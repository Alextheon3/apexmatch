# backend/schemas/__init__.py
"""
ApexMatch API Schemas Package
Centralized imports for all Pydantic schemas used across the application
"""

# Import with error handling to avoid import failures
try:
    # User schemas
    from .user_schema import (
        UserBase, UserCreate, UserUpdate, UserResponse, UserProfile,
        LoginRequest, LoginResponse, PasswordResetRequest, PasswordResetConfirm,
        EmailVerificationRequest, PhoneVerificationRequest, PhoneVerificationConfirm,
        UserPreferences, UserStats, GenderEnum, SubscriptionTierEnum, TrustTierEnum
    )
    USER_SCHEMAS_AVAILABLE = True
except ImportError:
    USER_SCHEMAS_AVAILABLE = False
    # Create placeholder classes to prevent import errors
    class UserBase: pass
    class UserCreate: pass
    class UserUpdate: pass
    class UserResponse: pass
    class UserProfile: pass
    class LoginRequest: pass
    class LoginResponse: pass
    class PasswordResetRequest: pass
    class PasswordResetConfirm: pass
    class EmailVerificationRequest: pass
    class PhoneVerificationRequest: pass
    class PhoneVerificationConfirm: pass
    class UserPreferences: pass
    class UserStats: pass
    class GenderEnum: pass
    class SubscriptionTierEnum: pass
    class TrustTierEnum: pass

try:
    # BGP schemas  
    from .bgp_schema import (
        BGPEventRequest, BGPProfile, BGPInsightsRequest, BGPInsightsResponse,
        BGPCompatibilityRequest, BGPCompatibilityResponse, BGPLearningUpdate,
        BGPQuestionnaireRequest, BGPQuestionnaireResponse, BGPRebuildRequest,
        BGPProgressResponse, BGPEventResponse, BGPCategoryInsight, BGPManualInput,
        BGPAnalyticsResponse, BGPCategoryEnum, EmotionalToneEnum
    )
    BGP_SCHEMAS_AVAILABLE = True
except ImportError:
    BGP_SCHEMAS_AVAILABLE = False
    # Create placeholder classes
    class BGPEventRequest: pass
    class BGPProfile: pass
    class BGPInsightsRequest: pass
    class BGPInsightsResponse: pass
    class BGPCompatibilityRequest: pass
    class BGPCompatibilityResponse: pass
    class BGPLearningUpdate: pass
    class BGPQuestionnaireRequest: pass
    class BGPQuestionnaireResponse: pass
    class BGPRebuildRequest: pass
    class BGPProgressResponse: pass
    class BGPEventResponse: pass
    class BGPCategoryInsight: pass
    class BGPManualInput: pass
    class BGPAnalyticsResponse: pass
    class BGPCategoryEnum: pass
    class EmotionalToneEnum: pass

try:
    # Match schemas
    from .match_schema import (
        MatchFindRequest, MatchResponse, MatchQueueResponse, MatchActionRequest,
        MatchActionResponse, MatchInsightsRequest, MatchInsightsResponse,
        CompatibilityAnalysisRequest, CompatibilityAnalysisResponse,
        MatchPreferencesRequest, MatchPreferencesResponse, MatchFeedbackRequest,
        MatchStatsResponse, MatchHistoryResponse, SuperLikeRequest,
        MatchDiscoveryResponse, MatchQualityMetrics, MatchStatusEnum,
        MatchActionEnum, MatchPreferenceEnum
    )
    MATCH_SCHEMAS_AVAILABLE = True
except ImportError:
    MATCH_SCHEMAS_AVAILABLE = False
    # Create placeholder classes
    class MatchFindRequest: pass
    class MatchResponse: pass
    class MatchQueueResponse: pass
    class MatchActionRequest: pass
    class MatchActionResponse: pass
    class MatchInsightsRequest: pass
    class MatchInsightsResponse: pass
    class CompatibilityAnalysisRequest: pass
    class CompatibilityAnalysisResponse: pass
    class MatchPreferencesRequest: pass
    class MatchPreferencesResponse: pass
    class MatchFeedbackRequest: pass
    class MatchStatsResponse: pass
    class MatchHistoryResponse: pass
    class SuperLikeRequest: pass
    class MatchDiscoveryResponse: pass
    class MatchQualityMetrics: pass
    class MatchStatusEnum: pass
    class MatchActionEnum: pass
    class MatchPreferenceEnum: pass

