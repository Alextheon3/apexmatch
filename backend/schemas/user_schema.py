# backend/schemas/user_schema.py
"""
ApexMatch User Schemas
Pydantic models for user-related API requests and responses
"""

from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class GenderEnum(str, Enum):
    MALE = "male"
    FEMALE = "female"
    NON_BINARY = "non_binary"
    OTHER = "other"

class SubscriptionTierEnum(str, Enum):
    FREE = "free"
    CONNECTION = "connection"
    ELITE = "elite"

class TrustTierEnum(str, Enum):
    CHALLENGED = "challenged"
    BUILDING = "building"
    RELIABLE = "reliable"
    TRUSTED = "trusted"
    ELITE = "elite"

# Base user schemas
class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: Optional[str] = None
    age: int
    gender: GenderEnum
    location: str
    bio: Optional[str] = None
    interests: Optional[List[str]] = []
    
    @validator('age')
    def validate_age(cls, v):
        if v < 18 or v > 100:
            raise ValueError('Age must be between 18 and 100')
        return v
    
    @validator('bio')
    def validate_bio(cls, v):
        if v and len(v) > 500:
            raise ValueError('Bio cannot exceed 500 characters')
        return v

class UserCreate(UserBase):
    password: str
    confirm_password: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    interests: Optional[List[str]] = None
    
    @validator('bio')
    def validate_bio(cls, v):
        if v and len(v) > 500:
            raise ValueError('Bio cannot exceed 500 characters')
        return v

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: Optional[str]
    age: int
    gender: str
    location: str
    bio: Optional[str]
    interests: List[str]
    trust_score: Optional[float]
    trust_tier: Optional[str]
    subscription_tier: str
    is_verified: bool
    is_active: bool
    created_at: datetime
    last_active: Optional[datetime]
    
    class Config:
        from_attributes = True

class UserProfile(BaseModel):
    id: int
    first_name: str
    age: int
    location: str
    bio: Optional[str]
    interests: List[str]
    trust_score: Optional[float]
    trust_tier: Optional[str]
    photos: List[Dict[str, Any]]
    compatibility_score: Optional[float] = None
    
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str
    confirm_password: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v

class EmailVerificationRequest(BaseModel):
    email: EmailStr

class PhoneVerificationRequest(BaseModel):
    phone_number: str

class PhoneVerificationConfirm(BaseModel):
    phone_number: str
    verification_code: str

class UserPreferences(BaseModel):
    min_age: int = 18
    max_age: int = 50
    preferred_gender: List[GenderEnum]
    max_distance: int = 50
    min_trust_tier: Optional[TrustTierEnum] = None
    
    @validator('min_age', 'max_age')
    def validate_age_range(cls, v):
        if v < 18 or v > 100:
            raise ValueError('Age must be between 18 and 100')
        return v
    
    @validator('max_age')
    def validate_age_order(cls, v, values, **kwargs):
        if 'min_age' in values and v < values['min_age']:
            raise ValueError('Max age must be greater than min age')
        return v

class UserStats(BaseModel):
    total_matches: int
    successful_reveals: int
    trust_score_history: List[Dict[str, Any]]
    conversation_quality_avg: float
    response_rate: float
    
    class Config:
        from_attributes = True