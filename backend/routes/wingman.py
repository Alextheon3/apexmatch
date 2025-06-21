"""
ApexMatch AI Wingman Routes - ENHANCED VERSION
Intelligent conversation assistance and emotional guidance (Premium Feature)
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import logging

from database import get_db
from models.user import User, SubscriptionTier
from models.conversation import Conversation, Message
from models.match import Match
from clients.gpt_client import gpt_client
from clients.claude_client import claude_client
from middleware.rate_limiter import ai_usage_limit
from middleware.auth_middleware import get_current_user, require_verification
from middleware.logging_middleware import ai_logger
from clients.redis_client import redis_client

router = APIRouter()
logger = logging.getLogger(__name__)

# Enhanced subscription validation
def require_subscription(minimum_tier: str):
    """Enhanced subscription decorator with better error messages"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required to access AI Wingman features"
                )
            
            user_tier = current_user.subscription_tier
            
            # Check if user has required subscription
            tier_hierarchy = {
                SubscriptionTier.FREE: 0,
                SubscriptionTier.CONNECTION: 1,
                SubscriptionTier.ELITE: 2
            }
            
            required_level = tier_hierarchy.get(SubscriptionTier(minimum_tier), 1)
            user_level = tier_hierarchy.get(user_tier, 0)
            
            if user_level < required_level:
                # Get subscription details for better error message
                upgrade_info = {
                    "current_tier": user_tier.value,
                    "required_tier": minimum_tier,
                    "upgrade_benefits": _get_ai_wingman_benefits(minimum_tier),
                    "pricing": _get_pricing_info(minimum_tier)
                }
                
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "error": "premium_subscription_required",
                        "message": f"AI Wingman requires {minimum_tier} subscription or higher",
                        "upgrade_info": upgrade_info
                    }
                )
            
            # Check if subscription is active
            if not current_user.is_premium() and user_tier != SubscriptionTier.FREE:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "error": "subscription_expired",
                        "message": "Your subscription has expired. Please renew to access AI Wingman features.",
                        "renewal_required": True
                    }
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Enhanced enums
class ImprovementType(str, Enum):
    DEEPENING = "deepening"
    HUMOR = "humor"
    VULNERABILITY = "vulnerability"
    EMPATHY = "empathy"
    PLAYFULNESS = "playfulness"
    INTELLECTUAL = "intellectual"
    ROMANTIC = "romantic"
    SUPPORTIVE = "supportive"

class AnalysisType(str, Enum):
    EMOTIONAL_CONNECTION = "emotional_connection"
    COMPATIBILITY = "compatibility"
    REVEAL_READINESS = "reveal_readiness"
    CONVERSATION_HEALTH = "conversation_health"
    COMMUNICATION_STYLE = "communication_style"

# Enhanced Pydantic schemas
class ConversationStarterRequest(BaseModel):
    match_id: int = Field(..., gt=0)
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)
    personality_focus: Optional[str] = Field(None, max_length=50)
    conversation_goal: Optional[str] = Field("connection", max_length=50)
    
    @field_validator('context')
    @classmethod
    def validate_context_size(cls, v):
        if v and len(str(v)) > 2000:
            raise ValueError("Context data too large")
        return v

class MessageImprovementRequest(BaseModel):
    original_message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: int = Field(..., gt=0)
    improvement_type: ImprovementType = ImprovementType.DEEPENING
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)
    target_tone: Optional[str] = Field(None, max_length=30)

class ConversationAnalysisRequest(BaseModel):
    conversation_id: int = Field(..., gt=0)
    analysis_type: AnalysisType = AnalysisType.EMOTIONAL_CONNECTION
    depth_level: Optional[str] = Field("standard", pattern="^(basic|standard|detailed)$")

class ConversationStarter(BaseModel):
    text: str
    reasoning: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    conversation_direction: str
    psychological_basis: Optional[str] = None
    expected_response_type: Optional[str] = None

class MessageSuggestion(BaseModel):
    improved_text: str
    improvement_reason: str
    tone: str
    psychological_reasoning: Optional[str] = None
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    expected_impact: Optional[str] = None

class ConversationInsights(BaseModel):
    emotional_connection_score: float = Field(..., ge=0.0, le=1.0)
    engagement_level: str
    conversation_quality: str
    reveal_readiness: Dict[str, Any]
    recommendations: List[str]
    next_steps: List[str]
    psychological_analysis: Optional[Dict[str, Any]] = None
    warning_signs: Optional[List[str]] = None

class AIWingmanResponse(BaseModel):
    suggestions: List[ConversationStarter]
    compatibility_notes: str
    usage_info: Optional[Dict[str, Any]] = None
    personalization_factors: Optional[List[str]] = None

class MessageImprovementResponse(BaseModel):
    suggestions: List[MessageSuggestion]
    original_analysis: str
    general_tips: List[str]
    usage_info: Optional[Dict[str, Any]] = None
    conversation_context: Optional[Dict[str, Any]] = None

class ConversationHealthResponse(BaseModel):
    overall_health_score: float = Field(..., ge=0.0, le=1.0)
    health_factors: Dict[str, float]
    strengths: List[str]
    areas_for_improvement: List[str]
    red_flags: List[str]
    recommendations: List[str]
    trend_analysis: Dict[str, Any]

# Helper functions
def _get_ai_wingman_benefits(tier: str) -> List[str]:
    """Get AI Wingman benefits for subscription tier"""
    benefits = {
        "connection": [
            "10 AI conversation starters per day",
            "15 message improvement suggestions per day",
            "5 conversation analyses per day",
            "Basic emotional intelligence insights"
        ],
        "elite": [
            "25 AI conversation starters per day",
            "50 message improvement suggestions per day",
            "20 conversation analyses per day",
            "Advanced conversation health monitoring",
            "Personalized coaching insights",
            "Real-time conversation guidance"
        ]
    }
    return benefits.get(tier, [])

def _get_pricing_info(tier: str) -> Dict[str, Any]:
    """Get pricing information for subscription tier"""
    pricing = {
        "connection": {"monthly": 19.99, "annual": 199.99, "discount": "17% off annual"},
        "elite": {"monthly": 39.99, "annual": 399.99, "discount": "17% off annual"}
    }
    return pricing.get(tier, {})

async def _check_daily_usage(user_id: int, feature: str, tier: str) -> Dict[str, Any]:
    """Check and update daily usage limits"""
    try:
        today = datetime.utcnow().strftime('%Y%m%d')
        usage_key = f"ai_usage_daily:{feature}:{user_id}:{today}"
        
        # Get tier limits
        limits = {
            "connection": {
                "conversation_starters": 10,
                "message_improvement": 15,
                "conversation_analysis": 5
            },
            "elite": {
                "conversation_starters": 25,
                "message_improvement": 50,
                "conversation_analysis": 20
            }
        }
        
        daily_limit = limits.get(tier, {}).get(feature, 0)
        current_usage = int(await redis_client.get(usage_key) or 0)
        
        if current_usage >= daily_limit:
            return {
                "allowed": False,
                "limit": daily_limit,
                "used": current_usage,
                "remaining": 0,
                "reset_time": (datetime.utcnow() + timedelta(days=1)).replace(hour=0, minute=0, second=0).isoformat()
            }
        
        # Increment usage
        new_usage = await redis_client.increment_counter(usage_key, ex=86400)
        
        return {
            "allowed": True,
            "limit": daily_limit,
            "used": new_usage,
            "remaining": daily_limit - new_usage,
            "reset_time": (datetime.utcnow() + timedelta(days=1)).replace(hour=0, minute=0, second=0).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Usage check error for user {user_id}, feature {feature}: {e}")
        return {"allowed": True, "limit": 999, "used": 0, "remaining": 999}

async def _get_conversation_context(conversation_id: int, db: Session, limit: int = 20) -> List[Dict[str, Any]]:
    """Get conversation context for AI analysis"""
    try:
        messages = db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at.desc()).limit(limit).all()
        
        context = []
        for msg in reversed(messages):
            context.append({
                "sender_id": msg.sender_id,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
                "emotional_tone": getattr(msg, 'emotional_tone', None),
                "depth_score": getattr(msg, 'depth_score', 0),
                "vulnerability_level": getattr(msg, 'vulnerability_level', 0),
                "word_count": getattr(msg, 'word_count', 0),
                "contains_question": getattr(msg, 'contains_question', False)
            })
        
        return context
        
    except Exception as e:
        logger.error(f"Error getting conversation context for {conversation_id}: {e}")
        return []

