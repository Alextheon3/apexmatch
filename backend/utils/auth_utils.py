# backend/utils/auth_utils.py
"""
ApexMatch Authentication Utilities
JWT token management, password hashing, and authentication helpers
"""

import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Union
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import secrets
import re
from email_validator import validate_email, EmailNotValidError

from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
from database import get_db
from models.user import User

# Security scheme for FastAPI
security = HTTPBearer()

class AuthUtils:
    """Authentication utility class"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        try:
            return bcrypt.checkpw(
                plain_password.encode('utf-8'), 
                hashed_password.encode('utf-8')
            )
        except Exception:
            return False
    
    @staticmethod
    def validate_password_strength(password: str) -> Dict[str, Any]:
        """
        Validate password strength for ApexMatch security standards
        Returns validation result with detailed feedback
        """
        issues = []
        score = 0
        
        # Length check
        if len(password) < 8:
            issues.append("Password must be at least 8 characters long")
        else:
            score += 1
        
        # Character variety checks
        if not re.search(r"[a-z]", password):
            issues.append("Password must contain at least one lowercase letter")
        else:
            score += 1
            
        if not re.search(r"[A-Z]", password):
            issues.append("Password must contain at least one uppercase letter")
        else:
            score += 1
            
        if not re.search(r"\d", password):
            issues.append("Password must contain at least one number")
        else:
            score += 1
            
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            issues.append("Password must contain at least one special character")
        else:
            score += 1
        
        # Common password check
        common_passwords = [
            "password", "123456", "password123", "admin", "qwerty",
            "letmein", "welcome", "monkey", "dragon", "master"
        ]
        if password.lower() in common_passwords:
            issues.append("Password is too common, please choose a more unique password")
            score = max(0, score - 2)
        
        # Sequential characters check
        if re.search(r"(012|123|234|345|456|567|678|789|abc|bcd|cde)", password.lower()):
            issues.append("Avoid sequential characters in password")
            score = max(0, score - 1)
        
        # Determine strength level
        if score >= 5:
            strength = "strong"
        elif score >= 3:
            strength = "medium"
        else:
            strength = "weak"
        
        return {
            "is_valid": len(issues) == 0,
            "strength": strength,
            "score": score,
            "issues": issues,
            "suggestions": [
                "Use a mix of uppercase and lowercase letters",
                "Include numbers and special characters",
                "Make it at least 12 characters long for maximum security",
                "Avoid personal information and common words"
            ] if issues else []
        }

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_reset_token(email: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create password reset token"""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=1)  # Reset tokens expire in 1 hour
    
    to_encode = {
        "sub": email,
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "reset",
        "nonce": secrets.token_urlsafe(16)  # Prevent token reuse
    }
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, expected_type: str = "access") -> Dict[str, Any]:
    """
    Verify JWT token and return payload
    
    Args:
        token: JWT token string
        expected_type: Expected token type (access, refresh, reset)
    
    Returns:
        Token payload if valid
        
    Raises:
        HTTPException: If token is invalid, expired, or wrong type
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Verify token type
        token_type = payload.get("type")
        if token_type != expected_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token type. Expected {expected_type}, got {token_type}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token
    """
    token = credentials.credentials
    payload = verify_token(token, "access")
    
    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user (additional check for account status)"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

def get_current_premium_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current user with premium subscription"""
    if current_user.subscription_tier == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required for this feature"
        )
    return current_user

def get_current_elite_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current user with elite subscription"""
    if current_user.subscription_tier != "elite":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Elite subscription required for this feature"
        )
    return current_user

def validate_email_format(email: str) -> bool:
    """Validate email format using email-validator"""
    try:
        validate_email(email)
        return True
    except EmailNotValidError:
        return False

def generate_verification_code() -> str:
    """Generate 6-digit verification code for email/SMS verification"""
    return f"{secrets.randbelow(900000) + 100000:06d}"

def generate_secure_token(length: int = 32) -> str:
    """Generate cryptographically secure random token"""
    return secrets.token_urlsafe(length)

class SubscriptionGuard:
    """Decorator class for subscription-based access control"""
    
    def __init__(self, required_tier: str):
        self.required_tier = required_tier
        self.tier_hierarchy = {
            "free": 0,
            "connection": 1,
            "elite": 2
        }
    
    def __call__(self, current_user: User = Depends(get_current_user)):
        user_tier_level = self.tier_hierarchy.get(current_user.subscription_tier, 0)
        required_tier_level = self.tier_hierarchy.get(self.required_tier, 0)
        
        if user_tier_level < required_tier_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{self.required_tier.title()} subscription required for this feature"
            )
        
        return current_user

# Subscription decorators for easy use
require_connection = SubscriptionGuard("connection")
require_elite = SubscriptionGuard("elite")

