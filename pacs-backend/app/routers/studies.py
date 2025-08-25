from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import shutil
import pydicom
from datetime import datetime

from ..database import get_db, User, Study, Patient, DicomFile, UserRole, StudyStatus
from ..auth import get_current_user
from .. import schemas

router = APIRouter(prefix="/studies", tags=["studies"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=schemas.Study)
async def upload_study(
    patient_id: str = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    date_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    study_description: Optional[str] = Form(None),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.TECHNICIAN, UserRole.DOCTOR]:
        raise HTTPException(status_code=403, detail="Only technicians and doctors can upload studies")
    
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        patient_data = {
            "patient_id": patient_id,
            "first_name": first_name,
            "last_name": last_name,
            "gender": gender,
            "phone": phone,
            "email": email,
            "address": address
        }
        if date_of_birth:
            try:
                patient_data["date_of_birth"] = datetime.fromisoformat(date_of_birth)
            except ValueError:
                pass
        
        patient = Patient(**patient_data)
        db.add(patient)
        db.commit()
        db.refresh(patient)
    
    study_uid = str(uuid.uuid4())
    
    study = Study(
        study_uid=study_uid,
        patient_id=patient.id,
        diagnostic_center_id=current_user.diagnostic_center_id,
        uploaded_by_id=current_user.id,
        study_description=study_description,
        study_date=datetime.now()
    )
    db.add(study)
    db.commit()
    db.refresh(study)
    
    study_dir = os.path.join(UPLOAD_DIR, study_uid)
    os.makedirs(study_dir, exist_ok=True)
    
    for file in files:
        if file.filename and file.filename.lower().endswith('.dcm'):
            file_path = os.path.join(study_dir, file.filename)
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            try:
                ds = pydicom.dcmread(file_path)
                
                dicom_file = DicomFile(
                    study_id=study.id,
                    series_uid=str(ds.get('SeriesInstanceUID', '')),
                    instance_uid=str(ds.get('SOPInstanceUID', '')),
                    file_path=file_path,
                    file_size=os.path.getsize(file_path),
                    slice_number=int(ds.get('InstanceNumber', 0)) if ds.get('InstanceNumber') else None,
                    patient_name=str(ds.get('PatientName', '')),
                    patient_id_dicom=str(ds.get('PatientID', '')),
                    study_date_dicom=str(ds.get('StudyDate', '')),
                    modality_dicom=str(ds.get('Modality', '')),
                    body_part_dicom=str(ds.get('BodyPartExamined', ''))
                )
                
                if not study.modality:
                    study.modality = dicom_file.modality_dicom
                if not study.body_part:
                    study.body_part = dicom_file.body_part_dicom
                
                db.add(dicom_file)
                
            except Exception as e:
                print(f"Error processing DICOM file {file.filename}: {e}")
    
    db.commit()
    db.refresh(study)
    
    from ..celery_app import process_dicom_study_async
    process_dicom_study_async.delay(study.id)
    
    return study

@router.get("/", response_model=List[schemas.Study])
async def get_studies(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[StudyStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Study)
    
    if current_user.role == UserRole.TECHNICIAN:
        query = query.filter(Study.uploaded_by_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        query = query.filter(
            (Study.diagnostic_center_id == current_user.diagnostic_center_id) |
            (Study.assigned_doctor_id == current_user.id)
        )
    elif current_user.role == UserRole.RADIOLOGIST:
        query = query.filter(Study.diagnostic_center_id == current_user.diagnostic_center_id)
    elif current_user.role in [UserRole.DIAGNOSTIC_CENTER_ADMIN]:
        query = query.filter(Study.diagnostic_center_id == current_user.diagnostic_center_id)
    
    if status_filter:
        query = query.filter(Study.status == status_filter)
    
    studies = query.offset(skip).limit(limit).all()
    return studies

@router.get("/{study_id}", response_model=schemas.Study)
async def get_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    
    has_access = False
    if current_user.role == UserRole.ADMIN:
        has_access = True
    elif current_user.role == UserRole.RADIOLOGIST:
        has_access = study.diagnostic_center_id == current_user.diagnostic_center_id
    elif current_user.role in [UserRole.DOCTOR, UserRole.TECHNICIAN, UserRole.DIAGNOSTIC_CENTER_ADMIN]:
        has_access = study.diagnostic_center_id == current_user.diagnostic_center_id
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    patient = db.query(Patient).filter(Patient.id == study.patient_id).first()
    if patient:
        study.patient_name = f"{patient.first_name} {patient.last_name}"
        study.patient_id_display = patient.patient_id
    
    dicom_files = db.query(DicomFile).filter(DicomFile.study_id == study.id).all()
    study.dicom_files = dicom_files
    
    return study

@router.put("/{study_id}/assign")
async def assign_study(
    study_id: int,
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    
    if current_user.role not in [UserRole.DIAGNOSTIC_CENTER_ADMIN, UserRole.DOCTOR]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    if study.diagnostic_center_id != current_user.diagnostic_center_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    study.assigned_doctor_id = doctor_id
    study.status = StudyStatus.ASSIGNED
    db.commit()
    
    return {"message": "Study assigned successfully"}

@router.put("/{study_id}/report")
async def update_report(
    study_id: int,
    report_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    
    if current_user.role == UserRole.DOCTOR:
        study.doctor_report = report_data.get("report", "")
        study.status = StudyStatus.COMPLETED
    elif current_user.role == UserRole.RADIOLOGIST:
        study.radiologist_report = report_data.get("report", "")
        study.final_report = report_data.get("final_report", "")
        study.status = StudyStatus.REVIEWED
    
    db.commit()
    return {"message": "Report updated successfully"}