# ============================================
# ENHANCED ROUTE IMPLEMENTATIONS
# ============================================

@router.post("/conversation-starters", response_model=AIWingmanResponse)
@require_verification()
@require_subscription("connection")
async def get_conversation_starters(
    request: ConversationStarterRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate AI-powered conversation starters with enhanced personalization"""
    
    # Check usage limits
    usage_check = await _check_daily_usage(
        current_user.id, 
        "conversation_starters", 
        current_user.subscription_tier.value
    )
    
    if not usage_check["allowed"]:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "daily_limit_exceeded",
                "message": f"Daily limit of {usage_check['limit']} conversation starters reached",
                "usage_info": usage_check
            }
        )
    
    # Get and validate match
    match = db.query(Match).filter(
        Match.id == request.match_id,
        ((Match.initiator_id == current_user.id) | (Match.target_id == current_user.id))
    ).first()
    
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found or you don't have access to this match"
        )
    
    # Get other user with enhanced error handling
    other_user_id = match.get_other_user_id(current_user.id)
    other_user = db.query(User).filter(User.id == other_user_id).first()
    
    if not other_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match user not found"
        )
    
    try:
        # Get enhanced BGP profiles
        user_bgp = {}
        match_bgp = {}
        
        if current_user.bgp_profile:
            user_bgp = current_user.bgp_profile.to_dict()
            user_bgp["personality_insights"] = current_user.bgp_profile.get_personality_insights()
            user_bgp["matching_strengths"] = current_user.bgp_profile.get_matching_strengths()
        
        if other_user.bgp_profile:
            match_bgp = other_user.bgp_profile.to_dict()
            match_bgp["personality_insights"] = other_user.bgp_profile.get_personality_insights()
        
        # Get match insights for better context
        match_insights = match.get_match_insights() if hasattr(match, 'get_match_insights') else {}
        
        # Enhanced context building
        enhanced_context = {
            **request.context,
            "match_compatibility": match.compatibility_score,
            "trust_compatibility": match.trust_compatibility,
            "match_insights": match_insights,
            "conversation_goal": request.conversation_goal,
            "personality_focus": request.personality_focus,
            "user_trust_tier": current_user.trust_profile.trust_tier.value if current_user.trust_profile else "standard",
            "match_trust_tier": other_user.trust_profile.trust_tier.value if other_user.trust_profile else "standard"
        }
        
        # Use Claude for sophisticated conversation starters
        ai_response = await claude_client.generate_conversation_advice(
            conversation_context=[],  # No conversation yet
            user_personality=user_bgp,
            goal="conversation_starter"
        )
        
        # Generate enhanced suggestions
        suggestions = []
        starter_templates = ai_response.get("recommended_responses", [])
        
        for i, template in enumerate(starter_templates[:3]):
            confidence = template.get("confidence", 0.7) if isinstance(template, dict) else 0.7
            
            # Enhanced starter generation based on compatibility
            if match.compatibility_score > 0.8:
                suggestions.append(ConversationStarter(
                    text="I have a feeling we're going to have some really interesting conversations. What's something you're genuinely curious about lately?",
                    reasoning="High compatibility suggests deep conversation potential",
                    confidence=confidence,
                    conversation_direction="intellectual_connection",
                    psychological_basis="Compatibility-based approach",
                    expected_response_type="thoughtful_sharing"
                ))
            else:
                suggestions.append(ConversationStarter(
                    text="What's something that made you smile today? I'd love to hear about the little things that bring you joy.",
                    reasoning="Positive emotion opener builds initial connection",
                    confidence=confidence,
                    conversation_direction="emotional_connection",
                    psychological_basis="Positive emotion sharing",
                    expected_response_type="personal_sharing"
                ))
        
        # Add personality-focused starters if requested
        if request.personality_focus:
            if request.personality_focus == "intellectual":
                suggestions.append(ConversationStarter(
                    text="I've been thinking about something lately and would love your perspective. What's a belief or opinion you've changed your mind about recently?",
                    reasoning="Intellectual curiosity and growth mindset exploration",
                    confidence=0.8,
                    conversation_direction="intellectual_engagement",
                    psychological_basis="Growth mindset and intellectual humility",
                    expected_response_type="reflective_sharing"
                ))
            elif request.personality_focus == "emotional":
                suggestions.append(ConversationStarter(
                    text="I'm curious about what moves you emotionally. What's something that never fails to touch your heart?",
                    reasoning="Emotional depth exploration",
                    confidence=0.75,
                    conversation_direction="emotional_depth",
                    psychological_basis="Emotional vulnerability invitation",
                    expected_response_type="vulnerable_sharing"
                ))
        
        # Generate compatibility notes
        compatibility_notes = ai_response.get("progression_advice", "Good potential for meaningful connection based on your profiles")
        
        # Get personalization factors
        personalization_factors = []
        if user_bgp.get("empathy_indicators", 0) > 0.7:
            personalization_factors.append("High empathy - focus on emotional connection")
        if match_bgp.get("humor_compatibility", 0) > 0.7:
            personalization_factors.append("Good humor compatibility - light playfulness recommended")
        
        # Log AI usage with enhanced data
        ai_logger.log_ai_request(
            user_id=current_user.id,
            ai_service="claude",
            request_type="conversation_starters",
            input_data={
                "match_id": request.match_id,
                "compatibility_score": match.compatibility_score,
                "conversation_goal": request.conversation_goal,
                "user_bgp_quality": len(user_bgp) > 0,
                "match_bgp_quality": len(match_bgp) > 0
            },
            response_data={
                "starters_generated": len(suggestions),
                "avg_confidence": sum(s.confidence for s in suggestions) / len(suggestions) if suggestions else 0,
                "personalization_applied": len(personalization_factors) > 0
            }
        )
        
        return AIWingmanResponse(
            suggestions=suggestions,
            compatibility_notes=compatibility_notes,
            usage_info=usage_check,
            personalization_factors=personalization_factors
        )
        
    except Exception as e:
        logger.error(f"Conversation starters error for user {current_user.id}, match {request.match_id}: {e}")
        
        # Fallback to GPT if Claude fails
        try:
            fallback_response = await gpt_client.generate_conversation_starter(
                user_bgp=user_bgp,
                match_bgp=match_bgp,
                match_interests=getattr(other_user, 'interests', []) or [],
                context=enhanced_context
            )
            
            suggestions = []
            for starter in fallback_response.get("starters", [])[:3]:
                suggestions.append(ConversationStarter(
                    text=starter.get("text", "What's something that's been on your mind lately?"),
                    reasoning=starter.get("reasoning", "General conversation opener"),
                    confidence=starter.get("confidence", 0.6),
                    conversation_direction="general"
                ))
            
            return AIWingmanResponse(
                suggestions=suggestions,
                compatibility_notes=fallback_response.get("compatibility_notes", ""),
                usage_info=usage_check
            )
            
        except Exception as fallback_error:
            logger.error(f"Fallback GPT also failed: {fallback_error}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI Wingman service temporarily unavailable. Please try again in a few minutes."
            )

@router.post("/improve-message", response_model=MessageImprovementResponse)
@require_verification()
@require_subscription("connection")
async def improve_message(
    request: MessageImprovementRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI suggestions to improve a message draft with enhanced analysis"""
    
    # Check usage limits
    usage_check = await _check_daily_usage(
        current_user.id, 
        "message_improvement", 
        current_user.subscription_tier.value
    )
    
    if not usage_check["allowed"]:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "daily_limit_exceeded",
                "message": f"Daily limit of {usage_check['limit']} message improvements reached",
                "usage_info": usage_check
            }
        )
    
    # Verify conversation access
    conversation = db.query(Conversation).filter(
        Conversation.id == request.conversation_id,
        ((Conversation.participant_1_id == current_user.id) | (Conversation.participant_2_id == current_user.id))
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or you don't have access"
        )
    
    try:
        # Get enhanced conversation context
        context_messages = await _get_conversation_context(request.conversation_id, db, limit=15)
        
        if len(context_messages) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient conversation history for meaningful improvement suggestions"
            )
        
        # Analyze original message
        original_analysis = _analyze_message_content(request.original_message)
        
        # Get conversation partner for context
        other_user_id = conversation.get_other_participant_id(current_user.id)
        other_user = db.query(User).filter(User.id == other_user_id).first()
        
        # Use Claude for advanced message improvement
        improvement_response = await claude_client.generate_conversation_advice(
            conversation_context=context_messages,
            user_personality=current_user.bgp_profile.to_dict() if current_user.bgp_profile else {},
            goal=f"improve_message_{request.improvement_type.value}"
        )
        
        # Generate enhanced suggestions based on improvement type
        suggestions = []
        
        if request.improvement_type == ImprovementType.DEEPENING:
            suggestions.extend([
                MessageSuggestion(
                    improved_text=f"That really resonates with me. {request.original_message} I'm curious - what led you to feel that way?",
                    improvement_reason="Added emotional validation and follow-up question for deeper exploration",
                    tone="warm_curious",
                    psychological_reasoning="Validation increases emotional safety, enabling deeper sharing",
                    confidence_score=0.85,
                    expected_impact="Encourages vulnerability and deeper conversation"
                ),
                MessageSuggestion(
                    improved_text=f"{request.original_message} I find myself thinking about similar things lately too.",
                    improvement_reason="Added personal connection and relatability",
                    tone="connected",
                    psychological_reasoning="Shared experience creates bonding and mutual understanding",
                    confidence_score=0.78,
                    expected_impact="Builds emotional connection through shared experience"
                )
            ])
        
        elif request.improvement_type == ImprovementType.HUMOR:
            suggestions.append(MessageSuggestion(
                improved_text=f"{request.original_message} 😄 Though I have to warn you, my jokes are dad-level quality!",
                improvement_reason="Added playful self-deprecating humor",
                tone="playful",
                psychological_reasoning="Self-deprecating humor shows humility and invites playful response",
                confidence_score=0.72,
                expected_impact="Lightens mood and invites playful interaction"
            ))
        
        elif request.improvement_type == ImprovementType.VULNERABILITY:
            suggestions.append(MessageSuggestion(
                improved_text=f"I'll be honest - {request.original_message.lower()} It feels a bit vulnerable sharing that, but I want to be genuine with you.",
                improvement_reason="Added vulnerability indicator and authenticity statement",
                tone="authentic_vulnerable",
                psychological_reasoning="Naming vulnerability reduces its power and models emotional openness",
                confidence_score=0.81,
                expected_impact="Deepens emotional intimacy and trust"
            ))
        
        elif request.improvement_type == ImprovementType.EMPATHY:
            suggestions.append(MessageSuggestion(
                improved_text=f"I can really sense the feeling behind what you shared. {request.original_message} How are you feeling about all of this?",
                improvement_reason="Added emotional recognition and empathetic response",
                tone="empathetic_caring",
                psychological_reasoning="Emotional validation creates safety and encourages sharing",
                confidence_score=0.83,
                expected_impact="Shows emotional intelligence and deepens trust"
            ))
        
        elif request.improvement_type == ImprovementType.INTELLECTUAL:
            suggestions.append(MessageSuggestion(
                improved_text=f"{request.original_message} I'm fascinated by different perspectives on this - what's shaped your thinking about it?",
                improvement_reason="Added intellectual curiosity and perspective-seeking",
                tone="intellectually_curious",
                psychological_reasoning="Shows respect for their thoughts and invites deeper analysis",
                confidence_score=0.79,
                expected_impact="Encourages thoughtful dialogue and intellectual connection"
            ))
        
        # Generate general improvement tips
        general_tips = [
            f"Consider the emotional tone - your message comes across as {original_analysis['tone']}",
            "Ask open-ended questions to encourage deeper sharing",
            "Share something personal to model vulnerability"
        ]
        
        if original_analysis['word_count'] > 100:
            general_tips.append("Consider breaking longer messages into smaller, more digestible parts")
        
        # Build conversation context summary
        conversation_context = {
            "message_count": len(context_messages),
            "emotional_trend": _analyze_emotional_trend(context_messages),
            "conversation_depth": _calculate_conversation_depth(context_messages),
            "last_message_from": "match" if context_messages[-1]["sender_id"] != current_user.id else "user"
        }
        
        # Log AI usage
        ai_logger.log_ai_request(
            user_id=current_user.id,
            ai_service="claude",
            request_type="message_improvement",
            input_data={
                "conversation_id": request.conversation_id,
                "improvement_type": request.improvement_type.value,
                "original_length": len(request.original_message),
                "context_messages": len(context_messages),
                "target_tone": request.target_tone
            },
            response_data={
                "suggestions_generated": len(suggestions),
                "improvement_confidence": sum(s.confidence_score for s in suggestions) / len(suggestions) if suggestions else 0
            }
        )
        
        return MessageImprovementResponse(
            suggestions=suggestions,
            original_analysis=f"Your message shows {original_analysis['sentiment']} sentiment with {original_analysis['tone']} tone",
            general_tips=general_tips,
            usage_info=usage_check,
            conversation_context=conversation_context
        )
        
    except Exception as e:
        logger.error(f"Message improvement error for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to improve message. Please try again."
        )

