# middleware/rate_limiter.py
"""
ApexMatch Rate Limiting Middleware
Implements sophisticated rate limiting for different user tiers and endpoints
FIXED: Redis is now optional and won't break requests
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from functools import wraps
import hashlib
import time

from fastapi import HTTPException, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class RateLimitExceeded(Exception):
    """Rate limit exceeded exception"""
    def __init__(self, message: str, retry_after: int, limit_type: str = "general"):
        self.message = message
        self.retry_after = retry_after
        self.limit_type = limit_type
        super().__init__(self.message)


class RateLimitConfig:
    """Rate limiting configuration for different user tiers and endpoints"""
    
    # Base rate limits per subscription tier (requests per minute)
    TIER_LIMITS = {
        "free": {
            "requests_per_minute": 60,
            "requests_per_hour": 1000,
            "requests_per_day": 10000,
            "burst_allowance": 10
        },
        "connection": {
            "requests_per_minute": 120,
            "requests_per_hour": 5000,
            "requests_per_day": 50000,
            "burst_allowance": 20
        },
        "elite": {
            "requests_per_minute": 300,
            "requests_per_hour": 15000,
            "requests_per_day": 150000,
            "burst_allowance": 50
        },
        "admin": {
            "requests_per_minute": 1000,
            "requests_per_hour": 50000,
            "requests_per_day": 500000,
            "burst_allowance": 100
        }
    }


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Advanced rate limiting middleware with tier-based limits"""
    
    def __init__(self, app, config: RateLimitConfig = None):
        super().__init__(app)
        self.config = config or RateLimitConfig()
        self.redis_available = False
        self.redis_client = None
        # In-memory fallback for rate limiting when Redis is unavailable
        self._memory_store = {}
        self._init_redis()
    
    def _init_redis(self):
        """Initialize Redis connection if available"""
        try:
            from clients.redis_client import redis_client
            self.redis_client = redis_client
            # Test Redis connection
            self.redis_client.redis.ping()
            self.redis_available = True
            logger.info("Redis connection established for rate limiting")
        except Exception as e:
            logger.warning(f"Redis not available for rate limiting, using memory fallback: {e}")
            self.redis_available = False
    
    async def dispatch(self, request: Request, call_next):
        """Apply rate limiting to requests"""
        start_time = datetime.utcnow()
        
        try:
            # Skip rate limiting for health checks and webhooks
            if self._should_skip_rate_limiting(request):
                return await call_next(request)
            
            # Get client identifier and user info
            client_id = self._get_client_identifier(request)
            user_tier = self._get_user_tier(request)
            
            # Use memory-based rate limiting if Redis is not available
            if not self.redis_available:
                if not self._check_memory_rate_limit(client_id, user_tier):
                    return JSONResponse(
                        status_code=429,
                        content={
                            "error": "rate_limit_exceeded",
                            "message": "Too many requests",
                            "retry_after": 60
                        },
                        headers={"Retry-After": "60"}
                    )
            else:
                # Use Redis-based rate limiting
                try:
                    await self._check_redis_rate_limit(client_id, user_tier)
                except RateLimitExceeded as e:
                    return JSONResponse(
                        status_code=429,
                        content={
                            "error": "rate_limit_exceeded",
                            "message": e.message,
                            "retry_after": e.retry_after,
                            "limit_type": e.limit_type
                        },
                        headers={"Retry-After": str(e.retry_after)}
                    )
                except Exception as e:
                    logger.warning(f"Redis rate limiting failed, continuing: {e}")
            
            # Process request
            response = await call_next(request)
            
            # Add rate limit headers
            await self._add_rate_limit_headers(response, client_id, user_tier)
            
            return response
            
        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            # Continue without rate limiting on error
            return await call_next(request)
    
    def _should_skip_rate_limiting(self, request: Request) -> bool:
        """Check if request should skip rate limiting"""
        skip_paths = [
            "/health", "/metrics", "/docs", "/redoc", "/openapi.json",
            "/webhooks/stripe"
        ]
        return any(request.url.path.startswith(path) for path in skip_paths)
    
    def _get_client_identifier(self, request: Request) -> str:
        """Get unique client identifier for rate limiting"""
        if hasattr(request.state, 'user') and request.state.user:
            return f"user:{request.state.user['user_id']}"
        
        # For unauthenticated requests, use IP + User Agent
        ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("User-Agent", "")
        client_hash = hashlib.md5(f"{ip}:{user_agent}".encode()).hexdigest()[:12]
        return f"client:{client_hash}"
    
    def _get_user_tier(self, request: Request) -> str:
        """Get user subscription tier"""
        if hasattr(request.state, 'user') and request.state.user:
            return request.state.user.get("subscription_tier", "free")
        return "free"
    
    def _check_memory_rate_limit(self, client_id: str, user_tier: str) -> bool:
        """Check rate limit using in-memory store"""
        now = time.time()
        tier_config = self.config.TIER_LIMITS.get(user_tier, self.config.TIER_LIMITS["free"])
        
        # Clean old entries
        if client_id in self._memory_store:
            self._memory_store[client_id] = [
                timestamp for timestamp in self._memory_store[client_id]
                if now - timestamp < 60  # Keep last minute
            ]
        else:
            self._memory_store[client_id] = []
        
        # Check if limit exceeded
        if len(self._memory_store[client_id]) >= tier_config["requests_per_minute"]:
            return False
        
        # Add current request
        self._memory_store[client_id].append(now)
        return True
    
    async def _check_redis_rate_limit(self, client_id: str, user_tier: str):
        """Check rate limit using Redis"""
        tier_config = self.config.TIER_LIMITS.get(user_tier, self.config.TIER_LIMITS["free"])
        
        # Check requests per minute
        minute_key = f"rate_limit_minute:{client_id}"
        minute_check = await self.redis_client.check_rate_limit(
            key=minute_key,
            limit=tier_config["requests_per_minute"],
            window_seconds=60
        )
        
        if not minute_check["allowed"]:
            raise RateLimitExceeded(
                f"Too many requests. Limit: {tier_config['requests_per_minute']}/minute for {user_tier} tier",
                retry_after=60,
                limit_type="user_minute"
            )
    
    async def _add_rate_limit_headers(self, response: Response, client_id: str, user_tier: str):
        """Add rate limit information to response headers"""
        try:
            tier_config = self.config.TIER_LIMITS.get(user_tier, self.config.TIER_LIMITS["free"])
            
            response.headers["X-RateLimit-Limit-Minute"] = str(tier_config["requests_per_minute"])
            response.headers["X-RateLimit-Limit-Hour"] = str(tier_config["requests_per_hour"])
            response.headers["X-RateLimit-Tier"] = user_tier
            
        except Exception as e:
            logger.debug(f"Error adding rate limit headers: {e}")


