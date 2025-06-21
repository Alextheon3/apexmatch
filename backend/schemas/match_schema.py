# backend/schemas/match_schema.py
"""
ApexMatch Matching System Schemas
Pydantic models for matching, compatibility, and connection requests
"""

from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class MatchStatusEnum(str, Enum):
    PENDING = "pending"
    MUTUAL = "mutual"
    REJECTED = "rejected"
    EXPIRED = "expired"

class MatchActionEnum(str, Enum):
    ACCEPT = "accept"
    REJECT = "reject"
    SUPER_LIKE = "super_like"

class MatchPreferenceEnum(str, Enum):
    DISCOVERY = "discovery"
    COMPATIBILITY = "compatibility"
    TRUST_BASED = "trust_based"
    AI_RECOMMENDED = "ai_recommended"

class MatchFindRequest(BaseModel):
    match_type: MatchPreferenceEnum = MatchPreferenceEnum.COMPATIBILITY
    limit: int = 10
    include_ai_analysis: bool = False
    filters: Optional[Dict[str, Any]] = {}
    
    @validator('limit')
    def validate_limit(cls, v):
        if v < 1 or v > 50:
            raise ValueError('Limit must be between 1 and 50')
        return v

class MatchResponse(BaseModel):
    id: int
    user_profile: Dict[str, Any]
    compatibility_score: float
    trust_compatibility: float
    bgp_compatibility: Optional[Dict[str, float]] = None
    ai_insights: Optional[Dict[str, Any]] = None
    match_reasoning: List[str]
    conversation_starters: Optional[List[str]] = None
    mutual: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True

class MatchQueueResponse(BaseModel):
    matches: List[MatchResponse]
    total_pending: int
    queue_health: str
    estimated_wait_time: Optional[int] = None
    match_quality_score: float

class MatchActionRequest(BaseModel):
    action: MatchActionEnum
    message: Optional[str] = None
    feedback: Optional[Dict[str, Any]] = {}

class MatchActionResponse(BaseModel):
    success: bool
    mutual_match: bool
    conversation_id: Optional[int] = None
    message: str
    next_reveal_eligible: bool = False
    celebration_data: Optional[Dict[str, Any]] = None

class MatchInsightsRequest(BaseModel):
    include_bgp_analysis: bool = True
    include_conversation_potential: bool = True
    include_long_term_compatibility: bool = False

class MatchInsightsResponse(BaseModel):
    match_id: int
    compatibility_breakdown: Dict[str, float]
    bgp_analysis: Optional[Dict[str, Any]] = None
    conversation_potential: Optional[Dict[str, Any]] = None
    long_term_indicators: Optional[Dict[str, Any]] = None
    relationship_predictions: Optional[Dict[str, Any]] = None
    red_flags: List[str]
    green_flags: List[str]

class CompatibilityAnalysisRequest(BaseModel):
    target_user_id: int
    analysis_type: str = "comprehensive"  # quick, standard, comprehensive
    include_predictions: bool = False
    
    @validator('analysis_type')
    def validate_analysis_type(cls, v):
        valid_types = ['quick', 'standard', 'comprehensive']
        if v not in valid_types:
            raise ValueError(f'Analysis type must be one of: {valid_types}')
        return v

class CompatibilityAnalysisResponse(BaseModel):
    overall_score: float
    category_scores: Dict[str, float]
    personality_match: Dict[str, Any]
    communication_compatibility: Dict[str, Any]
    lifestyle_alignment: Dict[str, Any]
    values_alignment: Dict[str, Any]
    relationship_potential: str
    predicted_success_factors: List[str]
    potential_friction_points: List[str]
    ai_recommendation: str

class MatchPreferencesRequest(BaseModel):
    algorithm_preference: MatchPreferenceEnum
    prioritize_trust_tier: bool = True
    min_compatibility_score: float = 0.6
    enable_ai_insights: bool = True
    max_distance_km: int = 50
    boost_recent_activity: bool = True
    
    @validator('min_compatibility_score')
    def validate_compatibility_score(cls, v):
        if v < 0 or v > 1:
            raise ValueError('Compatibility score must be between 0 and 1')
        return v
    
    @validator('max_distance_km')
    def validate_distance(cls, v):
        if v < 1 or v > 500:
            raise ValueError('Distance must be between 1 and 500 km')
        return v

class MatchPreferencesResponse(BaseModel):
    preferences_updated: bool
    estimated_daily_matches: int
    queue_refresh_frequency: str
    match_quality_prediction: float

class MatchFeedbackRequest(BaseModel):
    match_id: int
    feedback_type: str  # positive, negative, neutral, report
    rating: Optional[int] = None  # 1-5 scale
    feedback_text: Optional[str] = None
    improvement_suggestions: Optional[List[str]] = None
    
    @validator('rating')
    def validate_rating(cls, v):
        if v is not None and (v < 1 or v > 5):
            raise ValueError('Rating must be between 1 and 5')
        return v
    
    @validator('feedback_type')
    def validate_feedback_type(cls, v):
        valid_types = ['positive', 'negative', 'neutral', 'report']
        if v not in valid_types:
            raise ValueError(f'Feedback type must be one of: {valid_types}')
        return v

class MatchStatsResponse(BaseModel):
    total_matches: int
    mutual_matches: int
    rejection_rate: float
    average_compatibility: float
    successful_conversations: int
    reveal_success_rate: float
    match_quality_trend: Dict[str, float]
    algorithm_effectiveness: Dict[str, Any]

class MatchHistoryResponse(BaseModel):
    match_id: int
    other_user_profile: Dict[str, Any]
    compatibility_score: float
    action_taken: str
    mutual: bool
    conversation_started: bool
    created_at: datetime
    outcome: Optional[str] = None

class SuperLikeRequest(BaseModel):
    target_user_id: int
    message: Optional[str] = None
    
    @validator('message')
    def validate_message(cls, v):
        if v and len(v) > 200:
            raise ValueError('Super like message cannot exceed 200 characters')
        return v

class MatchDiscoveryResponse(BaseModel):
    user_id: int
    preview_profile: Dict[str, Any]
    compatibility_preview: float
    trust_indicator: str
    quick_insights: List[str]
    is_premium_match: bool
    distance_km: Optional[float] = None

class MatchQualityMetrics(BaseModel):
    algorithm_version: str
    prediction_accuracy: float
    user_satisfaction_score: float
    conversation_success_rate: float
    long_term_success_indicators: Dict[str, float]
    last_optimization: datetime