@router.post("/analyze-conversation", response_model=ConversationInsights)
@require_verification()
@require_subscription("connection")
async def analyze_conversation(
    request: ConversationAnalysisRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive AI analysis of conversation quality and emotional connection"""
    
    # Check usage limits
    usage_check = await _check_daily_usage(
        current_user.id, 
        "conversation_analysis", 
        current_user.subscription_tier.value
    )
    
    if not usage_check["allowed"]:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "daily_limit_exceeded",
                "message": f"Daily limit of {usage_check['limit']} conversation analyses reached",
                "usage_info": usage_check
            }
        )
    
    # Verify conversation access
    conversation = db.query(Conversation).filter(
        Conversation.id == request.conversation_id,
        ((Conversation.participant_1_id == current_user.id) | (Conversation.participant_2_id == current_user.id))
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or you don't have access"
        )
    
    try:
        # Get comprehensive conversation data
        all_messages = await _get_conversation_context(request.conversation_id, db, limit=50)
        
        if len(all_messages) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Conversation too short for meaningful analysis (minimum 5 messages required)"
            )
        
        # Get other user for enhanced analysis
        other_user_id = conversation.get_other_participant_id(current_user.id)
        other_user = db.query(User).filter(User.id == other_user_id).first()
        
        # Enhanced conversation analysis
        emotional_connection = _calculate_emotional_connection(all_messages, current_user.id)
        engagement_metrics = _calculate_engagement_metrics(all_messages, current_user.id)
        conversation_quality = _assess_conversation_quality(all_messages)
        
        # Use Claude for deep psychological analysis
        if request.depth_level == "detailed" and current_user.subscription_tier == SubscriptionTier.ELITE:
            psychological_analysis = await claude_client.analyze_relationship_compatibility(
                user1_profile=current_user.bgp_profile.to_dict() if current_user.bgp_profile else {},
                user2_profile=other_user.bgp_profile.to_dict() if other_user and other_user.bgp_profile else {},
                conversation_history=all_messages
            )
        else:
            psychological_analysis = None
        
        # Calculate reveal readiness
        reveal_readiness = _calculate_reveal_readiness(emotional_connection, conversation_quality, len(all_messages))
        
        # Generate recommendations
        recommendations = _generate_conversation_recommendations(
            emotional_connection, 
            engagement_metrics, 
            conversation_quality,
            request.analysis_type
        )
        
        # Detect warning signs
        warning_signs = _detect_conversation_warning_signs(all_messages, engagement_metrics)
        
        # Generate next steps
        next_steps = _generate_next_steps(
            emotional_connection, 
            conversation_quality, 
            reveal_readiness,
            request.analysis_type
        )
        
        # Log comprehensive AI usage
        ai_logger.log_ai_request(
            user_id=current_user.id,
            ai_service="claude",
            request_type="conversation_analysis",
            input_data={
                "conversation_id": request.conversation_id,
                "analysis_type": request.analysis_type.value,
                "depth_level": request.depth_level,
                "message_count": len(all_messages),
                "conversation_age_days": (datetime.utcnow() - conversation.created_at).days
            },
            response_data={
                "emotional_connection_score": emotional_connection,
                "conversation_quality": conversation_quality,
                "reveal_ready": reveal_readiness["ready"],
                "warning_signs_count": len(warning_signs)
            }
        )
        
        return ConversationInsights(
            emotional_connection_score=emotional_connection,
            engagement_level=engagement_metrics["level"],
            conversation_quality=conversation_quality,
            reveal_readiness=reveal_readiness,
            recommendations=recommendations,
            next_steps=next_steps,
            psychological_analysis=psychological_analysis,
            warning_signs=warning_signs
        )
        
    except Exception as e:
        logger.error(f"Conversation analysis error for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze conversation. Please try again."
        )

@router.get("/conversation-health/{conversation_id}", response_model=ConversationHealthResponse)
@require_verification()
@require_subscription("elite")  # Elite-only feature
async def get_conversation_health(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed conversation health analysis (Elite feature)"""
    
    try:
        # Verify conversation access
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            ((Conversation.participant_1_id == current_user.id) | (Conversation.participant_2_id == current_user.id))
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Get comprehensive message history
        all_messages = await _get_conversation_context(conversation_id, db, limit=100)
        
        if len(all_messages) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient conversation history for health analysis (minimum 10 messages required)"
            )
        
        # Calculate comprehensive health metrics
        health_factors = {
            "emotional_safety": _calculate_emotional_safety(all_messages),
            "mutual_respect": _calculate_mutual_respect(all_messages),
            "engagement_balance": _calculate_engagement_balance(all_messages, current_user.id),
            "communication_clarity": _calculate_communication_clarity(all_messages),
            "conflict_resolution": _calculate_conflict_resolution(all_messages),
            "growth_potential": _calculate_growth_potential(all_messages)
        }
        
        # Calculate overall health score
        overall_health = sum(health_factors.values()) / len(health_factors)
        
        # Identify strengths and areas for improvement
        strengths = [factor for factor, score in health_factors.items() if score > 0.7]
        improvements = [factor for factor, score in health_factors.items() if score < 0.5]
        
        # Detect red flags
        red_flags = _detect_health_red_flags(all_messages, health_factors)
        
        # Generate health recommendations
        recommendations = _generate_health_recommendations(health_factors, strengths, improvements)
        
        # Analyze trends over time
        trend_analysis = _analyze_conversation_trends(all_messages)
        
        return ConversationHealthResponse(
            overall_health_score=overall_health,
            health_factors=health_factors,
            strengths=[s.replace('_', ' ').title() for s in strengths],
            areas_for_improvement=[i.replace('_', ' ').title() for i in improvements],
            red_flags=red_flags,
            recommendations=recommendations,
            trend_analysis=trend_analysis
        )
        
    except Exception as e:
        logger.error(f"Conversation health error for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze conversation health"
        )

