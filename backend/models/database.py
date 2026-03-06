"""
MongoDB Database Models and Connection
"""

from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import os
from bson import ObjectId


# MongoDB Connection
class Database:
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    async def connect(cls):
        """Connect to MongoDB"""
        mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        cls.client = AsyncIOMotorClient(mongodb_url)
        cls.db = cls.client.skillbridge
        print(f"Connected to MongoDB: {mongodb_url}")

    @classmethod
    async def disconnect(cls):
        """Disconnect from MongoDB"""
        if cls.client:
            cls.client.close()
            print("Disconnected from MongoDB")

    @classmethod
    def get_db(cls):
        return cls.db


# Custom ObjectId type for Pydantic
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, info):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        return {"type": "string"}


# Enums
class AssessmentPhase(str, Enum):
    VOICE = "voice"
    CODE = "code"
    PEER = "peer"


class AssessmentStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    PASSED = "passed"
    FAILED = "failed"


# User Model
class User(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    email: EmailStr
    password_hash: str
    display_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Assessment Progress
    current_phase: AssessmentPhase = AssessmentPhase.VOICE
    phases_completed: List[AssessmentPhase] = []
    
    # Phase-specific status
    voice_status: AssessmentStatus = AssessmentStatus.NOT_STARTED
    code_status: AssessmentStatus = AssessmentStatus.NOT_STARTED
    peer_status: AssessmentStatus = AssessmentStatus.NOT_STARTED
    
    # Scores
    voice_score: Optional[float] = None
    code_score: Optional[float] = None
    peer_score: Optional[float] = None
    overall_score: Optional[float] = None
    
    # Verification badge
    is_verified: bool = False
    verification_date: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    display_name: str
    current_phase: AssessmentPhase
    phases_completed: List[AssessmentPhase]
    voice_status: AssessmentStatus
    code_status: AssessmentStatus
    peer_status: AssessmentStatus
    voice_score: Optional[float]
    code_score: Optional[float]
    peer_score: Optional[float]
    overall_score: Optional[float]
    is_verified: bool


# Assessment Session Model
class AssessmentSession(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    phase: AssessmentPhase
    topic: str
    difficulty: str = "intermediate"
    status: AssessmentStatus = AssessmentStatus.IN_PROGRESS
    
    # Timestamps
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    # Responses
    responses: List[Dict[str, Any]] = []
    
    # Evaluation Results
    evaluation: Optional[Dict[str, Any]] = None
    overall_score: Optional[float] = None
    passed: bool = False
    
    # Behavioral Metrics
    metrics: Dict[str, Any] = {}

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


# Voice Response Model
class VoiceResponse(BaseModel):
    question_id: str
    question: str
    transcript: str
    audio_url: Optional[str] = None
    duration: float
    
    # Audio Metrics
    wpm: float
    pause_count: int
    avg_pause_duration: float
    amplitude_variance: float
    
    # Evaluation
    evaluation: Optional[Dict[str, Any]] = None


# Code Response Model
class CodeResponse(BaseModel):
    question_id: str
    question: str
    code: str
    language: str
    
    # Explanation (voice)
    explanation_transcript: Optional[str] = None
    
    # Test Results
    test_results: Optional[Dict[str, Any]] = None
    
    # Evaluation
    evaluation: Optional[Dict[str, Any]] = None


# Peer Session Model
class PeerSession(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    evaluator_id: Optional[str] = None
    
    # Scheduling
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    
    # Session Data
    video_url: Optional[str] = None
    questions_asked: List[str] = []
    responses: List[Dict[str, Any]] = []
    
    # Evaluation
    evaluation: Optional[Dict[str, Any]] = None
    evaluator_notes: Optional[str] = None
    passed: bool = False

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


# Database Helper Functions
async def get_user_by_email(email: str) -> Optional[dict]:
    """Get user by email"""
    db = Database.get_db()
    return await db.users.find_one({"email": email})


async def get_user_by_id(user_id: str) -> Optional[dict]:
    """Get user by ID"""
    db = Database.get_db()
    return await db.users.find_one({"_id": ObjectId(user_id)})


async def create_user(user_data: dict) -> str:
    """Create new user"""
    db = Database.get_db()
    result = await db.users.insert_one(user_data)
    return str(result.inserted_id)


async def update_user(user_id: str, update_data: dict) -> bool:
    """Update user"""
    db = Database.get_db()
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    return result.modified_count > 0


async def create_session(session_data: dict) -> str:
    """Create assessment session"""
    db = Database.get_db()
    result = await db.sessions.insert_one(session_data)
    return str(result.inserted_id)


async def get_session(session_id: str) -> Optional[dict]:
    """Get session by ID"""
    db = Database.get_db()
    return await db.sessions.find_one({"_id": ObjectId(session_id)})


async def get_user_sessions(user_id: str, phase: Optional[str] = None) -> List[dict]:
    """Get all sessions for a user"""
    db = Database.get_db()
    query = {"user_id": user_id}
    if phase:
        query["phase"] = phase
    cursor = db.sessions.find(query).sort("started_at", -1)
    return await cursor.to_list(length=100)


async def update_session(session_id: str, update_data: dict) -> bool:
    """Update session"""
    db = Database.get_db()
    result = await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": update_data}
    )
    return result.modified_count > 0


async def update_user_phase_progress(user_id: str, phase: AssessmentPhase, passed: bool, score: float):
    """Update user's phase progress after assessment"""
    db = Database.get_db()
    
    update_data = {
        "updated_at": datetime.utcnow()
    }
    
    if phase == AssessmentPhase.VOICE:
        update_data["voice_status"] = AssessmentStatus.PASSED if passed else AssessmentStatus.FAILED
        update_data["voice_score"] = score
        if passed:
            update_data["current_phase"] = AssessmentPhase.CODE
    elif phase == AssessmentPhase.CODE:
        update_data["code_status"] = AssessmentStatus.PASSED if passed else AssessmentStatus.FAILED
        update_data["code_score"] = score
        if passed:
            update_data["current_phase"] = AssessmentPhase.PEER
    elif phase == AssessmentPhase.PEER:
        update_data["peer_status"] = AssessmentStatus.PASSED if passed else AssessmentStatus.FAILED
        update_data["peer_score"] = score
        if passed:
            update_data["is_verified"] = True
            update_data["verification_date"] = datetime.utcnow()
    
    # Add to phases_completed if passed
    if passed:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$addToSet": {"phases_completed": phase.value}}
        )
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    # Calculate overall score if all phases completed
    user = await get_user_by_id(user_id)
    if user and all([user.get("voice_score"), user.get("code_score"), user.get("peer_score")]):
        overall = (user["voice_score"] + user["code_score"] + user["peer_score"]) / 3
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"overall_score": overall}}
        )
