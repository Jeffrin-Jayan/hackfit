"""
Session Management Routes
Handles assessment session lifecycle with MongoDB
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId

from routes.auth import get_current_user, decode_token
from models.database import (
    Database,
    AssessmentPhase,
    AssessmentStatus,
    create_session,
    get_session,
    get_user_sessions,
    update_session,
    update_user_phase_progress,
    get_user_by_id,
    update_user
)

router = APIRouter()
security = HTTPBearer()


class SessionCreate(BaseModel):
    skill_topic: str
    phase: str = "voice"
    difficulty: str = "intermediate"


class QuestionResponse(BaseModel):
    question_id: str
    question: str
    transcript: str
    audio_metrics: dict


class SessionComplete(BaseModel):
    phase: str
    passed: bool
    score: float


class PhaseComplete(BaseModel):
    session_id: Optional[str] = None
    phase: str
    passed: bool
    score: float
    evaluation: Optional[dict] = None


@router.post("/create")
async def create_new_session(
    session_data: SessionCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new assessment session
    """
    user_id = str(current_user.get("_id"))
    
    # Validate phase access
    phase = session_data.phase.lower()
    if phase == "code" and current_user.get("voice_status") != "passed":
        raise HTTPException(
            status_code=403, 
            detail="Must pass Voice Assessment to access Code Challenge"
        )
    if phase == "peer" and current_user.get("code_status") != "passed":
        raise HTTPException(
            status_code=403,
            detail="Must pass Code Challenge to access Peer Session"
        )
    
    # Create session document
    session_doc = {
        "user_id": user_id,
        "phase": phase,
        "topic": session_data.skill_topic,
        "difficulty": session_data.difficulty,
        "status": "in_progress",
        "started_at": datetime.utcnow(),
        "completed_at": None,
        "responses": [],
        "evaluation": None,
        "overall_score": None,
        "passed": False,
        "metrics": {}
    }
    
    session_id = await create_session(session_doc)
    
    # Update user's phase status to in_progress
    phase_status_field = f"{phase}_status"
    await update_user(user_id, {phase_status_field: "in_progress"})
    
    return {
        "session_id": session_id,
        "phase": phase,
        "topic": session_data.skill_topic,
        "status": "in_progress"
    }


@router.get("/{session_id}")
async def get_session_details(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get session details by ID
    """
    session = await get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify ownership
    if session.get("user_id") != str(current_user.get("_id")):
        raise HTTPException(status_code=403, detail="Access denied")
    
    session["_id"] = str(session["_id"])
    return session


@router.post("/{session_id}/response")
async def submit_response(
    session_id: str,
    response: QuestionResponse,
    current_user: dict = Depends(get_current_user)
):
    """
    Submit a response for a question in the session
    """
    session = await get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.get("user_id") != str(current_user.get("_id")):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if session.get("status") != "in_progress":
        raise HTTPException(status_code=400, detail="Session is not active")
    
    # Add response to session
    db = Database.get_db()
    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {
            "$push": {
                "responses": {
                    "question_id": response.question_id,
                    "question": response.question,
                    "transcript": response.transcript,
                    "audio_metrics": response.audio_metrics,
                    "submitted_at": datetime.utcnow()
                }
            }
        }
    )
    
    return {
        "message": "Response submitted successfully",
        "question_id": response.question_id
    }


@router.post("/complete")
async def complete_phase(
    data: PhaseComplete,
    current_user: dict = Depends(get_current_user)
):
    """
    Complete a phase and update user progress
    """
    user_id = str(current_user.get("_id"))
    phase = data.phase.lower()
    
    # Validate phase
    if phase not in ["voice", "code", "peer"]:
        raise HTTPException(status_code=400, detail="Invalid phase")
    
    # Update session if provided
    if data.session_id:
        await update_session(data.session_id, {
            "status": "completed",
            "completed_at": datetime.utcnow(),
            "overall_score": data.score,
            "passed": data.passed,
            "evaluation": data.evaluation
        })
    
    # Update user's phase progress
    phase_enum = AssessmentPhase(phase)
    await update_user_phase_progress(user_id, phase_enum, data.passed, data.score)
    
    # Get updated user data
    updated_user = await get_user_by_id(user_id)
    
    # Determine next phase
    next_phase = None
    if data.passed:
        if phase == "voice":
            next_phase = "code"
        elif phase == "code":
            next_phase = "peer"
        elif phase == "peer":
            next_phase = None  # All complete!
    
    return {
        "message": f"Phase {phase} completed",
        "passed": data.passed,
        "score": data.score,
        "next_phase": next_phase,
        "is_verified": updated_user.get("is_verified", False),
        "current_phase": updated_user.get("current_phase")
    }


@router.post("/{session_id}/complete")
async def complete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark session as complete
    """
    session = await get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.get("user_id") != str(current_user.get("_id")):
        raise HTTPException(status_code=403, detail="Access denied")
    
    await update_session(session_id, {
        "status": "completed",
        "completed_at": datetime.utcnow()
    })
    
    return {
        "message": "Session completed",
        "session_id": session_id
    }


@router.get("/user/history")
async def get_my_sessions(
    phase: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all sessions for current user
    """
    user_id = str(current_user.get("_id"))
    sessions = await get_user_sessions(user_id, phase)
    
    # Convert ObjectIds to strings
    for session in sessions:
        session["_id"] = str(session["_id"])
    
    return {
        "sessions": sessions,
        "total": len(sessions)
    }


@router.get("/check-access/{phase}")
async def check_phase_access(
    phase: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Check if user can access a specific phase
    """
    phase = phase.lower()
    
    if phase == "voice":
        return {"can_access": True, "reason": None}
    
    if phase == "code":
        can_access = current_user.get("voice_status") == "passed"
        return {
            "can_access": can_access,
            "reason": None if can_access else "Must pass Voice Assessment first"
        }
    
    if phase == "peer":
        can_access = current_user.get("code_status") == "passed"
        return {
            "can_access": can_access,
            "reason": None if can_access else "Must pass Code Challenge first"
        }
    
    raise HTTPException(status_code=400, detail="Invalid phase")