# Alias for backward compatibility
RateLimiter = RateLimitMiddleware


def rate_limit(limit: int, window_seconds: int, per_user: bool = True, key_suffix: str = None):
    """Decorator for function-level rate limiting"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Basic rate limiting without Redis dependency
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def ai_usage_limit(tier_limits: Dict[str, int]):
    """Decorator for AI feature usage limits"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            user = kwargs.get("current_user")
            if not user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_tier = user.get("subscription_tier", "free")
            daily_limit = tier_limits.get(user_tier, 0)
            
            if daily_limit == 0:
                raise HTTPException(
                    status_code=403,
                    detail="This AI feature requires a premium subscription."
                )
            
            # If Redis is available, check usage
            try:
                from clients.redis_client import redis_client
                if redis_client.available:
                    usage_key = f"ai_usage:{func.__name__}:{user['user_id']}:{datetime.utcnow().strftime('%Y%m%d')}"
                    current_usage = await redis_client.increment_counter(usage_key, ex=86400)
                    
                    if current_usage > daily_limit:
                        raise HTTPException(
                            status_code=429,
                            detail=f"Daily AI usage limit exceeded. Limit: {daily_limit} for {user_tier} tier",
                            headers={"Retry-After": "86400"}
                        )
                    
                    # Add usage info to response
                    result = await func(*args, **kwargs)
                    if isinstance(result, dict):
                        result["usage_info"] = {
                            "used": current_usage,
                            "limit": daily_limit,
                            "remaining": max(0, daily_limit - current_usage),
                            "tier": user_tier
                        }
                    return result
                else:
                    # Continue without usage tracking if Redis fails
                    return await func(*args, **kwargs)
                    
            except Exception as e:
                logger.debug(f"AI usage tracking failed, continuing: {e}")
                return await func(*args, **kwargs)
            
        return wrapper
    return decorator


# Export commonly used items
__all__ = [
    "RateLimitMiddleware",
    "RateLimiter", 
    "RateLimitConfig",
    "RateLimitExceeded",
    "rate_limit",
    "ai_usage_limit"
]