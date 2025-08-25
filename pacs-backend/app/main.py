from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import shutil
from datetime import timedelta

from .database import engine, Base, get_db
from .auth import (
    create_access_token, get_current_user, require_admin, 
    require_diagnostic_center_admin, get_password_hash, verify_password,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from . import schemas
from .database import (
    User, DiagnosticCenter, Patient, Study, DicomFile, Annotation,
    UserRole, StudyStatus
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PACS System API", version="1.0.0")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/auth/login", response_model=schemas.Token)
async def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=schemas.User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

from .routers import admin, diagnostic_center, studies, ai

app.include_router(admin.router)
app.include_router(diagnostic_center.router)
app.include_router(studies.router)
app.include_router(ai.router)
