# backend/utils/cache_utils.py
"""
ApexMatch Caching Utilities
Redis-based caching for performance optimization and rate limiting
"""

import redis
import json
import pickle
import hashlib
from datetime import datetime, timedelta
from typing import Any, Optional, Dict, List, Union, Callable
from functools import wraps
import asyncio
import logging
from contextlib import contextmanager

from config import REDIS_URL, REDIS_PASSWORD, REDIS_DB

logger = logging.getLogger(__name__)

class CacheManager:
    """Redis cache manager for ApexMatch"""
    
    def __init__(self, redis_url: str = REDIS_URL, password: str = REDIS_PASSWORD, db: int = REDIS_DB):
        self.redis_client = redis.Redis.from_url(
            redis_url,
            password=password,
            db=db,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True
        )
        self.binary_client = redis.Redis.from_url(
            redis_url,
            password=password,
            db=db,
            decode_responses=False,  # For binary data
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True
        )
    
    def ping(self) -> bool:
        """Check Redis connection health"""
        try:
            return self.redis_client.ping()
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            return False
    
    def set(self, key: str, value: Any, ttl: int = 3600, serialize: str = "json") -> bool:
        """
        Set cache value with TTL
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds
            serialize: Serialization method ('json' or 'pickle')
        """
        try:
            if serialize == "json":
                serialized_value = json.dumps(value)
                return self.redis_client.setex(key, ttl, serialized_value)
            elif serialize == "pickle":
                serialized_value = pickle.dumps(value)
                return self.binary_client.setex(key, ttl, serialized_value)
            else:
                raise ValueError("serialize must be 'json' or 'pickle'")
        except Exception as e:
            logger.error(f"Cache set failed for key {key}: {e}")
            return False
    
    def get(self, key: str, serialize: str = "json") -> Optional[Any]:
        """
        Get cache value
        
        Args:
            key: Cache key
            serialize: Serialization method ('json' or 'pickle')
        """
        try:
            if serialize == "json":
                value = self.redis_client.get(key)
                return json.loads(value) if value else None
            elif serialize == "pickle":
                value = self.binary_client.get(key)
                return pickle.loads(value) if value else None
            else:
                raise ValueError("serialize must be 'json' or 'pickle'")
        except Exception as e:
            logger.error(f"Cache get failed for key {key}: {e}")
            return None
    
    def delete(self, key: str) -> bool:
        """Delete cache key"""
        try:
            return bool(self.redis_client.delete(key))
        except Exception as e:
            logger.error(f"Cache delete failed for key {key}: {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """Check if cache key exists"""
        try:
            return bool(self.redis_client.exists(key))
        except Exception as e:
            logger.error(f"Cache exists check failed for key {key}: {e}")
            return False
    
    def expire(self, key: str, ttl: int) -> bool:
        """Set TTL for existing key"""
        try:
            return bool(self.redis_client.expire(key, ttl))
        except Exception as e:
            logger.error(f"Cache expire failed for key {key}: {e}")
            return False
    
    def get_ttl(self, key: str) -> int:
        """Get remaining TTL for key (-1 if no TTL, -2 if key doesn't exist)"""
        try:
            return self.redis_client.ttl(key)
        except Exception as e:
            logger.error(f"Cache TTL check failed for key {key}: {e}")
            return -2
    
    def flush_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Cache flush pattern failed for {pattern}: {e}")
            return 0
    
    def increment(self, key: str, amount: int = 1, ttl: Optional[int] = None) -> int:
        """Increment counter with optional TTL"""
        try:
            with self.redis_client.pipeline() as pipe:
                pipe.multi()
                pipe.incrby(key, amount)
                if ttl:
                    pipe.expire(key, ttl)
                result = pipe.execute()
                return result[0]
        except Exception as e:
            logger.error(f"Cache increment failed for key {key}: {e}")
            return 0
    
    def decrement(self, key: str, amount: int = 1) -> int:
        """Decrement counter"""
        try:
            return self.redis_client.decrby(key, amount)
        except Exception as e:
            logger.error(f"Cache decrement failed for key {key}: {e}")
            return 0

# Global cache manager instance
cache = CacheManager()

class CacheKeys:
    """Centralized cache key definitions for ApexMatch"""
    
    # User-related cache keys
    USER_PROFILE = "user:profile:{user_id}"
    USER_PREFERENCES = "user:preferences:{user_id}"
    USER_SUBSCRIPTION = "user:subscription:{user_id}"
    USER_TRUST_SCORE = "user:trust:{user_id}"
    USER_BGP_PROFILE = "user:bgp:{user_id}"
    USER_MATCHES = "user:matches:{user_id}"
    USER_CONVERSATIONS = "user:conversations:{user_id}"
    
    # Matching cache keys
    POTENTIAL_MATCHES = "matches:potential:{user_id}:{filters_hash}"
    MATCH_COMPATIBILITY = "matches:compatibility:{user1_id}:{user2_id}"
    MATCH_QUEUE = "matches:queue:{user_id}"
    
    # BGP cache keys
    BGP_TRAITS = "bgp:traits:{user_id}"
    BGP_COMPATIBILITY = "bgp:compatibility:{user1_id}:{user2_id}"
    BGP_INSIGHTS = "bgp:insights:{user_id}"
    
    # Trust system cache keys
    TRUST_LEADERBOARD = "trust:leaderboard:global"
    TRUST_ANALYTICS = "trust:analytics:{user_id}"
    
    # Rate limiting keys
    RATE_LIMIT_AUTH = "ratelimit:auth:{ip}:{endpoint}"
    RATE_LIMIT_API = "ratelimit:api:{user_id}:{endpoint}"
    RATE_LIMIT_MATCHES = "ratelimit:matches:{user_id}"
    RATE_LIMIT_MESSAGES = "ratelimit:messages:{user_id}"
    
    # AI service cache keys
    AI_CONVERSATION_STARTERS = "ai:starters:{user_id}:{target_id}"
    AI_PERSONALITY_ANALYSIS = "ai:personality:{user_id}"
    AI_COMPATIBILITY_ANALYSIS = "ai:compatibility:{user1_id}:{user2_id}"
    
    # Feature usage tracking
    USAGE_AI_REQUESTS = "usage:ai:{user_id}:{date}"
    USAGE_PHOTO_REVEALS = "usage:reveals:{user_id}:{date}"
    USAGE_SUPER_LIKES = "usage:superlikes:{user_id}:{date}"
    
    # Session and security
    USER_SESSION = "session:{session_id}"
    LOGIN_ATTEMPTS = "security:login_attempts:{ip}"
    PASSWORD_RESET_TOKENS = "security:reset_tokens:{email}"
    
    # System health and metrics
    SYSTEM_HEALTH = "system:health"
    METRICS_DAILY = "metrics:daily:{date}"
    METRICS_USER_ACTIVITY = "metrics:activity:{user_id}:{date}"

def generate_cache_key(template: str, **kwargs) -> str:
    """Generate cache key from template and arguments"""
    return template.format(**kwargs)

def hash_dict(data: Dict) -> str:
    """Generate hash from dictionary for cache key generation"""
    sorted_items = sorted(data.items())
    serialized = json.dumps(sorted_items, sort_keys=True)
    return hashlib.md5(serialized.encode()).hexdigest()

class CacheDecorator:
    """Decorator for automatic function result caching"""
    
    def __init__(self, ttl: int = 3600, key_template: str = None, serialize: str = "json"):
        self.ttl = ttl
        self.key_template = key_template
        self.serialize = serialize
    
    def __call__(self, func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if self.key_template:
                cache_key = self.key_template.format(*args, **kwargs)
            else:
                # Auto-generate key from function name and arguments
                args_hash = hashlib.md5(str(args + tuple(kwargs.items())).encode()).hexdigest()
                cache_key = f"func:{func.__name__}:{args_hash}"
            
            # Try to get from cache
            cached_result = cache.get(cache_key, self.serialize)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, self.ttl, self.serialize)
            return result
        
        return wrapper

# Convenience decorators
def cache_result(ttl: int = 3600, serialize: str = "json"):
    """Cache function result decorator"""
    return CacheDecorator(ttl=ttl, serialize=serialize)

def cache_user_data(ttl: int = 1800):
    """Cache user-specific data (30 minutes default)"""
    return CacheDecorator(ttl=ttl, serialize="json")

def cache_bgp_data(ttl: int = 3600):
    """Cache BGP analysis data (1 hour default)"""
    return CacheDecorator(ttl=ttl, serialize="pickle")

class RateLimiter:
    """Redis-based rate limiter"""
    
    def __init__(self, cache_manager: CacheManager = cache):
        self.cache = cache_manager
    
    def check_rate_limit(
        self,
        key: str,
        limit: int,
        window: int,
        identifier: str = None
    ) -> Dict[str, Any]:
        """
        Check rate limit using sliding window
        
        Args:
            key: Rate limit key
            limit: Maximum requests allowed
            window: Window size in seconds
            identifier: Optional identifier for logging
        
        Returns:
            Dict with rate limit info
        """
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=window)
        
        # Use Redis sorted set for sliding window
        pipe = self.cache.redis_client.pipeline()
        pipe.zremrangebyscore(key, '-inf', window_start.timestamp())
        pipe.zcard(key)
        pipe.zadd(key, {str(now.timestamp()): now.timestamp()})
        pipe.expire(key, window)
        
        results = pipe.execute()
        current_requests = results[1]
        
        is_allowed = current_requests < limit
        remaining = max(0, limit - current_requests - 1)
        
        return {
            "allowed": is_allowed,
            "remaining": remaining,
            "total": limit,
            "window": window,
            "reset_time": (now + timedelta(seconds=window)).timestamp()
        }
    
    def is_rate_limited(self, key: str, limit: int, window: int) -> bool:
        """Simple rate limit check"""
        result = self.check_rate_limit(key, limit, window)
        return not result["allowed"]

# Global rate limiter instance
rate_limiter = RateLimiter()

class UsageTracker:
    """Track feature usage for subscription tiers"""
    
    def __init__(self, cache_manager: CacheManager = cache):
        self.cache = cache_manager
    
    def track_usage(self, user_id: int, feature: str, amount: int = 1) -> int:
        """Track feature usage and return current count"""
        today = datetime.utcnow().strftime("%Y-%m-%d")
        key = f"usage:{feature}:{user_id}:{today}"
        
        return self.cache.increment(key, amount, ttl=86400)  # 24 hours
    
    def get_usage(self, user_id: int, feature: str, date: str = None) -> int:
        """Get current usage count for feature"""
        if not date:
            date = datetime.utcnow().strftime("%Y-%m-%d")
        
        key = f"usage:{feature}:{user_id}:{date}"
        usage = self.cache.get(key)
        return int(usage) if usage else 0
    
    def check_usage_limit(self, user_id: int, feature: str, limit: int) -> Dict[str, Any]:
        """Check if user has exceeded usage limit"""
        current_usage = self.get_usage(user_id, feature)
        
        return {
            "current_usage": current_usage,
            "limit": limit,
            "remaining": max(0, limit - current_usage),
            "exceeded": current_usage >= limit
        }
    
    def reset_daily_usage(self, user_id: int, feature: str):
        """Reset daily usage counter"""
        today = datetime.utcnow().strftime("%Y-%m-%d")
        key = f"usage:{feature}:{user_id}:{today}"
        self.cache.delete(key)

# Global usage tracker
usage_tracker = UsageTracker()

class SessionManager:
    """Manage user sessions in Redis"""
    
    def __init__(self, cache_manager: CacheManager = cache):
        self.cache = cache_manager
    
    def create_session(self, user_id: int, session_data: Dict[str, Any], ttl: int = 86400) -> str:
        """Create new user session"""
        import uuid
        session_id = str(uuid.uuid4())
        session_key = CacheKeys.USER_SESSION.format(session_id=session_id)
        
        session_data.update({
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat()
        })
        
        self.cache.set(session_key, session_data, ttl)
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data"""
        session_key = CacheKeys.USER_SESSION.format(session_id=session_id)
        return self.cache.get(session_key)
    
    def update_session(self, session_id: str, data: Dict[str, Any]) -> bool:
        """Update session data"""
        session_key = CacheKeys.USER_SESSION.format(session_id=session_id)
        session_data = self.get_session(session_id)
        
        if session_data:
            session_data.update(data)
            session_data["last_activity"] = datetime.utcnow().isoformat()
            return self.cache.set(session_key, session_data, 86400)
        
        return False
    
    def delete_session(self, session_id: str) -> bool:
        """Delete session"""
        session_key = CacheKeys.USER_SESSION.format(session_id=session_id)
        return self.cache.delete(session_key)
    
    def extend_session(self, session_id: str, ttl: int = 86400) -> bool:
        """Extend session TTL"""
        session_key = CacheKeys.USER_SESSION.format(session_id=session_id)
        return self.cache.expire(session_key, ttl)

# Global session manager
session_manager = SessionManager()

class MatchCache:
    """Specialized caching for matching system"""
    
    def __init__(self, cache_manager: CacheManager = cache):
        self.cache = cache_manager
    
    def cache_potential_matches(self, user_id: int, filters: Dict, matches: List[Dict], ttl: int = 1800):
        """Cache potential matches with filters"""
        filters_hash = hash_dict(filters)
        cache_key = CacheKeys.POTENTIAL_MATCHES.format(user_id=user_id, filters_hash=filters_hash)
        
        cache_data = {
            "matches": matches,
            "filters": filters,
            "cached_at": datetime.utcnow().isoformat(),
            "total_count": len(matches)
        }
        
        return self.cache.set(cache_key, cache_data, ttl)
    
    def get_cached_matches(self, user_id: int, filters: Dict) -> Optional[List[Dict]]:
        """Get cached potential matches"""
        filters_hash = hash_dict(filters)
        cache_key = CacheKeys.POTENTIAL_MATCHES.format(user_id=user_id, filters_hash=filters_hash)
        
        cached_data = self.cache.get(cache_key)
        return cached_data["matches"] if cached_data else None
    
    def cache_compatibility_score(self, user1_id: int, user2_id: int, compatibility_data: Dict, ttl: int = 3600):
        """Cache compatibility analysis between users"""
        # Ensure consistent key ordering
        key_users = tuple(sorted([user1_id, user2_id]))
        cache_key = CacheKeys.MATCH_COMPATIBILITY.format(user1_id=key_users[0], user2_id=key_users[1])
        
        return self.cache.set(cache_key, compatibility_data, ttl)
    
    def get_compatibility_score(self, user1_id: int, user2_id: int) -> Optional[Dict]:
        """Get cached compatibility score"""
        key_users = tuple(sorted([user1_id, user2_id]))
        cache_key = CacheKeys.MATCH_COMPATIBILITY.format(user1_id=key_users[0], user2_id=key_users[1])
        
        return self.cache.get(cache_key)
    
    def invalidate_user_matches(self, user_id: int):
        """Invalidate all cached matches for a user"""
        pattern = f"matches:potential:{user_id}:*"
        return self.cache.flush_pattern(pattern)

# Global match cache
match_cache = MatchCache()

class BGPCache:
    """Specialized caching for BGP system"""
    
    def __init__(self, cache_manager: CacheManager = cache):
        self.cache = cache_manager
    
    def cache_user_traits(self, user_id: int, traits_data: Dict, ttl: int = 3600):
        """Cache user BGP traits"""
        cache_key = CacheKeys.BGP_TRAITS.format(user_id=user_id)
        return self.cache.set(cache_key, traits_data, ttl, serialize="pickle")
    
    def get_user_traits(self, user_id: int) -> Optional[Dict]:
        """Get cached user BGP traits"""
        cache_key = CacheKeys.BGP_TRAITS.format(user_id=user_id)
        return self.cache.get(cache_key, serialize="pickle")
    
    def cache_bgp_compatibility(self, user1_id: int, user2_id: int, compatibility_data: Dict, ttl: int = 7200):
        """Cache BGP compatibility analysis"""
        key_users = tuple(sorted([user1_id, user2_id]))
        cache_key = CacheKeys.BGP_COMPATIBILITY.format(user1_id=key_users[0], user2_id=key_users[1])
        
        return self.cache.set(cache_key, compatibility_data, ttl, serialize="pickle")
    
    def get_bgp_compatibility(self, user1_id: int, user2_id: int) -> Optional[Dict]:
        """Get cached BGP compatibility"""
        key_users = tuple(sorted([user1_id, user2_id]))
        cache_key = CacheKeys.BGP_COMPATIBILITY.format(user1_id=key_users[0], user2_id=key_users[1])
        
        return self.cache.get(cache_key, serialize="pickle")
    
    def invalidate_user_bgp(self, user_id: int):
        """Invalidate all BGP cache for a user"""
        patterns = [
            f"bgp:traits:{user_id}",
            f"bgp:compatibility:{user_id}:*",
            f"bgp:compatibility:*:{user_id}",
            f"bgp:insights:{user_id}"
        ]
        
        for pattern in patterns:
            self.cache.flush_pattern(pattern)

# Global BGP cache
bgp_cache = BGPCache()

@contextmanager
def cache_fallback(default_value=None, log_errors=True):
    """Context manager for graceful cache failures"""
    try:
        yield
    except Exception as e:
        if log_errors:
            logger.error(f"Cache operation failed: {e}")
        return default_value

def warm_cache_for_user(user_id: int):
    """Pre-warm cache with commonly accessed user data"""
    try:
        # This would be called after user login to pre-populate cache
        from services.bgp_builder import BGPBuilder
        from services.matchmaker import Matchmaker
        from database import get_db
        
        db = next(get_db())
        
        # Warm BGP data
        bgp_service = BGPBuilder(db)
        traits = bgp_service.get_user_traits(user_id)
        if traits:
            bgp_cache.cache_user_traits(user_id, traits)
        
        # Warm basic match data
        matchmaker = Matchmaker(db)
        matches = matchmaker.find_potential_matches(user_id, limit=10)
        if matches:
            match_cache.cache_potential_matches(user_id, {}, matches)
        
        db.close()
        logger.info(f"Cache warmed for user {user_id}")
        
    except Exception as e:
        logger.error(f"Cache warming failed for user {user_id}: {e}")

def get_cache_stats() -> Dict[str, Any]:
    """Get Redis cache statistics"""
    try:
        info = cache.redis_client.info()
        return {
            "connected_clients": info.get("connected_clients", 0),
            "used_memory": info.get("used_memory_human", "0B"),
            "keyspace_hits": info.get("keyspace_hits", 0),
            "keyspace_misses": info.get("keyspace_misses", 0),
            "hit_rate": round(
                info.get("keyspace_hits", 0) / 
                max(1, info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0)) * 100, 
                2
            ),
            "total_commands_processed": info.get("total_commands_processed", 0),
            "uptime_in_seconds": info.get("uptime_in_seconds", 0)
        }
    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        return {}

# Utility functions for common caching patterns
def cache_or_compute(cache_key: str, compute_func: Callable, ttl: int = 3600, serialize: str = "json"):
    """Get from cache or compute and cache result"""
    # Try cache first
    cached_result = cache.get(cache_key, serialize)
    if cached_result is not None:
        return cached_result
    
    # Compute and cache
    result = compute_func()
    cache.set(cache_key, result, ttl, serialize)
    return result

def invalidate_user_cache(user_id: int):
    """Invalidate all cache entries for a user"""
    patterns = [
        f"user:*:{user_id}",
        f"matches:*:{user_id}*",
        f"bgp:*:{user_id}*",
        f"usage:*:{user_id}*",
        f"ai:*:{user_id}*"
    ]
    
    for pattern in patterns:
        cache.flush_pattern(pattern)
    
    logger.info(f"Cache invalidated for user {user_id}")

# Cache health check
def check_cache_health() -> Dict[str, Any]:
    """Check cache system health"""
    try:
        # Test basic operations
        test_key = "health_check_test"
        test_value = {"timestamp": datetime.utcnow().isoformat()}
        
        # Test set
        set_success = cache.set(test_key, test_value, 60)
        
        # Test get
        retrieved_value = cache.get(test_key)
        get_success = retrieved_value == test_value
        
        # Test delete
        delete_success = cache.delete(test_key)
        
        # Get stats
        stats = get_cache_stats()
        
        return {
            "healthy": all([set_success, get_success, delete_success]),
            "operations": {
                "set": set_success,
                "get": get_success,
                "delete": delete_success
            },
            "stats": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Cache health check failed: {e}")
        return {
            "healthy": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }