from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db, User, DiagnosticCenter, UserRole
from ..auth import require_admin, get_password_hash
from .. import schemas

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/users", response_model=schemas.User)
async def create_user(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=user_data.role,
        diagnostic_center_id=user_data.diagnostic_center_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/users", response_model=List[schemas.User])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/users/{user_id}", response_model=schemas.User)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/users/{user_id}", response_model=schemas.User)
async def update_user(
    user_id: int,
    user_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for field, value in user_data.dict(exclude_unset=True).items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.post("/diagnostic-centers", response_model=schemas.DiagnosticCenter)
async def create_diagnostic_center(
    center_data: schemas.DiagnosticCenterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_center = DiagnosticCenter(**center_data.dict())
    db.add(db_center)
    db.commit()
    db.refresh(db_center)
    return db_center

@router.get("/diagnostic-centers", response_model=List[schemas.DiagnosticCenter])
async def get_diagnostic_centers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    centers = db.query(DiagnosticCenter).offset(skip).limit(limit).all()
    return centers

@router.put("/diagnostic-centers/{center_id}", response_model=schemas.DiagnosticCenter)
async def update_diagnostic_center(
    center_id: int,
    center_data: schemas.DiagnosticCenterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    center = db.query(DiagnosticCenter).filter(DiagnosticCenter.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Diagnostic center not found")
    
    for field, value in center_data.dict(exclude_unset=True).items():
        setattr(center, field, value)
    
    db.commit()
    db.refresh(center)
    return center
