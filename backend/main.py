"""
ApexMatch - FastAPI main entry point
Fixed for Docker with proper error handling and graceful fallbacks
"""

# CRITICAL: Load environment variables FIRST, before any other imports
import os
from dotenv import load_dotenv

# Explicitly load environment variables from .env file
load_dotenv()

# Verify critical environment variables are loaded
print(f"🔑 API Keys loaded: OpenAI={'✅' if os.getenv('OPENAI_API_KEY') else '❌'}, Anthropic={'✅' if os.getenv('ANTHROPIC_API_KEY') else '❌'}")

# Now continue with other imports
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import logging
from datetime import datetime
from sqlalchemy import text
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import with fallbacks for missing modules
try:
    from database import engine, Base, SessionLocal
    DATABASE_AVAILABLE = True
    logger.info("✅ Database module loaded")
    
    # Create test users
    def create_test_users():
        """Create test users for development"""
        try:
            from routes.auth import create_test_users as auth_create_test_users
            auth_create_test_users()
        except Exception as e:
            logger.warning(f"Could not create test users: {e}")
    
    create_test_users()
    
except ImportError as e:
    logger.warning(f"❌ Database module not available: {e}")
    DATABASE_AVAILABLE = False
    engine = None
    Base = None

# Import routes with fallbacks
ROUTES_AVAILABLE = {}

try:
    from routes import auth
    ROUTES_AVAILABLE['auth'] = auth
    logger.info("✅ Auth routes loaded")
except ImportError as e:
    logger.warning(f"❌ Auth routes not available: {e}")

try:
    from routes import match
    ROUTES_AVAILABLE['match'] = match
    logger.info("✅ Match routes loaded")
except ImportError as e:
    logger.warning(f"❌ Match routes not available: {e}")

try:
    from routes import reveal
    ROUTES_AVAILABLE['reveal'] = reveal
    logger.info("✅ Reveal routes loaded")
except ImportError as e:
    logger.warning(f"❌ Reveal routes not available: {e}")

try:
    from routes import wingman
    ROUTES_AVAILABLE['wingman'] = wingman
    logger.info("✅ Wingman routes loaded")
except ImportError as e:
    logger.warning(f"❌ Wingman routes not available: {e}")

try:
    from routes import upgrade
    ROUTES_AVAILABLE['upgrade'] = upgrade
    logger.info("✅ Upgrade routes loaded")
except ImportError as e:
    logger.warning(f"❌ Upgrade routes not available: {e}")

try:
    from routes import bgp
    ROUTES_AVAILABLE['bgp'] = bgp
    logger.info("✅ BGP routes loaded")
except ImportError as e:
    logger.warning(f"❌ BGP routes not available: {e}")

try:
    from routes import trust
    ROUTES_AVAILABLE['trust'] = trust
    logger.info("✅ Trust routes loaded")
except ImportError as e:
    logger.warning(f"❌ Trust routes not available: {e}")

try:
    from routes import websocket
    ROUTES_AVAILABLE['websocket'] = websocket
    logger.info("✅ WebSocket routes loaded")
except ImportError as e:
    logger.warning(f"❌ WebSocket routes not available: {e}")

# Import middleware with fallbacks
try:
    from middleware.auth_middleware import AuthMiddleware
    AUTH_MIDDLEWARE_AVAILABLE = True
    logger.info("✅ Auth middleware loaded")
except ImportError as e:
    logger.warning(f"❌ Auth middleware not available: {e}")
    AUTH_MIDDLEWARE_AVAILABLE = False

try:
    from middleware.rate_limiter import RateLimitMiddleware
    RATE_LIMIT_MIDDLEWARE_AVAILABLE = True
    logger.info("✅ Rate limit middleware loaded")
except ImportError as e:
    logger.warning(f"❌ Rate limit middleware not available: {e}")
    RATE_LIMIT_MIDDLEWARE_AVAILABLE = False

try:
    from middleware.logging_middleware import LoggingMiddleware
    LOGGING_MIDDLEWARE_AVAILABLE = True
    logger.info("✅ Logging middleware loaded")
except ImportError as e:
    logger.warning(f"❌ Logging middleware not available: {e}")
    LOGGING_MIDDLEWARE_AVAILABLE = False

# Import config with fallbacks
try:
    from config import settings
    CONFIG_AVAILABLE = True
    logger.info("✅ Config module loaded")
