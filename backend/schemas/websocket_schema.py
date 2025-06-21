# backend/schemas/websocket_schema.py
"""
ApexMatch WebSocket Schemas
Pydantic models for real-time communication, chat, and notifications
"""

from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum

class MessageTypeEnum(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    EMOJI = "emoji"
    VOICE_NOTE = "voice_note"
    SYSTEM = "system"
    REVEAL_REQUEST = "reveal_request"
    REVEAL_RESPONSE = "reveal_response"

class NotificationTypeEnum(str, Enum):
    NEW_MESSAGE = "new_message"
    NEW_MATCH = "new_match"
    REVEAL_REQUEST = "reveal_request"
    REVEAL_COMPLETED = "reveal_completed"
    TRUST_TIER_UPGRADE = "trust_tier_upgrade"
    SUBSCRIPTION_UPDATE = "subscription_update"
    SYSTEM_ANNOUNCEMENT = "system_announcement"

class WebSocketEventTypeEnum(str, Enum):
    MESSAGE = "message"
    TYPING = "typing"
    READ_RECEIPT = "read_receipt"
    USER_STATUS = "user_status"
    NOTIFICATION = "notification"
    HEARTBEAT = "heartbeat"
    CONNECTION_STATUS = "connection_status"

class EmotionalToneEnum(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    EXCITED = "excited"
    ROMANTIC = "romantic"
    PLAYFUL = "playful"
    SERIOUS = "serious"
    VULNERABLE = "vulnerable"

# Base WebSocket message schemas
class WebSocketMessage(BaseModel):
    event_type: WebSocketEventTypeEnum
    data: Dict[str, Any]
    timestamp: datetime = datetime.utcnow()
    user_id: Optional[int] = None

class ChatMessageRequest(BaseModel):
    content: str
    message_type: MessageTypeEnum = MessageTypeEnum.TEXT
    reply_to_id: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = {}
    
    @validator('content')
    def validate_content(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Message content cannot be empty')
        if len(v) > 2000:
            raise ValueError('Message content cannot exceed 2000 characters')
        return v.strip()

class ChatMessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    message_type: str
    emotional_tone: Optional[str]
    depth_score: Optional[float]
    vulnerability_level: Optional[float]
    reply_to_id: Optional[int]
    metadata: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: Optional[datetime]
    is_read: bool = False
    
    class Config:
        from_attributes = True

class TypingIndicator(BaseModel):
    conversation_id: int
    user_id: int
    is_typing: bool
    timestamp: datetime = datetime.utcnow()

class ReadReceipt(BaseModel):
    conversation_id: int
    message_id: int
    user_id: int
    read_at: datetime = datetime.utcnow()

class UserStatusUpdate(BaseModel):
    user_id: int
    status: str  # online, offline, away, busy
    last_seen: Optional[datetime] = None
    
    @validator('status')
    def validate_status(cls, v):
        valid_statuses = ['online', 'offline', 'away', 'busy']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {valid_statuses}')
        return v

class NotificationMessage(BaseModel):
    notification_type: NotificationTypeEnum
    title: str
    message: str
    data: Optional[Dict[str, Any]] = {}
    priority: str = "normal"  # low, normal, high, urgent
    action_url: Optional[str] = None
    
    @validator('priority')
    def validate_priority(cls, v):
        valid_priorities = ['low', 'normal', 'high', 'urgent']
        if v not in valid_priorities:
            raise ValueError(f'Priority must be one of: {valid_priorities}')
        return v

class ConversationJoinRequest(BaseModel):
    conversation_id: int
    user_token: str

class ConversationJoinResponse(BaseModel):
    success: bool
    conversation_id: int
    participant_count: int
    recent_messages: List[ChatMessageResponse]
    conversation_metadata: Dict[str, Any]

class HeartbeatRequest(BaseModel):
    timestamp: datetime = datetime.utcnow()
    client_info: Optional[Dict[str, Any]] = {}

class HeartbeatResponse(BaseModel):
    server_timestamp: datetime = datetime.utcnow()
    connection_quality: str
    latency_ms: Optional[float] = None

class ConnectionStatusUpdate(BaseModel):
    status: str  # connected, disconnected, reconnecting, error
    reason: Optional[str] = None
    retry_in_seconds: Optional[int] = None
    
    @validator('status')
    def validate_connection_status(cls, v):
        valid_statuses = ['connected', 'disconnected', 'reconnecting', 'error']
        if v not in valid_statuses:
            raise ValueError(f'Connection status must be one of: {valid_statuses}')
        return v

# Real-time reveal system schemas
class RevealRequestMessage(BaseModel):
    conversation_id: int
    target_user_id: int
    reveal_stage: str
    emotional_message: Optional[str] = None
    
    @validator('reveal_stage')
    def validate_reveal_stage(cls, v):
        valid_stages = ['preparation', 'intention', 'mutual_readiness', 'countdown', 'reveal', 'integration']
        if v not in valid_stages:
            raise ValueError(f'Reveal stage must be one of: {valid_stages}')
        return v

class RevealResponseMessage(BaseModel):
    reveal_request_id: int
    response: str  # accept, decline, not_ready
    message: Optional[str] = None
    
    @validator('response')
    def validate_response(cls, v):
        valid_responses = ['accept', 'decline', 'not_ready']
        if v not in valid_responses:
            raise ValueError(f'Response must be one of: {valid_responses}')
        return v

class RevealStatusUpdate(BaseModel):
    reveal_id: int
    current_stage: str
    both_ready: bool
    next_action_required: Optional[str] = None
    estimated_completion: Optional[datetime] = None

# AI Wingman real-time integration
class AIInsightNotification(BaseModel):
    conversation_id: int
    insight_type: str
    suggestion: str
    confidence: float
    expires_at: Optional[datetime] = None
    
    @validator('confidence')
    def validate_confidence(cls, v):
        if v < 0 or v > 1:
            raise ValueError('Confidence must be between 0 and 1')
        return v

class ConversationHealthUpdate(BaseModel):
    conversation_id: int
    health_score: float
    emotional_connection: float
    engagement_level: str
    recommendations: List[str]
    reveal_readiness: Optional[float] = None

# Error handling schemas
class WebSocketError(BaseModel):
    error_code: str
    error_message: str
    error_details: Optional[Dict[str, Any]] = {}
    timestamp: datetime = datetime.utcnow()
    recoverable: bool = True

class RateLimitError(WebSocketError):
    rate_limit_reset: datetime
    requests_remaining: int

# Batch message operations
class MessageBatch(BaseModel):
    messages: List[ChatMessageRequest]
    conversation_id: int
    
    @validator('messages')
    def validate_batch_size(cls, v):
        if len(v) > 50:
            raise ValueError('Batch cannot contain more than 50 messages')
        return v

class MessageBatchResponse(BaseModel):
    successful_messages: List[ChatMessageResponse]
    failed_messages: List[Dict[str, Any]]
    batch_id: str
    total_processed: int

# Advanced notification schemas
class TrustTierUpgradeNotification(NotificationMessage):
    old_tier: str
    new_tier: str
    new_benefits: List[str]
    celebration_animation: str

class NewMatchNotification(NotificationMessage):
    match_id: int
    match_user_profile: Dict[str, Any]
    compatibility_score: float
    conversation_starters: List[str]

class RevealCompletedNotification(NotificationMessage):
    reveal_id: int
    conversation_id: int
    celebration_data: Dict[str, Any]
    next_steps: List[str]

# Conversation analytics for real-time insights
class ConversationMetrics(BaseModel):
    conversation_id: int
    message_count: int
    response_time_avg: float
    emotional_progression: List[Dict[str, Any]]
    engagement_score: float
    last_activity: datetime

class RealTimeInsight(BaseModel):
    insight_id: str
    conversation_id: int
    insight_type: str
    content: str
    urgency: str
    suggested_action: Optional[str] = None
    valid_until: Optional[datetime] = None

# Connection quality monitoring
class ConnectionQuality(BaseModel):
    quality_score: float  # 0-1
    latency_ms: float
    packet_loss_rate: float
    reconnection_count: int
    last_quality_check: datetime

class WebSocketStats(BaseModel):
    connections_active: int
    messages_per_second: float
    average_latency: float
    error_rate: float
    uptime_seconds: int
    last_restart: Optional[datetime] = None

# Presence and activity tracking
class UserPresence(BaseModel):
    user_id: int
    status: str
    last_seen: datetime
    current_conversations: List[int]
    typing_in: Optional[int] = None

class ActivityUpdate(BaseModel):
    user_id: int
    activity_type: str  # typing, reading, responding, away
    conversation_id: Optional[int] = None
    timestamp: datetime = datetime.utcnow()

# System-wide announcements
class SystemAnnouncement(BaseModel):
    announcement_id: str
    title: str
    content: str
    announcement_type: str  # maintenance, feature, promotion, warning
    target_users: Optional[List[int]] = None  # None means all users
    expires_at: Optional[datetime] = None
    action_required: bool = False