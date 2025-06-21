# backend/schemas/trust_schema.py
"""
ApexMatch Trust System Schemas
Pydantic models for trust scoring, tier progression, and community moderation
"""

from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class TrustTierEnum(str, Enum):
    CHALLENGED = "challenged"
    BUILDING = "building"
    RELIABLE = "reliable"
    TRUSTED = "trusted"
    ELITE = "elite"

class TrustEventTypeEnum(str, Enum):
    PROFILE_COMPLETION = "profile_completion"
    EMAIL_VERIFICATION = "email_verification"
    PHONE_VERIFICATION = "phone_verification"
    PHOTO_VERIFICATION = "photo_verification"
    CONVERSATION_QUALITY = "conversation_quality"
    RESPONSE_CONSISTENCY = "response_consistency"
    MUTUAL_MATCH = "mutual_match"
    SUCCESSFUL_REVEAL = "successful_reveal"
    POSITIVE_FEEDBACK = "positive_feedback"
    REPORT_VIOLATION = "report_violation"
    SUSPICIOUS_BEHAVIOR = "suspicious_behavior"
    ACCOUNT_AGE_MILESTONE = "account_age_milestone"

class ViolationStatusEnum(str, Enum):
    PENDING = "pending"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"

class TrustEventRequest(BaseModel):
    event_type: TrustEventTypeEnum
    context: Optional[Dict[str, Any]] = {}
    user_reported_id: Optional[int] = None
    
    @validator('context')
    def validate_context(cls, v):
        if v and len(str(v)) > 1000:
            raise ValueError('Context data too large')
        return v

class TrustEventResponse(BaseModel):
    event_id: int
    score_change: float
    new_total_score: float
    tier_changed: bool
    old_tier: str
    new_tier: str
    message: str
    timestamp: datetime

class TrustScoreResponse(BaseModel):
    current_score: float
    trust_tier: str
    tier_progression: Dict[str, Any]
    recent_events: List[Dict[str, Any]]
    next_milestones: List[Dict[str, Any]]
    trust_benefits: List[str]

class TrustTierProgression(BaseModel):
    current_tier: str
    progress_percentage: float
    points_in_tier: float
    points_to_next: float
    next_tier: Optional[str] = None

class TrustMilestone(BaseModel):
    milestone_type: str
    description: str
    points_needed: int
    action_required: Optional[str] = None
    benefits: Optional[List[str]] = None

class TrustViolationReport(BaseModel):
    reported_user_id: int
    violation_type: str
    description: str
    evidence_urls: Optional[List[str]] = None
    
    @validator('description')
    def validate_description(cls, v):
        if len(v) < 10:
            raise ValueError('Description must be at least 10 characters')
        if len(v) > 1000:
            raise ValueError('Description cannot exceed 1000 characters')
        return v
    
    @validator('violation_type')
    def validate_violation_type(cls, v):
        valid_types = [
            'harassment', 'inappropriate_content', 'fake_profile', 
            'spam', 'threats', 'scam', 'underage', 'other'
        ]
        if v not in valid_types:
            raise ValueError(f'Violation type must be one of: {valid_types}')
        return v

class TrustViolationResponse(BaseModel):
    violation_id: int
    status: str
    immediate_action: Dict[str, Any]
    investigation_timeline: str
    message: str

class TrustViolationsListResponse(BaseModel):
    violations: List[Dict[str, Any]]
    total_reported: int

class TrustLeaderboardEntry(BaseModel):
    rank: int
    trust_score: float
    trust_tier: str
    percentile: float

class TrustLeaderboardResponse(BaseModel):
    leaderboard: List[TrustLeaderboardEntry]
    your_rank: Optional[int]
    your_score: float
    your_tier: str
    total_users: int

class TrustBoostRequest(BaseModel):
    boost_type: str = "activity"  # activity, referral, milestone
    
    @validator('boost_type')
    def validate_boost_type(cls, v):
        valid_types = ['activity', 'referral', 'milestone']
        if v not in valid_types:
            raise ValueError(f'Boost type must be one of: {valid_types}')
        return v

class TrustBoostResponse(BaseModel):
    boost_applied: bool
    boost_amount: int
    new_score: float
    tier_changed: bool
    next_boost_available: datetime
    message: str

class TrustAnalyticsResponse(BaseModel):
    total_events: int
    positive_events: int
    negative_events: int
    current_score: float
    current_tier: str
    trust_velocity_per_week: float
    score_progression: List[Dict[str, Any]]
    event_breakdown: Dict[str, Dict[str, Any]]
    tier_history: List[Dict[str, Any]]
    account_age_days: int
    insights: Dict[str, Any]

class TrustImpactResponse(BaseModel):
    trust_impact: Dict[str, Any]
    community_contributions: Dict[str, Any]
    trust_milestones: Dict[str, Any]
    recognition: Dict[str, Any]

class TrustTierRequirementsResponse(BaseModel):
    tiers: Dict[str, Dict[str, Any]]
    scoring_system: Dict[str, Any]

class TrustEventHistory(BaseModel):
    event_id: int
    event_type: str
    score_change: float
    description: str
    context: Optional[Dict[str, Any]]
    created_at: datetime
    
    class Config:
        from_attributes = True

class TrustInsights(BaseModel):
    trust_consistency: str
    most_common_event: Optional[str]
    biggest_score_gain: float
    biggest_score_loss: float
    tier_advancements: int
    community_standing: str

class TrustBenefits(BaseModel):
    tier: TrustTierEnum
    daily_reveals: int
    ai_wingman_access: bool
    priority_support: bool
    moderation_privileges: bool
    beta_access: bool
    special_badges: List[str]

class TrustSystemHealth(BaseModel):
    status: str
    service: str
    features: Dict[str, str]
    system_info: Dict[str, Any]