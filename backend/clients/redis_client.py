# clients/redis_client.py
"""
ApexMatch Redis Client
Handles caching, rate limiting, and real-time pub/sub for chat
FIXED: Optional Redis with graceful fallback
"""

import redis
import json
import asyncio
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class RedisClient:
    """Redis client with graceful fallback when Redis is unavailable"""
    
    def __init__(self):
        self.redis_url = "redis://localhost:6379"
        self.redis_db = 0
        self.default_ttl = 3600
        self.available = False
        self.redis = None
        self.async_redis = None
        self._init_connection()
        
    def _init_connection(self):
        """Initialize Redis connection with fallback"""
        try:
            self.redis = redis.from_url(
                self.redis_url,
                db=self.redis_db,
                decode_responses=True,
                retry_on_timeout=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            self.redis.ping()
            self.available = True
            logger.info("Redis connection established successfully")
        except Exception as e:
            logger.warning(f"Redis unavailable, using fallback mode: {e}")
            self.available = False
            self.redis = None
    
    async def get_async_redis(self):
        """Get async Redis connection for pub/sub"""
        if not self.available:
            return None
            
        if not self.async_redis:
            try:
                import aioredis
                self.async_redis = aioredis.from_url(
                    self.redis_url,
                    db=self.redis_db,
                    decode_responses=True
                )
            except Exception as e:
                logger.error(f"Failed to create async Redis connection: {e}")
                return None
        return self.async_redis
    
    # Caching Methods
    async def get(self, key: str) -> Optional[str]:
        """Get value from cache"""
        if not self.available:
            return None
            
        try:
            return self.redis.get(key)
        except Exception as e:
            logger.error(f"Redis get error for key {key}: {e}")
            self._handle_connection_error()
            return None
    
    async def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        """Set value in cache with optional expiration"""
        if not self.available:
            return False
            
        try:
            ttl = ex or self.default_ttl
            return self.redis.set(key, value, ex=ttl)
        except Exception as e:
            logger.error(f"Redis set error for key {key}: {e}")
            self._handle_connection_error()
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.available:
            return False
            
        try:
            return bool(self.redis.delete(key))
        except Exception as e:
            logger.error(f"Redis delete error for key {key}: {e}")
            self._handle_connection_error()
            return False
    
    async def get_json(self, key: str) -> Optional[Dict]:
        """Get JSON value from cache"""
        if not self.available:
            return None
            
        try:
            value = self.redis.get(key)
            return json.loads(value) if value else None
        except Exception as e:
            logger.error(f"Redis get_json error for key {key}: {e}")
            self._handle_connection_error()
            return None
    
    async def set_json(self, key: str, value: Dict, ex: Optional[int] = None) -> bool:
        """Set JSON value in cache"""
        if not self.available:
            return False
            
        try:
            json_str = json.dumps(value, default=str)
            return await self.set(key, json_str, ex)
        except Exception as e:
            logger.error(f"Redis set_json error for key {key}: {e}")
            return False
    
    # Rate Limiting Methods
    async def check_rate_limit(self, key: str, limit: int, window_seconds: int) -> Dict[str, Any]:
        """Check if request is within rate limit"""
        if not self.available:
            # Always allow when Redis is down
            return {
                "allowed": True,
                "remaining": limit - 1,
                "reset_time": datetime.utcnow() + timedelta(seconds=window_seconds),
                "limit": limit
            }
            
        try:
            current_time = datetime.utcnow()
            window_start = current_time - timedelta(seconds=window_seconds)
            
            # Use sliding window rate limiting
            pipe = self.redis.pipeline()
            
            # Remove old entries
            pipe.zremrangebyscore(key, 0, window_start.timestamp())
            
            # Count current entries
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(current_time.timestamp()): current_time.timestamp()})
            
            # Set expiration
            pipe.expire(key, window_seconds)
            
            results = pipe.execute()
            current_count = results[1]
            
            allowed = current_count < limit
            remaining = max(0, limit - current_count - 1)
            reset_time = current_time + timedelta(seconds=window_seconds)
            
            return {
                "allowed": allowed,
                "remaining": remaining,
                "reset_time": reset_time,
                "limit": limit
            }
            
        except Exception as e:
            logger.error(f"Rate limit check error for key {key}: {e}")
            self._handle_connection_error()
            # Allow request on Redis error
            return {
                "allowed": True,
                "remaining": limit - 1,
                "reset_time": datetime.utcnow() + timedelta(seconds=window_seconds),
                "limit": limit
            }
    
    async def increment_counter(self, key: str, ex: Optional[int] = None) -> int:
        """Increment counter with optional expiration"""
        if not self.available:
            return 1
            
        try:
            pipe = self.redis.pipeline()
            pipe.incr(key)
            if ex:
                pipe.expire(key, ex)
            results = pipe.execute()
            return results[0]
        except Exception as e:
            logger.error(f"Counter increment error for key {key}: {e}")
            self._handle_connection_error()
            return 1
    
    # Session Management
    async def store_user_session(self, user_id: int, session_data: Dict, ttl: int = 86400) -> bool:
        """Store user session data"""
        if not self.available:
            return False
            
        try:
            key = f"user_session:{user_id}"
            return await self.set_json(key, session_data, ttl)
        except Exception as e:
            logger.error(f"Session storage error: {e}")
            return False
    
    async def get_user_session(self, user_id: int) -> Optional[Dict]:
        """Get user session data"""
        if not self.available:
            return None
            
        try:
            key = f"user_session:{user_id}"
            return await self.get_json(key)
        except Exception as e:
            logger.error(f"Session retrieval error: {e}")
            return None
    
    async def invalidate_user_session(self, user_id: int) -> bool:
        """Invalidate user session"""
        if not self.available:
            return False
            
        try:
            key = f"user_session:{user_id}"
            return await self.delete(key)
        except Exception as e:
            logger.error(f"Session invalidation error: {e}")
            return False
    
    # Activity Tracking
    async def track_user_activity(self, user_id: int, activity_type: str, metadata: Dict = None) -> bool:
        """Track user activity for BGP building"""
        if not self.available:
            return False
            
        try:
            activity_data = {
                "user_id": user_id,
                "activity_type": activity_type,
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": metadata or {}
            }
            
            # Store in activity stream
            key = f"user_activity:{user_id}"
            await self.redis.lpush(key, json.dumps(activity_data, default=str))
            await self.redis.ltrim(key, 0, 99)  # Keep last 100 activities
            await self.redis.expire(key, 86400 * 7)  # Expire after 7 days
            
            return True
        except Exception as e:
            logger.error(f"Activity tracking error: {e}")
            self._handle_connection_error()
            return False
    
    # Health Check
    async def health_check(self) -> Dict[str, Any]:
        """Check Redis health"""
        if not self.available:
            return {
                "status": "unavailable",
                "fallback_mode": True,
                "message": "Redis is not available, using fallback mode"
            }
            
        try:
            # Test basic operations
            test_key = "health_check_test"
            await self.set(test_key, "test_value", 10)
            value = await self.get(test_key)
            await self.delete(test_key)
            
            # Get Redis info
            info = self.redis.info()
            
            return {
                "status": "healthy" if value == "test_value" else "unhealthy",
                "connected_clients": info.get("connected_clients", 0),
                "used_memory_human": info.get("used_memory_human", "unknown"),
                "uptime_in_seconds": info.get("uptime_in_seconds", 0),
                "fallback_mode": False
            }
        except Exception as e:
            logger.error(f"Redis health check error: {e}")
            self._handle_connection_error()
            return {
                "status": "unhealthy",
                "error": str(e),
                "fallback_mode": True
            }
    
    def _handle_connection_error(self):
        """Handle Redis connection errors by disabling Redis"""
        self.available = False
        self.redis = None
        logger.warning("Redis connection lost, switching to fallback mode")
    
    async def close(self):
        """Close Redis connections"""
        try:
            if self.async_redis:
                await self.async_redis.close()
        except Exception as e:
            logger.error(f"Redis close error: {e}")


# Global Redis client instance
redis_client = RedisClient()