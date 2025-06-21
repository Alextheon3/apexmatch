# backend/schemas/bgp_schema.py
"""
ApexMatch BGP (Behavioral Graph Profiling) Schemas
Pydantic models for behavioral profiling and personality analysis
"""

from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class BGPCategoryEnum(str, Enum):
    COMMUNICATION = "communication"
    EMOTIONAL = "emotional"
    LIFESTYLE = "lifestyle"
    VALUES = "values"
    INTERESTS = "interests"

class EmotionalToneEnum(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    EXCITED = "excited"
    CALM = "calm"
    ANXIOUS = "anxious"
    CONFIDENT = "confident"
    VULNERABLE = "vulnerable"

class BGPEventRequest(BaseModel):
    event_type: str
    category: BGPCategoryEnum
    emotional_context: Optional[Dict[str, Any]] = {}
    interaction_data: Optional[Dict[str, Any]] = {}
    
    @validator('event_type')
    def validate_event_type(cls, v):
        valid_events = [
            'message_sent', 'message_received', 'profile_viewed', 'match_accepted',
            'match_rejected', 'conversation_started', 'response_time_measured',
            'emoji_used', 'question_asked', 'personal_info_shared'
        ]
        if v not in valid_events:
            raise ValueError(f'Event type must be one of: {valid_events}')
        return v

class BGPProfile(BaseModel):
    user_id: int
    communication_style: Dict[str, float]
    emotional_intelligence: Dict[str, float]
    lifestyle_patterns: Dict[str, float]
    core_values: Dict[str, float]
    interest_intensity: Dict[str, float]
    maturity_level: float
    profile_completeness: float
    last_updated: datetime
    
    class Config:
        from_attributes = True

class BGPInsightsRequest(BaseModel):
    category: BGPCategoryEnum
    time_range_days: Optional[int] = 30

class BGPInsightsResponse(BaseModel):
    category: str
    insights: Dict[str, Any]
    recommendations: List[str]
    strengths: List[str]
    growth_areas: List[str]
    compatibility_notes: Dict[str, Any]

class BGPCompatibilityRequest(BaseModel):
    other_user_id: int
    analysis_depth: str = "standard"  # standard, detailed, premium
    
    @validator('analysis_depth')
    def validate_analysis_depth(cls, v):
        valid_depths = ['standard', 'detailed', 'premium']
        if v not in valid_depths:
            raise ValueError(f'Analysis depth must be one of: {valid_depths}')
        return v

class BGPCompatibilityResponse(BaseModel):
    overall_compatibility: float
    category_compatibility: Dict[str, float]
    strengths: List[str]
    potential_challenges: List[str]
    conversation_starters: List[str]
    relationship_potential: str
    detailed_analysis: Optional[Dict[str, Any]] = None

class BGPLearningUpdate(BaseModel):
    conversation_id: int
    learning_data: Dict[str, Any]
    feedback_type: str = "positive"  # positive, negative, neutral
    
    @validator('feedback_type')
    def validate_feedback_type(cls, v):
        valid_types = ['positive', 'negative', 'neutral']
        if v not in valid_types:
            raise ValueError(f'Feedback type must be one of: {valid_types}')
        return v

class BGPQuestionnaireRequest(BaseModel):
    responses: Dict[str, Any]
    questionnaire_version: str = "1.0"

class BGPQuestionnaireResponse(BaseModel):
    initial_profile: BGPProfile
    suggested_improvements: List[str]
    onboarding_complete: bool

class BGPRebuildRequest(BaseModel):
    preserve_manual_inputs: bool = True
    include_conversation_data: bool = True
    time_range_days: Optional[int] = None

class BGPProgressResponse(BaseModel):
    current_maturity: float
    profile_completeness: float
    total_events_analyzed: int
    last_significant_update: Optional[datetime]
    growth_trajectory: Dict[str, float]
    milestone_progress: Dict[str, Any]

class BGPEventResponse(BaseModel):
    event_id: int
    processed_successfully: bool
    bgp_impact: Dict[str, float]
    new_insights_generated: bool
    profile_maturity_change: float
    
    class Config:
        from_attributes = True

class BGPCategoryInsight(BaseModel):
    category: BGPCategoryEnum
    current_score: float
    trend: str  # improving, stable, declining
    key_behaviors: List[str]
    recommendations: List[str]
    peer_comparison: Optional[float] = None

class BGPManualInput(BaseModel):
    category: BGPCategoryEnum
    trait_name: str
    self_assessment: float
    confidence_level: float
    notes: Optional[str] = None
    
    @validator('self_assessment', 'confidence_level')
    def validate_scores(cls, v):
        if v < 0 or v > 1:
            raise ValueError('Scores must be between 0 and 1')
        return v

class BGPAnalyticsResponse(BaseModel):
    user_id: int
    total_events: int
    profile_evolution: List[Dict[str, Any]]
    category_development: Dict[str, List[Dict[str, Any]]]
    behavioral_patterns: Dict[str, Any]
    prediction_accuracy: Optional[float] = None
    last_analysis: datetime

class BGPTraitAnalysis(BaseModel):
    trait_name: str
    current_score: float
    confidence: float
    data_points: int
    trend: str
    last_updated: datetime

class BGPPersonalityProfile(BaseModel):
    openness: float
    conscientiousness: float
    extraversion: float
    agreeableness: float
    neuroticism: float
    emotional_stability: float
    communication_directness: float
    empathy_level: float
    
    @validator('*', pre=True)
    def validate_personality_scores(cls, v):
        if isinstance(v, (int, float)) and (v < 0 or v > 1):
            raise ValueError('Personality scores must be between 0 and 1')
        return v

class BGPMatchingPreferences(BaseModel):
    preferred_communication_style: List[str]
    emotional_compatibility_weight: float = 0.3
    lifestyle_compatibility_weight: float = 0.2
    values_compatibility_weight: float = 0.4
    interests_compatibility_weight: float = 0.1
    
    @validator('*_weight')
    def validate_weights(cls, v):
        if v < 0 or v > 1:
            raise ValueError('Weights must be between 0 and 1')
        return v

class BGPConversationAnalysis(BaseModel):
    conversation_id: int
    emotional_progression: List[Dict[str, Any]]
    communication_patterns: Dict[str, Any]
    vulnerability_moments: List[Dict[str, Any]]
    connection_indicators: Dict[str, float]
    predicted_longevity: Optional[float] = None

class BGPSystemHealth(BaseModel):
    status: str
    total_profiles: int
    profiles_updated_today: int
    average_profile_maturity: float
    system_accuracy: float
    last_model_update: datetime