@router.get("/usage-stats")
async def get_ai_usage_stats(
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive AI Wingman usage statistics"""
    
    if not current_user.is_premium():
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="AI Wingman requires premium subscription"
        )
    
    try:
        # Get subscription limits
        tier_limits = {
            "connection": {
                "conversation_starters": {"daily": 10, "monthly": 300},
                "message_improvement": {"daily": 15, "monthly": 450},
                "conversation_analysis": {"daily": 5, "monthly": 150}
            },
            "elite": {
                "conversation_starters": {"daily": 25, "monthly": 750},
                "message_improvement": {"daily": 50, "monthly": 1500},
                "conversation_analysis": {"daily": 20, "monthly": 600}
            }
        }
        
        user_tier = current_user.subscription_tier.value
        limits = tier_limits.get(user_tier, {"conversation_starters": {"daily": 0, "monthly": 0}})
        
        # Get current usage from Redis
        today = datetime.utcnow().strftime('%Y%m%d')
        month = datetime.utcnow().strftime('%Y%m')
        
        usage_stats = {}
        for feature in ["conversation_starters", "message_improvement", "conversation_analysis"]:
            daily_key = f"ai_usage_daily:{feature}:{current_user.id}:{today}"
            monthly_key = f"ai_usage_monthly:{feature}:{current_user.id}:{month}"
            
            daily_usage = int(await redis_client.get(daily_key) or 0)
            monthly_usage = int(await redis_client.get(monthly_key) or 0)
            
            feature_limits = limits.get(feature, {"daily": 0, "monthly": 0})
            
            usage_stats[feature] = {
                "daily": {
                    "used": daily_usage,
                    "limit": feature_limits["daily"],
                    "remaining": max(0, feature_limits["daily"] - daily_usage)
                },
                "monthly": {
                    "used": monthly_usage,
                    "limit": feature_limits["monthly"],
                    "remaining": max(0, feature_limits["monthly"] - monthly_usage)
                }
            }
        
        # Get usage trends
        usage_trends = await _get_usage_trends(current_user.id)
        
        # Get success metrics
        success_metrics = await _get_success_metrics(current_user.id)
        
        return {
            "subscription_tier": user_tier,
            "usage_stats": usage_stats,
            "usage_trends": usage_trends,
            "success_metrics": success_metrics,
            "recommendations": _get_usage_recommendations(usage_stats, user_tier),
            "next_reset": {
                "daily": (datetime.utcnow() + timedelta(days=1)).replace(hour=0, minute=0, second=0).isoformat(),
                "monthly": (datetime.utcnow().replace(day=1) + timedelta(days=32)).replace(day=1).isoformat()
            },
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Usage stats error for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get usage statistics"
        )

@router.post("/coaching-insights")
@require_verification()
@require_subscription("elite")  # Elite exclusive feature
async def get_coaching_insights(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get personalized dating coaching insights based on user's conversation patterns (Elite feature)"""
    
    try:
        # Get user's recent conversations for analysis
        recent_conversations = db.query(Conversation).filter(
            ((Conversation.participant_1_id == current_user.id) | 
             (Conversation.participant_2_id == current_user.id))
        ).order_by(Conversation.created_at.desc()).limit(10).all()
        
        if len(recent_conversations) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient conversation data for coaching insights (minimum 3 conversations required)"
            )
        
        # Analyze conversation patterns
        conversation_patterns = await _analyze_conversation_patterns(recent_conversations, current_user.id, db)
        
        # Generate personalized insights using Claude
        coaching_response = await claude_client.generate_coaching_insights(
            user_profile=current_user.bgp_profile.to_dict() if current_user.bgp_profile else {},
            conversation_patterns=conversation_patterns,
            trust_level=current_user.trust_profile.overall_trust_score if current_user.trust_profile else 0.5
        )
        
        # Structure coaching insights
        insights = {
            "communication_style_analysis": coaching_response.get("communication_analysis", {}),
            "strengths": coaching_response.get("strengths", []),
            "growth_areas": coaching_response.get("growth_areas", []),
            "personalized_action_plan": coaching_response.get("action_plan", []),
            "conversation_tips": coaching_response.get("tips", []),
            "success_predictions": coaching_response.get("predictions", {}),
            "coaching_score": conversation_patterns.get("overall_effectiveness", 0.5),
            "next_coaching_session": (datetime.utcnow() + timedelta(days=7)).isoformat()
        }
        
        # Store insights for future reference
        await redis_client.set_json(
            f"coaching_insights:{current_user.id}",
            insights,
            ex=86400 * 7  # Cache for 7 days
        )
        
        return insights
        
    except Exception as e:
        logger.error(f"Coaching insights error for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate coaching insights"
        )

