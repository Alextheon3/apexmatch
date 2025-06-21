"""
ApexMatch Logging Middleware
Comprehensive request/response logging, error tracking, and analytics
FIXED: Redis is now optional and won't break authentication
"""

import json
import logging
import time
import traceback
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
import asyncio

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from config import settings

# Configure logger
logger = logging.getLogger(__name__)

# Logging configuration
LOG_LEVEL = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
ENABLE_REQUEST_LOGGING = settings.ENABLE_REQUEST_LOGGING
ENABLE_RESPONSE_LOGGING = settings.ENABLE_RESPONSE_LOGGING
ENABLE_ERROR_TRACKING = settings.ENABLE_ERROR_TRACKING
LOG_SENSITIVE_DATA = settings.LOG_SENSITIVE_DATA

# Sensitive fields to redact from logs
SENSITIVE_FIELDS = {
    "password", "token", "access_token", "refresh_token", "api_key",
    "secret", "private_key", "card_number", "cvv", "ssn", "social_security",
    "credit_card", "payment_method", "stripe_token"
}

# Paths to exclude from detailed logging
EXCLUDE_PATHS = {
    "/health", "/metrics", "/docs", "/redoc", "/openapi.json",
    "/favicon.ico", "/robots.txt"
}

# Request/Response size limits for logging (in bytes)
MAX_REQUEST_BODY_LOG_SIZE = 10240  # 10KB
MAX_RESPONSE_BODY_LOG_SIZE = 10240  # 10KB


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive logging middleware for requests, responses, and errors
    FIXED: Redis operations are now optional and won't break authentication
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.logger = logging.getLogger("apexmatch.requests")
        self.redis_available = False
        self.redis_client = None
        self._init_redis()
        
    def _init_redis(self):
        """Initialize Redis connection if available"""
        try:
            from clients.redis_client import redis_client
            self.redis_client = redis_client
            # Test Redis connection
            self.redis_client.redis.ping()
            self.redis_available = True
            logger.info("Redis connection established for logging")
        except Exception as e:
            logger.warning(f"Redis not available for logging, continuing without analytics: {e}")
            self.redis_available = False
        
    async def dispatch(self, request: Request, call_next):
        """
        Process request and response logging
        """
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Start timing
        start_time = time.time()
        start_datetime = datetime.utcnow()
        
        # Skip logging for excluded paths
        if any(request.url.path.startswith(path) for path in EXCLUDE_PATHS):
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
        
        # Log request
        request_log = await self._create_request_log(request, request_id, start_datetime)
        
        if ENABLE_REQUEST_LOGGING:
            self.logger.info(f"REQUEST: {json.dumps(request_log, default=str)}")
        
        # Process request and handle errors
        try:
            response = await call_next(request)
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            # Log response
            response_log = await self._create_response_log(
                request, response, request_id, processing_time
            )
            
            if ENABLE_RESPONSE_LOGGING:
                self.logger.info(f"RESPONSE: {json.dumps(response_log, default=str)}")
            
            # Store request/response analytics (FIXED: Won't break on Redis failure)
            if self.redis_available:
                try:
                    await self._store_analytics(request, response, processing_time, request_id)
                except Exception as e:
                    logger.debug(f"Analytics storage failed (non-critical): {e}")
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as e:
            # Calculate processing time for errors
            processing_time = time.time() - start_time
            
            # Log error
            await self._log_error(request, e, request_id, processing_time, start_datetime)
            
            # Create error response
            error_response = JSONResponse(
                status_code=500,
                content={
                    "error": "internal_server_error",
                    "message": "An unexpected error occurred",
                    "request_id": request_id
                }
            )
            error_response.headers["X-Request-ID"] = request_id
            
            return error_response
    
    async def _create_request_log(
        self, 
        request: Request, 
        request_id: str, 
        timestamp: datetime
    ) -> Dict[str, Any]:
        """Create structured request log"""
        try:
            # Get client information
            client_ip = self._get_client_ip(request)
            user_agent = request.headers.get("User-Agent", "")
            
            # Get user information if available (FIXED: Safe access)
            user_info = None
            if hasattr(request.state, 'user') and request.state.user:
                try:
                    user_info = {
                        "user_id": request.state.user.get("user_id"),
                        "email": request.state.user.get("email"),
                        "subscription_tier": request.state.user.get("subscription_tier"),
                        "trust_score": request.state.user.get("trust_score")
                    }
                except:
                    user_info = None
            
            # Get request body if available and not too large
            request_body = None
            if ENABLE_REQUEST_LOGGING and request.method in ["POST", "PUT", "PATCH"]:
                try:
                    body = await self._get_request_body(request)
                    if body and len(body) <= MAX_REQUEST_BODY_LOG_SIZE:
                        request_body = self._sanitize_data(json.loads(body))
                    elif body:
                        request_body = {"_truncated": True, "size": len(body)}
                except:
                    request_body = {"_error": "Failed to parse request body"}
            
            # Create request log
            request_log = {
                "request_id": request_id,
                "timestamp": timestamp.isoformat(),
                "method": request.method,
                "url": str(request.url),
                "path": request.url.path,
                "query_params": dict(request.query_params),
                "headers": self._sanitize_headers(dict(request.headers)),
                "client_ip": client_ip,
                "user_agent": user_agent,
                "user": user_info,
                "body": request_body,
                "content_type": request.headers.get("Content-Type"),
                "content_length": request.headers.get("Content-Length")
            }
            
            return request_log
            
        except Exception as e:
            logger.error(f"Error creating request log: {e}")
            return {
                "request_id": request_id,
                "error": "Failed to create request log",
                "timestamp": timestamp.isoformat()
            }
    
    async def _create_response_log(
        self, 
        request: Request, 
        response: Response, 
        request_id: str, 
        processing_time: float
    ) -> Dict[str, Any]:
        """Create structured response log"""
        try:
            # Get response body if available and not too large
            response_body = None
            if ENABLE_RESPONSE_LOGGING and hasattr(response, 'body'):
                try:
                    body = response.body
                    if body and len(body) <= MAX_RESPONSE_BODY_LOG_SIZE:
                        if response.headers.get("Content-Type", "").startswith("application/json"):
                            response_body = self._sanitize_data(json.loads(body))
                        else:
                            response_body = {"_type": "non_json", "size": len(body)}
                    elif body:
                        response_body = {"_truncated": True, "size": len(body)}
                except:
                    response_body = {"_error": "Failed to parse response body"}
            
            # Create response log
            response_log = {
                "request_id": request_id,
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "body": response_body,
                "processing_time_ms": round(processing_time * 1000, 2),
                "content_type": response.headers.get("Content-Type"),
                "content_length": response.headers.get("Content-Length")
            }
            
            return response_log
            
        except Exception as e:
            logger.error(f"Error creating response log: {e}")
            return {
                "request_id": request_id,
                "error": "Failed to create response log"
            }
    
    async def _log_error(
        self, 
        request: Request, 
        error: Exception, 
        request_id: str, 
        processing_time: float,
        start_time: datetime
    ):
        """Log error with full context"""
        try:
            # Get user information if available (FIXED: Safe access)
            user_info = None
            if hasattr(request.state, 'user') and request.state.user:
                try:
                    user_info = {
                        "user_id": request.state.user.get("user_id"),
                        "email": request.state.user.get("email")
                    }
                except:
                    user_info = None
            
            # Create error log
            error_log = {
                "request_id": request_id,
                "timestamp": start_time.isoformat(),
                "error_type": type(error).__name__,
                "error_message": str(error),
                "traceback": traceback.format_exc() if ENABLE_ERROR_TRACKING else None,
                "method": request.method,
                "url": str(request.url),
                "path": request.url.path,
                "client_ip": self._get_client_ip(request),
                "user_agent": request.headers.get("User-Agent", ""),
                "user": user_info,
                "processing_time_ms": round(processing_time * 1000, 2)
            }
            
            # Log error
            self.logger.error(f"ERROR: {json.dumps(error_log, default=str)}")
            
            # Store error for analytics (FIXED: Won't break on Redis failure)
            if self.redis_available:
                try:
                    await self._store_error_analytics(error_log)
                except Exception as e:
                    logger.debug(f"Error analytics storage failed (non-critical): {e}")
            
        except Exception as e:
            logger.error(f"Error logging error: {e}")
    
    async def _get_request_body(self, request: Request) -> Optional[str]:
        """Safely get request body"""
        try:
            # Check if body was already read
            if hasattr(request.state, '_body'):
                return request.state._body
            
            # Read body
            body = await request.body()
            body_str = body.decode('utf-8') if body else None
            
            # Store for potential re-use
            request.state._body = body_str
            
            return body_str
            
        except Exception as e:
            logger.debug(f"Could not read request body: {e}")
            return None
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address with proxy support"""
        # Check for forwarded headers
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fall back to direct client IP
        return request.client.host if request.client else "unknown"
    
    def _sanitize_headers(self, headers: Dict[str, str]) -> Dict[str, str]:
        """Sanitize headers by removing sensitive information"""
        sanitized = {}
        for key, value in headers.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in SENSITIVE_FIELDS):
                sanitized[key] = "[REDACTED]"
            elif key_lower == "authorization":
                # Show only the type (Bearer, Basic, etc.)
                auth_parts = value.split(" ", 1)
                sanitized[key] = f"{auth_parts[0]} [REDACTED]" if len(auth_parts) > 1 else "[REDACTED]"
            elif key_lower == "cookie":
                sanitized[key] = "[REDACTED]"
            else:
                sanitized[key] = value
        return sanitized
    
    def _sanitize_data(self, data: Any) -> Any:
        """Recursively sanitize data by removing sensitive fields"""
        if not LOG_SENSITIVE_DATA:
            if isinstance(data, dict):
                sanitized = {}
                for key, value in data.items():
                    key_lower = key.lower()
                    if any(sensitive in key_lower for sensitive in SENSITIVE_FIELDS):
                        sanitized[key] = "[REDACTED]"
                    else:
                        sanitized[key] = self._sanitize_data(value)
                return sanitized
            elif isinstance(data, list):
                return [self._sanitize_data(item) for item in data]
        
        return data
    
    async def _store_analytics(
        self, 
        request: Request, 
        response: Response, 
        processing_time: float, 
        request_id: str
    ):
        """Store request/response analytics in Redis (FIXED: Safe Redis operations)"""
        if not self.redis_available or not self.redis_client:
            return
            
        try:
            # Create analytics entry
            analytics_data = {
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat(),
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "processing_time_ms": round(processing_time * 1000, 2),
                "user_id": None,
                "client_ip": self._get_client_ip(request)
            }
            
            # Safely get user_id
            if hasattr(request.state, 'user') and request.state.user:
                try:
                    analytics_data["user_id"] = request.state.user.get("user_id")
                except:
                    pass
            
            # Store in Redis with daily partitioning
            date_key = datetime.utcnow().strftime("%Y%m%d")
            analytics_key = f"request_analytics:{date_key}"
            
            await self.redis_client.redis.lpush(analytics_key, json.dumps(analytics_data, default=str))
            await self.redis_client.redis.ltrim(analytics_key, 0, 9999)  # Keep last 10k requests
            await self.redis_client.redis.expire(analytics_key, 86400 * 7)  # Expire after 7 days
            
            # Update performance metrics
            await self._update_performance_metrics(request.url.path, processing_time, response.status_code)
            
        except Exception as e:
            logger.debug(f"Analytics storage failed: {e}")
            # Mark Redis as unavailable if it fails
            self.redis_available = False
    
    async def _store_error_analytics(self, error_log: Dict[str, Any]):
        """Store error analytics in Redis (FIXED: Safe Redis operations)"""
        if not self.redis_available or not self.redis_client:
            return
            
        try:
            # Store error for tracking
            date_key = datetime.utcnow().strftime("%Y%m%d")
            error_key = f"error_analytics:{date_key}"
            
            await self.redis_client.redis.lpush(error_key, json.dumps(error_log, default=str))
            await self.redis_client.redis.ltrim(error_key, 0, 999)  # Keep last 1k errors
            await self.redis_client.redis.expire(error_key, 86400 * 30)  # Expire after 30 days
            
            # Update error counters
            error_counter_key = f"error_count:{error_log['error_type']}:{date_key}"
            await self.redis_client.increment_counter(error_counter_key, ex=86400)
            
        except Exception as e:
            logger.debug(f"Error analytics storage failed: {e}")
            # Mark Redis as unavailable if it fails
            self.redis_available = False
    
    async def _update_performance_metrics(self, path: str, processing_time: float, status_code: int):
        """Update performance metrics for endpoints (FIXED: Safe Redis operations)"""
        if not self.redis_available or not self.redis_client:
            return
            
        try:
            date_key = datetime.utcnow().strftime("%Y%m%d")
            
            # Update average response time
            path_metric_key = f"performance:{path}:{date_key}"
            current_data = await self.redis_client.get_json(path_metric_key) or {
                "total_requests": 0,
                "total_time": 0,
                "avg_time": 0,
                "status_codes": {}
            }
            
            # Update metrics
            current_data["total_requests"] += 1
            current_data["total_time"] += processing_time
            current_data["avg_time"] = current_data["total_time"] / current_data["total_requests"]
            
            # Update status code counts
            status_str = str(status_code)
            current_data["status_codes"][status_str] = current_data["status_codes"].get(status_str, 0) + 1
            
            await self.redis_client.set_json(path_metric_key, current_data, ex=86400 * 7)
            
        except Exception as e:
            logger.debug(f"Performance metrics update failed: {e}")
            # Mark Redis as unavailable if it fails
            self.redis_available = False


class StructuredLogger:
    """
    Structured logger for application events
    """
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
    
    def log_user_action(
        self, 
        user_id: int, 
        action: str, 
        details: Dict[str, Any] = None,
        request_id: str = None
    ):
        """Log user action with structured format"""
        log_data = {
            "event_type": "user_action",
            "user_id": user_id,
            "action": action,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details or {},
            "request_id": request_id
        }
        
        self.logger.info(f"USER_ACTION: {json.dumps(log_data, default=str)}")
    
    def log_business_event(
        self, 
        event_type: str, 
        data: Dict[str, Any],
        user_id: int = None,
        request_id: str = None
    ):
        """Log business event (matches, reveals, subscriptions, etc.)"""
        log_data = {
            "event_type": "business_event",
            "business_event_type": event_type,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data,
            "request_id": request_id
        }
        
        self.logger.info(f"BUSINESS_EVENT: {json.dumps(log_data, default=str)}")
    
    def log_security_event(
        self, 
        event_type: str, 
        severity: str,
        details: Dict[str, Any],
        user_id: int = None,
        client_ip: str = None,
        request_id: str = None
    ):
        """Log security-related events"""
        log_data = {
            "event_type": "security_event",
            "security_event_type": event_type,
            "severity": severity,
            "user_id": user_id,
            "client_ip": client_ip,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details,
            "request_id": request_id
        }
        
        self.logger.warning(f"SECURITY_EVENT: {json.dumps(log_data, default=str)}")
    
    def log_performance_warning(
        self, 
        operation: str, 
        duration_ms: float,
        threshold_ms: float,
        details: Dict[str, Any] = None,
        request_id: str = None
    ):
        """Log performance warnings for slow operations"""
        log_data = {
            "event_type": "performance_warning",
            "operation": operation,
            "duration_ms": duration_ms,
            "threshold_ms": threshold_ms,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details or {},
            "request_id": request_id
        }
        
        self.logger.warning(f"PERFORMANCE_WARNING: {json.dumps(log_data, default=str)}")


# Create global logger instances (FIXED: No Redis dependency)
app_logger = StructuredLogger("apexmatch.app")

# Export commonly used items
__all__ = [
    "LoggingMiddleware",
    "StructuredLogger", 
    "app_logger"
]