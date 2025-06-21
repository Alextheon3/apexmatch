"""
ApexMatch WebSocket Routes
Real-time chat, typing indicators, and emotional connection tracking
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, List, Set
import json
import asyncio
from datetime import datetime
import logging

from database import get_db
from models.user import User
from models.conversation import Conversation, Message, MessageType
from models.match import Match
from clients.redis_client import redis_client

router = APIRouter()
logger = logging.getLogger(__name__)

# Simple auth utility for WebSocket
def get_user_from_token(token: str, db: Session) -> User:
    """Get user from JWT token (simplified)"""
    try:
        # In real implementation, would decode JWT token
        # For now, assume token is user_id
        user_id = int(token)
        return db.query(User).filter(User.id == user_id).first()
    except:
        return None

# Simple chat service
class ChatService:
    def __init__(self, db: Session):
        self.db = db
    
    async def send_message(self, conversation_id: int, sender_id: int, 
                          content: str, message_type: MessageType = MessageType.TEXT):
        """Send message to conversation"""
        message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content,
            message_type=message_type,
            created_at=datetime.utcnow()
        )
        
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        
        return message
    
    async def analyze_message_emotion(self, message: Message):
        """Analyze message emotion (simplified)"""
        return {
            "sentiment": "positive",
            "emotional_tone": "friendly",
            "depth_score": 0.5
        }
    
    async def update_conversation_metrics(self, conversation_id: int):
        """Update conversation metrics"""
        # Would update conversation emotional metrics
        pass
    
    async def get_conversation_insights(self, conversation_id: int):
        """Get conversation insights"""
        return {
            "emotional_connection": 0.6,
            "ready_for_reveal": False
        }


class ConnectionManager:
    """Manages WebSocket connections for real-time chat"""
    
    def __init__(self):
        # Active connections: {user_id: {connection_id: websocket}}
        self.active_connections: Dict[int, Dict[str, WebSocket]] = {}
        # User typing status: {conversation_id: {user_id: timestamp}}
        self.typing_status: Dict[int, Dict[int, datetime]] = {}
        # Conversation participants: {conversation_id: {user_ids}}
        self.conversation_participants: Dict[int, Set[int]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int, connection_id: str):
        """Connect user to WebSocket"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = {}
        
        self.active_connections[user_id][connection_id] = websocket
        
        # Send connection confirmation
        await self.send_personal_message({
            "type": "connection_established",
            "user_id": user_id,
            "connection_id": connection_id,
            "timestamp": datetime.utcnow().isoformat()
        }, user_id)
        
        logger.info(f"User {user_id} connected with connection {connection_id}")
    
    def disconnect(self, user_id: int, connection_id: str):
        """Disconnect user from WebSocket"""
        if user_id in self.active_connections:
            if connection_id in self.active_connections[user_id]:
                del self.active_connections[user_id][connection_id]
            
            # Remove user if no more connections
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        # Clean up typing status
        self._cleanup_typing_status(user_id)
        
        logger.info(f"User {user_id} disconnected from connection {connection_id}")
    
    async def send_personal_message(self, message: dict, user_id: int):
        """Send message to specific user across all their connections"""
        if user_id in self.active_connections:
            message_json = json.dumps(message, default=str)
            
            # Send to all user's connections
            disconnected_connections = []
            for connection_id, websocket in self.active_connections[user_id].items():
                try:
                    await websocket.send_text(message_json)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}, connection {connection_id}: {e}")
                    disconnected_connections.append(connection_id)
            
            # Clean up failed connections
            for connection_id in disconnected_connections:
                self.disconnect(user_id, connection_id)
    
    async def send_to_conversation(self, message: dict, conversation_id: int, exclude_user_id: int = None):
        """Send message to all participants in a conversation"""
        if conversation_id in self.conversation_participants:
            for user_id in self.conversation_participants[conversation_id]:
                if exclude_user_id and user_id == exclude_user_id:
                    continue
                await self.send_personal_message(message, user_id)
    
    async def join_conversation(self, user_id: int, conversation_id: int):
        """Add user to conversation participants"""
        if conversation_id not in self.conversation_participants:
            self.conversation_participants[conversation_id] = set()
        
        self.conversation_participants[conversation_id].add(user_id)
        
        # Notify other participants that user joined
        await self.send_to_conversation({
            "type": "user_joined",
            "user_id": user_id,
            "conversation_id": conversation_id,
            "timestamp": datetime.utcnow().isoformat()
        }, conversation_id, exclude_user_id=user_id)
    
    async def leave_conversation(self, user_id: int, conversation_id: int):
        """Remove user from conversation participants"""
        if conversation_id in self.conversation_participants:
            self.conversation_participants[conversation_id].discard(user_id)
            
            if not self.conversation_participants[conversation_id]:
                del self.conversation_participants[conversation_id]
            else:
                # Notify other participants that user left
                await self.send_to_conversation({
                    "type": "user_left",
                    "user_id": user_id,
                    "conversation_id": conversation_id,
                    "timestamp": datetime.utcnow().isoformat()
                }, conversation_id)
    
    async def set_typing_status(self, user_id: int, conversation_id: int, is_typing: bool):
        """Update user typing status"""
        if conversation_id not in self.typing_status:
            self.typing_status[conversation_id] = {}
        
        if is_typing:
            self.typing_status[conversation_id][user_id] = datetime.utcnow()
        else:
            self.typing_status[conversation_id].pop(user_id, None)
        
        # Notify other participants
        await self.send_to_conversation({
            "type": "typing_status",
            "user_id": user_id,
            "conversation_id": conversation_id,
            "is_typing": is_typing,
            "timestamp": datetime.utcnow().isoformat()
        }, conversation_id, exclude_user_id=user_id)
    
    def _cleanup_typing_status(self, user_id: int):
        """Clean up typing status when user disconnects"""
        for conversation_id in list(self.typing_status.keys()):
            if user_id in self.typing_status[conversation_id]:
                del self.typing_status[conversation_id][user_id]
                
                # Notify that user stopped typing
                asyncio.create_task(self.send_to_conversation({
                    "type": "typing_status",
                    "user_id": user_id,
                    "conversation_id": conversation_id,
                    "is_typing": False,
                    "timestamp": datetime.utcnow().isoformat()
                }, conversation_id, exclude_user_id=user_id))
    
    def get_online_users(self) -> List[int]:
        """Get list of currently online user IDs"""
        return list(self.active_connections.keys())
    
    def is_user_online(self, user_id: int) -> bool:
        """Check if user is currently online"""
        return user_id in self.active_connections


