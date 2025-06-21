"""
ApexMatch Matching Routes
Core matching functionality and match management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime

from database import get_db
from models.user import User
from models.match import Match, MatchStatus
from services.matchmaker import MatchmakingService
from middleware.auth_middleware import get_current_user

router = APIRouter()

# Response schemas
class MatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    compatibility_score: float
    trust_compatibility: float
    overall_match_quality: float
    status: MatchStatus
    created_at: datetime
    expires_at: datetime
    match_explanation: Optional[Dict]
    other_user_preview: Dict  # Limited info about other user

class MatchInsights(BaseModel):
    compatibility_reasons: List[str]
    behavioral_highlights: List[str]
    conversation_starters: List[str]
    compatibility_score: float

@router.post("/find", response_model=List[MatchResponse])
async def find_new_matches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Find new matches for the current user"""
    
    # Check if user can get new matches (tier limits)
    if not current_user.can_get_new_match():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Match limit reached. Upgrade to Premium for unlimited matches."
        )
    
    # Check if user has completed enough profile for matching
    if current_user.profile_completion_percentage() < 70:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete your profile before matching"
        )
    
    # Check if BGP is ready
    if not current_user.bgp_profile or not current_user.bgp_profile.is_ready_for_matching():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your behavioral profile is still building. Please continue using the app to improve matching accuracy."
        )
    
    try:
        # Use matchmaking service to find matches
        matchmaker = MatchmakingService(db)
        max_matches = 5 if current_user.is_premium() else 1
        matches = matchmaker.find_matches_for_user(current_user.id, max_matches)
        
        if not matches:
            return []
        
        # Convert to response format
        match_responses = []
        for match in matches:
            other_user_id = match.get_other_user_id(current_user.id)
            other_user = db.query(User).filter(User.id == other_user_id).first()
            
            # Create limited preview of other user (no photos yet)
            other_user_preview = {
                "id": other_user.id,
                "first_name": other_user.first_name,
                "age": other_user.age,
                "location": other_user.location,
                "trust_tier": other_user.trust_profile.trust_tier.value if other_user.trust_profile else "standard"
            }
            
            match_responses.append(MatchResponse(
                id=match.id,
                compatibility_score=match.compatibility_score,
                trust_compatibility=match.trust_compatibility,
                overall_match_quality=match.overall_match_quality,
                status=match.status,
                created_at=match.created_at,
                expires_at=match.expires_at,
                match_explanation=match.match_explanation,
                other_user_preview=other_user_preview
            ))
        
        return match_responses
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to find matches"
        )

@router.get("/queue", response_model=List[MatchResponse])
async def get_match_queue(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pending matches waiting for user's response"""
    
    matchmaker = MatchmakingService(db)
    pending_matches = matchmaker.get_match_queue_for_user(current_user.id)
    
    match_responses = []
    for match in pending_matches:
        other_user_id = match.get_other_user_id(current_user.id)
        other_user = db.query(User).filter(User.id == other_user_id).first()
        
        other_user_preview = {
            "id": other_user.id,
            "first_name": other_user.first_name,
            "age": other_user.age,
            "location": other_user.location,
            "trust_tier": other_user.trust_profile.trust_tier.value if other_user.trust_profile else "standard"
        }
        
        match_responses.append(MatchResponse(
            id=match.id,
            compatibility_score=match.compatibility_score,
            trust_compatibility=match.trust_compatibility,
            overall_match_quality=match.overall_match_quality,
            status=match.status,
            created_at=match.created_at,
            expires_at=match.expires_at,
            match_explanation=match.match_explanation,
            other_user_preview=other_user_preview
        ))
    
    return match_responses

@router.post("/{match_id}/accept")
async def accept_match(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a match"""
    
    # Check if user can start new chat
    if not current_user.can_start_new_chat():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Active chat limit reached. Upgrade to Premium for unlimited chats."
        )
    
    matchmaker = MatchmakingService(db)
    success = matchmaker.accept_match(match_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not accept match"
        )
    
    return {"message": "Match accepted successfully"}

@router.post("/{match_id}/reject")
async def reject_match(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a match"""
    
    matchmaker = MatchmakingService(db)
    success = matchmaker.reject_match(match_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not reject match"
        )
    
    return {"message": "Match rejected"}

@router.get("/{match_id}/insights", response_model=MatchInsights)
async def get_match_insights(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed insights about a match"""
    
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match or not match.is_participant(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    # Get other user
    other_user_id = match.get_other_user_id(current_user.id)
    other_user = db.query(User).filter(User.id == other_user_id).first()
    
    # Generate insights
    compatibility_reasons = match.match_explanation.get('reasons', []) if match.match_explanation else []
    
    # Get behavioral highlights
    behavioral_highlights = []
    if current_user.bgp_profile and other_user.bgp_profile:
        highlights = current_user.bgp_profile.get_compatibility_explanation(other_user.bgp_profile)
        behavioral_highlights = highlights[:3]  # Top 3
    
    # Generate conversation starters
    conversation_starters = [
        "What's something that made you smile today?",
        "If you could have dinner with anyone, who would it be and why?",
        "What's a small thing that brings you joy?"
    ]
    
    return MatchInsights(
        compatibility_reasons=compatibility_reasons,
        behavioral_highlights=behavioral_highlights,
        conversation_starters=conversation_starters,
        compatibility_score=match.overall_match_quality
    )

@router.get("/active", response_model=List[MatchResponse])
async def get_active_matches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's active matches"""
    
    active_matches = db.query(Match).filter(
        ((Match.initiator_id == current_user.id) | (Match.target_id == current_user.id)),
        Match.status.in_([MatchStatus.ACTIVE, MatchStatus.REVEAL_READY, MatchStatus.REVEALED])
    ).order_by(Match.last_activity_at.desc()).all()
    
    match_responses = []
    for match in active_matches:
        other_user_id = match.get_other_user_id(current_user.id)
        other_user = db.query(User).filter(User.id == other_user_id).first()
        
        # Show more info for active matches
        other_user_preview = {
            "id": other_user.id,
            "first_name": other_user.first_name,
            "age": other_user.age,
            "location": other_user.location,
            "trust_tier": other_user.trust_profile.trust_tier.value if other_user.trust_profile else "standard",
            "last_active": other_user.last_active.isoformat() if other_user.last_active else None,
            "is_online": other_user.is_online()
        }
        
        match_responses.append(MatchResponse(
            id=match.id,
            compatibility_score=match.compatibility_score,
            trust_compatibility=match.trust_compatibility,
            overall_match_quality=match.overall_match_quality,
            status=match.status,
            created_at=match.created_at,
            expires_at=match.expires_at,
            match_explanation=match.match_explanation,
            other_user_preview=other_user_preview
        ))
    
    return match_responses

@router.get("/statistics")
async def get_match_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's matching statistics"""
    
    matchmaker = MatchmakingService(db)
    stats = matchmaker.get_match_statistics(current_user.id)
    
    return stats

@router.post("/cleanup-expired")
async def cleanup_expired_matches(db: Session = Depends(get_db)):
    """Admin endpoint to cleanup expired matches"""
    
    matchmaker = MatchmakingService(db)
    count = matchmaker.cleanup_expired_matches()
    
    return {"message": f"Cleaned up {count} expired matches"}