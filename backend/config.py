"""
ApexMatch Configuration Management
Environment-based settings with validation
"""

from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List, Optional, Any
import os


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Pydantic v2 configuration
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra='ignore'  # This allows extra fields from .env without errors
    )
    
    # App Configuration
    APP_NAME: str = "ApexMatch"
    DEBUG: bool = False
    API_VERSION: str = "v1"
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = "sqlite:///./apexmatch.db"
    DATABASE_ECHO: bool = False
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://apexmatch.com"
    ]
    
    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    CACHE_TTL: int = 3600  # 1 hour
    
    # AI Services
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    AI_MODEL_PRIMARY: str = "gpt-4"
    AI_MODEL_FALLBACK: str = "gpt-3.5-turbo"
    AI_MAX_TOKENS: int = 150
    AI_TEMPERATURE: float = 0.7
    
    # Rate Limiting
    RATE_LIMIT_FREE_HOURLY: int = 10
    RATE_LIMIT_PREMIUM_HOURLY: int = 100
    RATE_LIMIT_AI_FREE_DAILY: int = 3
    RATE_LIMIT_AI_PREMIUM_DAILY: int = 50
    
    # Subscription & Payment
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    PREMIUM_PRICE_USD: int = 1800  # $18.00 in cents
    
    # Matching Algorithm
    MATCH_SIMILARITY_THRESHOLD: float = 0.7
    BGP_UPDATE_FREQUENCY_HOURS: int = 24
    TRUST_DECAY_RATE: float = 0.1
    MAX_ACTIVE_MATCHES: int = 10
    
    # Free Tier Limits
    FREE_MATCHES_PER_3_DAYS: int = 1
    FREE_MAX_ACTIVE_CHATS: int = 3
    FREE_BGP_INSIGHTS_BASIC: bool = True
    
    # WebSocket Configuration
    WS_HEARTBEAT_INTERVAL: int = 30
    WS_MAX_CONNECTIONS_PER_USER: int = 3
    
    # Email Configuration (for notifications)
    EMAIL_HOST: Optional[str] = None
    EMAIL_PORT: int = 587
    EMAIL_USERNAME: Optional[str] = None
    EMAIL_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "noreply@apexmatch.com"
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: Optional[str] = None
    ENABLE_REQUEST_LOGGING: bool = True
    
    # Additional middleware settings that might be needed
    ENABLE_RATE_LIMITING: bool = True
    ENABLE_AUTH_MIDDLEWARE: bool = True
    ENABLE_CORS: bool = True
    
    # Additional feature flags
    ENABLE_AI_WINGMAN: bool = True
    ENABLE_PHOTO_REVEALS: bool = True
    ENABLE_TRUST_SYSTEM: bool = True
    ENABLE_BGP_ANALYSIS: bool = True
    ENABLE_WEBSOCKETS: bool = True
    
    def __getattr__(self, name: str) -> Any:
        """
        Fallback for missing attributes to prevent AttributeError
        Returns reasonable defaults for any missing settings
        """
        # Boolean settings default to True
        if name.startswith('ENABLE_'):
            return True
        
        # Rate limit settings
        if 'RATE_LIMIT' in name:
            return 100
        
        # Timeout settings  
        if 'TIMEOUT' in name:
            return 30
        
        # Size/limit settings
        if any(x in name for x in ['MAX_', 'LIMIT_', 'SIZE_']):
            return 1000
        
        # String settings
        if any(x in name for x in ['URL', 'HOST', 'PATH', 'KEY']):
            return None
        
        # Default fallback
        return None


# Global settings instance
settings = Settings()

# Validation on startup
def validate_settings():
    """Validate critical settings on startup"""
    errors = []
    
    if not settings.SECRET_KEY or settings.SECRET_KEY == "your-super-secret-key-change-in-production":
        if not settings.DEBUG:
            errors.append("SECRET_KEY must be set in production")
    
    if not settings.OPENAI_API_KEY and not settings.ANTHROPIC_API_KEY:
        errors.append("At least one AI service API key must be configured")
    
    if not settings.STRIPE_SECRET_KEY:
        errors.append("STRIPE_SECRET_KEY must be configured for payments")
    
    if errors:
        raise ValueError(f"Configuration errors: {', '.join(errors)}")

# Environment-specific configurations
class DevelopmentConfig(Settings):
    DEBUG: bool = True
    DATABASE_ECHO: bool = True
    LOG_LEVEL: str = "DEBUG"

class ProductionConfig(Settings):
    DEBUG: bool = False
    DATABASE_ECHO: bool = False
    LOG_LEVEL: str = "WARNING"

class TestingConfig(Settings):
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite:///./test_apexmatch.db"
    REDIS_DB: int = 1

# Factory function to get appropriate config
def get_settings() -> Settings:
    """Get settings based on environment"""
    env = os.getenv("ENVIRONMENT", "development").lower()
    
    if env == "production":
        return ProductionConfig()
    elif env == "testing":
        return TestingConfig()
    else:
        return DevelopmentConfig()