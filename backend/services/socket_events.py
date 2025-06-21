# backend/services/socket_events.py
"""
ApexMatch WebSocket Event Service
Manages real-time events, notifications, and WebSocket communication
"""

from typing import Dict, List, Optional, Set, Any
from datetime import datetime, timedelta
import json
import asyncio
import logging
from enum import Enum

from clients.redis_client import redis_client
from models.user import User
from models.conversation import Conversation, Message
from models.match import Match
from models.reveal import PhotoReveal
from config import settings

logger = logging.getLogger(__name__)


class WebSocketEventType(str, Enum):
    # Connection events
    USER_CONNECTED = "user_connected"
    USER_DISCONNECTED = "user_disconnected"
    HEARTBEAT = "heartbeat"
    
    # Chat events
    MESSAGE_SENT = "message_sent"
    MESSAGE_RECEIVED = "message_received"
    TYPING_START = "typing_start"
    TYPING_STOP = "typing_stop"
    MESSAGE_READ = "message_read"
    
    # Match events
    NEW_MATCH = "new_match"
    MATCH_ACCEPTED = "match_accepted"
    MATCH_REJECTED = "match_rejected"
    
    # Reveal events
    REVEAL_REQUEST = "reveal_request"
    REVEAL_RESPONSE = "reveal_response"
    REVEAL_STAGE_CHANGE = "reveal_stage_change"
    REVEAL_COUNTDOWN = "reveal_countdown"
    REVEAL_COMPLETED = "reveal_completed"
    
    # Notification events
    NOTIFICATION = "notification"
    TRUST_TIER_UPGRADE = "trust_tier_upgrade"
    SUBSCRIPTION_UPDATE = "subscription_update"
    
    # System events
    SYSTEM_ANNOUNCEMENT = "system_announcement"
    MAINTENANCE_MODE = "maintenance_mode"


