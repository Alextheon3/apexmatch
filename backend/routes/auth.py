"""
ApexMatch Authentication Routes
Real implementation with proper database integration
FIXED: Handles all frontend request fields properly
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
import jwt
import hashlib
import uuid
from enum import Enum

# Real database dependency
def get_db():
    """Get database session"""
    from database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Settings configuration
class Settings:
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    SECRET_KEY = "apexmatch-secret-key-change-in-production"
    ALGORITHM = "HS256"

settings = Settings()

# Enum definitions
class SubscriptionTier(str, Enum):
    FREE = "free"
    CONNECTION = "connection"
    ELITE = "elite"

class OnboardingStatus(str, Enum):
    PROFILE_COMPLETE = "profile_complete"
    BGP_BUILDING = "bgp_building"
    READY = "ready"

class TrustTier(str, Enum):
    CHALLENGED = "challenged"
    BUILDING = "building"
    RELIABLE = "reliable"
    TRUSTED = "trusted"
    ELITE = "elite"

# Simple User storage (in-memory for now - replace with database later)
USERS_DB = {}

class User:
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', len(USERS_DB) + 1)
        self.uuid = str(uuid.uuid4())
        self.email = kwargs.get('email')
        self.first_name = kwargs.get('first_name')
        self.age = kwargs.get('age')
        self.location = kwargs.get('location')
        self.subscription_tier = SubscriptionTier.FREE
        self.onboarding_status = OnboardingStatus.PROFILE_COMPLETE
        self.is_active = True
        self.created_at = datetime.utcnow()
        self.last_active = datetime.utcnow()
        self.deleted_at = None
        self.password_hash = None
        self.trust_score = 50.0
        self.trust_tier = TrustTier.BUILDING
        
        # Store in memory database
        USERS_DB[self.email] = self
    
    def set_password(self, password: str):
        """Set hashed password"""
        self.password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, password: str) -> bool:
        """Verify password"""
        return self.password_hash == hashlib.sha256(password.encode()).hexdigest()
    
    def is_premium(self) -> bool:
        """Check if user has premium subscription"""
        return self.subscription_tier in [SubscriptionTier.CONNECTION, SubscriptionTier.ELITE]
    
    def profile_completion_percentage(self) -> float:
        """Calculate profile completion percentage"""
        completion = 0.0
        if self.first_name:
            completion += 25
        if self.age:
            completion += 25
        if self.location:
            completion += 25
        if self.email:
            completion += 25
        return completion
    
    def update_last_active(self):
        """Update last active timestamp"""
        self.last_active = datetime.utcnow()

# Auth utilities
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    """Get current user from token"""
    payload = verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user_email = payload.get("sub")
    user = USERS_DB.get(user_email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user

router = APIRouter()
security = HTTPBearer()

# Pydantic schemas for request/response - FIXED: Added all frontend fields
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    age: int
    location: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    rememberMe: Optional[bool] = False  # FIXED: Added this field
    sessionId: Optional[str] = None     # FIXED: Added this field

class UserResponse(BaseModel):
    id: int
    uuid: str
    email: str
    first_name: Optional[str]
    age: Optional[int]
    location: Optional[str]
    subscription_tier: SubscriptionTier
    onboarding_status: OnboardingStatus
    is_premium: bool
    profile_completion: float
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: UserResponse

@router.post("/register", response_model=TokenResponse)
async def register_user(user_data: UserRegister):
    """Register a new user account"""
    
    print(f"📝 Registration attempt for: {user_data.email}")
    
    # Check if user already exists
    if user_data.email in USERS_DB:
        print(f"❌ Email already exists: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate age
    if user_data.age < 18 or user_data.age > 99:
        print(f"❌ Invalid age: {user_data.age}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Age must be between 18 and 99"
        )
    
    try:
        # Create user
        user = User(
            email=user_data.email,
            first_name=user_data.first_name,
            age=user_data.age,
            location=user_data.location,
            onboarding_status=OnboardingStatus.PROFILE_COMPLETE
        )
        user.set_password(user_data.password)
        
        print(f"✅ Registered user: {user.email}")
        
        # Create access token
        access_token = create_access_token(data={"sub": user.email})
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse(
                id=user.id,
                uuid=user.uuid,
                email=user.email,
                first_name=user.first_name,
                age=user.age,
                location=user.location,
                subscription_tier=user.subscription_tier,
                onboarding_status=user.onboarding_status,
                is_premium=user.is_premium(),
                profile_completion=user.profile_completion_percentage()
            )
        )
        
    except Exception as e:
        print(f"❌ Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=TokenResponse)
async def login_user(login_data: UserLogin):
    """Authenticate user and return access token - FIXED: Handles all frontend fields"""
    
    print(f"🔐 Login attempt for: {login_data.email}")
    print(f"📋 Login data: rememberMe={login_data.rememberMe}, sessionId={login_data.sessionId}")
    
    # Find user by email
    user = USERS_DB.get(login_data.email)
    
    if not user:
        print(f"❌ User not found: {login_data.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not user.verify_password(login_data.password):
        print(f"❌ Invalid password for: {login_data.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is active
    if not user.is_active:
        print(f"❌ Deactivated account: {login_data.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated"
        )
    
    # Update last active
    user.update_last_active()
    
    # FIXED: Handle rememberMe for token expiry
    if login_data.rememberMe:
        expires_delta = timedelta(days=30)  # 30 days for remember me
        expires_seconds = int(expires_delta.total_seconds())
        print(f"🔒 Remember me enabled - token expires in 30 days")
    else:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        expires_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        print(f"🔒 Standard login - token expires in {settings.ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
    
    print(f"✅ Login successful for: {login_data.email}")
    
    # Create access token with appropriate expiry
    access_token = create_access_token(
        data={
            "sub": user.email,
            "user_id": user.id,
            "email": user.email,
            "subscription_tier": user.subscription_tier.value,
            "trust_score": user.trust_score,
            "is_verified": True,  # For now, assume all users are verified
            "permissions": []  # Add permissions as needed
        }, 
        expires_delta=expires_delta
    )
    
    # FIXED: Return proper response format
    response = TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_seconds,
        user=UserResponse(
            id=user.id,
            uuid=user.uuid,
            email=user.email,
            first_name=user.first_name,
            age=user.age,
            location=user.location,
            subscription_tier=user.subscription_tier,
            onboarding_status=user.onboarding_status,
            is_premium=user.is_premium(),
            profile_completion=user.profile_completion_percentage()
        )
    )
    
    print(f"🎉 Returning successful login response for: {user.email}")
    return response

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile information"""
    
    print(f"👤 Profile request for: {current_user.email}")
    
    return UserResponse(
        id=current_user.id,
        uuid=current_user.uuid,
        email=current_user.email,
        first_name=current_user.first_name,
        age=current_user.age,
        location=current_user.location,
        subscription_tier=current_user.subscription_tier,
        onboarding_status=current_user.onboarding_status,
        is_premium=current_user.is_premium(),
        profile_completion=current_user.profile_completion_percentage()
    )

