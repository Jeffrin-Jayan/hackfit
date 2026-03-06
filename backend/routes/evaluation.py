"""
AI Evaluation Routes
Handles Gemini-powered skill evaluation with 8 behavioral dimensions
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class AudioMetrics(BaseModel):
    wpm: float  # Words per minute
    pause_count: int  # Number of pauses
    avg_pause_duration: float  # Average pause duration in seconds
    total_duration: float  # Total response duration
    amplitude_variance: float  # Voice amplitude variance (confidence indicator)


class EvaluationRequest(BaseModel):
    session_id: str
    question: str
    topic: str
    transcript: str
    audio_metrics: AudioMetrics


class DimensionScore(BaseModel):
    dimension: str
    score: float  # 1-10 scale
    feedback: str
    indicators: List[str]


class EvaluationResponse(BaseModel):
    session_id: str
    overall_score: float
    passed: bool
    dimensions: List[DimensionScore]
    blind_spots: List[str]
    strengths: List[str]
    recommendations: List[str]
    evaluated_at: datetime


# 8 Evaluation Dimensions
EVALUATION_DIMENSIONS = [
    "content_accuracy",
    "conceptual_depth", 
    "explanation_clarity",
    "real_world_application",
    "response_spontaneity",
    "technical_vocabulary",
    "logical_flow",
    "confidence_indicators"
]


@router.post("/", response_model=EvaluationResponse)
async def evaluate_response(request: EvaluationRequest):
    """
    Evaluate a single response using Gemini AI
    Returns scores across 8 behavioral dimensions
    """
    from services.gemini_service import evaluate_with_gemini
    
    try:
        result = await evaluate_with_gemini(
            topic=request.topic,
            question=request.question,
            transcript=request.transcript,
            audio_metrics=request.audio_metrics.model_dump()
        )
        
        return {
            "session_id": request.session_id,
            "overall_score": result["overall_score"],
            "passed": result["overall_score"] >= 6.0,
            "dimensions": result["dimensions"],
            "blind_spots": result["blind_spots"],
            "strengths": result["strengths"],
            "recommendations": result["recommendations"],
            "evaluated_at": datetime.utcnow()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


@router.post("/batch")
async def evaluate_batch(session_id: str, responses: List[EvaluationRequest]):
    """
    Evaluate multiple responses and aggregate results
    """
    results = []
    
    for response in responses:
        result = await evaluate_response(response)
        results.append(result)
    
    # Calculate aggregate scores
    if results:
        avg_score = sum(r["overall_score"] for r in results) / len(results)
        passed = avg_score >= 6.0
    else:
        avg_score = 0
        passed = False
    
    return {
        "session_id": session_id,
        "individual_results": results,
        "aggregate_score": avg_score,
        "passed": passed,
        "total_responses": len(results)
    }


@router.post("/consistency-check")
async def check_consistency(session_id: str, responses: List[dict]):
    """
    Cross-check answers for consistency
    Detects if responses contradict each other (potential AI-generated content)
    """
    from services.gemini_service import check_response_consistency
    
    try:
        result = await check_response_consistency(responses)
        return {
            "session_id": session_id,
            "consistent": result["consistent"],
            "confidence": result["confidence"],
            "inconsistencies": result.get("inconsistencies", []),
            "analysis": result.get("analysis", "")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Consistency check failed: {str(e)}")


@router.get("/{session_id}")
async def get_evaluation(session_id: str):
    """
    Get evaluation results for a session
    """
    # Will be implemented with Firebase persistence
    return {
        "session_id": session_id,
        "message": "Evaluation results will be fetched from database"
    }
