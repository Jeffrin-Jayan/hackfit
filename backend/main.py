"""
SkillBridge Backend - FastAPI Entry Point
Skill verification platform for the post-AI world
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routes
from routes import evaluation, session, auth


from models.database import Database

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management"""
    # Startup
    print("SkillBridge Backend starting up...")
    await Database.connect()
    yield
    # Shutdown
    await Database.disconnect()
    print("SkillBridge Backend shutting down...")


# Initialize FastAPI app
app = FastAPI(
    title="SkillBridge API",
    description="AI-powered skill verification platform with 8 behavioral detectors",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://frontend:3000",
        os.getenv("FRONTEND_URL", "http://localhost:3000")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(session.router, prefix="/api/v1/session", tags=["Session Management"])
app.include_router(evaluation.router, prefix="/api/v1/evaluate", tags=["AI Evaluation"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "SkillBridge API",
        "status": "healthy",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    db_connected = Database.client is not None
    return {
        "status": "healthy",
        "services": {
            "api": True,
            "gemini": os.getenv("GEMINI_API_KEY") is not None,
            "mongodb": db_connected
        }
    }