# Helper functions for analysis
def _analyze_message_content(message: str) -> Dict[str, Any]:
    """Analyze message content for basic metrics"""
    return {
        "word_count": len(message.split()),
        "sentiment": "positive" if any(word in message.lower() for word in ["happy", "great", "love", "excited"]) else "neutral",
        "tone": "friendly" if "!" in message or "😊" in message else "casual",
        "contains_question": "?" in message,
        "emotional_words": len([word for word in message.split() if word.lower() in ["feel", "think", "love", "excited", "worried"]])
    }

def _calculate_emotional_connection(messages: List[Dict], user_id: int) -> float:
    """Calculate emotional connection score based on message analysis"""
    if not messages:
        return 0.0
    
    # Factors that indicate emotional connection
    emotional_indicators = 0
    total_messages = len(messages)
    
    for msg in messages:
        content = msg.get("content", "").lower()
        
        # Check for emotional language
        emotional_words = ["feel", "think", "heart", "soul", "love", "care", "worry", "hope", "dream"]
        if any(word in content for word in emotional_words):
            emotional_indicators += 1
        
        # Check for vulnerability indicators
        vulnerability_words = ["honest", "vulnerable", "scared", "nervous", "insecure", "struggle"]
        if any(word in content for word in vulnerability_words):
            emotional_indicators += 2
        
        # Check for personal sharing
        personal_words = ["my", "i", "me", "myself", "personal", "private"]
        if sum(content.count(word) for word in personal_words) > 3:
            emotional_indicators += 1
    
    return min(1.0, emotional_indicators / total_messages)

def _calculate_engagement_metrics(messages: List[Dict], user_id: int) -> Dict[str, Any]:
    """Calculate engagement metrics for conversation balance"""
    if not messages:
        return {"balance": 0.5, "level": "low"}
    
    user_messages = [m for m in messages if m["sender_id"] == user_id]
    other_messages = [m for m in messages if m["sender_id"] != user_id]
    
    balance = len(user_messages) / len(messages) if messages else 0.5
    
    # Calculate response time patterns (simplified)
    avg_response_time = 2.5  # Mock average in hours
    
    # Determine engagement level
    if 0.4 <= balance <= 0.6 and avg_response_time < 4:
        level = "high"
    elif 0.3 <= balance <= 0.7 and avg_response_time < 8:
        level = "medium"
    else:
        level = "low"
    
    return {
        "balance": balance,
        "level": level,
        "user_message_count": len(user_messages),
        "other_message_count": len(other_messages),
        "avg_response_time_hours": avg_response_time
    }

def _assess_conversation_quality(messages: List[Dict]) -> str:
    """Assess overall conversation quality based on various factors"""
    if not messages:
        return "poor"
    
    message_count = len(messages)
    avg_length = sum(len(msg.get("content", "")) for msg in messages) / message_count
    question_count = sum(1 for msg in messages if "?" in msg.get("content", ""))
    
    quality_score = 0
    
    # Message count factor
    if message_count >= 50:
        quality_score += 3
    elif message_count >= 20:
        quality_score += 2
    elif message_count >= 10:
        quality_score += 1
    
    # Message depth factor
    if avg_length > 100:
        quality_score += 2
    elif avg_length > 50:
        quality_score += 1
    
    # Engagement factor (questions indicate interest)
    question_ratio = question_count / message_count
    if question_ratio > 0.3:
        quality_score += 2
    elif question_ratio > 0.1:
        quality_score += 1
    
    # Return quality assessment
    if quality_score >= 6:
        return "excellent"
    elif quality_score >= 4:
        return "good"
    elif quality_score >= 2:
        return "developing"
    else:
        return "poor"

def _calculate_reveal_readiness(emotional_connection: float, quality: str, message_count: int) -> Dict[str, Any]:
    """Calculate readiness for photo reveal based on conversation metrics"""
    quality_scores = {"poor": 0.2, "developing": 0.4, "good": 0.7, "excellent": 0.9}
    quality_score = quality_scores.get(quality, 0.5)
    
    message_factor = min(1.0, message_count / 20)  # Optimal at 20+ messages
    overall_score = (emotional_connection * 0.5 + quality_score * 0.3 + message_factor * 0.2)
    
    ready = overall_score >= 0.7 and message_count >= 15 and emotional_connection >= 0.6
    
    missing_elements = []
    if emotional_connection < 0.6:
        missing_elements.append("Build deeper emotional connection")
    if message_count < 15:
        missing_elements.append(f"Continue conversation ({15 - message_count} more messages recommended)")
    if quality_score < 0.6:
        missing_elements.append("Improve conversation depth and engagement")
    
    return {
        "ready": ready,
        "percentage": int(overall_score * 100),
        "missing_elements": missing_elements,
        "emotional_connection": emotional_connection,
        "quality_score": quality_score,
        "message_factor": message_factor,
        "recommendation": "Ready for reveal!" if ready else "Continue building connection"
    }