try:
    # Trust schemas
    from .trust_schema import (
        TrustEventRequest, TrustEventResponse, TrustScoreResponse,
        TrustTierProgression, TrustMilestone, TrustViolationReport,
        TrustViolationResponse, TrustViolationsListResponse, TrustLeaderboardEntry,
        TrustLeaderboardResponse, TrustBoostRequest, TrustBoostResponse,
        TrustAnalyticsResponse, TrustImpactResponse, TrustTierRequirementsResponse,
        TrustEventHistory, TrustInsights, TrustBenefits, TrustSystemHealth,
        TrustTierEnum, TrustEventTypeEnum, ViolationStatusEnum
    )
    TRUST_SCHEMAS_AVAILABLE = True
except ImportError:
    TRUST_SCHEMAS_AVAILABLE = False
    # Create placeholder classes
    class TrustEventRequest: pass
    class TrustEventResponse: pass
    class TrustScoreResponse: pass
    class TrustTierProgression: pass
    class TrustMilestone: pass
    class TrustViolationReport: pass
    class TrustViolationResponse: pass
    class TrustViolationsListResponse: pass
    class TrustLeaderboardEntry: pass
    class TrustLeaderboardResponse: pass
    class TrustBoostRequest: pass
    class TrustBoostResponse: pass
    class TrustAnalyticsResponse: pass
    class TrustImpactResponse: pass
    class TrustTierRequirementsResponse: pass
    class TrustEventHistory: pass
    class TrustInsights: pass
    class TrustBenefits: pass
    class TrustSystemHealth: pass
    class TrustEventTypeEnum: pass
    class ViolationStatusEnum: pass

try:
    # WebSocket schemas
    from .websocket_schema import (
        WebSocketMessage, ChatMessageRequest, ChatMessageResponse, TypingIndicator,
        ReadReceipt, UserStatusUpdate, NotificationMessage, ConversationJoinRequest,
        ConversationJoinResponse, HeartbeatRequest, HeartbeatResponse,
        ConnectionStatusUpdate, RevealRequestMessage, RevealResponseMessage,
        RevealStatusUpdate, AIInsightNotification, ConversationHealthUpdate,
        WebSocketError, RateLimitError, MessageBatch, MessageBatchResponse,
        TrustTierUpgradeNotification, NewMatchNotification, RevealCompletedNotification,
        ConversationMetrics, RealTimeInsight, ConnectionQuality, WebSocketStats,
        UserPresence, ActivityUpdate, SystemAnnouncement, MessageTypeEnum,
        NotificationTypeEnum, WebSocketEventTypeEnum
    )
    WEBSOCKET_SCHEMAS_AVAILABLE = True
except ImportError:
    WEBSOCKET_SCHEMAS_AVAILABLE = False
    # Create placeholder classes
    class WebSocketMessage: pass
    class ChatMessageRequest: pass
    class ChatMessageResponse: pass
    class TypingIndicator: pass
    class ReadReceipt: pass
    class UserStatusUpdate: pass
    class NotificationMessage: pass
    class ConversationJoinRequest: pass
    class ConversationJoinResponse: pass
    class HeartbeatRequest: pass
    class HeartbeatResponse: pass
    class ConnectionStatusUpdate: pass
    class RevealRequestMessage: pass
    class RevealResponseMessage: pass
    class RevealStatusUpdate: pass
    class AIInsightNotification: pass
    class ConversationHealthUpdate: pass
    class WebSocketError: pass
    class RateLimitError: pass
    class MessageBatch: pass
    class MessageBatchResponse: pass
    class TrustTierUpgradeNotification: pass
    class NewMatchNotification: pass
    class RevealCompletedNotification: pass
    class ConversationMetrics: pass
    class RealTimeInsight: pass
    class ConnectionQuality: pass
    class WebSocketStats: pass
    class UserPresence: pass
    class ActivityUpdate: pass
    class SystemAnnouncement: pass
    class MessageTypeEnum: pass
    class NotificationTypeEnum: pass
    class WebSocketEventTypeEnum: pass

