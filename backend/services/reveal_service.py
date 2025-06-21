# backend/services/reveal_service.py
"""
ApexMatch Photo Reveal Service
Manages the revolutionary 6-stage photo reveal process with 70% emotional connection threshold
"""

from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
from enum import Enum
import json
import logging

from models.user import User
from models.conversation import Conversation, Message
from models.match import Match
from models.reveal import PhotoReveal, RevealStage, RevealStatus, RevealRequest
from clients.redis_client import redis_client
from clients.claude_client import claude_client
from services.chat_service import ChatService
from config import settings

logger = logging.getLogger(__name__)


class RevealService:
    """
    Service managing the revolutionary photo reveal system
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.emotional_threshold = 0.70  # 70% emotional connection required
        self.stage_timeouts = {
            RevealStage.PREPARATION: 300,     # 5 minutes
            RevealStage.INTENTION: 180,       # 3 minutes  
            RevealStage.MUTUAL_READINESS: 120, # 2 minutes
            RevealStage.COUNTDOWN: 30,        # 30 seconds
            RevealStage.REVEAL: 0,            # Immediate
            RevealStage.INTEGRATION: 600      # 10 minutes
        }
    
    async def request_photo_reveal(
        self, 
        conversation_id: int, 
        requesting_user_id: int,
        emotional_message: Optional[str] = None
    ) -> Dict:
        """
        Request a photo reveal with emotional connection verification
        """
        
        try:
            # Verify conversation exists and user has access
            conversation = await self._get_and_verify_conversation(conversation_id, requesting_user_id)
            if not conversation:
                return {"success": False, "error": "Conversation not found or access denied"}
            
            # Check if reveal already exists
            existing_reveal = self.db.query(PhotoReveal).filter(
                PhotoReveal.conversation_id == conversation_id,
                PhotoReveal.status.in_([RevealStatus.PENDING, RevealStatus.IN_PROGRESS])
            ).first()
            
            if existing_reveal:
                return {"success": False, "error": "Reveal already in progress"}
            
            # Check emotional connection threshold
            readiness_check = await self._assess_emotional_readiness(conversation, requesting_user_id)
            
            if not readiness_check["meets_threshold"]:
                return {
                    "success": False,
                    "error": "Insufficient emotional connection",
                    "current_connection": readiness_check["connection_percentage"],
                    "threshold_required": 70,
                    "recommendations": readiness_check["recommendations"]
                }
            
            # Check user's daily reveal limit
            if not await self._check_reveal_limit(requesting_user_id):
                return {"success": False, "error": "Daily reveal limit reached"}
            
            # Create reveal request
            reveal = PhotoReveal(
                conversation_id=conversation_id,
                requesting_user_id=requesting_user_id,
                target_user_id=conversation.get_other_participant_id(requesting_user_id),
                current_stage=RevealStage.PREPARATION,
                status=RevealStatus.PENDING,
                emotional_readiness_score=readiness_check["connection_percentage"],
                requesting_message=emotional_message,
                created_at=datetime.utcnow(),
                stage_expires_at=datetime.utcnow() + timedelta(seconds=self.stage_timeouts[RevealStage.PREPARATION])
            )
            
            self.db.add(reveal)
            self.db.commit()
            
            # Start the reveal process
            await self._start_reveal_process(reveal)
            
            return {
                "success": True,
                "reveal_id": reveal.id,
                "current_stage": reveal.current_stage.value,
                "message": "Photo reveal process initiated",
                "emotional_connection": readiness_check["connection_percentage"],
                "stage_timeout": self.stage_timeouts[RevealStage.PREPARATION]
            }
            
        except Exception as e:
            logger.error(f"Error requesting photo reveal: {e}")
            self.db.rollback()
            return {"success": False, "error": "Failed to request reveal"}
    
    async def _get_and_verify_conversation(self, conversation_id: int, user_id: int) -> Optional[Conversation]:
        """Get and verify user has access to conversation"""
        return self.db.query(Conversation).filter(
            Conversation.id == conversation_id,
            or_(
                Conversation.participant_1_id == user_id,
                Conversation.participant_2_id == user_id
            ),
            Conversation.is_active == True
        ).first()
    
    async def _assess_emotional_readiness(self, conversation: Conversation, requesting_user_id: int) -> Dict:
        """
        Assess if the emotional connection meets the 70% threshold for reveal
        """
        
        # Get conversation messages for analysis
        messages = self.db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at.asc()).all()
        
        if len(messages) < 10:
            return {
                "meets_threshold": False,
                "connection_percentage": 0,
                "recommendations": ["Have more meaningful conversations before requesting a reveal"]
            }
        
        # Calculate base emotional connection metrics
        base_metrics = self._calculate_base_connection_metrics(messages, conversation)
        
        # Use AI analysis for premium assessment
        requesting_user = self.db.query(User).filter(User.id == requesting_user_id).first()
        if requesting_user and requesting_user.is_premium():
            try:
                ai_assessment = await self._get_ai_readiness_assessment(conversation, messages)
                base_metrics.update(ai_assessment)
            except Exception as e:
                logger.warning(f"AI assessment failed, using basic metrics: {e}")
        
        # Calculate final connection percentage
        connection_percentage = self._calculate_final_connection_score(base_metrics)
        
        meets_threshold = connection_percentage >= self.emotional_threshold
        
        return {
            "meets_threshold": meets_threshold,
            "connection_percentage": round(connection_percentage * 100, 1),
            "metrics": base_metrics,
            "recommendations": self._generate_readiness_recommendations(base_metrics, connection_percentage)
        }
    
    def _calculate_base_connection_metrics(self, messages: List[Message], conversation: Conversation) -> Dict:
        """Calculate base emotional connection metrics"""
        
        total_messages = len(messages)
        if total_messages == 0:
            return {"insufficient_data": True}
        
        # Message depth analysis
        deep_messages = len([m for m in messages if (m.depth_score or 0) > 0.6])
        depth_ratio = deep_messages / total_messages
        
        # Vulnerability sharing
        vulnerable_messages = len([m for m in messages if (m.vulnerability_level or 0) > 0.5])
        vulnerability_ratio = vulnerable_messages / total_messages
        
        # Mutual vulnerability (both users sharing)
        user1_vulnerable = len([m for m in messages if m.sender_id == conversation.participant_1_id and (m.vulnerability_level or 0) > 0.5])
        user2_vulnerable = len([m for m in messages if m.sender_id == conversation.participant_2_id and (m.vulnerability_level or 0) > 0.5])
        mutual_vulnerability = min(user1_vulnerable, user2_vulnerable) > 0
        
        # Conversation consistency (regular exchange)
        conversation_days = (datetime.utcnow() - conversation.created_at).days
        messages_per_day = total_messages / max(conversation_days, 1)
        consistency_score = min(1.0, messages_per_day / 5)  # 5 messages/day = perfect consistency
        
        # Future language (planning together)
        future_messages = len([m for m in messages if any(word in m.content.lower() for word in [
            'future', 'tomorrow', 'next week', 'plan', 'together', 'us', 'we should', 'let\'s'
        ])])
        future_ratio = future_messages / total_messages
        
        # Question engagement (showing interest)
        question_messages = len([m for m in messages if m.contains_question])
        question_ratio = question_messages / total_messages
        
        # Response time consistency
        response_times = self._calculate_response_times(messages)
        response_consistency = self._calculate_response_consistency(response_times)
        
        return {
            "total_messages": total_messages,
            "conversation_days": conversation_days,
            "depth_ratio": depth_ratio,
            "vulnerability_ratio": vulnerability_ratio,
            "mutual_vulnerability": mutual_vulnerability,
            "consistency_score": consistency_score,
            "future_ratio": future_ratio,
            "question_ratio": question_ratio,
            "response_consistency": response_consistency,
            "emotional_connection_score": conversation.emotional_connection_score or 0.0
        }
    
    def _calculate_response_times(self, messages: List[Message]) -> List[float]:
        """Calculate response times between different senders"""
        response_times = []
        
        for i in range(1, len(messages)):
            prev_msg = messages[i-1]
            curr_msg = messages[i]
            
            if prev_msg.sender_id != curr_msg.sender_id:
                time_diff = (curr_msg.created_at - prev_msg.created_at).total_seconds()
                response_times.append(time_diff)
        
        return response_times
    
    def _calculate_response_consistency(self, response_times: List[float]) -> float:
        """Calculate response time consistency (0-1)"""
        if len(response_times) < 3:
            return 0.5
        
        # Calculate coefficient of variation (lower = more consistent)
        mean = sum(response_times) / len(response_times)
        if mean == 0:
            return 0.5
        
        variance = sum((rt - mean) ** 2 for rt in response_times) / len(response_times)
        std_dev = variance ** 0.5
        cv = std_dev / mean
        
        # Convert to consistency score (0-1, higher = more consistent)
        return max(0.0, 1.0 - min(1.0, cv))
    
    async def _get_ai_readiness_assessment(self, conversation: Conversation, messages: List[Message]) -> Dict:
        """Get AI-powered readiness assessment"""
        
        # Prepare conversation data for AI analysis
        recent_messages = messages[-20:] if len(messages) > 20 else messages
        conversation_data = []
        
        for msg in recent_messages:
            conversation_data.append({
                "content": msg.content,
                "sender_id": msg.sender_id,
                "emotional_tone": msg.emotional_tone.value if msg.emotional_tone else "neutral",
                "depth_score": msg.depth_score or 0,
                "vulnerability_level": msg.vulnerability_level or 0,
                "created_at": msg.created_at.isoformat()
            })
        
        # Use Claude for psychological assessment
        assessment = await claude_client.assess_reveal_psychological_readiness(
            conversation_data={
                "message_count": len(messages),
                "days_active": (datetime.utcnow() - conversation.created_at).days,
                "avg_response_time": conversation.avg_response_time_minutes or 0,
                "depth_score": conversation.emotional_depth_score or 0
            },
            emotional_connection_metrics={
                "overall_score": conversation.emotional_connection_score or 0,
                "vulnerability_count": len([m for m in messages if (m.vulnerability_level or 0) > 0.5]),
                "empathy_count": len([m for m in messages if getattr(m, 'empathy_score', 0) > 0.8]),
                "future_language": any("future" in m.content.lower() for m in messages[-10:]),
                "shared_values": getattr(conversation, 'shared_values', []) or []
            },
            trust_indicators=[],
            user_bgp={},
            match_bgp={}
        )
        
        return {
            "ai_connection_score": assessment.get("connection_analysis", {}).get("emotional_connection_percentage", 0) / 100,
            "ai_readiness_factors": assessment.get("psychological_readiness", {}),
            "ai_recommendations": assessment.get("recommendations", {}).get("preparation_suggestions", [])
        }
    
    def _calculate_final_connection_score(self, metrics: Dict) -> float:
        """Calculate final emotional connection score (0-1)"""
        
        if metrics.get("insufficient_data"):
            return 0.0
        
        # Weight different factors
        weights = {
            "depth_ratio": 0.25,
            "vulnerability_ratio": 0.20,
            "mutual_vulnerability": 0.15,
            "consistency_score": 0.10,
            "future_ratio": 0.10,
            "question_ratio": 0.05,
            "response_consistency": 0.05,
            "emotional_connection_score": 0.10
        }
        
        # Calculate base score
        base_score = 0.0
        for factor, weight in weights.items():
            if factor == "mutual_vulnerability":
                base_score += weight if metrics.get(factor, False) else 0
            else:
                base_score += weight * metrics.get(factor, 0)
        
        # Apply AI enhancement if available
        if "ai_connection_score" in metrics:
            ai_score = metrics["ai_connection_score"]
            # Blend base score with AI score (70% base, 30% AI)
            final_score = (base_score * 0.7) + (ai_score * 0.3)
        else:
            final_score = base_score
        
        # Apply minimum message requirement
        min_message_factor = min(1.0, metrics.get("total_messages", 0) / 15)  # 15 messages for full score
        final_score *= min_message_factor
        
        return min(1.0, final_score)
    
    def _generate_readiness_recommendations(self, metrics: Dict, connection_score: float) -> List[str]:
        """Generate recommendations for improving emotional readiness"""
        
        recommendations = []
        
        if connection_score < 0.4:
            recommendations.append("Continue having meaningful conversations to build deeper connection")
        
        if metrics.get("depth_ratio", 0) < 0.3:
            recommendations.append("Try asking deeper, more personal questions")
        
        if metrics.get("vulnerability_ratio", 0) < 0.2:
            recommendations.append("Share something personal about yourself to build trust")
        
        if not metrics.get("mutual_vulnerability", False):
            recommendations.append("Both of you should feel comfortable sharing vulnerable moments")
        
        if metrics.get("future_ratio", 0) < 0.1:
            recommendations.append("Talk about future plans or things you'd like to do together")
        
        if metrics.get("consistency_score", 0) < 0.5:
            recommendations.append("Maintain regular conversation to build stronger connection")
        
        if "ai_recommendations" in metrics:
            recommendations.extend(metrics["ai_recommendations"][:2])
        
        if not recommendations:
            recommendations.append("You're building a great connection! A photo reveal could be a beautiful next step.")
        
        return recommendations[:3]  # Return top 3 recommendations
    
    async def _check_reveal_limit(self, user_id: int) -> bool:
        """Check if user has reached daily reveal limit"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # Get daily limits based on subscription tier
        daily_limits = {
            "free": 1,
            "connection": 5,
            "elite": 15
        }
        
        user_tier = user.subscription_tier.value if user.subscription_tier else "free"
        daily_limit = daily_limits.get(user_tier, 1)
        
        # Count today's reveals
        today = datetime.utcnow().date()
        today_reveals = self.db.query(PhotoReveal).filter(
            PhotoReveal.requesting_user_id == user_id,
            PhotoReveal.created_at >= datetime.combine(today, datetime.min.time())
        ).count()
        
        return today_reveals < daily_limit
    
    async def _start_reveal_process(self, reveal: PhotoReveal) -> None:
        """Start the 6-stage reveal process"""
        
        # Cache reveal data for real-time updates
        reveal_data = {
            "reveal_id": reveal.id,
            "conversation_id": reveal.conversation_id,
            "requesting_user_id": reveal.requesting_user_id,
            "target_user_id": reveal.target_user_id,
            "current_stage": reveal.current_stage.value,
            "emotional_message": reveal.requesting_message,
            "created_at": reveal.created_at.isoformat()
        }
        
        await redis_client.set_json(
            f"reveal_process:{reveal.id}",
            reveal_data,
            ex=3600  # 1 hour expiration
        )
        
        # Send real-time notification to target user
        await self._notify_reveal_request(reveal)
        
        # Start stage timeout monitoring
        await self._schedule_stage_timeout(reveal.id, RevealStage.PREPARATION)
    
    async def _notify_reveal_request(self, reveal: PhotoReveal) -> None:
        """Notify target user of reveal request"""
        
        notification = {
            "type": "reveal_request",
            "reveal_id": reveal.id,
            "conversation_id": reveal.conversation_id,
            "requesting_user_id": reveal.requesting_user_id,
            "stage": reveal.current_stage.value,
            "message": reveal.requesting_message,
            "emotional_readiness": reveal.emotional_readiness_score,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to target user
        await redis_client.send_user_notification(reveal.target_user_id, notification)
        
        # Send to conversation channel
        await redis_client.publish_message(
            f"conversation:{reveal.conversation_id}",
            notification
        )
    
    async def respond_to_reveal(
        self, 
        reveal_id: int, 
        responding_user_id: int, 
        response: str,  # "accept", "decline", "not_ready"
        message: Optional[str] = None
    ) -> Dict:
        """Respond to a photo reveal request"""
        
        try:
            reveal = self.db.query(PhotoReveal).filter(
                PhotoReveal.id == reveal_id,
                PhotoReveal.target_user_id == responding_user_id,
                PhotoReveal.status == RevealStatus.PENDING
            ).first()
            
            if not reveal:
                return {"success": False, "error": "Reveal request not found"}
            
            if reveal.current_stage != RevealStage.PREPARATION:
                return {"success": False, "error": "Invalid stage for response"}
            
            # Process response
            if response == "accept":
                return await self._accept_reveal(reveal, message)
            elif response == "decline":
                return await self._decline_reveal(reveal, message)
            elif response == "not_ready":
                return await self._not_ready_reveal(reveal, message)
            else:
                return {"success": False, "error": "Invalid response"}
                
        except Exception as e:
            logger.error(f"Error responding to reveal: {e}")
            return {"success": False, "error": "Failed to process response"}
    
    async def _accept_reveal(self, reveal: PhotoReveal, message: Optional[str]) -> Dict:
        """Accept reveal and move to next stage"""
        
        reveal.target_response = "accepted"
        reveal.target_message = message
        reveal.current_stage = RevealStage.INTENTION
        reveal.stage_expires_at = datetime.utcnow() + timedelta(seconds=self.stage_timeouts[RevealStage.INTENTION])
        
        self.db.commit()
        
        # Update cached data
        await self._update_reveal_cache(reveal)
        
        # Notify both users
        await self._notify_stage_progress(reveal, "Reveal accepted! Sharing intentions...")
        
        # Schedule next stage timeout
        await self._schedule_stage_timeout(reveal.id, RevealStage.INTENTION)
        
        return {
            "success": True,
            "message": "Reveal accepted - proceeding to intention sharing",
            "next_stage": RevealStage.INTENTION.value,
            "stage_timeout": self.stage_timeouts[RevealStage.INTENTION]
        }
    
    async def _decline_reveal(self, reveal: PhotoReveal, message: Optional[str]) -> Dict:
        """Decline reveal request"""
        
        reveal.status = RevealStatus.DECLINED
        reveal.target_response = "declined"
        reveal.target_message = message
        reveal.completed_at = datetime.utcnow()
        
        self.db.commit()
        
        # Notify users
        await self._notify_reveal_declined(reveal)
        
        return {
            "success": True,
            "message": "Reveal declined respectfully",
            "status": "declined"
        }
    
    async def _not_ready_reveal(self, reveal: PhotoReveal, message: Optional[str]) -> Dict:
        """Indicate not ready for reveal"""
        
        reveal.status = RevealStatus.NOT_READY
        reveal.target_response = "not_ready"
        reveal.target_message = message
        reveal.completed_at = datetime.utcnow()
        
        self.db.commit()
        
        # Provide guidance for building more connection
        guidance = await self._generate_connection_guidance(reveal.conversation_id)
        
        await self._notify_not_ready(reveal, guidance)
        
        return {
            "success": True,
            "message": "Not ready for reveal - continue building connection",
            "status": "not_ready",
            "guidance": guidance
        }
    
    async def progress_reveal_stage(self, reveal_id: int, user_id: int, stage_data: Dict) -> Dict:
        """Progress reveal to next stage"""
        
        try:
            reveal = self.db.query(PhotoReveal).filter(
                PhotoReveal.id == reveal_id,
                or_(
                    PhotoReveal.requesting_user_id == user_id,
                    PhotoReveal.target_user_id == user_id
                )
            ).first()
            
            if not reveal:
                return {"success": False, "error": "Reveal not found"}
            
            if reveal.status != RevealStatus.PENDING:
                return {"success": False, "error": "Reveal not active"}
            
            # Process based on current stage
            if reveal.current_stage == RevealStage.INTENTION:
                return await self._process_intention_stage(reveal, user_id, stage_data)
            elif reveal.current_stage == RevealStage.MUTUAL_READINESS:
                return await self._process_readiness_stage(reveal, user_id, stage_data)
            elif reveal.current_stage == RevealStage.COUNTDOWN:
                return await self._process_countdown_stage(reveal, user_id, stage_data)
            elif reveal.current_stage == RevealStage.REVEAL:
                return await self._process_reveal_stage(reveal, user_id, stage_data)
            else:
                return {"success": False, "error": "Invalid stage"}
                
        except Exception as e:
            logger.error(f"Error progressing reveal stage: {e}")
            return {"success": False, "error": "Failed to progress stage"}
    
    async def _process_intention_stage(self, reveal: PhotoReveal, user_id: int, stage_data: Dict) -> Dict:
        """Process intention sharing stage"""
        
        intention = stage_data.get("intention", "")
        
    async def _process_intention_stage(self, reveal: PhotoReveal, user_id: int, stage_data: Dict) -> Dict:
        """Process intention sharing stage"""
        
        intention = stage_data.get("intention", "")
        
        # Store intention
        if user_id == reveal.requesting_user_id:
            reveal.requesting_user_intention = intention
        else:
            reveal.target_user_intention = intention
        
        # Check if both users have shared intentions
        if reveal.requesting_user_intention and reveal.target_user_intention:
            # Move to mutual readiness stage
            reveal.current_stage = RevealStage.MUTUAL_READINESS
            reveal.stage_expires_at = datetime.utcnow() + timedelta(seconds=self.stage_timeouts[RevealStage.MUTUAL_READINESS])
            
            self.db.commit()
            
            await self._update_reveal_cache(reveal)
            await self._notify_stage_progress(reveal, "Both intentions shared! Confirming mutual readiness...")
            await self._schedule_stage_timeout(reveal.id, RevealStage.MUTUAL_READINESS)
            
            return {
                "success": True,
                "message": "Intentions shared - confirming mutual readiness",
                "next_stage": RevealStage.MUTUAL_READINESS.value,
                "both_intentions": {
                    "requesting_user": reveal.requesting_user_intention,
                    "target_user": reveal.target_user_intention
                }
            }
        else:
            # Wait for other user
            self.db.commit()
            await self._update_reveal_cache(reveal)
            
            return {
                "success": True,
                "message": "Intention recorded - waiting for your match to share theirs",
                "waiting_for": "other_user_intention"
            }
    
    async def _process_readiness_stage(self, reveal: PhotoReveal, user_id: int, stage_data: Dict) -> Dict:
        """Process mutual readiness confirmation stage"""
        
        is_ready = stage_data.get("ready", False)
        
        # Store readiness
        if user_id == reveal.requesting_user_id:
            reveal.requesting_user_ready = is_ready
        else:
            reveal.target_user_ready = is_ready
        
        # Check if both users are ready
        if reveal.requesting_user_ready and reveal.target_user_ready:
            # Move to countdown stage
            reveal.current_stage = RevealStage.COUNTDOWN
            reveal.stage_expires_at = datetime.utcnow() + timedelta(seconds=self.stage_timeouts[RevealStage.COUNTDOWN])
            
            self.db.commit()
            
            await self._update_reveal_cache(reveal)
            await self._notify_stage_progress(reveal, "Both ready! Starting countdown...")
            await self._schedule_stage_timeout(reveal.id, RevealStage.COUNTDOWN)
            
            # Start countdown
            await self._start_countdown(reveal)
            
            return {
                "success": True,
                "message": "Both ready - starting countdown!",
                "next_stage": RevealStage.COUNTDOWN.value,
                "countdown_seconds": self.stage_timeouts[RevealStage.COUNTDOWN]
            }
        elif not is_ready:
            # User not ready - pause reveal
            reveal.status = RevealStatus.PAUSED
            self.db.commit()
            
            return {
                "success": True,
                "message": "Reveal paused - take time to prepare emotionally",
                "status": "paused"
            }
        else:
            # Wait for other user
            self.db.commit()
            await self._update_reveal_cache(reveal)
            
            return {
                "success": True,
                "message": "Readiness confirmed - waiting for your match",
                "waiting_for": "other_user_readiness"
            }
    
    async def _process_countdown_stage(self, reveal: PhotoReveal, user_id: int, stage_data: Dict) -> Dict:
        """Process countdown stage (automatic progression)"""
        
        # Countdown happens automatically, but allow users to abort
        abort_reveal = stage_data.get("abort", False)
        
        if abort_reveal:
            reveal.status = RevealStatus.ABORTED
            reveal.completed_at = datetime.utcnow()
            self.db.commit()
            
            await self._notify_reveal_aborted(reveal, user_id)
            
            return {
                "success": True,
                "message": "Reveal aborted",
                "status": "aborted"
            }
        
        return {
            "success": True,
            "message": "Countdown in progress",
            "status": "countdown_active"
        }
    
    async def _process_reveal_stage(self, reveal: PhotoReveal, user_id: int, stage_data: Dict) -> Dict:
        """Process the actual photo reveal stage"""
        
        # Photos should be revealed simultaneously
        # This would integrate with photo service to make photos visible
        
        reveal.current_stage = RevealStage.INTEGRATION
        reveal.status = RevealStatus.COMPLETED
        reveal.revealed_at = datetime.utcnow()
        reveal.stage_expires_at = datetime.utcnow() + timedelta(seconds=self.stage_timeouts[RevealStage.INTEGRATION])
        
        self.db.commit()
        
        # Make photos visible to both users
        await self._reveal_photos(reveal)
        
        # Celebrate the reveal
        await self._celebrate_reveal(reveal)
        
        # Start integration period
        await self._start_integration_period(reveal)
        
        return {
            "success": True,
            "message": "Photos revealed! Enjoy this special moment together.",
            "status": "revealed",
            "celebration_data": await self._get_celebration_data(reveal)
        }
    
    async def _start_countdown(self, reveal: PhotoReveal) -> None:
        """Start the 30-second countdown with real-time updates"""
        
        countdown_data = {
            "type": "countdown_started",
            "reveal_id": reveal.id,
            "countdown_seconds": self.stage_timeouts[RevealStage.COUNTDOWN],
            "message": "Get ready for your photo reveal!",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to conversation
        await redis_client.publish_message(
            f"conversation:{reveal.conversation_id}",
            countdown_data
        )
        
        # Schedule automatic progression to reveal
        await redis_client.redis.setex(
            f"reveal_countdown:{reveal.id}",
            self.stage_timeouts[RevealStage.COUNTDOWN],
            "auto_reveal"
        )
    
    async def _reveal_photos(self, reveal: PhotoReveal) -> None:
        """Make photos visible to both users"""
        
        # This would integrate with photo service
        # For now, just record the reveal event
        
        reveal_event = {
            "type": "photos_revealed",
            "reveal_id": reveal.id,
            "conversation_id": reveal.conversation_id,
            "requesting_user_id": reveal.requesting_user_id,
            "target_user_id": reveal.target_user_id,
            "revealed_at": reveal.revealed_at.isoformat()
        }
        
        # Cache revealed status
        await redis_client.set_json(
            f"photos_revealed:{reveal.conversation_id}",
            reveal_event,
            ex=86400 * 30  # Keep for 30 days
        )
        
        # Send to conversation
        await redis_client.publish_message(
            f"conversation:{reveal.conversation_id}",
            reveal_event
        )
    
    async def _celebrate_reveal(self, reveal: PhotoReveal) -> None:
        """Send celebration animations and messages"""
        
        celebration = {
            "type": "reveal_celebration",
            "reveal_id": reveal.id,
            "message": "🎉 Photos revealed! This is a special moment in your connection.",
            "animation": "heart_burst",
            "duration": 5000,  # 5 seconds
            "sound": "celebration_chime",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to both users
        await redis_client.send_user_notification(reveal.requesting_user_id, celebration)
        await redis_client.send_user_notification(reveal.target_user_id, celebration)
        
        # Send to conversation
        await redis_client.publish_message(
            f"conversation:{reveal.conversation_id}",
            celebration
        )
    
    async def _start_integration_period(self, reveal: PhotoReveal) -> None:
        """Start the integration period after reveal"""
        
        integration_data = {
            "type": "integration_started",
            "reveal_id": reveal.id,
            "message": "Take time to appreciate this moment and continue your conversation",
            "guidance": [
                "Share your feelings about seeing each other",
                "Talk about what attracted you to each other",
                "Plan your next conversation or meeting"
            ],
            "duration_minutes": self.stage_timeouts[RevealStage.INTEGRATION] // 60
        }
        
        await redis_client.publish_message(
            f"conversation:{reveal.conversation_id}",
            integration_data
        )
    
    async def _get_celebration_data(self, reveal: PhotoReveal) -> Dict:
        """Get celebration data for reveal completion"""
        
        return {
            "reveal_id": reveal.id,
            "message": "Congratulations on this beautiful moment!",
            "emotional_readiness": reveal.emotional_readiness_score,
            "connection_journey": {
                "days_to_reveal": (reveal.revealed_at - reveal.created_at).days,
                "emotional_preparation": "Complete",
                "mutual_readiness": "Confirmed"
            },
            "next_steps": [
                "Share your feelings about seeing each other",
                "Talk about your connection journey",
                "Plan your next steps together"
            ]
        }
    
    async def _update_reveal_cache(self, reveal: PhotoReveal) -> None:
        """Update cached reveal data"""
        
        reveal_data = {
            "reveal_id": reveal.id,
            "conversation_id": reveal.conversation_id,
            "requesting_user_id": reveal.requesting_user_id,
            "target_user_id": reveal.target_user_id,
            "current_stage": reveal.current_stage.value,
            "status": reveal.status.value,
            "stage_expires_at": reveal.stage_expires_at.isoformat() if reveal.stage_expires_at else None,
            "requesting_user_intention": reveal.requesting_user_intention,
            "target_user_intention": reveal.target_user_intention,
            "requesting_user_ready": reveal.requesting_user_ready,
            "target_user_ready": reveal.target_user_ready
        }
        
        await redis_client.set_json(
            f"reveal_process:{reveal.id}",
            reveal_data,
            ex=3600
        )
    
    async def _notify_stage_progress(self, reveal: PhotoReveal, message: str) -> None:
        """Notify users of stage progression"""
        
        notification = {
            "type": "reveal_stage_progress",
            "reveal_id": reveal.id,
            "current_stage": reveal.current_stage.value,
            "message": message,
            "stage_expires_at": reveal.stage_expires_at.isoformat() if reveal.stage_expires_at else None,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to both users
        await redis_client.send_user_notification(reveal.requesting_user_id, notification)
        await redis_client.send_user_notification(reveal.target_user_id, notification)
        
        # Send to conversation
        await redis_client.publish_message(
            f"conversation:{reveal.conversation_id}",
            notification
        )
    
    async def _schedule_stage_timeout(self, reveal_id: int, stage: RevealStage) -> None:
        """Schedule stage timeout handling"""
        
        timeout_key = f"reveal_timeout:{reveal_id}:{stage.value}"
        await redis_client.redis.setex(
            timeout_key,
            self.stage_timeouts[stage],
            "timeout"
        )
    
    async def handle_stage_timeout(self, reveal_id: int, stage: RevealStage) -> None:
        """Handle stage timeout"""
        
        reveal = self.db.query(PhotoReveal).filter(PhotoReveal.id == reveal_id).first()
        if not reveal or reveal.current_stage != stage:
            return
        
        if stage == RevealStage.COUNTDOWN:
            # Auto-progress to reveal
            await self._auto_progress_to_reveal(reveal)
        else:
            # Timeout other stages
            reveal.status = RevealStatus.TIMEOUT
            reveal.completed_at = datetime.utcnow()
            self.db.commit()
            
            await self._notify_reveal_timeout(reveal, stage)
    
    async def _auto_progress_to_reveal(self, reveal: PhotoReveal) -> None:
        """Automatically progress countdown to reveal"""
        
        reveal.current_stage = RevealStage.REVEAL
        reveal.revealed_at = datetime.utcnow()
        self.db.commit()
        
        # Execute reveal
        await self._reveal_photos(reveal)
        await self._celebrate_reveal(reveal)
        
        # Move to integration
        reveal.current_stage = RevealStage.INTEGRATION
        reveal.stage_expires_at = datetime.utcnow() + timedelta(seconds=self.stage_timeouts[RevealStage.INTEGRATION])
        self.db.commit()
        
        await self._start_integration_period(reveal)
    
    async def get_reveal_status(self, reveal_id: int, user_id: int) -> Dict:
        """Get current reveal status"""
        
        reveal = self.db.query(PhotoReveal).filter(
            PhotoReveal.id == reveal_id,
            or_(
                PhotoReveal.requesting_user_id == user_id,
                PhotoReveal.target_user_id == user_id
            )
        ).first()
        
        if not reveal:
            return {"error": "Reveal not found"}
        
        return {
            "reveal_id": reveal.id,
            "current_stage": reveal.current_stage.value,
            "status": reveal.status.value,
            "emotional_readiness_score": reveal.emotional_readiness_score,
            "stage_expires_at": reveal.stage_expires_at.isoformat() if reveal.stage_expires_at else None,
            "requesting_user_intention": reveal.requesting_user_intention,
            "target_user_intention": reveal.target_user_intention,
            "requesting_user_ready": reveal.requesting_user_ready,
            "target_user_ready": reveal.target_user_ready,
            "revealed_at": reveal.revealed_at.isoformat() if reveal.revealed_at else None,
            "created_at": reveal.created_at.isoformat()
        }
    
    async def get_reveal_insights(self, reveal_id: int, user_id: int) -> Dict:
        """Get insights about the reveal process"""
        
        reveal = self.db.query(PhotoReveal).filter(
            PhotoReveal.id == reveal_id,
            or_(
                PhotoReveal.requesting_user_id == user_id,
                PhotoReveal.target_user_id == user_id
            )
        ).first()
        
        if not reveal:
            return {"error": "Reveal not found"}
        
        # Calculate reveal journey metrics
        if reveal.revealed_at:
            total_duration = (reveal.revealed_at - reveal.created_at).total_seconds()
            duration_minutes = total_duration / 60
            
            return {
                "reveal_journey": {
                    "duration_minutes": round(duration_minutes, 1),
                    "emotional_readiness": reveal.emotional_readiness_score,
                    "completion_status": "successful",
                    "stages_completed": self._count_completed_stages(reveal)
                },
                "emotional_analysis": {
                    "preparation_quality": "thorough" if reveal.requesting_user_intention and reveal.target_user_intention else "basic",
                    "mutual_readiness": "confirmed" if reveal.requesting_user_ready and reveal.target_user_ready else "partial",
                    "connection_strength": self._assess_connection_strength(reveal.emotional_readiness_score)
                },
                "celebration_data": await self._get_celebration_data(reveal) if reveal.status == RevealStatus.COMPLETED else None
            }
        else:
            return {
                "reveal_journey": {
                    "status": reveal.status.value,
                    "current_stage": reveal.current_stage.value,
                    "time_elapsed_minutes": round((datetime.utcnow() - reveal.created_at).total_seconds() / 60, 1)
                }
            }
    
    def _count_completed_stages(self, reveal: PhotoReveal) -> int:
        """Count how many stages were completed"""
        
        completed = 1  # PREPARATION (always completed to start)
        
        if reveal.requesting_user_intention and reveal.target_user_intention:
            completed += 1  # INTENTION
        
        if reveal.requesting_user_ready and reveal.target_user_ready:
            completed += 1  # MUTUAL_READINESS
        
        if reveal.revealed_at:
            completed += 2  # COUNTDOWN and REVEAL
        
        return completed
    
    def _assess_connection_strength(self, emotional_score: float) -> str:
        """Assess connection strength based on emotional readiness score"""
        
        if emotional_score >= 0.9:
            return "exceptional"
        elif emotional_score >= 0.8:
            return "very_strong"
        elif emotional_score >= 0.7:
            return "strong"
        elif emotional_score >= 0.6:
            return "developing"
        else:
            return "building"
    
    async def _generate_connection_guidance(self, conversation_id: int) -> List[str]:
        """Generate guidance for building stronger connection"""
        
        conversation = self.db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        
        if not conversation:
            return ["Continue having meaningful conversations"]
        
        guidance = []
        
        # Analyze what's missing for 70% threshold
        if (conversation.emotional_connection_score or 0) < 0.5:
            guidance.append("Share more personal experiences and feelings")
        
        if conversation.vulnerability_events is None or conversation.vulnerability_events < 2:
            guidance.append("Open up about something meaningful to you")
        
        if conversation.deep_conversation_count is None or conversation.deep_conversation_count < 3:
            guidance.append("Ask deeper questions about values, dreams, and fears")
        
        if (conversation.message_count or 0) < 20:
            guidance.append("Continue building your conversation history together")
        
        if not guidance:
            guidance.append("You're building a beautiful connection - continue being authentic")
        
        return guidance[:3]  # Return top 3 pieces of guidance
    
    async def _notify_reveal_declined(self, reveal: PhotoReveal) -> None:
        """Notify users when reveal is declined"""
        
        notification = {
            "type": "reveal_declined",
            "reveal_id": reveal.id,
            "message": "Photo reveal was respectfully declined. Continue building your connection.",
            "guidance": "Respect their decision and focus on deepening your emotional bond",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await redis_client.send_user_notification(reveal.requesting_user_id, notification)
        await redis_client.publish_message(f"conversation:{reveal.conversation_id}", notification)
    
    async def _notify_not_ready(self, reveal: PhotoReveal, guidance: List[str]) -> None:
        """Notify users when someone isn't ready for reveal"""
        
        notification = {
            "type": "reveal_not_ready",
            "reveal_id": reveal.id,
            "message": "Not quite ready for photo reveal yet. Let's build more connection first.",
            "guidance": guidance,
            "encouragement": "This shows emotional intelligence - take time to build genuine connection",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await redis_client.send_user_notification(reveal.requesting_user_id, notification)
        await redis_client.send_user_notification(reveal.target_user_id, notification)
        await redis_client.publish_message(f"conversation:{reveal.conversation_id}", notification)
    
    async def _notify_reveal_timeout(self, reveal: PhotoReveal, stage: RevealStage) -> None:
        """Notify users when reveal times out"""
        
        notification = {
            "type": "reveal_timeout",
            "reveal_id": reveal.id,
            "stage": stage.value,
            "message": f"Photo reveal timed out at {stage.value} stage",
            "guidance": "You can try again when you're both ready to fully engage in the process",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await redis_client.send_user_notification(reveal.requesting_user_id, notification)
        await redis_client.send_user_notification(reveal.target_user_id, notification)
    
    async def _notify_reveal_aborted(self, reveal: PhotoReveal, aborting_user_id: int) -> None:
        """Notify users when reveal is aborted"""
        
        notification = {
            "type": "reveal_aborted",
            "reveal_id": reveal.id,
            "message": "Photo reveal was paused - that's completely okay",
            "guidance": "Take time to feel comfortable and try again when ready",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        other_user_id = (
            reveal.target_user_id if aborting_user_id == reveal.requesting_user_id 
            else reveal.requesting_user_id
        )
        
        await redis_client.send_user_notification(other_user_id, notification)
        await redis_client.publish_message(f"conversation:{reveal.conversation_id}", notification)