# Global connection manager
connection_manager = ConnectionManager()


@router.websocket("/chat/{conversation_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    conversation_id: int,
    token: str,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time chat"""
    
    try:
        # Authenticate user from token
        user = get_user_from_token(token, db)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Verify user has access to conversation
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            ((Conversation.participant_1_id == user.id) | (Conversation.participant_2_id == user.id))
        ).first()
        
        if not conversation:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Generate unique connection ID
        connection_id = f"{user.id}_{conversation_id}_{datetime.utcnow().timestamp()}"
        
        # Connect user
        await connection_manager.connect(websocket, user.id, connection_id)
        await connection_manager.join_conversation(user.id, conversation_id)
        
        # Initialize chat service
        chat_service = ChatService(db)
        
        try:
            while True:
                # Receive message from WebSocket
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                await handle_websocket_message(
                    message_data, user, conversation, chat_service, connection_manager
                )
                
        except WebSocketDisconnect:
            pass
        
    except Exception as e:
        logger.error(f"WebSocket chat error: {e}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
    
    finally:
        # Clean up connection
        if 'user' in locals() and 'connection_id' in locals():
            connection_manager.disconnect(user.id, connection_id)
            await connection_manager.leave_conversation(user.id, conversation_id)


async def handle_websocket_message(
    message_data: dict,
    user: User,
    conversation: Conversation,
    chat_service: ChatService,
    connection_manager: ConnectionManager
):
    """Handle different types of WebSocket messages"""
    
    message_type = message_data.get("type")
    
    if message_type == "send_message":
        await handle_send_message(message_data, user, conversation, chat_service, connection_manager)
    
    elif message_type == "typing_start":
        await connection_manager.set_typing_status(user.id, conversation.id, True)
    
    elif message_type == "typing_stop":
        await connection_manager.set_typing_status(user.id, conversation.id, False)
    
    elif message_type == "mark_read":
        await handle_mark_read(user, conversation, chat_service, connection_manager)
    
    elif message_type == "join_conversation":
        await connection_manager.join_conversation(user.id, conversation.id)
    
    else:
        logger.warning(f"Unknown message type: {message_type}")


async def handle_send_message(
    message_data: dict,
    user: User,
    conversation: Conversation,
    chat_service: ChatService,
    connection_manager: ConnectionManager
):
    """Handle sending a new message"""
    
    content = message_data.get("content", "").strip()
    if not content:
        return
    
    try:
        # Create message in database
        message = await chat_service.send_message(
            conversation_id=conversation.id,
            sender_id=user.id,
            content=content,
            message_type=MessageType.TEXT
        )
        
        # Analyze message for emotional tracking
        emotional_analysis = await chat_service.analyze_message_emotion(message)
        
        # Update conversation emotional metrics
        await chat_service.update_conversation_metrics(conversation.id)
        
        # Prepare message for broadcast
        message_response = {
            "type": "new_message",
            "message": {
                "id": message.id,
                "conversation_id": conversation.id,
                "sender_id": user.id,
                "content": message.content,
                "created_at": message.created_at.isoformat(),
                "emotional_tone": getattr(message, 'emotional_tone', None),
                "depth_score": getattr(message, 'depth_score', 0),
                "vulnerability_level": getattr(message, 'vulnerability_level', 0)
            },
            "emotional_analysis": emotional_analysis,
            "sender_info": {
                "id": user.id,
                "first_name": user.first_name
            }
        }
        
        # Send to all conversation participants
        await connection_manager.send_to_conversation(
            message_response, conversation.id
        )
        
        # Track activity for BGP building
        await redis_client.track_user_activity(
            user.id,
            "message_sent",
            {
                "conversation_id": conversation.id,
                "message_length": len(content),
                "depth_score": getattr(message, 'depth_score', 0),
                "vulnerability_level": getattr(message, 'vulnerability_level', 0)
            }
        )
        
        # Check if conversation is ready for reveal
        conversation_insights = await chat_service.get_conversation_insights(conversation.id)
        if conversation_insights.get("ready_for_reveal", False):
            await connection_manager.send_to_conversation({
                "type": "reveal_eligible",
                "conversation_id": conversation.id,
                "emotional_connection_score": conversation_insights.get("emotional_connection", 0),
                "timestamp": datetime.utcnow().isoformat()
            }, conversation.id)
        
    except Exception as e:
        logger.error(f"Error handling send message: {e}")
        await connection_manager.send_personal_message({
            "type": "error",
            "message": "Failed to send message",
            "timestamp": datetime.utcnow().isoformat()
        }, user.id)


async def handle_mark_read(
    user: User,
    conversation: Conversation,
    chat_service: ChatService,
    connection_manager: ConnectionManager
):
    """Handle marking conversation as read"""
    
    try:
        # Mark conversation as read
        conversation.mark_as_read(user.id)
        
        # Notify other participants
        other_user_id = conversation.get_other_participant_id(user.id)
        if other_user_id:
            await connection_manager.send_personal_message({
                "type": "message_read",
                "conversation_id": conversation.id,
                "reader_id": user.id,
                "timestamp": datetime.utcnow().isoformat()
            }, other_user_id)
        
    except Exception as e:
        logger.error(f"Error handling mark read: {e}")


@router.websocket("/notifications/{user_id}")
async def websocket_notifications_endpoint(
    websocket: WebSocket,
    user_id: int,
    token: str,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for general notifications"""
    
    try:
        # Authenticate user
        user = get_user_from_token(token, db)
        if not user or user.id != user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        connection_id = f"notifications_{user_id}_{datetime.utcnow().timestamp()}"
        await connection_manager.connect(websocket, user_id, connection_id)
        
        try:
            while True:
                # Keep connection alive and handle ping/pong
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
                
        except WebSocketDisconnect:
            pass
    
    except Exception as e:
        logger.error(f"WebSocket notifications error: {e}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
    
    finally:
        if 'connection_id' in locals():
            connection_manager.disconnect(user_id, connection_id)


# WebSocket utility functions for other services
async def notify_new_match(user_id: int, match_data: dict):
    """Notify user of new match via WebSocket"""
    await connection_manager.send_personal_message({
        "type": "new_match",
        "match": match_data,
        "timestamp": datetime.utcnow().isoformat()
    }, user_id)


async def notify_match_accepted(user_id: int, match_id: int, other_user_info: dict):
    """Notify user that their match was accepted"""
    await connection_manager.send_personal_message({
        "type": "match_accepted",
        "match_id": match_id,
        "other_user": other_user_info,
        "timestamp": datetime.utcnow().isoformat()
    }, user_id)


async def notify_emotional_milestone(conversation_id: int, milestone_data: dict):
    """Notify conversation participants of emotional milestone"""
    await connection_manager.send_to_conversation({
        "type": "emotional_milestone",
        "milestone": milestone_data,
        "conversation_id": conversation_id,
        "timestamp": datetime.utcnow().isoformat()
    }, conversation_id)


async def notify_trust_score_update(user_id: int, new_score: float, changes: dict):
    """Notify user of trust score update"""
    await connection_manager.send_personal_message({
        "type": "trust_score_update",
        "new_score": new_score,
        "changes": changes,
        "timestamp": datetime.utcnow().isoformat()
    }, user_id)


# Health check endpoint
@router.get("/health")
async def websocket_health():
    """WebSocket service health check"""
    return {
        "status": "healthy",
        "active_connections": len(connection_manager.active_connections),
        "active_conversations": len(connection_manager.conversation_participants),
        "online_users": connection_manager.get_online_users()
    }