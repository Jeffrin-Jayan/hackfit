"""
Authentication Routes
Handles user authentication with MongoDB and JWT
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import bcrypt
import os
from jose import JWTError, jwt

from models.database import (
    Database, 
    User, 
    UserCreate, 
    UserLogin, 
    UserResponse,
    AssessmentPhase,
    AssessmentStatus,
    get_user_by_email,
    get_user_by_id,
    create_user,
    update_user
)

router = APIRouter()
security = HTTPBearer()

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-super-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class AuthError(BaseModel):
    detail: str


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_access_token(user_id: str, email: str) -> str:
    """Create JWT access token"""
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


def format_user_response(user: dict) -> UserResponse:
    """Format user dict to UserResponse"""
    return UserResponse(
        id=str(user.get("_id")),
        email=user.get("email"),
        display_name=user.get("display_name"),
        current_phase=user.get("current_phase", AssessmentPhase.VOICE),
        phases_completed=user.get("phases_completed", []),
        voice_status=user.get("voice_status", AssessmentStatus.NOT_STARTED),
        code_status=user.get("code_status", AssessmentStatus.NOT_STARTED),
        peer_status=user.get("peer_status", AssessmentStatus.NOT_STARTED),
        voice_score=user.get("voice_score"),
        code_score=user.get("code_score"),
        peer_score=user.get("peer_score"),
        overall_score=user.get("overall_score"),
        is_verified=user.get("is_verified", False)
    )


@router.post("/register", response_model=TokenResponse)
async def register_user(user_data: UserCreate):
    """
    Register a new user
    """
    # Check if email already exists
    existing_user = await get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate password
    if len(user_data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Create user document
    user_doc = {
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "display_name": user_data.display_name,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "current_phase": AssessmentPhase.VOICE.value,
        "phases_completed": [],
        "voice_status": AssessmentStatus.NOT_STARTED.value,
        "code_status": AssessmentStatus.NOT_STARTED.value,
        "peer_status": AssessmentStatus.NOT_STARTED.value,
        "voice_score": None,
        "code_score": None,
        "peer_score": None,
        "overall_score": None,
        "is_verified": False,
        "verification_date": None
    }
    
    # Insert into database
    user_id = await create_user(user_doc)
    
    # Create access token
    access_token = create_access_token(user_id, user_data.email)
    
    # Get created user
    user = await get_user_by_id(user_id)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=format_user_response(user)
    )


@router.post("/login", response_model=TokenResponse)
async def login_user(user_data: UserLogin):
    """
    Authenticate user and return token
    """
    # Find user by email
    user = await get_user_by_email(user_data.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(user_data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create access token
    user_id = str(user.get("_id"))
    access_token = create_access_token(user_id, user_data.email)
    
    # Update last login
    await update_user(user_id, {"updated_at": datetime.utcnow()})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=format_user_response(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user
    """
    return format_user_response(current_user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    display_name: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Update current user's profile
    """
    user_id = str(current_user.get("_id"))
    update_data = {"updated_at": datetime.utcnow()}
    
    if display_name:
        update_data["display_name"] = display_name
    
    await update_user(user_id, update_data)
    updated_user = await get_user_by_id(user_id)
    
    return format_user_response(updated_user)


@router.get("/progress")
async def get_progress(current_user: dict = Depends(get_current_user)):
    """
    Get user's assessment progress
    """
    return {
        "current_phase": current_user.get("current_phase", AssessmentPhase.VOICE.value),
        "phases_completed": current_user.get("phases_completed", []),
        "phases": {
            "voice": {
                "status": current_user.get("voice_status", AssessmentStatus.NOT_STARTED.value),
                "score": current_user.get("voice_score"),
                "unlocked": True  # Voice is always unlocked
            },
            "code": {
                "status": current_user.get("code_status", AssessmentStatus.NOT_STARTED.value),
                "score": current_user.get("code_score"),
                "unlocked": current_user.get("voice_status") == AssessmentStatus.PASSED.value
            },
            "peer": {
                "status": current_user.get("peer_status", AssessmentStatus.NOT_STARTED.value),
                "score": current_user.get("peer_score"),
                "unlocked": current_user.get("code_status") == AssessmentStatus.PASSED.value
            }
        },
        "is_verified": current_user.get("is_verified", False),
        "overall_score": current_user.get("overall_score")
    }


@router.post("/logout")
async def logout_user():
    """
    Logout current user (client should discard token)
    """
    return {"message": "Successfully logged out"}