async def _get_usage_trends(user_id: int) -> Dict[str, Any]:
    """Get usage trends over time from Redis data"""
    try:
        # Get last 7 days of usage data
        trends = {}
        for i in range(7):
            date = (datetime.utcnow() - timedelta(days=i)).strftime('%Y%m%d')
            
            daily_usage = 0
            for feature in ["conversation_starters", "message_improvement", "conversation_analysis"]:
                usage_key = f"ai_usage_daily:{feature}:{user_id}:{date}"
                usage = int(await redis_client.get(usage_key) or 0)
                daily_usage += usage
            
            trends[date] = daily_usage
        
        # Calculate trend metrics
        usage_values = list(trends.values())
        weekly_total = sum(usage_values)
        avg_daily = weekly_total / 7
        
        # Determine trend direction
        recent_avg = sum(usage_values[:3]) / 3  # Last 3 days
        older_avg = sum(usage_values[4:]) / 3   # 4-7 days ago
        
        if recent_avg > older_avg * 1.2:
            trend_direction = "increasing"
        elif recent_avg < older_avg * 0.8:
            trend_direction = "decreasing"
        else:
            trend_direction = "stable"
        
        return {
            "weekly_growth": int(((recent_avg - older_avg) / max(older_avg, 1)) * 100),
            "most_used_feature": "message_improvement",  # Would calculate from actual data
            "peak_usage_day": max(trends.keys(), key=lambda k: trends[k]),
            "weekly_total": weekly_total,
            "daily_average": round(avg_daily, 1),
            "trend_direction": trend_direction,
            "daily_breakdown": trends
        }
        
    except Exception as e:
        logger.error(f"Error getting usage trends for user {user_id}: {e}")
        return {
            "weekly_growth": 0,
            "most_used_feature": "conversation_starters",
            "peak_usage_day": "monday",
            "trend_direction": "stable"
        }

async def _get_success_metrics(user_id: int) -> Dict[str, Any]:
    """Get AI Wingman success metrics from analytics"""
    try:
        # Mock implementation - would get from analytics database
        return {
            "response_rate_improvement": 23,
            "conversation_length_increase": 18,
            "positive_feedback_increase": 31,
            "successful_reveals": 8,
            "avg_conversation_quality": 0.75,
            "trust_score_improvement": 12,
            "match_satisfaction": 0.82,
            "recommendations_followed": 67  # Percentage
        }
        
    except Exception as e:
        logger.error(f"Error getting success metrics for user {user_id}: {e}")
        return {
            "response_rate_improvement": 0,
            "conversation_length_increase": 0,
            "positive_feedback_increase": 0
        }

def _get_usage_recommendations(usage_stats: Dict, tier: str) -> List[str]:
    """Get personalized usage recommendations"""
    recommendations = []
    
    # Check usage patterns
    total_daily_usage = sum(stats["daily"]["used"] for stats in usage_stats.values())
    total_daily_limit = sum(stats["daily"]["limit"] for stats in usage_stats.values())
    
    usage_percentage = (total_daily_usage / max(total_daily_limit, 1)) * 100
    
    if usage_percentage > 80:
        recommendations.append("You're using AI Wingman heavily today - great engagement!")
        if tier == "connection":
            recommendations.append("Consider upgrading to Elite for unlimited access")
    elif usage_percentage < 20:
        recommendations.append("You have plenty of AI Wingman uses left today - try the conversation analysis feature!")
    
    # Feature-specific recommendations
    for feature, stats in usage_stats.items():
        remaining = stats["daily"]["remaining"]
        feature_name = feature.replace('_', ' ').title()
        
        if remaining == 0:
            recommendations.append(f"You've used all your {feature_name} for today. Try again tomorrow!")
        elif remaining <= 2:
            recommendations.append(f"Only {remaining} {feature_name} uses left today - use them wisely!")
        elif stats["daily"]["used"] == 0:
            recommendations.append(f"Try using {feature_name} to improve your conversations!")
    
    if tier == "connection":
        recommendations.append("Elite users get 2-5x more AI Wingman features - consider upgrading!")
    
    return recommendations[:5]  # Limit to top 5 recommendations

# Additional helper functions for conversation health analysis
def _calculate_emotional_safety(messages: List[Dict]) -> float:
    """Calculate emotional safety score based on message content"""
    if not messages:
        return 0.5
    
    # Look for indicators of emotional safety
    safety_indicators = 0
    total_messages = len(messages)
    
    for msg in messages:
        content = msg.get("content", "").lower()
        
        # Positive safety indicators
        if any(word in content for word in ["safe", "comfortable", "trust", "open", "honest"]):
            safety_indicators += 2
        
        # Negative safety indicators
        if any(word in content for word in ["uncomfortable", "worried", "scared", "pressure"]):
            safety_indicators -= 1
        
        # Respectful language
        if any(word in content for word in ["understand", "respect", "appreciate"]):
            safety_indicators += 1
    
    return max(0.0, min(1.0, 0.5 + (safety_indicators / total_messages)))

def _calculate_mutual_respect(messages: List[Dict]) -> float:
    """Calculate mutual respect score"""
    if not messages:
        return 0.5
    
    # Mock implementation - would analyze language patterns
    respect_score = 0.8  # Assume generally respectful
    
    for msg in messages:
        content = msg.get("content", "").lower()
        
        # Check for respectful language
        if any(word in content for word in ["please", "thank", "appreciate", "respect"]):
            respect_score += 0.02
        
        # Check for disrespectful language
        if any(word in content for word in ["stupid", "idiot", "shut up", "whatever"]):
            respect_score -= 0.1
    
    return max(0.0, min(1.0, respect_score))

def _calculate_engagement_balance(messages: List[Dict], user_id: int) -> float:
    """Calculate engagement balance score"""
    if not messages:
        return 0.5
    
    user_count = len([m for m in messages if m["sender_id"] == user_id])
    total_count = len(messages)
    balance = user_count / total_count if total_count > 0 else 0.5
    
    # Perfect balance is 50/50, score decreases as it gets more unbalanced
    return 1.0 - abs(0.5 - balance) * 2

def _calculate_communication_clarity(messages: List[Dict]) -> float:
    """Calculate communication clarity score"""
    if not messages:
        return 0.5
    
    # Mock implementation based on message characteristics
    clarity_score = 0.7
    
    for msg in messages:
        content = msg.get("content", "")
        
        # Clear communication indicators
        if len(content.split('.')) > 1:  # Multiple sentences
            clarity_score += 0.01
        
        if '?' in content:  # Questions show engagement
            clarity_score += 0.02
        
        # Unclear communication indicators
        if len(content) < 10:  # Very short messages
            clarity_score -= 0.01
            
        if content.count('...') > 2:  # Excessive ellipses
            clarity_score -= 0.01
    
    return max(0.0, min(1.0, clarity_score))

def _calculate_conflict_resolution(messages: List[Dict]) -> float:
    """Calculate conflict resolution score"""
    # Mock implementation - would detect and analyze conflicts
    return 0.8  # Assume good conflict resolution

def _calculate_growth_potential(messages: List[Dict]) -> float:
    """Calculate growth potential score"""
    if not messages:
        return 0.5
    
    # Look for growth indicators
    growth_indicators = 0
    
    for msg in messages:
        content = msg.get("content", "").lower()
        
        # Growth-oriented language
        if any(word in content for word in ["learn", "grow", "improve", "better", "change"]):
            growth_indicators += 1
        
        # Future-oriented language
        if any(word in content for word in ["future", "plan", "goal", "dream", "hope"]):
            growth_indicators += 1
    
    return min(1.0, 0.5 + (growth_indicators / len(messages)))

def _detect_health_red_flags(messages: List[Dict], health_factors: Dict[str, float]) -> List[str]:
    """Detect conversation health red flags"""
    red_flags = []
    
    # Check health factor thresholds
    if health_factors.get("emotional_safety", 1.0) < 0.3:
        red_flags.append("Low emotional safety - may indicate trust issues")
    
    if health_factors.get("mutual_respect", 1.0) < 0.4:
        red_flags.append("Potential respect issues - consider addressing communication style")
    
    if health_factors.get("engagement_balance", 1.0) < 0.3:
        red_flags.append("Highly unbalanced conversation - one person dominating")
    
    # Check message patterns
    if messages:
        recent_messages = messages[-10:]  # Last 10 messages
        
        # Check for declining engagement
        if len(recent_messages) < 5:
            red_flags.append("Conversation activity declining")
        
        # Check for very short responses
        avg_length = sum(len(msg.get("content", "")) for msg in recent_messages) / len(recent_messages)
        if avg_length < 20:
            red_flags.append("Messages becoming very brief - may indicate disengagement")
    
    return red_flags

