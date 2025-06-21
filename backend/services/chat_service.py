# backend/services/chat_service.py
"""
ApexMatch Chat Service
Handles real-time messaging, conversation management, and chat analytics
"""

from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime, timedelta
import json
import re
import logging

from models.user import User
from models.conversation import Conversation, Message, MessageType, EmotionalTone
from models.match import Match, MatchStatus
from clients.redis_client import redis_client
from services.bgp_builder import BGPBuilderService
from clients.gpt_client import gpt_client
from config import settings

logger = logging.getLogger(__name__)


class ChatService:
    """
    Service for managing real-time chat, conversation analysis, and messaging
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.bgp_builder = BGPBuilderService(db)
    
    async def send_message(
        self, 
        conversation_id: int, 
        sender_id: int, 
        content: str, 
        message_type: MessageType = MessageType.TEXT,
        reply_to_id: Optional[int] = None,
        metadata: Optional[Dict] = None
    ) -> Optional[Message]:
        """Send a message in a conversation"""
        
        try:
            # Verify conversation exists and user has access
            conversation = self.db.query(Conversation).filter(
                Conversation.id == conversation_id,
                or_(
                    Conversation.participant_1_id == sender_id,
                    Conversation.participant_2_id == sender_id
                )
            ).first()
            
            if not conversation:
                raise ValueError("Conversation not found or access denied")
            
            # Check if conversation is active
            if not conversation.is_active:
                raise ValueError("Conversation is not active")
            
            # Analyze message content
            analysis = await self._analyze_message_content(content, conversation, sender_id)
            
            # Create message
            message = Message(
                conversation_id=conversation_id,
                sender_id=sender_id,
                content=content,
                message_type=message_type,
                reply_to_id=reply_to_id,
                metadata=metadata or {},
                emotional_tone=analysis.get('emotional_tone'),
                depth_score=analysis.get('depth_score'),
                vulnerability_level=analysis.get('vulnerability_level'),
                contains_question=analysis.get('contains_question', False),
                word_count=len(content.split()),
                created_at=datetime.utcnow()
            )
            
            self.db.add(message)
            
            # Update conversation metadata
            await self._update_conversation_metadata(conversation, message, analysis)
            
            # Process for BGP learning
            await self._process_message_for_bgp(message, analysis)
            
            # Cache message for real-time delivery
            await self._cache_message_for_delivery(message)
            
            self.db.commit()
            
            # Trigger real-time notifications
            await self._notify_message_sent(message)
            
            return message
            
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            self.db.rollback()
            return None
    
    async def _analyze_message_content(
        self, 
        content: str, 
        conversation: Conversation, 
        sender_id: int
    ) -> Dict:
        """Analyze message content for emotional tone, depth, and other metrics"""
        
        analysis = {
            'emotional_tone': EmotionalTone.NEUTRAL,
            'depth_score': 0.3,  # Default moderate depth
            'vulnerability_level': 0.0,
            'contains_question': '?' in content,
            'word_count': len(content.split()),
            'emoji_count': len(re.findall(r'[😀-🿿]', content)),
            'contains_future_language': any(word in content.lower() for word in [
                'future', 'tomorrow', 'next', 'plan', 'hope', 'dream', 'goal'
            ])
        }
        
        # Emotional tone analysis
        analysis['emotional_tone'] = self._detect_emotional_tone(content)
        
        # Depth score based on content characteristics
        analysis['depth_score'] = self._calculate_depth_score(content, conversation)
        
        # Vulnerability detection
        analysis['vulnerability_level'] = self._detect_vulnerability_level(content)
        
        # Try AI analysis for premium features
        if await self._should_use_ai_analysis(sender_id):
            try:
                ai_analysis = await self._get_ai_message_analysis(content, conversation)
                analysis.update(ai_analysis)
            except Exception as e:
                logger.warning(f"AI analysis failed, using basic analysis: {e}")
        
        return analysis
    
    def _detect_emotional_tone(self, content: str) -> EmotionalTone:
        """Detect emotional tone using keyword matching and patterns"""
        
        content_lower = content.lower()
        
        # Positive indicators
        positive_words = [
            'happy', 'excited', 'amazing', 'wonderful', 'great', 'love', 'perfect',
            'awesome', 'fantastic', 'brilliant', 'thrilled', 'delighted', '😄', '😊', '❤️'
        ]
        
        # Negative indicators
        negative_words = [
            'sad', 'disappointed', 'frustrated', 'angry', 'terrible', 'awful',
            'horrible', 'worried', 'stressed', 'upset', 'annoyed', '😢', '😞', '😤'
        ]
        
        # Vulnerable/serious indicators
        vulnerable_words = [
            'honestly', 'to be honest', 'i feel', 'i\'m feeling', 'struggling',
            'difficult', 'personal', 'share', 'trust', 'open up'
        ]
        
        # Excited indicators
        excited_indicators = [
            '!', 'omg', 'wow', 'incredible', 'can\'t wait', 'so excited'
        ]
        
        positive_count = sum(1 for word in positive_words if word in content_lower)
        negative_count = sum(1 for word in negative_words if word in content_lower)
        vulnerable_count = sum(1 for word in vulnerable_words if word in content_lower)
        excited_count = sum(1 for indicator in excited_indicators if indicator in content_lower)
        
        # Determine dominant tone
        if excited_count > 0 and positive_count > negative_count:
            return EmotionalTone.EXCITED
        elif vulnerable_count > 0:
            return EmotionalTone.VULNERABLE
        elif positive_count > negative_count:
            return EmotionalTone.POSITIVE
        elif negative_count > positive_count:
            return EmotionalTone.NEGATIVE
        else:
            return EmotionalTone.NEUTRAL
    
    def _calculate_depth_score(self, content: str, conversation: Conversation) -> float:
        """Calculate conversation depth score (0-1)"""
        
        score = 0.3  # Base score
        content_lower = content.lower()
        
        # Length factor (longer messages tend to be deeper)
        word_count = len(content.split())
        if word_count > 50:
            score += 0.2
        elif word_count > 20:
            score += 0.1
        
        # Deep conversation indicators
        deep_indicators = [
            'because', 'feel like', 'i think', 'i believe', 'my perspective',
            'important to me', 'value', 'meaningful', 'deep', 'philosophy',
            'purpose', 'passion', 'dream', 'goal', 'fear', 'worry'
        ]
        
        deep_count = sum(1 for indicator in deep_indicators if indicator in content_lower)
        score += min(0.3, deep_count * 0.1)
        
        # Question depth
        if '?' in content:
            question_depth_indicators = [
                'why do you', 'what do you think', 'how do you feel',
                'what\'s important', 'what matters', 'what\'s your'
            ]
            if any(indicator in content_lower for indicator in question_depth_indicators):
                score += 0.2
        
        # Personal sharing indicators
        personal_indicators = [
            'i\'ve never', 'i rarely', 'i usually', 'growing up', 'my family',
            'my experience', 'i\'ve learned', 'i realized'
        ]
        
        personal_count = sum(1 for indicator in personal_indicators if indicator in content_lower)
        score += min(0.2, personal_count * 0.1)
        
        return min(1.0, score)
    
    def _detect_vulnerability_level(self, content: str) -> float:
        """Detect vulnerability level in message (0-1)"""
        
        content_lower = content.lower()
        vulnerability_score = 0.0
        
        # High vulnerability indicators
        high_vulnerability = [
            'i\'m scared', 'i\'m worried', 'i\'m insecure', 'i struggle with',
            'i\'ve been hurt', 'hard for me', 'difficult to', 'makes me nervous',
            'i\'m not good at', 'i\'m afraid', 'vulnerable', 'insecurity'
        ]
        
        # Medium vulnerability indicators
        medium_vulnerability = [
            'i feel', 'i\'m feeling', 'honestly', 'to be honest', 'i have to admit',
            'i\'ve never told', 'personal', 'private', 'share something'
        ]
        
        # Low vulnerability indicators
        low_vulnerability = [
            'i think', 'i believe', 'my opinion', 'i prefer', 'i like',
            'i don\'t like', 'i enjoy', 'i\'m interested'
        ]
        
        for indicator in high_vulnerability:
            if indicator in content_lower:
                vulnerability_score = max(vulnerability_score, 0.8)
        
        for indicator in medium_vulnerability:
            if indicator in content_lower:
                vulnerability_score = max(vulnerability_score, 0.5)
        
        for indicator in low_vulnerability:
            if indicator in content_lower:
                vulnerability_score = max(vulnerability_score, 0.2)
        
        return vulnerability_score
    
    async def _should_use_ai_analysis(self, user_id: int) -> bool:
        """Check if user can use AI analysis features"""
        user = self.db.query(User).filter(User.id == user_id).first()
        return user and user.is_premium()
    
    async def _get_ai_message_analysis(self, content: str, conversation: Conversation) -> Dict:
        """Get AI-powered message analysis"""
        
        # Get recent conversation context
        recent_messages = self.db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at.desc()).limit(5).all()
        
        context = [
            {
                "content": msg.content,
                "sender_id": msg.sender_id,
                "emotional_tone": msg.emotional_tone.value if msg.emotional_tone else "neutral"
            }
            for msg in reversed(recent_messages)
        ]
        
        prompt = f"""
        Analyze this message in the context of a dating conversation:
        
        Message: "{content}"
        
        Recent context: {json.dumps(context)}
        
        Provide analysis in JSON format with:
        - emotional_tone: (positive, negative, neutral, excited, vulnerable)
        - depth_score: (0.0-1.0)
        - vulnerability_level: (0.0-1.0)
        - intimacy_level: (0.0-1.0)
        - conversation_direction: (deepening, maintaining, deflecting)
        """
        
        try:
            response = await gpt_client.generate_completion(
                prompt=prompt,
                max_tokens=150,
                temperature=0.3
            )
            
            # Parse JSON response
            analysis = json.loads(response)
            
            # Convert emotional_tone string to enum
            tone_map = {
                'positive': EmotionalTone.POSITIVE,
                'negative': EmotionalTone.NEGATIVE,
                'excited': EmotionalTone.EXCITED,
                'vulnerable': EmotionalTone.VULNERABLE,
                'neutral': EmotionalTone.NEUTRAL
            }
            
            analysis['emotional_tone'] = tone_map.get(
                analysis.get('emotional_tone', 'neutral'), 
                EmotionalTone.NEUTRAL
            )
            
            return analysis
            
        except Exception as e:
            logger.warning(f"AI message analysis failed: {e}")
            return {}
    
    async def _update_conversation_metadata(
        self, 
        conversation: Conversation, 
        message: Message, 
        analysis: Dict
    ) -> None:
        """Update conversation-level metadata based on new message"""
        
        # Update message count
        conversation.message_count = (conversation.message_count or 0) + 1
        
        # Update last activity
        conversation.last_activity_at = message.created_at
        
        # Update emotional progression
        if analysis.get('vulnerability_level', 0) > 0.5:
            conversation.vulnerability_events = (conversation.vulnerability_events or 0) + 1
        
        # Update depth progression
        depth_score = analysis.get('depth_score', 0)
        if depth_score > 0.6:
            conversation.deep_conversation_count = (conversation.deep_conversation_count or 0) + 1
        
        # Calculate rolling emotional connection score
        await self._update_emotional_connection_score(conversation)
        
        # Update conversation health metrics
        await self._update_conversation_health(conversation)
    
    async def _update_emotional_connection_score(self, conversation: Conversation) -> None:
        """Update the emotional connection score for the conversation"""
        
        # Get recent messages for analysis
        recent_messages = self.db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at.desc()).limit(20).all()
        
        if not recent_messages:
            return
        
        # Calculate factors contributing to emotional connection
        factors = {
            'mutual_vulnerability': 0.0,
            'conversation_balance': 0.0,
            'emotional_positivity': 0.0,
            'depth_progression': 0.0,
            'response_consistency': 0.0
        }
        
        # Mutual vulnerability (both participants sharing vulnerable content)
        user1_vulnerability = sum(
            msg.vulnerability_level or 0 
            for msg in recent_messages 
            if msg.sender_id == conversation.participant_1_id
        )
        user2_vulnerability = sum(
            msg.vulnerability_level or 0 
            for msg in recent_messages 
            if msg.sender_id == conversation.participant_2_id
        )
        
        if user1_vulnerability > 0 and user2_vulnerability > 0:
            factors['mutual_vulnerability'] = min(1.0, (user1_vulnerability + user2_vulnerability) / 10)
        
        # Conversation balance
        user1_messages = len([m for m in recent_messages if m.sender_id == conversation.participant_1_id])
        user2_messages = len([m for m in recent_messages if m.sender_id == conversation.participant_2_id])
        total_messages = len(recent_messages)
        
        if total_messages > 0:
            balance = 1.0 - abs((user1_messages / total_messages) - 0.5) * 2
            factors['conversation_balance'] = balance
        
        # Emotional positivity
        positive_emotions = len([
            m for m in recent_messages 
            if m.emotional_tone in [EmotionalTone.POSITIVE, EmotionalTone.EXCITED]
        ])
        factors['emotional_positivity'] = min(1.0, positive_emotions / max(1, total_messages))
        
        # Depth progression
        if recent_messages:
            recent_depth = sum(msg.depth_score or 0 for msg in recent_messages[:5]) / 5
            factors['depth_progression'] = recent_depth
        
        # Calculate weighted emotional connection score
        weights = {
            'mutual_vulnerability': 0.35,
            'conversation_balance': 0.20,
            'emotional_positivity': 0.20,
            'depth_progression': 0.25
        }
        
        connection_score = sum(
            factors[factor] * weight 
            for factor, weight in weights.items()
        )
        
        conversation.emotional_connection_score = connection_score
    
    async def _update_conversation_health(self, conversation: Conversation) -> None:
        """Update overall conversation health metrics"""
        
        # Calculate response time health
        recent_messages = self.db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at.desc()).limit(10).all()
        
        response_times = []
        for i in range(1, len(recent_messages)):
            prev_msg = recent_messages[i]
            curr_msg = recent_messages[i-1]
            
            if prev_msg.sender_id != curr_msg.sender_id:
                time_diff = (curr_msg.created_at - prev_msg.created_at).total_seconds()
                response_times.append(time_diff)
        
        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
            conversation.avg_response_time_minutes = avg_response_time / 60
        
        # Update overall health score
        health_factors = {
            'activity_recency': self._calculate_activity_recency_score(conversation),
            'emotional_connection': conversation.emotional_connection_score or 0,
            'message_balance': self._calculate_message_balance_score(conversation),
            'conversation_growth': self._calculate_growth_score(conversation)
        }
        
        conversation.health_score = sum(health_factors.values()) / len(health_factors)
    
    def _calculate_activity_recency_score(self, conversation: Conversation) -> float:
        """Calculate score based on recent activity"""
        if not conversation.last_activity_at:
            return 0.0
        
        hours_since_activity = (datetime.utcnow() - conversation.last_activity_at).total_seconds() / 3600
        
        if hours_since_activity < 1:
            return 1.0
        elif hours_since_activity < 24:
            return 0.8
        elif hours_since_activity < 72:
            return 0.6
        elif hours_since_activity < 168:  # 1 week
            return 0.3
        else:
            return 0.1
    
    def _calculate_message_balance_score(self, conversation: Conversation) -> float:
        """Calculate conversation balance score"""
        # This would examine message distribution between participants
        # For now, return a moderate score
        return 0.7
    
    def _calculate_growth_score(self, conversation: Conversation) -> float:
        """Calculate conversation growth/progression score"""
        depth_events = conversation.deep_conversation_count or 0
        vulnerability_events = conversation.vulnerability_events or 0
        total_messages = conversation.message_count or 1
        
        growth_rate = (depth_events + vulnerability_events) / total_messages
        return min(1.0, growth_rate * 5)  # Scale to 0-1
    
    async def _process_message_for_bgp(self, message: Message, analysis: Dict) -> None:
        """Process message for BGP profile building"""
        
        # Create activity metadata for BGP processing
        bgp_metadata = {
            'message_length': len(message.content),
            'emotional_tone': analysis.get('emotional_tone', EmotionalTone.NEUTRAL).value,
            'depth_score': analysis.get('depth_score', 0),
            'vulnerability_level': analysis.get('vulnerability_level', 0),
            'contains_question': analysis.get('contains_question', False),
            'emoji_count': analysis.get('emoji_count', 0),
            'response_time_seconds': self._calculate_response_time(message),
            'conversation_id': message.conversation_id
        }
        
        # Process as BGP activity
        await self.bgp_builder.process_user_activity(
            user_id=message.sender_id,
            activity_type='message_sent',
            metadata=bgp_metadata
        )
    
    def _calculate_response_time(self, message: Message) -> Optional[float]:
        """Calculate response time for this message"""
        
        # Get previous message from different sender
        prev_message = self.db.query(Message).filter(
            Message.conversation_id == message.conversation_id,
            Message.sender_id != message.sender_id,
            Message.created_at < message.created_at
        ).order_by(Message.created_at.desc()).first()
        
        if prev_message:
            return (message.created_at - prev_message.created_at).total_seconds()
        
        return None
    
    async def _cache_message_for_delivery(self, message: Message) -> None:
        """Cache message for real-time delivery via WebSocket"""
        
        message_data = {
            'id': message.id,
            'conversation_id': message.conversation_id,
            'sender_id': message.sender_id,
            'content': message.content,
            'message_type': message.message_type.value,
            'emotional_tone': message.emotional_tone.value if message.emotional_tone else None,
            'created_at': message.created_at.isoformat(),
            'metadata': message.metadata
        }
        
        # Cache for WebSocket delivery
        await redis_client.publish_message(
            f"conversation:{message.conversation_id}",
            message_data
        )
    
    async def _notify_message_sent(self, message: Message) -> None:
        """Send real-time notifications for new message"""
        
        conversation = self.db.query(Conversation).filter(
            Conversation.id == message.conversation_id
        ).first()
        
        if not conversation:
            return
        
        # Get recipient ID
        recipient_id = (
            conversation.participant_2_id 
            if message.sender_id == conversation.participant_1_id 
            else conversation.participant_1_id
        )
        
        # Send notification to recipient
        notification_data = {
            'type': 'new_message',
            'conversation_id': message.conversation_id,
            'sender_id': message.sender_id,
            'message_preview': message.content[:50] + '...' if len(message.content) > 50 else message.content,
            'timestamp': message.created_at.isoformat()
        }
        
        await redis_client.send_user_notification(recipient_id, notification_data)
    
    async def mark_messages_as_read(
        self, 
        conversation_id: int, 
        user_id: int, 
        last_read_message_id: Optional[int] = None
    ) -> bool:
        """Mark messages as read in a conversation"""
        
        try:
            query = self.db.query(Message).filter(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id,  # Don't mark own messages as read
                Message.is_read == False
            )
            
            if last_read_message_id:
                query = query.filter(Message.id <= last_read_message_id)
            
            messages_to_mark = query.all()
            
            for message in messages_to_mark:
                message.is_read = True
                message.read_at = datetime.utcnow()
            
            self.db.commit()
            
            # Send read receipt notification
            if messages_to_mark:
                await self._send_read_receipt(conversation_id, user_id, len(messages_to_mark))
            
            return True
            
        except Exception as e:
            logger.error(f"Error marking messages as read: {e}")
            self.db.rollback()
            return False
    
    async def _send_read_receipt(self, conversation_id: int, reader_id: int, message_count: int) -> None:
        """Send read receipt notification"""
        
        receipt_data = {
            'type': 'read_receipt',
            'conversation_id': conversation_id,
            'reader_id': reader_id,
            'messages_read': message_count,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        await redis_client.publish_message(
            f"conversation:{conversation_id}",
            receipt_data
        )
    
    def get_conversation_messages(
        self, 
        conversation_id: int, 
        user_id: int, 
        limit: int = 50, 
        before_message_id: Optional[int] = None
    ) -> List[Message]:
        """Get messages from a conversation with pagination"""
        
        # Verify user has access to conversation
        conversation = self.db.query(Conversation).filter(
            Conversation.id == conversation_id,
            or_(
                Conversation.participant_1_id == user_id,
                Conversation.participant_2_id == user_id
            )
        ).first()
        
        if not conversation:
            return []
        
        query = self.db.query(Message).filter(
            Message.conversation_id == conversation_id
        )
        
        if before_message_id:
            query = query.filter(Message.id < before_message_id)
        
        return query.order_by(Message.created_at.desc()).limit(limit).all()
    
    def get_user_conversations(self, user_id: int, limit: int = 20) -> List[Conversation]:
        """Get user's conversations ordered by last activity"""
        
        return self.db.query(Conversation).filter(
            or_(
                Conversation.participant_1_id == user_id,
                Conversation.participant_2_id == user_id
            ),
            Conversation.is_active == True
        ).order_by(Conversation.last_activity_at.desc()).limit(limit).all()
    
    async def get_conversation_insights(self, conversation_id: int, user_id: int) -> Dict:
        """Get AI-powered conversation insights"""
        
        # Verify access
        conversation = self.db.query(Conversation).filter(
            Conversation.id == conversation_id,
            or_(
                Conversation.participant_1_id == user_id,
                Conversation.participant_2_id == user_id
            )
        ).first()
        
        if not conversation:
            return {"error": "Conversation not found"}
        
        # Use BGP Builder's conversation analysis
        analysis = await self.bgp_builder.analyze_conversation_patterns(conversation_id)
        
        if analysis.get("insufficient_data"):
            return {
                "message": "Not enough conversation data for insights",
                "minimum_messages_needed": 5
            }
        
        # Enhance with additional insights
        insights = {
            "conversation_health": {
                "overall_score": conversation.health_score or 0.5,
                "emotional_connection": conversation.emotional_connection_score or 0.0,
                "activity_level": self._calculate_activity_recency_score(conversation),
                "balance_score": analysis.get("message_balance", {}).get("balance_score", 0.5)
            },
            "communication_patterns": analysis.get("response_time_patterns", {}),
            "emotional_progression": analysis.get("emotional_progression", {}),
            "depth_analysis": analysis.get("depth_progression", {}),
            "engagement_metrics": {
                "mutual_engagement": analysis.get("mutual_engagement_score", 0.0),
                "total_messages": analysis.get("total_messages", 0),
                "conversation_duration_hours": analysis.get("conversation_duration", 0)
            },
            "recommendations": self._generate_conversation_recommendations(analysis, conversation)
        }
        
        return insights
    
    def _generate_conversation_recommendations(self, analysis: Dict, conversation: Conversation) -> List[str]:
        """Generate conversation improvement recommendations"""
        
        recommendations = []
        
        # Balance recommendations
        balance = analysis.get("message_balance", {})
        if balance.get("balance_score", 0.5) < 0.6:
            if balance.get("user1_ratio", 0.5) > 0.7:
                recommendations.append("Try asking more questions to encourage your match to share more")
            else:
                recommendations.append("Feel free to share more about yourself to balance the conversation")
        
        # Depth recommendations
        depth = analysis.get("depth_progression", {})
        if depth.get("avg_depth", 0.3) < 0.4:
            recommendations.append("Consider asking deeper questions to build emotional connection")
        
        # Response time recommendations
        response_times = analysis.get("response_time_patterns", {})
        if response_times.get("slow_response_ratio", 0) > 0.7:
            recommendations.append("Faster responses can help maintain conversation momentum")
        
        # Emotional connection recommendations
        if (conversation.emotional_connection_score or 0) < 0.5:
            recommendations.append("Try sharing something personal to deepen your connection")
        
        if not recommendations:
            recommendations.append("Your conversation is going well! Keep being authentic and engaged.")
        
        return recommendations[:3]  # Return top 3 recommendations
    
    async def search_messages(
        self, 
        user_id: int, 
        query: str, 
        conversation_id: Optional[int] = None,
        limit: int = 20
    ) -> List[Message]:
        """Search messages by content"""
        
        # Base query - only conversations user participates in
        message_query = self.db.query(Message).join(Conversation).filter(
            or_(
                Conversation.participant_1_id == user_id,
                Conversation.participant_2_id == user_id
            ),
            Message.content.contains(query)
        )
        
        if conversation_id:
            message_query = message_query.filter(Message.conversation_id == conversation_id)
        
        return message_query.order_by(Message.created_at.desc()).limit(limit).all()
    
    async def delete_message(self, message_id: int, user_id: int) -> bool:
        """Delete a message (soft delete)"""
        
        try:
            message = self.db.query(Message).filter(
                Message.id == message_id,
                Message.sender_id == user_id  # Can only delete own messages
            ).first()
            
            if not message:
                return False
            
            # Soft delete
            message.is_deleted = True
            message.deleted_at = datetime.utcnow()
            
            self.db.commit()
            
            # Notify conversation participants
            await self._notify_message_deleted(message)
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting message: {e}")
            self.db.rollback()
            return False
    
    async def _notify_message_deleted(self, message: Message) -> None:
        """Notify participants that a message was deleted"""
        
        notification_data = {
            'type': 'message_deleted',
            'conversation_id': message.conversation_id,
            'message_id': message.id,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        await redis_client.publish_message(
            f"conversation:{message.conversation_id}",
            notification_data
        )
    
    async def report_message(
        self, 
        message_id: int, 
        reporter_id: int, 
        reason: str, 
        details: Optional[str] = None
    ) -> bool:
        """Report a message for inappropriate content"""
        
        try:
            message = self.db.query(Message).filter(Message.id == message_id).first()
            if not message:
                return False
            
            # Create report record (would integrate with moderation system)
            report_data = {
                'message_id': message_id,
                'reporter_id': reporter_id,
                'reported_user_id': message.sender_id,
                'reason': reason,
                'details': details,
                'message_content': message.content,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Store in Redis for moderation queue
            await redis_client.redis.lpush(
                "message_reports", 
                json.dumps(report_data)
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error reporting message: {e}")
            return False
    
    async def set_typing_indicator(
        self, 
        conversation_id: int, 
        user_id: int, 
        is_typing: bool
    ) -> None:
        """Set typing indicator for real-time updates"""
        
        typing_data = {
            'type': 'typing_indicator',
            'conversation_id': conversation_id,
            'user_id': user_id,
            'is_typing': is_typing,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Send via WebSocket
        await redis_client.publish_message(
            f"conversation:{conversation_id}",
            typing_data
        )
        
        # Cache typing state
        cache_key = f"typing:{conversation_id}:{user_id}"
        if is_typing:
            await redis_client.redis.setex(cache_key, 10, "true")  # 10 second timeout
        else:
            await redis_client.redis.delete(cache_key)
    
    async def get_conversation_statistics(self, conversation_id: int, user_id: int) -> Dict:
        """Get detailed conversation statistics"""
        
        # Verify access
        conversation = self.db.query(Conversation).filter(
            Conversation.id == conversation_id,
            or_(
                Conversation.participant_1_id == user_id,
                Conversation.participant_2_id == user_id
            )
        ).first()
        
        if not conversation:
            return {"error": "Conversation not found"}
        
        # Get message statistics
        messages = self.db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).all()
        
        if not messages:
            return {"message": "No messages yet"}
        
        # Calculate statistics
        total_messages = len(messages)
        user_messages = len([m for m in messages if m.sender_id == user_id])
        other_messages = total_messages - user_messages
        
        # Word count analysis
        user_words = sum(m.word_count for m in messages if m.sender_id == user_id and m.word_count)
        other_words = sum(m.word_count for m in messages if m.sender_id != user_id and m.word_count)
        
        # Emotional analysis
        emotional_breakdown = {}
        for tone in EmotionalTone:
            count = len([m for m in messages if m.emotional_tone == tone])
            emotional_breakdown[tone.value] = count
        
        # Time analysis
        first_message = min(messages, key=lambda m: m.created_at)
        last_message = max(messages, key=lambda m: m.created_at)
        duration = (last_message.created_at - first_message.created_at).total_seconds() / 3600
        
        return {
            "conversation_overview": {
                "total_messages": total_messages,
                "duration_hours": round(duration, 1),
                "messages_per_hour": round(total_messages / max(duration, 1), 2)
            },
            "participation": {
                "your_messages": user_messages,
                "their_messages": other_messages,
                "your_percentage": round((user_messages / total_messages) * 100, 1),
                "balance_score": round(1.0 - abs((user_messages / total_messages) - 0.5) * 2, 2)
            },
            "communication_style": {
                "your_avg_words": round(user_words / max(user_messages, 1), 1),
                "their_avg_words": round(other_words / max(other_messages, 1), 1),
                "total_words": user_words + other_words
            },
            "emotional_breakdown": emotional_breakdown,
            "connection_metrics": {
                "emotional_connection_score": conversation.emotional_connection_score or 0.0,
                "conversation_health": conversation.health_score or 0.5,
                "vulnerability_events": conversation.vulnerability_events or 0,
                "deep_conversations": conversation.deep_conversation_count or 0
            }
        }