class SocketEventsService:
    """
    Service for managing WebSocket events and real-time communication
    """
    
    def __init__(self):
        self.active_connections: Dict[int, Set[str]] = {}  # user_id -> set of connection_ids
        self.connection_metadata: Dict[str, Dict] = {}  # connection_id -> metadata
        self.user_status: Dict[int, str] = {}  # user_id -> status
        self.conversation_participants: Dict[int, Set[int]] = {}  # conversation_id -> user_ids
        self.typing_indicators: Dict[int, Dict[int, datetime]] = {}  # conversation_id -> {user_id: timestamp}
    
    async def handle_user_connected(self, user_id: int, connection_id: str, metadata: Dict) -> Dict:
        """Handle user connection event"""
        
        try:
            # Add connection to active connections
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            
            self.active_connections[user_id].add(connection_id)
            
            # Store connection metadata
            self.connection_metadata[connection_id] = {
                "user_id": user_id,
                "connected_at": datetime.utcnow(),
                "client_info": metadata.get("client_info", {}),
                "last_heartbeat": datetime.utcnow()
            }
            
            # Update user status
            previous_status = self.user_status.get(user_id, "offline")
            self.user_status[user_id] = "online"
            
            # Cache online status
            await redis_client.redis.setex(
                f"user_status:{user_id}",
                300,  # 5 minutes
                "online"
            )
            
            # Notify user's conversations about online status
            if previous_status != "online":
                await self._notify_status_change(user_id, "online")
            
            # Send welcome message with pending notifications
            welcome_data = await self._get_welcome_data(user_id)
            
            await self._send_to_user(user_id, {
                "type": WebSocketEventType.USER_CONNECTED,
                "data": welcome_data,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            logger.info(f"User {user_id} connected with connection {connection_id}")
            
            return {"success": True, "connection_id": connection_id}
            
        except Exception as e:
            logger.error(f"Error handling user connection: {e}")
            return {"success": False, "error": "Failed to handle connection"}
    
    async def handle_user_disconnected(self, connection_id: str) -> Dict:
        """Handle user disconnection event"""
        
        try:
            if connection_id not in self.connection_metadata:
                return {"success": True, "message": "Connection not found"}
            
            metadata = self.connection_metadata[connection_id]
            user_id = metadata["user_id"]
            
            # Remove connection
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(connection_id)
                
                # If no more connections, mark user as offline
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
                    self.user_status[user_id] = "offline"
                    
                    # Update cache
                    await redis_client.redis.setex(
                        f"user_status:{user_id}",
                        3600,  # 1 hour
                        "offline"
                    )
                    
                    # Store last seen time
                    await redis_client.redis.setex(
                        f"user_last_seen:{user_id}",
                        86400 * 7,  # 7 days
                        datetime.utcnow().isoformat()
                    )
                    
                    # Notify conversations about offline status
                    await self._notify_status_change(user_id, "offline")
            
            # Clean up connection metadata
            del self.connection_metadata[connection_id]
            
            # Clear typing indicators for this user
            await self._clear_typing_indicators(user_id)
            
            logger.info(f"User {user_id} disconnected (connection {connection_id})")
            
            return {"success": True, "user_id": user_id}
            
        except Exception as e:
            logger.error(f"Error handling user disconnection: {e}")
            return {"success": False, "error": "Failed to handle disconnection"}
    
    async def _get_welcome_data(self, user_id: int) -> Dict:
        """Get welcome data for newly connected user"""
        
        # Get pending notifications
        pending_notifications = await redis_client.redis.lrange(
            f"notifications:{user_id}", 0, -1
        )
        
        notifications = []
        for notification_str in pending_notifications:
            try:
                notification = json.loads(notification_str)
                notifications.append(notification)
            except json.JSONDecodeError:
                continue
        
        # Get active conversations
        active_conversations = await redis_client.get_json(
            f"user_conversations:{user_id}"
        ) or []
        
        # Get unread message counts
        unread_counts = {}
        for conv_id in active_conversations:
            count = await redis_client.redis.get(f"unread_count:{user_id}:{conv_id}")
            if count:
                unread_counts[conv_id] = int(count)
        
        return {
            "pending_notifications": notifications[-10:],  # Last 10 notifications
            "active_conversations": active_conversations,
            "unread_message_counts": unread_counts,
            "online_status": "online",
            "connection_time": datetime.utcnow().isoformat()
        }
    
    async def _notify_status_change(self, user_id: int, status: str) -> None:
        """Notify conversations about user status change"""
        
        # Get user's active conversations
        conversations = await redis_client.get_json(f"user_conversations:{user_id}") or []
        
        status_update = {
            "type": "user_status_change",
            "user_id": user_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to each conversation
        for conv_id in conversations:
            await redis_client.publish_message(
                f"conversation:{conv_id}",
                status_update
            )
    
    async def _clear_typing_indicators(self, user_id: int) -> None:
        """Clear typing indicators for disconnected user"""
        
        for conv_id in list(self.typing_indicators.keys()):
            if user_id in self.typing_indicators[conv_id]:
                del self.typing_indicators[conv_id][user_id]
                
                # Notify conversation that user stopped typing
                await self._send_typing_indicator(conv_id, user_id, False)
    
    async def handle_heartbeat(self, connection_id: str) -> Dict:
        """Handle heartbeat from connection"""
        
        if connection_id in self.connection_metadata:
            self.connection_metadata[connection_id]["last_heartbeat"] = datetime.utcnow()
            
            user_id = self.connection_metadata[connection_id]["user_id"]
            
            # Update online status cache
            await redis_client.redis.setex(
                f"user_status:{user_id}",
                300,  # 5 minutes
                "online"
            )
            
            return {
                "type": WebSocketEventType.HEARTBEAT,
                "timestamp": datetime.utcnow().isoformat(),
                "connection_healthy": True
            }
        
        return {"error": "Connection not found"}
    
    async def handle_message_sent(self, user_id: int, message_data: Dict) -> Dict:
        """Handle message sent event"""
        
        try:
            conversation_id = message_data["conversation_id"]
            message_content = message_data["content"]
            
            # Create message event
            message_event = {
                "type": WebSocketEventType.MESSAGE_SENT,
                "conversation_id": conversation_id,
                "sender_id": user_id,
                "content": message_content,
                "message_type": message_data.get("message_type", "text"),
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": message_data.get("metadata", {})
            }
            
            # Send to conversation participants
            await redis_client.publish_message(
                f"conversation:{conversation_id}",
                message_event
            )
            
            # Update unread counts for other participants
            await self._update_unread_counts(conversation_id, user_id)
            
            # Clear typing indicator for sender
            await self._send_typing_indicator(conversation_id, user_id, False)
            
            return {"success": True, "message": "Message sent successfully"}
            
        except Exception as e:
            logger.error(f"Error handling message sent: {e}")
            return {"success": False, "error": "Failed to send message"}
    
    async def handle_typing_indicator(
        self, 
        user_id: int, 
        conversation_id: int, 
        is_typing: bool
    ) -> Dict:
        """Handle typing indicator event"""
        
        try:
            if conversation_id not in self.typing_indicators:
                self.typing_indicators[conversation_id] = {}
            
            if is_typing:
                self.typing_indicators[conversation_id][user_id] = datetime.utcnow()
            else:
                self.typing_indicators[conversation_id].pop(user_id, None)
            
            # Send typing indicator to conversation
            await self._send_typing_indicator(conversation_id, user_id, is_typing)
            
            # Schedule automatic typing stop (10 seconds)
            if is_typing:
                await self._schedule_typing_stop(conversation_id, user_id)
            
            return {"success": True}
            
        except Exception as e:
            logger.error(f"Error handling typing indicator: {e}")
            return {"success": False, "error": "Failed to update typing indicator"}
    
    async def _send_typing_indicator(
        self, 
        conversation_id: int, 
        user_id: int, 
        is_typing: bool
    ) -> None:
        """Send typing indicator to conversation participants"""
        
        typing_event = {
            "type": WebSocketEventType.TYPING_START if is_typing else WebSocketEventType.TYPING_STOP,
            "conversation_id": conversation_id,
            "user_id": user_id,
            "is_typing": is_typing,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await redis_client.publish_message(
            f"conversation:{conversation_id}",
            typing_event
        )
    
    async def _schedule_typing_stop(self, conversation_id: int, user_id: int) -> None:
        """Schedule automatic typing stop after timeout"""
        
        await asyncio.sleep(10)  # 10 second timeout
        
        # Check if user is still typing
        if (conversation_id in self.typing_indicators and 
            user_id in self.typing_indicators[conversation_id]):
            
            last_typing = self.typing_indicators[conversation_id][user_id]
            if (datetime.utcnow() - last_typing).seconds >= 10:
                # Auto-stop typing
                del self.typing_indicators[conversation_id][user_id]
                await self._send_typing_indicator(conversation_id, user_id, False)
    
    async def _update_unread_counts(self, conversation_id: int, sender_id: int) -> None:
        """Update unread message counts for conversation participants"""
        
        # Get conversation participants
        participants = await redis_client.get_json(f"conversation_participants:{conversation_id}")
        
        if not participants:
            return
        
        # Increment unread count for non-senders
        for participant_id in participants:
            if participant_id != sender_id:
                current_count = await redis_client.redis.get(
                    f"unread_count:{participant_id}:{conversation_id}"
                ) or 0
                
                await redis_client.redis.setex(
                    f"unread_count:{participant_id}:{conversation_id}",
                    86400 * 7,  # 7 days
                    int(current_count) + 1
                )
    
    async def handle_message_read(
        self, 
        user_id: int, 
        conversation_id: int, 
        last_read_message_id: Optional[int] = None
    ) -> Dict:
        """Handle message read event"""
        
        try:
            # Clear unread count
            await redis_client.redis.delete(f"unread_count:{user_id}:{conversation_id}")
            
            # Send read receipt
            read_event = {
                "type": WebSocketEventType.MESSAGE_READ,
                "conversation_id": conversation_id,
                "reader_id": user_id,
                "last_read_message_id": last_read_message_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await redis_client.publish_message(
                f"conversation:{conversation_id}",
                read_event
            )
            
            return {"success": True}
            
        except Exception as e:
            logger.error(f"Error handling message read: {e}")
            return {"success": False, "error": "Failed to mark messages as read"}
    
    async def handle_new_match(self, match_data: Dict) -> Dict:
        """Handle new match event"""
        
        try:
            target_user_id = match_data["target_user_id"]
            initiator_user_id = match_data["initiator_user_id"]
            
            match_event = {
                "type": WebSocketEventType.NEW_MATCH,
                "match_id": match_data["match_id"],
                "initiator_profile": match_data.get("initiator_profile", {}),
                "compatibility_score": match_data.get("compatibility_score", 0),
                "match_explanation": match_data.get("match_explanation", {}),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Send to target user
            await self._send_to_user(target_user_id, match_event)
            
            # Send confirmation to initiator
            initiator_event = {
                "type": "match_sent",
                "match_id": match_data["match_id"],
                "target_profile": match_data.get("target_profile", {}),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await self._send_to_user(initiator_user_id, initiator_event)
            
            return {"success": True}
            
        except Exception as e:
            logger.error(f"Error handling new match: {e}")
            return {"success": False, "error": "Failed to send match notification"}
    
    async def handle_match_response(self, match_response_data: Dict) -> Dict:
        """Handle match acceptance/rejection"""
        
        try:
            match_id = match_response_data["match_id"]
            responding_user_id = match_response_data["responding_user_id"]
            initiator_user_id = match_response_data["initiator_user_id"]
            response = match_response_data["response"]  # "accepted" or "rejected"
            
            if response == "accepted":
                # Create conversation for mutual match
                conversation_id = match_response_data.get("conversation_id")
                
                accepted_event = {
                    "type": WebSocketEventType.MATCH_ACCEPTED,
                    "match_id": match_id,
                    "conversation_id": conversation_id,
                    "mutual_match": True,
                    "celebration": True,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                # Send to both users
                await self._send_to_user(initiator_user_id, accepted_event)
                await self._send_to_user(responding_user_id, accepted_event)
                
                # Set up conversation participants cache
                await redis_client.set_json(
                    f"conversation_participants:{conversation_id}",
                    [initiator_user_id, responding_user_id],
                    ex=86400 * 30  # 30 days
                )
                
            else:  # rejected
                rejected_event = {
                    "type": WebSocketEventType.MATCH_REJECTED,
                    "match_id": match_id,
                    "message": "Your match was not accepted",
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                # Only send to initiator
                await self._send_to_user(initiator_user_id, rejected_event)
            
            return {"success": True}
            
        except Exception as e:
            logger.error(f"Error handling match response: {e}")
            return {"success": False, "error": "Failed to handle match response"}
    
    async def handle_reveal_event(self, reveal_data: Dict) -> Dict:
        """Handle photo reveal events"""
        
        try:
            event_type = reveal_data["event_type"]
            reveal_id = reveal_data["reveal_id"]
            conversation_id = reveal_data["conversation_id"]
            
            if event_type == "reveal_request":
                await self._handle_reveal_request(reveal_data)
            
            elif event_type == "reveal_response":
                await self._handle_reveal_response(reveal_data)
            
            elif event_type == "reveal_stage_change":
                await self._handle_reveal_stage_change(reveal_data)
            
            elif event_type == "reveal_countdown":
                await self._handle_reveal_countdown(reveal_data)
            
            elif event_type == "reveal_completed":
                await self._handle_reveal_completed(reveal_data)
            
            return {"success": True}
            
        except Exception as e:
            logger.error(f"Error handling reveal event: {e}")
            return {"success": False, "error": "Failed to handle reveal event"}
    
    async def _handle_reveal_request(self, reveal_data: Dict) -> None:
        """Handle reveal request event"""
        
        target_user_id = reveal_data["target_user_id"]
        requesting_user_id = reveal_data["requesting_user_id"]
        
        request_event = {
            "type": WebSocketEventType.REVEAL_REQUEST,
            "reveal_id": reveal_data["reveal_id"],
            "requesting_user_id": requesting_user_id,
            "emotional_message": reveal_data.get("emotional_message"),
            "emotional_readiness": reveal_data.get("emotional_readiness"),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to target user
        await self._send_to_user(target_user_id, request_event)
        
        # Send to conversation
        await redis_client.publish_message(
            f"conversation:{reveal_data['conversation_id']}",
            request_event
        )
    
    async def _handle_reveal_stage_change(self, reveal_data: Dict) -> None:
        """Handle reveal stage progression"""
        
        stage_event = {
            "type": WebSocketEventType.REVEAL_STAGE_CHANGE,
            "reveal_id": reveal_data["reveal_id"],
            "current_stage": reveal_data["current_stage"],
            "message": reveal_data.get("message"),
            "stage_timeout": reveal_data.get("stage_timeout"),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to conversation
        await redis_client.publish_message(
            f"conversation:{reveal_data['conversation_id']}",
            stage_event
        )
    
    async def _handle_reveal_countdown(self, reveal_data: Dict) -> None:
        """Handle reveal countdown"""
        
        countdown_seconds = reveal_data.get("countdown_seconds", 30)
        
        # Send countdown updates every 5 seconds
        for remaining in range(countdown_seconds, 0, -5):
            countdown_event = {
                "type": WebSocketEventType.REVEAL_COUNTDOWN,
                "reveal_id": reveal_data["reveal_id"],
                "seconds_remaining": remaining,
                "message": f"Photo reveal in {remaining} seconds!",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await redis_client.publish_message(
                f"conversation:{reveal_data['conversation_id']}",
                countdown_event
            )
            
            await asyncio.sleep(5)
    
    async def _handle_reveal_completed(self, reveal_data: Dict) -> None:
        """Handle completed reveal"""
        
        completion_event = {
            "type": WebSocketEventType.REVEAL_COMPLETED,
            "reveal_id": reveal_data["reveal_id"],
            "celebration_data": reveal_data.get("celebration_data", {}),
            "message": "Photos revealed! Enjoy this special moment together.",
            "next_steps": reveal_data.get("next_steps", []),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to conversation with celebration
        await redis_client.publish_message(
            f"conversation:{reveal_data['conversation_id']}",
            completion_event
        )
        
        # Send individual notifications
        requesting_user_id = reveal_data.get("requesting_user_id")
        target_user_id = reveal_data.get("target_user_id")
        
        if requesting_user_id:
            await self._send_to_user(requesting_user_id, completion_event)
        if target_user_id:
            await self._send_to_user(target_user_id, completion_event)
    
    async def send_notification(self, user_id: int, notification: Dict) -> Dict:
        """Send notification to user"""
        
        try:
            notification_event = {
                "type": WebSocketEventType.NOTIFICATION,
                "notification": notification,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Send to user if online
            if user_id in self.active_connections:
                await self._send_to_user(user_id, notification_event)
            
            # Store notification for later delivery
            await redis_client.redis.lpush(
                f"notifications:{user_id}",
                json.dumps(notification)
            )
            
            # Keep only last 50 notifications
            await redis_client.redis.ltrim(f"notifications:{user_id}", 0, 49)
            
            return {"success": True}
            
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            return {"success": False, "error": "Failed to send notification"}
    
    async def send_system_announcement(self, announcement: Dict, target_users: Optional[List[int]] = None) -> Dict:
        """Send system-wide announcement"""
        
        try:
            announcement_event = {
                "type": WebSocketEventType.SYSTEM_ANNOUNCEMENT,
                "announcement": announcement,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            if target_users:
                # Send to specific users
                for user_id in target_users:
                    await self._send_to_user(user_id, announcement_event)
            else:
                # Send to all connected users
                for user_id in self.active_connections:
                    await self._send_to_user(user_id, announcement_event)
            
            return {"success": True, "recipients": len(target_users) if target_users else len(self.active_connections)}
            
        except Exception as e:
            logger.error(f"Error sending system announcement: {e}")
            return {"success": False, "error": "Failed to send announcement"}
    
    async def _send_to_user(self, user_id: int, event_data: Dict) -> None:
        """Send event to all connections of a user"""
        
        if user_id not in self.active_connections:
            return
        
        # Send to all user's connections
        for connection_id in self.active_connections[user_id]:
            try:
                # In a real implementation, this would send via WebSocket
                # For now, we'll use Redis pub/sub
                await redis_client.publish_message(
                    f"user_events:{user_id}",
                    event_data
                )
            except Exception as e:
                logger.error(f"Error sending to connection {connection_id}: {e}")
    
    async def get_user_status(self, user_id: int) -> Dict:
        """Get user's online status"""
        
        status = self.user_status.get(user_id, "offline")
        
        if status == "offline":
            # Check cache
            cached_status = await redis_client.redis.get(f"user_status:{user_id}")
            if cached_status:
                status = cached_status.decode()
        
        last_seen = None
        if status == "offline":
            last_seen_str = await redis_client.redis.get(f"user_last_seen:{user_id}")
            if last_seen_str:
                last_seen = last_seen_str.decode()
        
        return {
            "user_id": user_id,
            "status": status,
            "last_seen": last_seen,
            "active_connections": len(self.active_connections.get(user_id, set()))
        }
    
    async def get_conversation_participants_status(self, conversation_id: int) -> Dict:
        """Get status of all participants in a conversation"""
        
        participants = await redis_client.get_json(f"conversation_participants:{conversation_id}")
        
        if not participants:
            return {"participants": []}
        
        participant_status = []
        for user_id in participants:
            status = await self.get_user_status(user_id)
            participant_status.append(status)
        
        return {"participants": participant_status}
    
    async def get_active_typing_users(self, conversation_id: int) -> List[int]:
        """Get users currently typing in conversation"""
        
        if conversation_id not in self.typing_indicators:
            return []
        
        current_time = datetime.utcnow()
        active_typing = []
        
        for user_id, last_typing in self.typing_indicators[conversation_id].items():
            if (current_time - last_typing).seconds < 10:  # 10 second timeout
                active_typing.append(user_id)
        
        return active_typing
    
    async def cleanup_stale_connections(self) -> Dict:
        """Clean up stale connections and typing indicators"""
        
        cleaned_connections = 0
        cleaned_typing = 0
        current_time = datetime.utcnow()
        
        # Clean stale connections (no heartbeat for 5 minutes)
        stale_connections = []
        for connection_id, metadata in self.connection_metadata.items():
            if (current_time - metadata["last_heartbeat"]).seconds > 300:
                stale_connections.append(connection_id)
        
        for connection_id in stale_connections:
            await self.handle_user_disconnected(connection_id)
            cleaned_connections += 1
        
        # Clean stale typing indicators (older than 30 seconds)
        for conv_id in list(self.typing_indicators.keys()):
            stale_users = []
            for user_id, last_typing in self.typing_indicators[conv_id].items():
                if (current_time - last_typing).seconds > 30:
                    stale_users.append(user_id)
            
            for user_id in stale_users:
                del self.typing_indicators[conv_id][user_id]
                await self._send_typing_indicator(conv_id, user_id, False)
                cleaned_typing += 1
        
        return {
            "cleaned_connections": cleaned_connections,
            "cleaned_typing_indicators": cleaned_typing,
            "active_connections": len(self.connection_metadata),
            "active_conversations": len(self.typing_indicators)
        }
    
    async def get_service_stats(self) -> Dict:
        """Get WebSocket service statistics"""
        
        total_connections = len(self.connection_metadata)
        unique_users = len(self.active_connections)
        active_conversations = len(self.typing_indicators)
        
        # Count typing users
        total_typing = sum(len(users) for users in self.typing_indicators.values())
        
        return {
            "total_connections": total_connections,
            "unique_online_users": unique_users,
            "active_conversations": active_conversations,
            "users_currently_typing": total_typing,
            "average_connections_per_user": round(total_connections / max(unique_users, 1), 2),
            "service_uptime": "running",
            "last_cleanup": datetime.utcnow().isoformat()
        }