# Module availability status
SCHEMA_STATUS = {
    "user_schemas": USER_SCHEMAS_AVAILABLE,
    "bgp_schemas": BGP_SCHEMAS_AVAILABLE,
    "match_schemas": MATCH_SCHEMAS_AVAILABLE,
    "trust_schemas": TRUST_SCHEMAS_AVAILABLE,
    "websocket_schemas": WEBSOCKET_SCHEMAS_AVAILABLE
}

__all__ = [
    # User schemas
    "UserBase", "UserCreate", "UserUpdate", "UserResponse", "UserProfile",
    "LoginRequest", "LoginResponse", "PasswordResetRequest", "PasswordResetConfirm",
    "EmailVerificationRequest", "PhoneVerificationRequest", "PhoneVerificationConfirm",
    "UserPreferences", "UserStats", "GenderEnum", "SubscriptionTierEnum", "TrustTierEnum",
    
    # BGP schemas
    "BGPEventRequest", "BGPProfile", "BGPInsightsRequest", "BGPInsightsResponse",
    "BGPCompatibilityRequest", "BGPCompatibilityResponse", "BGPLearningUpdate",
    "BGPQuestionnaireRequest", "BGPQuestionnaireResponse", "BGPRebuildRequest",
    "BGPProgressResponse", "BGPEventResponse", "BGPCategoryInsight", "BGPManualInput",
    "BGPAnalyticsResponse", "BGPCategoryEnum", "EmotionalToneEnum",
    
    # Match schemas
    "MatchFindRequest", "MatchResponse", "MatchQueueResponse", "MatchActionRequest",
    "MatchActionResponse", "MatchInsightsRequest", "MatchInsightsResponse",
    "CompatibilityAnalysisRequest", "CompatibilityAnalysisResponse",
    "MatchPreferencesRequest", "MatchPreferencesResponse", "MatchFeedbackRequest",
    "MatchStatsResponse", "MatchHistoryResponse", "SuperLikeRequest",
    "MatchDiscoveryResponse", "MatchQualityMetrics", "MatchStatusEnum",
    "MatchActionEnum", "MatchPreferenceEnum",
    
    # Trust schemas
    "TrustEventRequest", "TrustEventResponse", "TrustScoreResponse",
    "TrustTierProgression", "TrustMilestone", "TrustViolationReport",
    "TrustViolationResponse", "TrustViolationsListResponse", "TrustLeaderboardEntry",
    "TrustLeaderboardResponse", "TrustBoostRequest", "TrustBoostResponse",
    "TrustAnalyticsResponse", "TrustImpactResponse", "TrustTierRequirementsResponse",
    "TrustEventHistory", "TrustInsights", "TrustBenefits", "TrustSystemHealth",
    "TrustTierEnum", "TrustEventTypeEnum", "ViolationStatusEnum",
    
    # WebSocket schemas
    "WebSocketMessage", "ChatMessageRequest", "ChatMessageResponse", "TypingIndicator",
    "ReadReceipt", "UserStatusUpdate", "NotificationMessage", "ConversationJoinRequest",
    "ConversationJoinResponse", "HeartbeatRequest", "HeartbeatResponse",
    "ConnectionStatusUpdate", "RevealRequestMessage", "RevealResponseMessage",
    "RevealStatusUpdate", "AIInsightNotification", "ConversationHealthUpdate",
    "WebSocketError", "RateLimitError", "MessageBatch", "MessageBatchResponse",
    "TrustTierUpgradeNotification", "NewMatchNotification", "RevealCompletedNotification",
    "ConversationMetrics", "RealTimeInsight", "ConnectionQuality", "WebSocketStats",
    "UserPresence", "ActivityUpdate", "SystemAnnouncement", "MessageTypeEnum",
    "NotificationTypeEnum", "WebSocketEventTypeEnum",
    
    # Status tracking
    "SCHEMA_STATUS"
]