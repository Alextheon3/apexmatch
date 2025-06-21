"""
ApexMatch Authentication Middleware
Handles JWT validation and user authentication
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from config import settings

# Configure logger
logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()

# JWT settings
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

# Paths that don't require authentication
PUBLIC_PATHS = {
    "/", "/health", "/docs", "/redoc", "/openapi.json",
    "/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/refresh",
    "/api/v1/auth/forgot-password", "/api/v1/auth/reset-password",
    "/api/v1/auth/verify-email", "/api/v1/auth/resend-verification",
    "/ws", "/favicon.ico", "/api/v1/status", "/api/v1/info"
}


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Dependency to get the current user from JWT token
    """
    token = credentials.credentials
    
    try:
        # Decode JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Extract user information
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check token expiration
        exp = payload.get("exp")
        if exp and datetime.utcnow().timestamp() > exp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Return user information
        return {
            "user_id": int(user_id),
            "email": payload.get("email"),
            "username": payload.get("username"),
            "subscription_tier": payload.get("subscription_tier", "free"),
            "trust_score": payload.get("trust_score", 0.5),
            "is_verified": payload.get("is_verified", False),
            "token_type": payload.get("token_type", "access")
        }
        
    except JWTError as e:
        logger.warning(f"JWT validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_active_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Dependency to ensure user is active and verified
    """
    if not current_user.get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify your email to continue."
        )
    
    return current_user


async def get_premium_user(current_user: Dict[str, Any] = Depends(get_current_active_user)) -> Dict[str, Any]:
    """
    Dependency to ensure user has premium subscription
    """
    if current_user.get("subscription_tier", "free") == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required for this feature"
        )
    
    return current_user


async def get_admin_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Dependency to ensure user is admin
    """
    # You might want to add an 'is_admin' field to your JWT payload
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return current_user


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Authentication middleware for protecting routes
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.logger = logging.getLogger("apexmatch.auth")
    
    async def dispatch(self, request: Request, call_next):
        """
        Process authentication for protected routes
        """
        # Skip authentication for public paths
        if any(request.url.path.startswith(path) for path in PUBLIC_PATHS):
            response = await call_next(request)
            return response
        
        # Skip OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            response = await call_next(request)
            return response
        
        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "detail": "Missing authentication token",
                    "error": "unauthorized"
                },
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        try:
            # Extract and validate token
            token = auth_header.split(" ")[1]
            
            # Decode JWT token
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            
            # Extract user information
            user_id = payload.get("sub")
            if not user_id:
                raise JWTError("Invalid token payload")
            
            # Check token expiration
            exp = payload.get("exp")
            if exp and datetime.utcnow().timestamp() > exp:
                raise JWTError("Token has expired")
            
            # Store user info in request state
            request.state.user = {
                "user_id": int(user_id),
                "email": payload.get("email"),
                "username": payload.get("username"),
                "subscription_tier": payload.get("subscription_tier", "free"),
                "trust_score": payload.get("trust_score", 0.5),
                "is_verified": payload.get("is_verified", False),
                "token_type": payload.get("token_type", "access")
            }
            
            # Log authentication success
            self.logger.debug(f"Authenticated user {user_id} for {request.method} {request.url.path}")
            
            # Process request
            response = await call_next(request)
            return response
            
        except JWTError as e:
            self.logger.warning(f"JWT validation failed: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "detail": "Could not validate credentials",
                    "error": "invalid_token"
                },
                headers={"WWW-Authenticate": "Bearer"}
            )
        except Exception as e:
            self.logger.error(f"Auth middleware error: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "detail": "Authentication error",
                    "error": "auth_error"
                }
            )


def create_access_token(data: dict, expires_delta: Optional[int] = None) -> str:
    """
    Create a new JWT access token
    """
    to_encode = data.copy()
    
    # Set expiration
    if expires_delta:
        expire = datetime.utcnow() + timedelta(minutes=expires_delta)
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "token_type": "access"
    })
    
    # Create JWT token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """
    Create a new JWT refresh token
    """
    to_encode = data.copy()
    
    # Refresh tokens have longer expiration (30 days)
    expire = datetime.utcnow() + timedelta(days=30)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "token_type": "refresh"
    })
    
    # Create JWT token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str, expected_type: str = "access") -> Dict[str, Any]:
    """
    Verify and decode a JWT token
    """
    try:
        # Decode token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Check token type
        token_type = payload.get("token_type", "access")
        if token_type != expected_type:
            raise JWTError(f"Invalid token type. Expected {expected_type}, got {token_type}")
        
        # Check expiration
        exp = payload.get("exp")
        if exp and datetime.utcnow().timestamp() > exp:
            raise JWTError("Token has expired")
        
        return payload
        
    except JWTError:
        raise
    except Exception as e:
        raise JWTError(f"Invalid token: {str(e)}")


def require_verification():
    """Decorator to require email verification"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user or not current_user.get('is_verified', False):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Email verification required"
                )
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_trust_score(minimum_score: float):
    """Decorator to require minimum trust score"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            trust_score = current_user.get('trust_score', 0) * 100  # Convert to 0-100 scale
            if trust_score < minimum_score:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Minimum trust score of {minimum_score} required. Your score: {trust_score:.1f}"
                )
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Export commonly used items
__all__ = [
    "AuthMiddleware",
    "get_current_user",
    "get_current_active_user",
    "get_premium_user",
    "get_admin_user",
    "create_access_token",
    "create_refresh_token",
    "verify_token",
    "security",
    "require_verification",
    "require_trust_score"
]