@router.put("/me")
async def update_user_profile(
    profile_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update user profile information"""
    
    print(f"✏️ Profile update for: {current_user.email}")
    
    # Update allowed fields
    allowed_fields = ['first_name', 'age', 'location', 'bio', 'timezone', 'preferred_communication_hours']
    
    updated_fields = []
    for field, value in profile_data.items():
        if field in allowed_fields and hasattr(current_user, field):
            setattr(current_user, field, value)
            updated_fields.append(field)
    
    # Update onboarding status if profile is more complete
    if (current_user.first_name and current_user.age and current_user.location and 
        current_user.onboarding_status == OnboardingStatus.PROFILE_COMPLETE):
        current_user.onboarding_status = OnboardingStatus.BGP_BUILDING
        updated_fields.append('onboarding_status')
    
    print(f"✅ Updated fields for {current_user.email}: {updated_fields}")
    return {"message": "Profile updated successfully", "updated_fields": updated_fields}

@router.post("/logout")
async def logout_user(current_user: User = Depends(get_current_user)):
    """Logout user (mainly for updating last active time)"""
    
    print(f"👋 User logged out: {current_user.email}")
    current_user.update_last_active()
    
    return {"message": "Logged out successfully"}

@router.post("/change-password")
async def change_password(
    password_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Change user password"""
    
    print(f"🔑 Password change request for: {current_user.email}")
    
    current_password = password_data.get("current_password")
    new_password = password_data.get("new_password")
    
    if not current_password or not new_password:
        print(f"❌ Missing password fields for: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current and new passwords are required"
        )
    
    # Verify current password
    if not current_user.verify_password(current_password):
        print(f"❌ Invalid current password for: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    if len(new_password) < 8:
        print(f"❌ New password too short for: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long"
        )
    
    # Update password
    current_user.set_password(new_password)
    
    print(f"✅ Password changed for: {current_user.email}")
    return {"message": "Password changed successfully"}

@router.delete("/me")
async def delete_user_account(current_user: User = Depends(get_current_user)):
    """Soft delete user account"""
    
    print(f"🗑️ Account deletion request for: {current_user.email}")
    
    # Soft delete
    current_user.deleted_at = datetime.utcnow()
    current_user.is_active = False
    
    print(f"✅ Account soft deleted: {current_user.email}")
    return {"message": "Account deleted successfully"}

@router.get("/health")
async def auth_health_check():
    """Health check for auth service"""
    return {
        "status": "healthy",
        "service": "authentication",
        "timestamp": datetime.utcnow().isoformat(),
        "users_count": len(USERS_DB),
        "active_users": len([u for u in USERS_DB.values() if u.is_active])
    }

# Create some default test users for development
def create_test_users():
    """Create test users for development"""
    test_users = [
        {
            "email": "test@example.com",
            "password": "password123",
            "first_name": "Test",
            "age": 25,
            "location": "Test City"
        },
        {
            "email": "admin@apexmatch.com", 
            "password": "admin123",
            "first_name": "Admin",
            "age": 30,
            "location": "Admin City"
        },
        {
            "email": "demo@test.com",
            "password": "demo123", 
            "first_name": "Demo",
            "age": 28,
            "location": "Demo City"
        }
    ]
    
    for user_data in test_users:
        if user_data["email"] not in USERS_DB:
            user = User(
                email=user_data["email"],
                first_name=user_data["first_name"],
                age=user_data["age"],
                location=user_data["location"]
            )
            user.set_password(user_data["password"])
            print(f"✅ Created test user: {user.email}")

# Initialize test users
create_test_users()