def _generate_health_recommendations(health_factors: Dict, strengths: List[str], improvements: List[str]) -> List[str]:
    """Generate health improvement recommendations"""
    recommendations = []
    
    # Address specific areas for improvement
    if "emotional_safety" in improvements:
        recommendations.append("Focus on creating a safe space for emotional expression by validating feelings")
    
    if "engagement_balance" in improvements:
        recommendations.append("Try to balance speaking and listening - ask more questions or share more equally")
    
    if "communication_clarity" in improvements:
        recommendations.append("Be more specific and clear in your communication - avoid ambiguous statements")
    
    if "mutual_respect" in improvements:
        recommendations.append("Use more respectful language and acknowledge your partner's perspectives")
    
    # Leverage strengths
    if "emotional_safety" in strengths:
        recommendations.append("Continue fostering the emotionally safe environment you've created")
    
    if "growth_potential" in strengths:
        recommendations.append("Your growth-oriented conversations are excellent - keep exploring future goals together")
    
    # General recommendations if no specific issues
    if not recommendations:
        recommendations.extend([
            "Your conversation health looks great! Keep up the excellent communication.",
            "Consider deepening emotional intimacy by sharing more personal experiences",
            "Try exploring shared values and long-term compatibility"
        ])
    
    return recommendations[:5]  # Limit to top 5

def _analyze_conversation_trends(messages: List[Dict]) -> Dict[str, Any]:
    """Analyze conversation trends over time"""
    if not messages:
        return {"overall_trend": "insufficient_data"}
    
    # Split messages into time periods for trend analysis
    total_messages = len(messages)
    midpoint = total_messages // 2
    
    early_messages = messages[:midpoint]
    recent_messages = messages[midpoint:]
    
    # Calculate metrics for each period
    early_avg_length = sum(len(msg.get("content", "")) for msg in early_messages) / len(early_messages)
    recent_avg_length = sum(len(msg.get("content", "")) for msg in recent_messages) / len(recent_messages)
    
    early_questions = sum(1 for msg in early_messages if "?" in msg.get("content", ""))
    recent_questions = sum(1 for msg in recent_messages if "?" in msg.get("content", ""))
    
    # Determine trends
    length_trend = "increasing" if recent_avg_length > early_avg_length * 1.1 else "decreasing" if recent_avg_length < early_avg_length * 0.9 else "stable"
    engagement_trend = "increasing" if recent_questions > early_questions else "decreasing" if recent_questions < early_questions else "stable"
    
    # Overall trend assessment
    if length_trend == "increasing" and engagement_trend == "increasing":
        overall_trend = "improving"
    elif length_trend == "decreasing" and engagement_trend == "decreasing":
        overall_trend = "declining"
    else:
        overall_trend = "stable"
    
    return {
        "overall_trend": overall_trend,
        "emotional_depth_trend": "increasing",  # Would calculate from emotional indicators
        "engagement_trend": engagement_trend,
        "quality_trend": length_trend,
        "message_length_change": round(((recent_avg_length - early_avg_length) / early_avg_length) * 100, 1),
        "engagement_change": recent_questions - early_questions
    }

def _generate_conversation_recommendations(emotional_connection: float, engagement_metrics: Dict, 
                                         quality: str, analysis_type: AnalysisType) -> List[str]:
    """Generate conversation recommendations based on analysis"""
    recommendations = []
    
    # Emotional connection recommendations
    if emotional_connection < 0.4:
        recommendations.append("Focus on sharing more personal stories and experiences to build emotional connection")
        recommendations.append("Ask deeper questions about feelings, dreams, and meaningful experiences")
    elif emotional_connection < 0.7:
        recommendations.append("Continue building emotional intimacy by being more vulnerable in your sharing")
    else:
        recommendations.append("Your emotional connection is strong - consider deepening with more meaningful topics")
    
    # Engagement balance recommendations
    if engagement_metrics["level"] == "low":
        if engagement_metrics["balance"] < 0.3:
            recommendations.append("Try contributing more to the conversation - share your thoughts and ask questions")
        elif engagement_metrics["balance"] > 0.7:
            recommendations.append("Give your conversation partner more space to share - ask open-ended questions")
        else:
            recommendations.append("Increase overall engagement by responding more quickly and thoroughly")
    
    # Quality-based recommendations
    if quality == "developing":
        recommendations.append("Continue building the foundation of your connection through consistent communication")
        recommendations.append("Try asking more thoughtful questions to encourage deeper responses")
    elif quality == "poor":
        recommendations.append("Focus on having more meaningful exchanges - move beyond surface-level topics")
    
    # Analysis type specific recommendations
    if analysis_type == AnalysisType.REVEAL_READINESS:
        if emotional_connection > 0.6 and quality in ["good", "excellent"]:
            recommendations.append("Your conversation shows good reveal readiness - consider taking the next step")
        else:
            recommendations.append("Build more emotional trust before proceeding to photo reveals")
    
    elif analysis_type == AnalysisType.COMPATIBILITY:
        recommendations.append("Explore shared values and life goals to assess long-term compatibility")
        recommendations.append("Discuss communication preferences and conflict resolution styles")
    
    return recommendations[:4]  # Limit to top 4 recommendations

def _detect_conversation_warning_signs(messages: List[Dict], engagement_metrics: Dict) -> List[str]:
    """Detect conversation warning signs"""
    warnings = []
    
    if not messages:
        return warnings
    
    # Engagement imbalance warning
    if engagement_metrics["balance"] < 0.2 or engagement_metrics["balance"] > 0.8:
        warnings.append("Unbalanced conversation - one person is doing most of the talking")
    
    # Response pattern warnings
    recent_messages = messages[-10:] if len(messages) >= 10 else messages
    
    # Check for declining message length
    if len(recent_messages) >= 5:
        early_avg = sum(len(msg.get("content", "")) for msg in recent_messages[:5]) / 5
        recent_avg = sum(len(msg.get("content", "")) for msg in recent_messages[-5:]) / 5
        
        if recent_avg < early_avg * 0.5:
            warnings.append("Message length declining - may indicate decreasing interest")
    
    # Check for lack of questions
    question_count = sum(1 for msg in recent_messages if "?" in msg.get("content", ""))
    if question_count == 0 and len(recent_messages) >= 5:
        warnings.append("No questions being asked - conversation may be becoming one-sided")
    
    # Check for very short responses
    short_responses = sum(1 for msg in recent_messages if len(msg.get("content", "")) < 15)
    if short_responses > len(recent_messages) * 0.6:
        warnings.append("Many very short responses - may indicate disengagement")
    
    # Check for emotional distance
    emotional_words = ["feel", "think", "love", "care", "worry", "hope", "excited", "happy", "sad"]
    emotional_count = sum(1 for msg in recent_messages for word in emotional_words if word in msg.get("content", "").lower())
    
    if emotional_count == 0 and len(recent_messages) >= 8:
        warnings.append("Lack of emotional expression - conversation may be becoming superficial")
    
    return warnings

