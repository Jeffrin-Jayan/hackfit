"""
Pydantic Schemas for SkillBridge
Defines data models for API requests and responses
"""

from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


# Enums
class SessionStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    EVALUATED = "evaluated"
    CANCELLED = "cancelled"


class DifficultyLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


# Audio Metrics
class AudioMetrics(BaseModel):
    """Audio behavioral signals extracted from voice recording"""
    wpm: float = Field(ge=0, description="Words per minute")
    pause_count: int = Field(ge=0, description="Number of pauses detected")
    avg_pause_duration: float = Field(ge=0, description="Average pause duration in seconds")
    total_duration: float = Field(ge=0, description="Total response duration in seconds")
    amplitude_variance: float = Field(ge=0, description="Voice amplitude variance")
    speaking_duration: Optional[float] = Field(None, description="Speaking time excluding pauses")
    pause_ratio: Optional[float] = Field(None, description="Ratio of pause time to total time")


# Evaluation Dimension
class DimensionScore(BaseModel):
    """Score for a single evaluation dimension"""
    dimension: str
    score: float = Field(ge=1, le=10)
    feedback: str
    indicators: List[str] = []


# User Models
class UserBase(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserResponse(UserBase):
    user_id: str
    created_at: datetime
    assessment_count: int = 0


# Session Models
class SessionCreate(BaseModel):
    """Create a new assessment session"""
    skill_topic: str = Field(min_length=1, max_length=200)
    difficulty: DifficultyLevel = DifficultyLevel.INTERMEDIATE


class QuestionCreate(BaseModel):
    """A question in an assessment"""
    question_id: str
    question_text: str
    topic: str
    expected_depth: DifficultyLevel = DifficultyLevel.INTERMEDIATE


class ResponseSubmit(BaseModel):
    """Submit a response to a question"""
    question_id: str
    transcript: str
    audio_metrics: AudioMetrics
    audio_url: Optional[str] = None  # Optional: URL to stored audio


class SessionResponse(BaseModel):
    """Full session details"""
    session_id: str
    user_id: str
    skill_topic: str
    difficulty: DifficultyLevel
    status: SessionStatus
    created_at: datetime
    completed_at: Optional[datetime] = None
    questions: List[QuestionCreate] = []
    response_count: int = 0


# Evaluation Models
class EvaluationRequest(BaseModel):
    """Request to evaluate a response"""
    session_id: str
    question: str
    topic: str
    transcript: str
    audio_metrics: AudioMetrics


class EvaluationResult(BaseModel):
    """Full evaluation result"""
    session_id: str
    overall_score: float = Field(ge=1, le=10)
    passed: bool
    dimensions: List[DimensionScore]
    blind_spots: List[str] = []
    strengths: List[str] = []
    recommendations: List[str] = []
    evaluated_at: datetime


class ConsistencyCheckRequest(BaseModel):
    """Request to check consistency across responses"""
    session_id: str
    responses: List[Dict[str, Any]]


class ConsistencyCheckResult(BaseModel):
    """Consistency check result"""
    session_id: str
    consistent: bool
    confidence: float = Field(ge=0, le=1)
    inconsistencies: List[Dict[str, Any]] = []
    analysis: str


# Assessment Question Bank
class QuestionBank(BaseModel):
    """Collection of questions for a topic"""
    topic: str
    difficulty: DifficultyLevel
    questions: List[str]
    followup_questions: Dict[str, List[str]] = {}


# Skill Topics
SKILL_TOPICS = [
    "Python Programming",
    "JavaScript & TypeScript",
    "React & Frontend Development",
    "Node.js & Backend Development",
    "SQL & Database Design",
    "System Design & Architecture",
    "DevOps & Cloud Computing",
    "Machine Learning Basics",
    "Data Structures & Algorithms",
    "API Design & REST"
]


# Sample Question Templates
QUESTION_TEMPLATES = {
    "conceptual": [
        "Explain {concept} in your own words.",
        "What is the difference between {concept_a} and {concept_b}?",
        "Why would you use {concept} instead of {alternative}?",
        "Walk me through how {concept} works under the hood."
    ],
    "practical": [
        "How would you implement {feature} in a real project?",
        "Describe a time when you used {concept} to solve a problem.",
        "What are the trade-offs when choosing {option_a} vs {option_b}?",
        "How would you debug {problem_type}?"
    ],
    "deep_dive": [
        "What are the edge cases to consider when implementing {feature}?",
        "How does {concept} handle {scenario}?",
        "What are the performance implications of {approach}?",
        "Explain the internals of {technology}."
    ]
}