except ImportError as e:
    logger.warning(f"❌ Config module not available: {e}, using defaults")
    CONFIG_AVAILABLE = False
    
    # Default settings
    class DefaultSettings:
        ALLOWED_ORIGINS = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://frontend:3000"
        ]
        DEBUG = os.getenv("DEBUG", "true").lower() == "true"
        ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
        APP_NAME = os.getenv("APP_NAME", "ApexMatch")
    
    settings = DefaultSettings()

# Import clients to check API key status
try:
    from clients.claude_client import claude_client
    CLAUDE_AVAILABLE = True
    logger.info("✅ Claude client initialized")
except ImportError as e:
    logger.warning(f"❌ Claude client not available: {e}")
    CLAUDE_AVAILABLE = False

try:
    from clients.gpt_client import gpt_client
    OPENAI_AVAILABLE = True
    logger.info("✅ OpenAI client initialized")
except ImportError as e:
    logger.warning(f"❌ OpenAI client not available: {e}")
    OPENAI_AVAILABLE = False

try:
    from clients.redis_client import redis_client
    REDIS_AVAILABLE = True
    logger.info("✅ Redis client initialized")
except ImportError as e:
    logger.warning(f"❌ Redis client not available: {e}")
    REDIS_AVAILABLE = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events with error handling"""
    startup_time = datetime.utcnow()
    try:
        logger.info("🚀 Starting ApexMatch Backend...")
        
        # Database initialization
        if DATABASE_AVAILABLE and Base and engine:
            try:
                Base.metadata.create_all(bind=engine)
                logger.info("✅ Database tables created")
                
                # Test database connection
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                logger.info("✅ Database connection verified")
            except Exception as e:
                logger.error(f"❌ Database initialization failed: {e}")
        else:
            logger.warning("⚠️ Database not available, skipping table creation")
        
        # Redis connection test
        if REDIS_AVAILABLE:
            try:
                redis_health = await redis_client.health_check()
                if redis_health.get("status") == "healthy":
                    logger.info("✅ Redis connection verified")
                else:
                    logger.warning("⚠️ Redis connection issues detected")
            except Exception as e:
                logger.warning(f"⚠️ Redis health check failed: {e}")
        
        # API clients verification
        api_status = []
        if CLAUDE_AVAILABLE and os.getenv('ANTHROPIC_API_KEY'):
            api_status.append("Claude ✅")
        elif os.getenv('ANTHROPIC_API_KEY'):
            api_status.append("Claude ⚠️")
        else:
            api_status.append("Claude ❌")
            
        if OPENAI_AVAILABLE and os.getenv('OPENAI_API_KEY'):
            api_status.append("OpenAI ✅")
        elif os.getenv('OPENAI_API_KEY'):
            api_status.append("OpenAI ⚠️")
        else:
            api_status.append("OpenAI ❌")
        
        logger.info(f"🤖 AI Services: {', '.join(api_status)}")
        
        startup_duration = (datetime.utcnow() - startup_time).total_seconds()
        logger.info(f"🚀 ApexMatch Backend Started Successfully in {startup_duration:.2f}s")
        logger.info(f"📊 Loaded: {len(ROUTES_AVAILABLE)} route modules, Database: {'✅' if DATABASE_AVAILABLE else '❌'}")
        
        yield
        
        # Shutdown
        logger.info("🛑 ApexMatch Backend Shutting Down...")
        
        # Cleanup connections if needed
        if REDIS_AVAILABLE:
            try:
                # Redis cleanup would go here
                pass
            except Exception as e:
                logger.warning(f"Redis cleanup warning: {e}")
        
        logger.info("🛑 ApexMatch Backend Shutdown Complete")
        
    except Exception as e:
        logger.error(f"❌ Critical error during lifespan: {e}")
        yield


# Initialize FastAPI
app = FastAPI(
    title="ApexMatch API",
    description="Revolutionary AI-powered dating platform with behavioral analysis",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if getattr(settings, 'DEBUG', True) else None,
    redoc_url="/redoc" if getattr(settings, 'DEBUG', True) else None,
    openapi_url="/openapi.json" if getattr(settings, 'DEBUG', True) else None
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=getattr(settings, 'ALLOWED_ORIGINS', ["http://localhost:3000"]),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Add custom middleware if available
if LOGGING_MIDDLEWARE_AVAILABLE:
    app.add_middleware(LoggingMiddleware)
    logger.info("✅ Logging middleware added")

if RATE_LIMIT_MIDDLEWARE_AVAILABLE:
    app.add_middleware(RateLimitMiddleware)
    logger.info("✅ Rate limit middleware added")

# Route registration with enhanced logging
route_count = 0

if 'auth' in ROUTES_AVAILABLE:
    app.include_router(ROUTES_AVAILABLE['auth'].router, prefix="/api/v1/auth", tags=["Authentication"])
    logger.info("✅ Auth routes added")
    route_count += 1

if 'reveal' in ROUTES_AVAILABLE:
    app.include_router(ROUTES_AVAILABLE['reveal'].router, prefix="/api/v1/reveal", tags=["Photo Reveal"])
    logger.info("✅ Reveal routes added")
    route_count += 1

if 'wingman' in ROUTES_AVAILABLE:
    app.include_router(ROUTES_AVAILABLE['wingman'].router, prefix="/api/v1/wingman", tags=["AI Wingman"])
    logger.info("✅ Wingman routes added")
    route_count += 1

if 'bgp' in ROUTES_AVAILABLE:
    app.include_router(ROUTES_AVAILABLE['bgp'].router, prefix="/api/v1/bgp", tags=["Behavioral Analysis"])
    logger.info("✅ BGP routes added")
    route_count += 1

if 'trust' in ROUTES_AVAILABLE:
    app.include_router(ROUTES_AVAILABLE['trust'].router, prefix="/api/v1/trust", tags=["Trust System"])
    logger.info("✅ Trust routes added")
    route_count += 1

if 'match' in ROUTES_AVAILABLE:
    app.include_router(ROUTES_AVAILABLE['match'].router, prefix="/api/v1/match", tags=["Matching"])
    logger.info("✅ Match routes added")
    route_count += 1

if 'upgrade' in ROUTES_AVAILABLE:
    app.include_router(ROUTES_AVAILABLE['upgrade'].router, prefix="/api/v1/upgrade", tags=["Subscription"])
    logger.info("✅ Upgrade routes added")
    route_count += 1

if 'websocket' in ROUTES_AVAILABLE:
    app.include_router(ROUTES_AVAILABLE['websocket'].router, prefix="/ws", tags=["WebSocket"])
    logger.info("✅ WebSocket routes added")
    route_count += 1

logger.info(f"📈 Total routes registered: {route_count}")

# Enhanced root endpoints
@app.get("/")
async def root():
    """Root endpoint with comprehensive status"""
    return {
        "message": "Welcome to ApexMatch API",
        "tagline": "Revolutionary AI-powered dating with behavioral analysis",
        "version": "1.0.0",
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": getattr(settings, 'ENVIRONMENT', 'development'),
        "features": {
            "ai_wingman": CLAUDE_AVAILABLE or OPENAI_AVAILABLE,
            "behavioral_analysis": 'bgp' in ROUTES_AVAILABLE,
            "photo_reveals": 'reveal' in ROUTES_AVAILABLE,
            "trust_system": 'trust' in ROUTES_AVAILABLE,
            "real_time_chat": 'websocket' in ROUTES_AVAILABLE,
            "subscription_system": 'upgrade' in ROUTES_AVAILABLE
        },
        "system_status": {
            "database": "connected" if DATABASE_AVAILABLE else "unavailable",
            "redis": "connected" if REDIS_AVAILABLE else "unavailable",
            "ai_services": {
                "claude": "available" if CLAUDE_AVAILABLE and os.getenv('ANTHROPIC_API_KEY') else "unavailable",
                "openai": "available" if OPENAI_AVAILABLE and os.getenv('OPENAI_API_KEY') else "unavailable"
            },
            "routes_loaded": len(ROUTES_AVAILABLE),
            "middleware_active": sum([
                LOGGING_MIDDLEWARE_AVAILABLE,
                AUTH_MIDDLEWARE_AVAILABLE,
                RATE_LIMIT_MIDDLEWARE_AVAILABLE
            ])
        },
        "api_endpoints": {
            "documentation": "/docs",
            "health_check": "/health",
            "api_status": "/api/v1/status",
            "app_info": "/api/v1/info"
        }
    }

@app.get("/health")
async def health_check():
    """Enhanced health check endpoint for monitoring"""
    try:
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "environment": getattr(settings, 'ENVIRONMENT', 'development'),
            "uptime": "running",
            "services": {
                "api": "operational",
                "database": "unknown",
                "redis": "unknown",
                "ai_services": {
                    "claude": "unknown",
                    "openai": "unknown"
                }
            },
            "system": {
                "routes_loaded": len(ROUTES_AVAILABLE),
                "middleware_count": sum([
                    LOGGING_MIDDLEWARE_AVAILABLE,
                    AUTH_MIDDLEWARE_AVAILABLE, 
                    RATE_LIMIT_MIDDLEWARE_AVAILABLE
                ]),
                "config_loaded": CONFIG_AVAILABLE
            }
        }
        
        # Database health check
        if DATABASE_AVAILABLE and engine:
            try:
                with engine.connect() as conn:
                    result = conn.execute(text("SELECT 1"))
                    if result:
                        health_status["services"]["database"] = "connected"
                    else:
                        health_status["services"]["database"] = "error"
                        health_status["status"] = "degraded"
            except Exception as e:
                health_status["services"]["database"] = f"error: {str(e)[:50]}"
                health_status["status"] = "degraded"
        else:
            health_status["services"]["database"] = "not_configured"
        
        # Redis health check
        if REDIS_AVAILABLE:
            try:
                redis_health = await redis_client.health_check()
                health_status["services"]["redis"] = redis_health.get("status", "unknown")
            except Exception as e:
                health_status["services"]["redis"] = f"error: {str(e)[:50]}"
                health_status["status"] = "degraded"
        else:
            health_status["services"]["redis"] = "not_configured"
        
        # AI services health check
        if CLAUDE_AVAILABLE and os.getenv('ANTHROPIC_API_KEY'):
            try:
                claude_health = await claude_client.health_check()
                health_status["services"]["ai_services"]["claude"] = claude_health.get("status", "unknown")
            except Exception as e:
                health_status["services"]["ai_services"]["claude"] = f"error: {str(e)[:30]}"
        else:
            health_status["services"]["ai_services"]["claude"] = "not_configured"
        
        if OPENAI_AVAILABLE and os.getenv('OPENAI_API_KEY'):
            try:
                openai_health = await gpt_client.health_check()
                health_status["services"]["ai_services"]["openai"] = openai_health.get("status", "unknown")
            except Exception as e:
                health_status["services"]["ai_services"]["openai"] = f"error: {str(e)[:30]}"
        else:
            health_status["services"]["ai_services"]["openai"] = "not_configured"
        
        return health_status
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0"
        }

@app.get("/api/v1/status")
async def api_status():
    """Detailed API status endpoint"""
    return {
        "api_version": "v1",
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat(),
        "routes": {
            "total_loaded": len(ROUTES_AVAILABLE),
            "available_modules": list(ROUTES_AVAILABLE.keys()),
            "endpoints": {
                "auth": "/api/v1/auth" if 'auth' in ROUTES_AVAILABLE else None,
                "matching": "/api/v1/match" if 'match' in ROUTES_AVAILABLE else None,
                "reveals": "/api/v1/reveal" if 'reveal' in ROUTES_AVAILABLE else None,
                "ai_wingman": "/api/v1/wingman" if 'wingman' in ROUTES_AVAILABLE else None,
                "behavioral_analysis": "/api/v1/bgp" if 'bgp' in ROUTES_AVAILABLE else None,
                "trust_system": "/api/v1/trust" if 'trust' in ROUTES_AVAILABLE else None,
                "subscriptions": "/api/v1/upgrade" if 'upgrade' in ROUTES_AVAILABLE else None,
                "websocket": "/ws" if 'websocket' in ROUTES_AVAILABLE else None
            }
        },
        "features": {
            "ai_wingman": {
                "enabled": os.getenv("ENABLE_AI_WINGMAN", "true").lower() == "true",
                "claude_available": CLAUDE_AVAILABLE and bool(os.getenv('ANTHROPIC_API_KEY')),
                "openai_available": OPENAI_AVAILABLE and bool(os.getenv('OPENAI_API_KEY'))
            },
            "photo_reveals": {
                "enabled": os.getenv("ENABLE_PHOTO_REVEALS", "true").lower() == "true",
                "route_available": 'reveal' in ROUTES_AVAILABLE
            },
            "trust_system": {
                "enabled": os.getenv("ENABLE_TRUST_SYSTEM", "true").lower() == "true",
                "route_available": 'trust' in ROUTES_AVAILABLE
            },
            "behavioral_analysis": {
                "enabled": os.getenv("ENABLE_BGP_ANALYSIS", "true").lower() == "true",
                "route_available": 'bgp' in ROUTES_AVAILABLE
            }
        },
        "middleware": {
            "auth": AUTH_MIDDLEWARE_AVAILABLE,
            "rate_limiting": RATE_LIMIT_MIDDLEWARE_AVAILABLE,
            "logging": LOGGING_MIDDLEWARE_AVAILABLE
        },
        "environment": {
            "mode": getattr(settings, 'ENVIRONMENT', 'development'),
            "debug": getattr(settings, 'DEBUG', True),
            "config_loaded": CONFIG_AVAILABLE
        }
    }

@app.get("/api/v1/info")
async def app_info():
    """Comprehensive application information"""
    return {
        "application": {
            "name": getattr(settings, 'APP_NAME', "ApexMatch API"),
            "description": "Revolutionary AI-powered dating platform with behavioral analysis",
            "version": "1.0.0",
            "environment": getattr(settings, 'ENVIRONMENT', 'development'),
            "debug_mode": getattr(settings, 'DEBUG', True)
        },
        "system": {
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            "platform": os.name,
            "timestamp": datetime.utcnow().isoformat()
        },
        "configuration": {
            "cors_origins": getattr(settings, 'ALLOWED_ORIGINS', []),
            "database_available": DATABASE_AVAILABLE,
            "redis_available": REDIS_AVAILABLE,
            "config_module_loaded": CONFIG_AVAILABLE
        },
        "modules": {
            "routes": {
                "loaded": list(ROUTES_AVAILABLE.keys()),
                "count": len(ROUTES_AVAILABLE)
            },
            "middleware": {
                "auth": AUTH_MIDDLEWARE_AVAILABLE,
                "rate_limit": RATE_LIMIT_MIDDLEWARE_AVAILABLE,
                "logging": LOGGING_MIDDLEWARE_AVAILABLE
            },
            "clients": {
                "claude": CLAUDE_AVAILABLE,
                "openai": OPENAI_AVAILABLE,
                "redis": REDIS_AVAILABLE
            }
        },
        "api": {
            "documentation": "/docs" if getattr(settings, 'DEBUG', True) else "disabled",
            "redoc": "/redoc" if getattr(settings, 'DEBUG', True) else "disabled",
            "openapi_schema": "/openapi.json" if getattr(settings, 'DEBUG', True) else "disabled"
        }
    }

# Development-only endpoints
if getattr(settings, 'DEBUG', True):
    @app.get("/api/v1/debug/env")
    async def debug_environment():
        """Debug endpoint to check environment variables (development only)"""
        return {
            "environment_variables": {
                "ENVIRONMENT": os.getenv("ENVIRONMENT", "not_set"),
                "DEBUG": os.getenv("DEBUG", "not_set"),
                "HOST": os.getenv("HOST", "not_set"),
                "PORT": os.getenv("PORT", "not_set"),
                "DATABASE_URL": "***configured***" if os.getenv("DATABASE_URL") else "not_set",
                "REDIS_URL": "***configured***" if os.getenv("REDIS_URL") else "not_set",
                "OPENAI_API_KEY": "***configured***" if os.getenv("OPENAI_API_KEY") else "not_set",
                "ANTHROPIC_API_KEY": "***configured***" if os.getenv("ANTHROPIC_API_KEY") else "not_set",
                "SECRET_KEY": "***configured***" if os.getenv("SECRET_KEY") else "not_set",
                "JWT_SECRET_KEY": "***configured***" if os.getenv("JWT_SECRET_KEY") else "not_set"
            },
            "note": "This endpoint is only available in debug mode"
        }

if __name__ == "__main__":
    # Get configuration from environment
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "true").lower() == "true"
    
    logger.info("=" * 50)
    logger.info("🚀 STARTING APEXMATCH API SERVER")
    logger.info("=" * 50)
    logger.info(f"📡 Host: {host}")
    logger.info(f"🔌 Port: {port}")
    logger.info(f"🐛 Debug: {debug}")
    logger.info(f"🌍 Environment: {getattr(settings, 'ENVIRONMENT', 'development')}")
    logger.info(f"📊 Routes loaded: {len(ROUTES_AVAILABLE)}")
    logger.info(f"🔑 API Keys: OpenAI={'✅' if os.getenv('OPENAI_API_KEY') else '❌'}, Anthropic={'✅' if os.getenv('ANTHROPIC_API_KEY') else '❌'}")
    logger.info("=" * 50)
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info",
        access_log=True
    )