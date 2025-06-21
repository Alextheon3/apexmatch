"""
ApexMatch BGP Builder Service
Continuously analyzes user behavior to build and refine Behavioral Graph Profiles
"""

from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import numpy as np
import json
import logging
from collections import defaultdict

from models.user import User, OnboardingStatus
from models.bgp import BGPProfile, BGPBehaviorEvent
from models.conversation import Conversation, Message, MessageType, EmotionalTone
from models.match import Match
from clients.redis_client import redis_client
from config import settings

logger = logging.getLogger(__name__)


class BGPBuilderService:
    """
    Service that analyzes user behavior patterns and builds/updates BGP profiles
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.min_data_points = 10  # Minimum events before confident analysis
        self.update_frequency_hours = settings.BGP_UPDATE_FREQUENCY_HOURS
    
    async def process_user_activity(self, user_id: int, activity_type: str, metadata: Dict) -> bool:
        """
        Process a user activity event and update BGP accordingly
        """
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user or not user.bgp_profile:
                return False
            
            # Log the behavior event
            event = BGPBehaviorEvent(
                bgp_profile_id=user.bgp_profile.id,
                event_type=activity_type,
                event_category=self._categorize_event(activity_type),
                metadata=metadata,
                timestamp=datetime.utcnow()
            )
            
            # Extract measurable value if applicable
            if activity_type in ['message_sent', 'message_response']:
                event.value = metadata.get('response_time_seconds', 0)
            elif activity_type in ['profile_view', 'match_interaction']:
                event.value = metadata.get('duration_seconds', 0)
            
            self.db.add(event)
            
            # Update BGP profile based on this activity
            await self._update_bgp_from_activity(user.bgp_profile, activity_type, metadata, event)
            
            # Check if user is ready for matching
            await self._check_matching_readiness(user)
            
            self.db.commit()
            
            # Cache updated analysis
            await self._cache_bgp_analysis(user_id, user.bgp_profile)
            
            return True
            
        except Exception as e:
            logger.error(f"Error processing user activity: {e}")
            self.db.rollback()
            return False
    
    def _categorize_event(self, event_type: str) -> str:
        """Categorize event type for BGP analysis"""
        communication_events = [
            'message_sent', 'message_response', 'conversation_started', 
            'typing_indicator', 'read_receipt'
        ]
        emotional_events = [
            'emotional_expression', 'vulnerability_shared', 'support_given',
            'conflict_resolved', 'empathy_shown'
        ]
        decision_events = [
            'match_accepted', 'match_rejected', 'reveal_requested', 
            'reveal_accepted', 'profile_updated'
        ]
        focus_events = [
            'app_session', 'profile_view', 'conversation_focus',
            'feature_exploration', 'deep_conversation'
        ]
        
        if event_type in communication_events:
            return 'communication'
        elif event_type in emotional_events:
            return 'emotional'
        elif event_type in decision_events:
            return 'decision'
        elif event_type in focus_events:
            return 'focus'
        else:
            return 'general'
    
    async def _update_bgp_from_activity(
        self, 
        bgp: BGPProfile, 
        activity_type: str, 
        metadata: Dict,
        event: BGPBehaviorEvent
    ) -> None:
        """Update BGP dimensions based on specific activity"""
        
        # Communication pattern updates
        if activity_type == 'message_sent':
            await self._update_communication_patterns(bgp, metadata)
        
        elif activity_type == 'message_response':
            await self._update_response_patterns(bgp, metadata)
        
        elif activity_type == 'emotional_expression':
            await self._update_emotional_patterns(bgp, metadata)
        
        elif activity_type in ['match_accepted', 'match_rejected']:
            await self._update_decision_patterns(bgp, metadata)
        
        elif activity_type == 'conversation_deep':
            await self._update_depth_preferences(bgp, metadata)
        
        elif activity_type == 'vulnerability_shared':
            await self._update_vulnerability_comfort(bgp, metadata)
        
        elif activity_type == 'focus_session':
            await self._update_focus_patterns(bgp, metadata)
        
        # Update overall confidence and stability
        await self._update_profile_confidence(bgp)
        
        # Log event for detailed tracking
        bgp.log_communication_event(activity_type, metadata)
        
        bgp.updated_at = datetime.utcnow()
    
    async def _update_communication_patterns(self, bgp: BGPProfile, metadata: Dict) -> None:
        """Update communication-related BGP dimensions"""
        
        # Message length analysis
        message_length = metadata.get('message_length', 0)
        if message_length > 0:
            # Normalize message length (0-1 scale, where 1 = very verbose)
            length_score = min(1.0, message_length / 200)  # 200 chars = max verbosity
            
            # Update with weighted average (new data weighted 0.2)
            bgp.message_length_avg = (bgp.message_length_avg * 0.8) + (length_score * 0.2)
        
        # Emoji usage analysis
        emoji_count = metadata.get('emoji_count', 0)
        total_chars = metadata.get('message_length', 1)
        emoji_density = emoji_count / total_chars if total_chars > 0 else 0
        
        # Update emoji usage rate
        bgp.emoji_usage_rate = (bgp.emoji_usage_rate * 0.8) + (min(1.0, emoji_density * 10) * 0.2)
        
        # Question asking pattern
        has_question = metadata.get('contains_question', False)
        if has_question:
            # Increase conversation depth preference slightly
            bgp.conversation_depth_pref = min(1.0, bgp.conversation_depth_pref + 0.02)
    
    async def _update_response_patterns(self, bgp: BGPProfile, metadata: Dict) -> None:
        """Update response timing and consistency patterns"""
        
        response_time = metadata.get('response_time_seconds', 0)
        if response_time > 0:
            # Normalize response time (0 = instant, 1 = very slow)
            # Use logarithmic scale for response times
            normalized_speed = 1.0 - min(1.0, np.log(response_time + 1) / np.log(3600))  # 1 hour = very slow
            
            # Update response speed average
            bgp.response_speed_avg = (bgp.response_speed_avg * 0.7) + (normalized_speed * 0.3)
            
            # Update response consistency by tracking variance
            # (Implementation would track rolling variance of response times)
        
        # Time of day analysis
        hour = datetime.utcnow().hour
        if 6 <= hour <= 10:  # Morning person indicator
            bgp.morning_evening_person = min(1.0, bgp.morning_evening_person + 0.01)
        elif 20 <= hour <= 23:  # Evening person indicator
            bgp.morning_evening_person = max(0.0, bgp.morning_evening_person - 0.01)
    
    async def _update_emotional_patterns(self, bgp: BGPProfile, metadata: Dict) -> None:
        """Update emotional expression and vulnerability patterns"""
        
        emotional_intensity = metadata.get('emotional_intensity', 0.5)
        emotion_type = metadata.get('emotion_type', 'neutral')
        
        # Update emotional volatility based on intensity swings
        current_volatility = bgp.emotional_volatility
        if emotional_intensity > 0.8 or emotional_intensity < 0.2:
            # High intensity emotions increase volatility slightly
            bgp.emotional_volatility = min(1.0, current_volatility + 0.01)
        else:
            # Moderate emotions decrease volatility slightly
            bgp.emotional_volatility = max(0.0, current_volatility - 0.005)
        
        # Update empathy indicators based on supportive language
        is_supportive = metadata.get('is_supportive', False)
        if is_supportive:
            bgp.empathy_indicators = min(1.0, bgp.empathy_indicators + 0.02)
        
        # Log emotional event for pattern analysis
        bgp.log_emotional_event(emotion_type, emotional_intensity, metadata)
    
    async def _update_decision_patterns(self, bgp: BGPProfile, metadata: Dict) -> None:
        """Update decision-making speed and style patterns"""
        
        decision_time = metadata.get('decision_time_seconds', 0)
        decision_type = metadata.get('decision_type', 'match_response')
        
        if decision_time > 0:
            # Normalize decision speed (0 = very slow, 1 = instant)
            # Different scales for different decision types
            if decision_type == 'match_response':
                max_time = 3600  # 1 hour
            else:
                max_time = 300   # 5 minutes
            
            speed_score = 1.0 - min(1.0, decision_time / max_time)
            
            # Update decision making speed
            bgp.decision_making_speed = (bgp.decision_making_speed * 0.8) + (speed_score * 0.2)
            
            # Log decision event
            bgp.log_decision_event(decision_type, decision_time, metadata)
    
    async def _update_vulnerability_comfort(self, bgp: BGPProfile, metadata: Dict) -> None:
        """Update comfort with emotional vulnerability"""
        
        vulnerability_level = metadata.get('vulnerability_level', 0.0)
        context = metadata.get('context', 'general')
        
        # Higher vulnerability sharing increases comfort over time
        if vulnerability_level > 0.5:
            increase = vulnerability_level * 0.03  # Scale increase by level
            bgp.vulnerability_comfort = min(1.0, bgp.vulnerability_comfort + increase)
        
        # Track vulnerability in different contexts
        # (early conversation vs later, different topics, etc.)
    
    async def _update_focus_patterns(self, bgp: BGPProfile, metadata: Dict) -> None:
        """Update focus and attention patterns"""
        
        session_duration = metadata.get('session_duration_seconds', 0)
        activity_switches = metadata.get('activity_switches', 0)
        deep_engagement = metadata.get('deep_engagement', False)
        
        if session_duration > 0:
            # Normalize session duration for focus scoring
            focus_score = min(1.0, session_duration / 1800)  # 30 min = max focus
            
            # Account for activity switching (more switches = less focus)
            if activity_switches > 0:
                distraction_penalty = min(0.5, activity_switches * 0.1)
                focus_score = max(0.0, focus_score - distraction_penalty)
            
            # Update focus stability
            bgp.focus_stability = (bgp.focus_stability * 0.8) + (focus_score * 0.2)
            
            # Log focus event
            bgp.log_focus_event('app_session', session_duration, focus_score)
    
    async def _update_profile_confidence(self, bgp: BGPProfile) -> None:
        """Update overall profile confidence based on data quantity and consistency"""
        
        # Count total behavior events
        total_events = self.db.query(BGPBehaviorEvent).filter(
            BGPBehaviorEvent.bgp_profile_id == bgp.id
        ).count()
        
        # Base confidence on number of data points
        base_confidence = min(1.0, total_events / 100)  # 100 events = full confidence
        
        # Adjust for recency (newer data is more relevant)
        recent_threshold = datetime.utcnow() - timedelta(days=7)
        recent_events = self.db.query(BGPBehaviorEvent).filter(
            BGPBehaviorEvent.bgp_profile_id == bgp.id,
            BGPBehaviorEvent.timestamp >= recent_threshold
        ).count()
        
        recency_bonus = min(0.2, recent_events / 20)  # Up to 20% bonus for recent activity
        
        # Calculate final confidence
        bgp.data_confidence = min(1.0, base_confidence + recency_bonus)
    
    async def _check_matching_readiness(self, user: User) -> None:
        """Check if user is ready for matching and update onboarding status"""
        
        if user.onboarding_status == OnboardingStatus.BGP_BUILDING:
            if user.bgp_profile.is_ready_for_matching():
                user.onboarding_status = OnboardingStatus.READY_TO_MATCH
                user.onboarding_completed_at = datetime.utcnow()
                
                # Notify user they're ready for matching
                await self._notify_matching_ready(user.id)
    
    async def _notify_matching_ready(self, user_id: int) -> None:
        """Notify user that their BGP is ready for matching"""
        # Would integrate with notification service
        await redis_client.set_json(
            f"bgp_ready_notification:{user_id}",
            {
                "user_id": user_id,
                "ready_at": datetime.utcnow().isoformat(),
                "message": "Your behavioral profile is ready! You can now find matches based on emotional compatibility."
            },
            ex=86400  # 24 hours
        )
    
    async def _cache_bgp_analysis(self, user_id: int, bgp: BGPProfile) -> None:
        """Cache BGP analysis results for quick access"""
        
        analysis = {
            "user_id": user_id,
            "confidence": bgp.data_confidence,
            "behavioral_vector": bgp.get_behavioral_vector(),
            "personality_insights": bgp.get_personality_insights(),
            "ready_for_matching": bgp.is_ready_for_matching(),
            "last_updated": bgp.updated_at.isoformat(),
            "growth_areas": bgp.get_growth_areas()
        }
        
        await redis_client.cache_bgp_analysis(user_id, analysis)
    
    async def analyze_conversation_patterns(self, conversation_id: int) -> Dict:
        """Analyze conversation patterns for both participants"""
        
        conversation = self.db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        
        if not conversation:
            return {}
        
        # Get all messages in conversation
        messages = self.db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at).all()
        
        if len(messages) < 3:
            return {"insufficient_data": True}
        
        # Analyze patterns
        analysis = {
            "total_messages": len(messages),
            "conversation_duration": self._calculate_duration(messages),
            "message_balance": self._calculate_balance(messages, conversation),
            "emotional_progression": self._analyze_emotional_progression(messages),
            "depth_progression": self._analyze_depth_progression(messages),
            "response_time_patterns": self._analyze_response_times(messages),
            "mutual_engagement_score": self._calculate_mutual_engagement(messages, conversation)
        }
        
        # Update BGP profiles based on conversation analysis
        await self._update_bgp_from_conversation(conversation, analysis)
        
        return analysis
    
    def _calculate_duration(self, messages: List[Message]) -> float:
        """Calculate conversation duration in hours"""
        if len(messages) < 2:
            return 0.0
        
        start_time = messages[0].created_at
        end_time = messages[-1].created_at
        duration = (end_time - start_time).total_seconds() / 3600
        
        return round(duration, 2)
    
    def _calculate_balance(self, messages: List[Message], conversation: Conversation) -> Dict:
        """Calculate message balance between participants"""
        
        user1_count = sum(1 for msg in messages if msg.sender_id == conversation.participant_1_id)
        user2_count = sum(1 for msg in messages if msg.sender_id == conversation.participant_2_id)
        total = len(messages)
        
        if total == 0:
            return {"balance_score": 0.5, "user1_ratio": 0.5, "user2_ratio": 0.5}
        
        user1_ratio = user1_count / total
        user2_ratio = user2_count / total
        
        # Balance score: 1.0 = perfectly balanced, 0.0 = completely one-sided
        balance_score = 1.0 - abs(0.5 - user1_ratio) * 2
        
        return {
            "balance_score": balance_score,
            "user1_ratio": user1_ratio,
            "user2_ratio": user2_ratio,
            "user1_count": user1_count,
            "user2_count": user2_count
        }
    
    def _analyze_emotional_progression(self, messages: List[Message]) -> Dict:
        """Analyze how emotional openness progresses over time"""
        
        if len(messages) < 5:
            return {"insufficient_data": True}
        
        # Split messages into early, middle, late periods
        third = len(messages) // 3
        early_messages = messages[:third]
        middle_messages = messages[third:2*third]
        late_messages = messages[2*third:]
        
        def avg_vulnerability(msg_group):
            return sum(msg.vulnerability_level or 0 for msg in msg_group) / len(msg_group) if msg_group else 0
        
        early_vulnerability = avg_vulnerability(early_messages)
        middle_vulnerability = avg_vulnerability(middle_messages)
        late_vulnerability = avg_vulnerability(late_messages)
        
        # Calculate progression trend
        vulnerability_trend = late_vulnerability - early_vulnerability
        
        return {
            "early_vulnerability": early_vulnerability,
            "middle_vulnerability": middle_vulnerability,
            "late_vulnerability": late_vulnerability,
            "vulnerability_trend": vulnerability_trend,  # Positive = increasing openness
            "progression_type": self._classify_emotional_progression(vulnerability_trend)
        }
    
    def _classify_emotional_progression(self, trend: float) -> str:
        """Classify the type of emotional progression"""
        if trend > 0.3:
            return "rapid_opening"
        elif trend > 0.1:
            return "gradual_opening"
        elif trend > -0.1:
            return "stable"
        elif trend > -0.3:
            return "gradual_closing"
        else:
            return "rapid_closing"
    
    def _analyze_depth_progression(self, messages: List[Message]) -> Dict:
        """Analyze conversation depth progression"""
        
        depth_scores = [msg.depth_score or 0 for msg in messages if msg.depth_score is not None]
        
        if len(depth_scores) < 5:
            return {"insufficient_data": True}
        
        # Calculate moving averages
        window_size = max(3, len(depth_scores) // 5)
        moving_averages = []
        
        for i in range(window_size, len(depth_scores)):
            window = depth_scores[i-window_size:i]
            moving_averages.append(sum(window) / len(window))
        
        if len(moving_averages) < 2:
            return {"insufficient_data": True}
        
        # Calculate trend
        depth_trend = moving_averages[-1] - moving_averages[0]
        
        return {
            "initial_depth": moving_averages[0],
            "final_depth": moving_averages[-1],
            "depth_trend": depth_trend,
            "max_depth": max(depth_scores),
            "avg_depth": sum(depth_scores) / len(depth_scores),
            "progression_type": self._classify_depth_progression(depth_trend)
        }
    
    def _classify_depth_progression(self, trend: float) -> str:
        """Classify conversation depth progression"""
        if trend > 0.2:
            return "deepening_rapidly"
        elif trend > 0.05:
            return "deepening_gradually"
        elif trend > -0.05:
            return "stable_depth"
        else:
            return "becoming_superficial"
    
    def _analyze_response_times(self, messages: List[Message]) -> Dict:
        """Analyze response time patterns"""
        
        response_times = []
        for i in range(1, len(messages)):
            prev_msg = messages[i-1]
            curr_msg = messages[i]
            
            # Only count if different senders (actual responses)
            if prev_msg.sender_id != curr_msg.sender_id:
                time_diff = (curr_msg.created_at - prev_msg.created_at).total_seconds()
                response_times.append(time_diff)
        
        if len(response_times) < 3:
            return {"insufficient_data": True}
        
        avg_response_time = sum(response_times) / len(response_times)
        
        # Categorize response times
        quick_responses = sum(1 for rt in response_times if rt < 300)  # < 5 minutes
        medium_responses = sum(1 for rt in response_times if 300 <= rt < 3600)  # 5 min - 1 hour
        slow_responses = sum(1 for rt in response_times if rt >= 3600)  # > 1 hour
        
        return {
            "avg_response_time_seconds": avg_response_time,
            "avg_response_time_formatted": self._format_duration(avg_response_time),
            "quick_response_ratio": quick_responses / len(response_times),
            "medium_response_ratio": medium_responses / len(response_times),
            "slow_response_ratio": slow_responses / len(response_times),
            "response_consistency": self._calculate_response_consistency(response_times)
        }
    
    def _calculate_response_consistency(self, response_times: List[float]) -> float:
        """Calculate how consistent response times are (0 = very inconsistent, 1 = very consistent)"""
        if len(response_times) < 3:
            return 0.5
        
        # Use coefficient of variation (std dev / mean)
        mean = sum(response_times) / len(response_times)
        variance = sum((rt - mean) ** 2 for rt in response_times) / len(response_times)
        std_dev = variance ** 0.5
        
        if mean == 0:
            return 0.5
        
        cv = std_dev / mean
        # Convert to 0-1 scale (lower CV = higher consistency)
        consistency = max(0.0, 1.0 - min(1.0, cv))
        
        return consistency
    
    def _format_duration(self, seconds: float) -> str:
        """Format duration in human-readable format"""
        if seconds < 60:
            return f"{int(seconds)}s"
        elif seconds < 3600:
            return f"{int(seconds/60)}m"
        elif seconds < 86400:
            return f"{int(seconds/3600)}h {int((seconds%3600)/60)}m"
        else:
            return f"{int(seconds/86400)}d {int((seconds%86400)/3600)}h"
    
    def _calculate_mutual_engagement(self, messages: List[Message], conversation: Conversation) -> float:
        """Calculate mutual engagement score based on various factors"""
        
        if len(messages) < 5:
            return 0.0
        
        # Factor 1: Message balance (how evenly distributed)
        balance = self._calculate_balance(messages, conversation)
        balance_score = balance["balance_score"]
        
        # Factor 2: Question asking (shows interest)
        question_count = sum(1 for msg in messages if msg.contains_question)
        question_score = min(1.0, question_count / (len(messages) * 0.3))  # 30% questions = max score
        
        # Factor 3: Emotional expression
        emotional_messages = sum(1 for msg in messages if msg.vulnerability_level and msg.vulnerability_level > 0.3)
        emotion_score = min(1.0, emotional_messages / (len(messages) * 0.2))  # 20% emotional = max score
        
        # Factor 4: Conversation depth
        deep_messages = sum(1 for msg in messages if msg.depth_score and msg.depth_score > 0.6)
        depth_score = min(1.0, deep_messages / (len(messages) * 0.4))  # 40% deep = max score
        
        # Weighted combination
        engagement_score = (
            balance_score * 0.3 +
            question_score * 0.2 +
            emotion_score * 0.25 +
            depth_score * 0.25
        )
        
        return round(engagement_score, 3)
    
    async def _update_bgp_from_conversation(self, conversation: Conversation, analysis: Dict) -> None:
        """Update BGP profiles based on conversation analysis"""
        
        # Get both users' BGP profiles
        user1 = self.db.query(User).filter(User.id == conversation.participant_1_id).first()
        user2 = self.db.query(User).filter(User.id == conversation.participant_2_id).first()
        
        if not user1 or not user2 or not user1.bgp_profile or not user2.bgp_profile:
            return
        
        bgp1 = user1.bgp_profile
        bgp2 = user2.bgp_profile
        
        # Update conversation-related BGP dimensions
        if "response_time_patterns" in analysis and not analysis["response_time_patterns"].get("insufficient_data"):
            response_data = analysis["response_time_patterns"]
            
            # Update response consistency for both users
            consistency = response_data["response_consistency"]
            bgp1.response_consistency = (bgp1.response_consistency * 0.8) + (consistency * 0.2)
            bgp2.response_consistency = (bgp2.response_consistency * 0.8) + (consistency * 0.2)
        
        # Update conversation depth preference
        if "depth_progression" in analysis and not analysis["depth_progression"].get("insufficient_data"):
            depth_data = analysis["depth_progression"]
            avg_depth = depth_data["avg_depth"]
            
            # Users who engage in deep conversations prefer depth
            bgp1.conversation_depth_pref = (bgp1.conversation_depth_pref * 0.7) + (avg_depth * 0.3)
            bgp2.conversation_depth_pref = (bgp2.conversation_depth_pref * 0.7) + (avg_depth * 0.3)
        
        # Update vulnerability comfort
        if "emotional_progression" in analysis and not analysis["emotional_progression"].get("insufficient_data"):
            emotion_data = analysis["emotional_progression"]
            late_vulnerability = emotion_data["late_vulnerability"]
            
            # Users who become more vulnerable over time are more comfortable with it
            bgp1.vulnerability_comfort = (bgp1.vulnerability_comfort * 0.8) + (late_vulnerability * 0.2)
            bgp2.vulnerability_comfort = (bgp2.vulnerability_comfort * 0.8) + (late_vulnerability * 0.2)
        
        # Update mutual engagement tracking
        engagement_score = analysis.get("mutual_engagement_score", 0)
        if engagement_score > 0.7:
            # High engagement indicates good social skills
            bgp1.empathy_indicators = min(1.0, bgp1.empathy_indicators + 0.01)
            bgp2.empathy_indicators = min(1.0, bgp2.empathy_indicators + 0.01)
    
    async def batch_update_bgp_profiles(self) -> Dict:
        """Batch update all BGP profiles that need updating"""
        
        # Find profiles that haven't been updated recently
        cutoff_time = datetime.utcnow() - timedelta(hours=self.update_frequency_hours)
        
        stale_profiles = self.db.query(BGPProfile).filter(
            BGPProfile.updated_at < cutoff_time,
            BGPProfile.data_confidence > 0.1  # Only update profiles with some data
        ).limit(100).all()  # Process in batches
        
        updated_count = 0
        error_count = 0
        
        for bgp in stale_profiles:
            try:
                # Get recent behavior events for this profile
                recent_events = self.db.query(BGPBehaviorEvent).filter(
                    BGPBehaviorEvent.bgp_profile_id == bgp.id,
                    BGPBehaviorEvent.processed == False
                ).all()
                
                if recent_events:
                    # Process each unprocessed event
                    for event in recent_events:
                        await self._reprocess_behavior_event(bgp, event)
                        event.processed = True
                    
                    # Update profile confidence
                    await self._update_profile_confidence(bgp)
                    
                    # Cache updated analysis
                    await self._cache_bgp_analysis(bgp.user_id, bgp)
                    
                    updated_count += 1
                    
            except Exception as e:
                logger.error(f"Error updating BGP profile {bgp.id}: {e}")
                error_count += 1
        
        self.db.commit()
        
        return {
            "updated_profiles": updated_count,
            "errors": error_count,
            "total_processed": len(stale_profiles)
        }
    
    async def _reprocess_behavior_event(self, bgp: BGPProfile, event: BGPBehaviorEvent) -> None:
        """Reprocess a behavior event to update BGP"""
        
        # Convert event back to activity format for processing
        activity_type = event.event_type
        metadata = event.metadata or {}
        
        # Add event value to metadata if present
        if event.value is not None:
            if activity_type in ['message_response']:
                metadata['response_time_seconds'] = event.value
            elif activity_type in ['app_session']:
                metadata['session_duration_seconds'] = event.value
        
        # Reprocess the event
        await self._update_bgp_from_activity(bgp, activity_type, metadata, event)
    
    async def get_bgp_insights_for_user(self, user_id: int) -> Dict:
        """Get comprehensive BGP insights for a user"""
        
        # Check cache first
        cached_analysis = await redis_client.get_cached_bgp_analysis(user_id)
        if cached_analysis:
            return cached_analysis
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.bgp_profile:
            return {"error": "User or BGP profile not found"}
        
        bgp = user.bgp_profile
        
        # Generate comprehensive insights
        insights = {
            "user_id": user_id,
            "confidence": bgp.data_confidence,
            "ready_for_matching": bgp.is_ready_for_matching(),
            "behavioral_vector": bgp.get_behavioral_vector(),
            "personality_insights": bgp.get_personality_insights(),
            "growth_areas": bgp.get_growth_areas(),
            "profile_stability": bgp.profile_stability,
            "last_updated": bgp.updated_at.isoformat(),
            "dimensions": {
                "communication": {
                    "response_speed": bgp.response_speed_avg,
                    "response_consistency": bgp.response_consistency,
                    "conversation_depth_pref": bgp.conversation_depth_pref,
                    "message_length_avg": bgp.message_length_avg,
                    "emoji_usage_rate": bgp.emoji_usage_rate
                },
                "emotional": {
                    "emotional_volatility": bgp.emotional_volatility,
                    "vulnerability_comfort": bgp.vulnerability_comfort,
                    "empathy_indicators": bgp.empathy_indicators,
                    "humor_compatibility": bgp.humor_compatibility
                },
                "trust": {
                    "attachment_security": bgp.attachment_security,
                    "ghosting_likelihood": bgp.ghosting_likelihood,
                    "commitment_readiness": bgp.commitment_readiness,
                    "boundary_respect": bgp.boundary_respect,
                    "trust_building_pace": bgp.trust_building_pace
                },
                "decision": {
                    "decision_making_speed": bgp.decision_making_speed,
                    "spontaneity_vs_planning": bgp.spontaneity_vs_planning,
                    "risk_tolerance": bgp.risk_tolerance,
                    "introspection_level": bgp.introspection_level
                },
                "activity": {
                    "activity_level": bgp.activity_level,
                    "social_battery": bgp.social_battery,
                    "morning_evening_person": bgp.morning_evening_person,
                    "routine_vs_variety": bgp.routine_vs_variety,
                    "focus_stability": bgp.focus_stability
                }
            }
        }
        
        # Cache for future requests
        await redis_client.cache_bgp_analysis(user_id, insights)
        
        return insights