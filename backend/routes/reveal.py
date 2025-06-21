"""
ApexMatch Photo Reveal Routes
Revolutionary 6-stage reveal system prioritizing emotional connection
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum

from database import get_db
from models.user import User
from models.match import Match, MatchStatus
from models.conversation import Conversation
from clients.claude_client import claude_client
from clients.gpt_client import gpt_client
from middleware.rate_limiter import rate_limit, ai_usage_limit
from middleware.auth_middleware import get_current_user, require_verification, require_trust_score
from middleware.logging_middleware import match_logger
from clients.redis_client import redis_client

router = APIRouter()

# Define missing enums locally
class RevealStatus(str, Enum):
    NOT_READY = "not_ready"
    PENDING = "pending"
    PREPARATION = "preparation"
    READY = "ready"
    COMPLETED = "completed"
    DECLINED = "declined"
    CANCELLED = "cancelled"

class RevealStage(str, Enum):
    PREPARATION = "preparation"
    INTENTION = "intention"
    MUTUAL_READINESS = "mutual_readiness"
    COUNTDOWN = "countdown"
    REVEAL = "reveal"
    INTEGRATION = "integration"

# Simple RevealRequest model
class RevealRequest:
    def __init__(self, match_id: int, requester_id: int, target_id: int, 
                 message: str = None, emotional_readiness_score: float = 0.0):
        self.id = None  # Would be set by database
        self.match_id = match_id
        self.requester_id = requester_id
        self.target_id = target_id
        self.message = message
        self.emotional_readiness_score = emotional_readiness_score
        self.stage = RevealStage.PREPARATION
        self.status = RevealStatus.PENDING
        self.created_at = datetime.utcnow()
        self.requester_ready = False
        self.target_ready = False

# Pydantic schemas
class RevealRequestCreate(BaseModel):
    match_id: int
    message: Optional[str] = None

class RevealResponse(BaseModel):
    request_id: int
    response: bool  # True = accept, False = decline
    message: Optional[str] = None

class RevealStatusResponse(BaseModel):
    id: int
    match_id: int
    stage: RevealStage
    status: RevealStatus
    emotional_readiness_score: float
    requester_ready: bool
    target_ready: bool
    mutual_consent: bool
    estimated_time_to_reveal: Optional[str]
    preparation_guidance: List[str]
    created_at: datetime

class RevealInsights(BaseModel):
    emotional_connection_score: float
    trust_indicators: List[str]
    conversation_highlights: List[str]
    readiness_assessment: str
    missing_elements: List[str]
    recommendation: str

class RevealStageGuide(BaseModel):
    stage: str
    title: str
    description: str
    requirements: List[str]
    guidance: List[str]
    estimated_duration: str
    next_steps: List[str]

@router.post("/request", status_code=status.HTTP_201_CREATED)
@require_verification()
@require_trust_score(50)  # Minimum trust score required
@rate_limit(limit=10, window_seconds=86400)  # 10 requests per day
async def request_photo_reveal(
    request_data: RevealRequestCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request photo reveal with emotional readiness check"""
    
    # Check usage limits based on subscription tier
    daily_limit = {
        "free": 1,
        "connection": 5,
        "elite": 15
    }.get(current_user.subscription_tier.value, 1)
    
    # Check today's usage (simplified)
    today_requests = 1  # Would check database
    
    if today_requests >= daily_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily reveal request limit reached ({daily_limit}). Upgrade for more requests."
        )
    
    # Get match
    match = db.query(Match).filter(
        Match.id == request_data.match_id,
        ((Match.initiator_id == current_user.id) | (Match.target_id == current_user.id)),
        Match.status.in_([MatchStatus.ACTIVE, MatchStatus.REVEAL_READY])
    ).first()
    
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found or not eligible for reveal"
        )
    
    try:
        # Get conversation for emotional analysis
        conversation = match.conversation
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No conversation exists for this match"
            )
        
        # Check emotional readiness (simplified)
        emotional_connection_percentage = 75.0  # Would use AI analysis
        
        # Require 70% emotional connection
        if emotional_connection_percentage < 70:
            return {
                "reveal_denied": True,
                "reason": "Insufficient emotional connection",
                "current_connection": emotional_connection_percentage,
                "required_connection": 70,
                "guidance": ["Continue building emotional intimacy"],
                "estimated_time": "3-5 days"
            }
        
        # Create reveal request
        reveal_request = RevealRequest(
            match_id=match.id,
            requester_id=current_user.id,
            target_id=match.get_other_user_id(current_user.id),
            message=request_data.message,
            emotional_readiness_score=emotional_connection_percentage / 100
        )
        
        # In real implementation, save to database
        # db.add(reveal_request)
        # db.commit()
        # db.refresh(reveal_request)
        
        # Log reveal event
        match_logger.log_reveal_event(
            user_id=current_user.id,
            match_user_id=match.get_other_user_id(current_user.id),
            reveal_stage="request_initiated",
            emotional_readiness_score=reveal_request.emotional_readiness_score,
            details={"message_included": bool(request_data.message)}
        )
        
        # Notify other user via WebSocket
        background_tasks.add_task(
            notify_reveal_request,
            reveal_request.target_id,
            1,  # reveal_request.id
            current_user.first_name
        )
        
        return {
            "message": "Reveal request created successfully",
            "request_id": 1,  # reveal_request.id
            "emotional_readiness_score": emotional_connection_percentage,
            "stage": reveal_request.stage.value,
            "next_steps": ["Prepare emotionally for this meaningful moment"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create reveal request"
        )

@router.get("/guide/{stage}", response_model=RevealStageGuide)
async def get_stage_guide(
    stage: RevealStage,
    current_user: User = Depends(get_current_user)
):
    """Get guidance for a specific reveal stage"""
    
    stage_guides = {
        RevealStage.PREPARATION: RevealStageGuide(
            stage="preparation",
            title="Emotional Preparation",
            description="Prepare your heart and mind for this meaningful moment of connection.",
            requirements=[
                "70% emotional connection achieved",
                "Mutual consent confirmed",
                "Trust foundation established"
            ],
            guidance=[
                "Reflect on your emotional connection with this person",
                "Consider what you hope to gain from sharing your appearance",
                "Prepare for the possibility of different expectations",
                "Focus on the person you've come to know through conversation"
            ],
            estimated_duration="10-30 minutes",
            next_steps=[
                "Mark yourself as ready when you feel emotionally prepared",
                "Wait for your match to also mark themselves as ready",
                "Proceed to intention setting when both are ready"
            ]
        ),
        RevealStage.INTENTION: RevealStageGuide(
            stage="intention",
            title="Setting Intentions",
            description="Share your intentions and hopes for this reveal moment.",
            requirements=[
                "Both users marked as ready",
                "Emotional preparation completed"
            ],
            guidance=[
                "Share why you want to reveal photos at this moment",
                "Express your hopes and expectations openly",
                "Acknowledge any nervousness or excitement",
                "Confirm your commitment to honoring the connection you've built"
            ],
            estimated_duration="15-45 minutes",
            next_steps=[
                "Engage in honest dialogue about intentions",
                "Express any concerns or excitement",
                "Confirm mutual readiness to proceed"
            ]
        ),
        RevealStage.MUTUAL_READINESS: RevealStageGuide(
            stage="mutual_readiness",
            title="Mutual Readiness Confirmation",
            description="Final confirmation that both parties are truly ready.",
            requirements=[
                "Intentions shared and discussed",
                "Any concerns addressed",
                "Mutual enthusiasm confirmed"
            ],
            guidance=[
                "Take a moment to check in with your feelings",
                "Confirm you're proceeding from a place of genuine connection",
                "Address any last-minute hesitations honestly",
                "Celebrate the emotional journey you've shared together"
            ],
            estimated_duration="5-15 minutes",
            next_steps=[
                "Final ready confirmation from both users",
                "Proceed to countdown when both confirm"
            ]
        ),
        RevealStage.COUNTDOWN: RevealStageGuide(
            stage="countdown",
            title="Reveal Countdown",
            description="The anticipatory moment before the reveal.",
            requirements=[
                "Mutual readiness confirmed",
                "Both users present and ready"
            ],
            guidance=[
                "Take deep breaths and center yourself",
                "Remember the person behind the photos",
                "Focus on the emotional connection you've built",
                "Prepare to see them with kindness and openness"
            ],
            estimated_duration="1-2 minutes",
            next_steps=[
                "Synchronized countdown begins",
                "Photos revealed simultaneously"
            ]
        ),
        RevealStage.REVEAL: RevealStageGuide(
            stage="reveal",
            title="The Sacred Reveal",
            description="The moment of visual connection after emotional bonding.",
            requirements=[
                "Countdown completed",
                "Both users ready for simultaneous reveal"
            ],
            guidance=[
                "Take a moment to absorb and appreciate",
                "Remember: you're seeing the person you've already connected with",
                "Share your genuine reactions honestly",
                "Focus on how this adds to rather than changes your connection"
            ],
            estimated_duration="Ongoing",
            next_steps=[
                "Share reactions and feelings",
                "Continue building your connection with visual context",
                "Plan your first video call or meeting if desired"
            ]
        ),
        RevealStage.INTEGRATION: RevealStageGuide(
            stage="integration",
            title="Post-Reveal Integration",
            description="Integrating visual connection with emotional bond.",
            requirements=[
                "Photos revealed and acknowledged",
                "Initial reactions shared"
            ],
            guidance=[
                "Discuss how the reveal affects your connection",
                "Share what you found attractive beyond physical appearance",
                "Talk about next steps in your relationship",
                "Plan future interactions with full context"
            ],
            estimated_duration="Ongoing",
            next_steps=[
                "Continue conversations with visual context",
                "Plan video calls or in-person meetings",
                "Deepen your relationship further"
            ]
        )
    }
    
    return stage_guides.get(stage, RevealStageGuide(
        stage="unknown",
        title="Unknown Stage",
        description="Stage guidance not available",
        requirements=[],
        guidance=[],
        estimated_duration="Unknown",
        next_steps=[]
    ))

@router.get("/active")
async def get_active_reveals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's active reveal requests"""
    
    # In real implementation, would query database
    # For now, return empty list
    return {"active_reveals": []}

# Background notification functions
async def notify_reveal_request(user_id: int, request_id: int, requester_name: str):
    """Notify user of new reveal request"""
    try:
        # Would use WebSocket connection manager
        await redis_client.set_json(
            f"notification:{user_id}",
            {
                "type": "reveal_request",
                "request_id": request_id,
                "requester_name": requester_name,
                "message": f"{requester_name} has requested to reveal photos with you",
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    except Exception as e:
        print(f"Failed to notify reveal request: {e}")

@router.get("/health")
async def reveal_health_check():
    """Reveal service health check"""
    return {
        "status": "healthy",
        "service": "reveal_routes",
        "ai_clients": {
            "claude": await claude_client.health_check(),
            "gpt": await gpt_client.health_check()
        }
    }