class TrustGuard:
    """Decorator class for trust-based access control"""
    
    def __init__(self, min_trust_score: int = None, min_trust_tier: str = None):
        self.min_trust_score = min_trust_score
        self.min_trust_tier = min_trust_tier
        self.trust_tier_scores = {
            "challenged": 0,
            "building": 300,
            "reliable": 500,
            "trusted": 700,
            "elite": 900
        }
    
    def __call__(self, current_user: User = Depends(get_current_user)):
        if self.min_trust_score and current_user.trust_score < self.min_trust_score:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Minimum trust score of {self.min_trust_score} required"
            )
        
        if self.min_trust_tier:
            user_tier_score = self.trust_tier_scores.get(current_user.trust_tier, 0)
            required_tier_score = self.trust_tier_scores.get(self.min_trust_tier, 0)
            
            if user_tier_score < required_tier_score:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Minimum trust tier '{self.min_trust_tier}' required"
                )
        
        return current_user

# Trust decorators for easy use
require_trusted = TrustGuard(min_trust_tier="trusted")
require_reliable = TrustGuard(min_trust_tier="reliable")

def create_user_session_data(user: User) -> Dict[str, Any]:
    """Create session data for user authentication"""
    return {
        "user_id": user.id,
        "email": user.email,
        "subscription_tier": user.subscription_tier,
        "trust_tier": user.trust_tier,
        "trust_score": user.trust_score,
        "is_verified": user.is_verified,
        "last_login": datetime.utcnow().isoformat()
    }

def extract_user_agent_info(user_agent: str) -> Dict[str, str]:
    """Extract browser and OS information from user agent string"""
    # Simple user agent parsing (could be enhanced with external library)
    browser = "Unknown"
    os = "Unknown"
    
    if "Chrome" in user_agent:
        browser = "Chrome"
    elif "Firefox" in user_agent:
        browser = "Firefox"
    elif "Safari" in user_agent:
        browser = "Safari"
    elif "Edge" in user_agent:
        browser = "Edge"
    
    if "Windows" in user_agent:
        os = "Windows"
    elif "Mac OS" in user_agent:
        os = "macOS"
    elif "Linux" in user_agent:
        os = "Linux"
    elif "Android" in user_agent:
        os = "Android"
    elif "iOS" in user_agent:
        os = "iOS"
    
    return {
        "browser": browser,
        "operating_system": os,
        "full_user_agent": user_agent
    }

def is_password_compromised(password: str) -> bool:
    """
    Check if password appears in known data breaches
    This is a placeholder - in production, you'd use HaveIBeenPwned API
    """
    # Placeholder implementation
    # In production, integrate with HaveIBeenPwned API
    common_compromised = [
        "password123", "123456789", "qwerty123", "admin123",
        "welcome123", "password1", "123456", "password"
    ]
    return password.lower() in common_compromised

def generate_password_reset_html(reset_link: str, user_name: str) -> str:
    """Generate HTML for password reset email"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>ApexMatch Password Reset</title>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; background: #f9f9f9; }}
            .button {{ background: #667eea; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block; }}
            .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>🔒 Password Reset Request</h2>
            </div>
            <div class="content">
                <p>Hi {user_name},</p>
                <p>We received a request to reset your ApexMatch password. If you didn't make this request, you can safely ignore this email.</p>
                <p>To reset your password, click the button below:</p>
                <p style="text-align: center;">
                    <a href="{reset_link}" class="button">Reset Password</a>
                </p>
                <p>This link will expire in 1 hour for security reasons.</p>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all;">{reset_link}</p>
            </div>
            <div class="footer">
                <p>© 2025 ApexMatch. All rights reserved.</p>
                <p>This is an automated email. Please don't reply to this message.</p>
            </div>
        </div>
    </body>
    </html>
    """

# Rate limiting helpers
class RateLimiter:
    """Simple in-memory rate limiter for authentication endpoints"""
    
    def __init__(self):
        self.attempts = {}
    
    def is_rate_limited(self, identifier: str, max_attempts: int = 5, window_minutes: int = 15) -> bool:
        """Check if identifier is rate limited"""
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=window_minutes)
        
        # Clean old attempts
        if identifier in self.attempts:
            self.attempts[identifier] = [
                attempt for attempt in self.attempts[identifier] 
                if attempt > window_start
            ]
        
        # Check current attempts
        current_attempts = len(self.attempts.get(identifier, []))
        return current_attempts >= max_attempts
    
    def record_attempt(self, identifier: str):
        """Record an authentication attempt"""
        if identifier not in self.attempts:
            self.attempts[identifier] = []
        self.attempts[identifier].append(datetime.utcnow())

# Global rate limiter instance
auth_rate_limiter = RateLimiter()

def check_auth_rate_limit(identifier: str, max_attempts: int = 5):
    """Check and record authentication rate limit"""
    if auth_rate_limiter.is_rate_limited(identifier, max_attempts):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please try again later."
        )
    auth_rate_limiter.record_attempt(identifier)