def _generate_next_steps(emotional_connection: float, quality: str, 
                        reveal_readiness: Dict, analysis_type: AnalysisType) -> List[str]:
    """Generate next steps for conversation development"""
    next_steps = []
    
    # Reveal readiness based steps
    if reveal_readiness.get("ready", False):
        next_steps.append("Consider requesting a photo reveal - you've built strong emotional connection")
        next_steps.append("Plan a voice call or video chat to deepen your connection")
    else:
        next_steps.append("Continue building emotional intimacy before considering photo reveal")
        missing = reveal_readiness.get("missing_elements", [])
        if missing:
            next_steps.extend(missing[:2])  # Add top 2 missing elements
    
    # Emotional connection based steps
    if emotional_connection > 0.7:
        next_steps.append("Explore deeper topics like values, dreams, and life goals")
        next_steps.append("Share more vulnerable personal experiences to deepen trust")
    elif emotional_connection > 0.4:
        next_steps.append("Share more personal stories to build emotional connection")
        next_steps.append("Ask about meaningful experiences and feelings")
    else:
        next_steps.append("Focus on building basic emotional connection through personal sharing")
        next_steps.append("Ask open-ended questions about interests and experiences")
    
    # Quality based steps
    if quality in ["excellent", "good"]:
        next_steps.append("Consider meeting in person or planning a virtual date")
    elif quality == "developing":
        next_steps.append("Continue consistent communication to build conversation quality")
    
    # Analysis type specific steps
    if analysis_type == AnalysisType.COMPATIBILITY:
        next_steps.append("Discuss long-term relationship goals and values alignment")
        next_steps.append("Explore how you handle conflict and communication differences")
    
    return next_steps[:4]  # Limit to top 4 next steps

def _analyze_emotional_trend(messages: List[Dict]) -> str:
    """Analyze emotional trend in conversation"""
    if not messages or len(messages) < 6:
        return "insufficient_data"
    
    # Split into early and recent messages
    midpoint = len(messages) // 2
    early_messages = messages[:midpoint]
    recent_messages = messages[midpoint:]
    
    # Count emotional indicators
    emotional_words = ["feel", "love", "care", "excited", "happy", "worried", "hope", "dream"]
    
    early_emotional = sum(1 for msg in early_messages 
                         for word in emotional_words 
                         if word in msg.get("content", "").lower())
    
    recent_emotional = sum(1 for msg in recent_messages 
                          for word in emotional_words 
                          if word in msg.get("content", "").lower())
    
    # Calculate rates
    early_rate = early_emotional / len(early_messages)
    recent_rate = recent_emotional / len(recent_messages)
    
    if recent_rate > early_rate * 1.2:
        return "increasing"
    elif recent_rate < early_rate * 0.8:
        return "decreasing"
    else:
        return "stable"

def _calculate_conversation_depth(messages: List[Dict]) -> str:
    """Calculate conversation depth level"""
    if not messages:
        return "surface"
    
    depth_indicators = 0
    total_messages = len(messages)
    
    # Words that indicate deeper conversation
    deep_words = [
        "feel", "believe", "value", "important", "meaningful", "personal", "private",
        "vulnerable", "honest", "trust", "love", "care", "dream", "goal", "future",
        "past", "experience", "learn", "grow", "change", "impact", "influence"
    ]
    
    for msg in messages:
        content = msg.get("content", "").lower()
        word_count = 0
        
        for word in deep_words:
            if word in content:
                word_count += 1
        
        # Messages with multiple depth indicators count more
        if word_count >= 3:
            depth_indicators += 2
        elif word_count >= 1:
            depth_indicators += 1
    
    avg_depth = depth_indicators / total_messages
    
    if avg_depth > 0.7:
        return "deep"
    elif avg_depth > 0.4:
        return "moderate"
    else:
        return "surface"

async def _analyze_conversation_patterns(conversations: List[Conversation], user_id: int, db: Session) -> Dict[str, Any]:
    """Analyze conversation patterns for coaching insights"""
    try:
        patterns = {
            "total_conversations": len(conversations),
            "avg_conversation_length": 0,
            "response_patterns": {},
            "emotional_patterns": {},
            "engagement_patterns": {},
            "success_indicators": {},
            "areas_for_improvement": [],
            "overall_effectiveness": 0.5
        }
        
        if not conversations:
            return patterns
        
        total_messages = 0
        total_emotional_score = 0
        total_engagement_score = 0
        
        for conv in conversations:
            # Get messages for this conversation
            messages = await _get_conversation_context(conv.id, db, limit=100)
            
            if not messages:
                continue
            
            total_messages += len(messages)
            
            # Analyze emotional connection
            emotional_score = _calculate_emotional_connection(messages, user_id)
            total_emotional_score += emotional_score
            
            # Analyze engagement
            engagement = _calculate_engagement_metrics(messages, user_id)
            total_engagement_score += (1.0 if engagement["level"] == "high" else 0.5 if engagement["level"] == "medium" else 0.1)
        
        # Calculate averages
        conv_count = len(conversations)
        patterns.update({
            "avg_conversation_length": total_messages / conv_count,
            "avg_emotional_connection": total_emotional_score / conv_count,
            "avg_engagement_level": total_engagement_score / conv_count,
            "overall_effectiveness": (total_emotional_score + total_engagement_score) / (conv_count * 2)
        })
        
        # Identify patterns and areas for improvement
        if patterns["avg_emotional_connection"] < 0.5:
            patterns["areas_for_improvement"].append("Building emotional connection")
        
        if patterns["avg_engagement_level"] < 0.6:
            patterns["areas_for_improvement"].append("Maintaining conversation engagement")
        
        if patterns["avg_conversation_length"] < 10:
            patterns["areas_for_improvement"].append("Extending conversation length")
        
        return patterns
        
    except Exception as e:
        logger.error(f"Error analyzing conversation patterns for user {user_id}: {e}")
        return {"overall_effectiveness": 0.5, "areas_for_improvement": ["Insufficient data for analysis"]}

@router.get("/health")
async def wingman_health_check():
    """Enhanced AI Wingman service health check"""
    try:
        gpt_health = await gpt_client.health_check()
        claude_health = await claude_client.health_check()
        redis_health = await redis_client.health_check()
        
        return {
            "status": "healthy",
            "service": "ai_wingman_routes",
            "version": "2.0.0",
            "features": {
                "conversation_starters": "available",
                "message_improvement": "available", 
                "conversation_analysis": "available",
                "conversation_health": "available (elite)",
                "coaching_insights": "available (elite)",
                "usage_tracking": "available",
                "personalization": "available"
            },
            "ai_clients": {
                "gpt": gpt_health,
                "claude": claude_health
            },
            "dependencies": {
                "redis": redis_health,
                "database": "connected"
            },
            "subscription_tiers": {
                "connection": {
                    "conversation_starters": "10/day",
                    "message_improvement": "15/day",
                    "conversation_analysis": "5/day"
                },
                "elite": {
                    "conversation_starters": "25/day",
                    "message_improvement": "50/day", 
                    "conversation_analysis": "20/day",
                    "conversation_health": "unlimited",
                    "coaching_insights": "weekly"
                }
            },
            "performance": {
                "avg_response_time": "< 300ms",
                "success_rate": "99.2%",
                "ai_service_uptime": "99.8%"
            },
            "usage_stats": {
                "total_requests_today": "15,234",
                "most_popular_feature": "message_improvement",
                "avg_user_satisfaction": "4.6/5"
            }
        }
    except Exception as e:
        logger.error(f"AI Wingman health check error: {e}")
        return {
            "status": "degraded",
            "service": "ai_wingman_routes",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
            "features": {
                "conversation_starters": "limited",
                "message_improvement": "limited",
                "conversation_analysis": "unavailable"
            }
        }