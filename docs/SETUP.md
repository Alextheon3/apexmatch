# ApexMatch Setup Guide

## Quick Start

Welcome to ApexMatch - the revolutionary dating platform that uses AI-powered behavioral matching, trust scoring, and sacred photo reveals to create authentic connections. This guide will get you up and running in minutes.

### ⚡ One-Command Setup (Recommended)

```bash
# Clone and start ApexMatch
git clone https://github.com/your-org/apexmatch.git
cd apexmatch
cp .env.example .env
docker-compose up -d

# Access your platform
echo "🚀 ApexMatch is running!"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000/docs"
```

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 4GB | 8GB+ |
| **Storage** | 20GB | 50GB+ SSD |
| **OS** | Docker-compatible | Ubuntu 22.04+ |

### Required Software

#### 1. Docker & Docker Compose
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

#### 2. Git
```bash
# Ubuntu/Debian
sudo apt-get install git

# Verify
git --version
```

#### 3. Node.js (Optional - for local development)
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

## Installation Methods

### Method 1: Docker Compose (Recommended)

#### Step 1: Clone Repository
```bash
git clone https://github.com/your-org/apexmatch.git
cd apexmatch
```

#### Step 2: Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit configuration (see Environment Variables section below)
nano .env
```

#### Step 3: Start Services
```bash
# Build and start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

#### Step 4: Initialize Database
```bash
# Run database migrations
docker-compose exec backend alembic upgrade head

# Create sample data (optional)
docker-compose exec backend python scripts/create_sample_data.py
```

### Method 2: Local Development Setup

#### Step 1: Backend Setup
```bash
cd backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup database
createdb apexmatch_dev
export DATABASE_URL="postgresql://localhost/apexmatch_dev"

# Run migrations
alembic upgrade head

# Start backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Step 2: Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start frontend
npm start
```

#### Step 3: Database and Cache
```bash
# PostgreSQL
sudo systemctl start postgresql
createuser -s apexmatch
createdb -O apexmatch apexmatch_dev

# Redis
sudo systemctl start redis-server
```

## Environment Configuration

### Core Environment Variables (.env)

```bash
# ======================
# APPLICATION SETTINGS
# ======================
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=your-super-secret-key-change-this-in-production
API_BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# ======================
# DATABASE CONFIGURATION
# ======================
DATABASE_URL=postgresql://apexmatch:secure_password@postgres:5432/apexmatch_db
POSTGRES_USER=apexmatch
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=apexmatch_db

# ======================
# REDIS CONFIGURATION
# ======================
REDIS_URL=redis://redis:6379/0
REDIS_PASSWORD=redis_secure_password

# ======================
# AUTHENTICATION
# ======================
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=30
JWT_REFRESH_EXPIRE_DAYS=7

# ======================
# AI SERVICES
# ======================
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here

# AI Configuration
AI_WINGMAN_ENABLED=true
BGP_AUTO_ANALYSIS=true
MAX_AI_REQUESTS_PER_DAY=100

# ======================
# PAYMENT PROCESSING
# ======================
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Subscription Configuration
ENABLE_SUBSCRIPTIONS=true
FREE_TIER_MATCHES_PER_DAY=1
CONNECTION_TIER_PRICE=19.99
ELITE_TIER_PRICE=39.99

# ======================
# EMAIL SERVICES
# ======================
SENDGRID_API_KEY=SG.your-sendgrid-api-key
FROM_EMAIL=noreply@apexmatch.com
SUPPORT_EMAIL=support@apexmatch.com

# Email Features
SEND_WELCOME_EMAILS=true
SEND_MATCH_NOTIFICATIONS=true
SEND_WEEKLY_DIGEST=true

# ======================
# FILE STORAGE
# ======================
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET=apexmatch-photos-dev
AWS_REGION=us-west-2

# Photo Configuration
ENABLE_PHOTO_UPLOADS=true
MAX_PHOTO_SIZE_MB=10
ALLOWED_PHOTO_FORMATS=jpg,jpeg,png,webp
PHOTO_REVEAL_STAGES=6

# ======================
# TRUST & SAFETY
# ======================
TRUST_SYSTEM_ENABLED=true
AUTO_MODERATION_ENABLED=true
MANUAL_REVIEW_THRESHOLD=0.3

# Trust Configuration
INITIAL_TRUST_SCORE=0.5
GHOSTING_PENALTY=0.1
VIOLATION_REPORT_THRESHOLD=3
REFORMATION_ENABLED=true

# ======================
# BEHAVIORAL PROFILING
# ======================
BGP_ENABLED=true
BGP_CONFIDENCE_THRESHOLD=0.3
BGP_AUTO_UPDATE=true
BGP_LEARNING_RATE=0.1

# Matching Configuration
COMPATIBILITY_THRESHOLD=0.6
EMOTIONAL_CONNECTION_THRESHOLD=0.7
MAX_DAILY_MATCHES=10

# ======================
# MONITORING & ANALYTICS
# ======================
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
MIXPANEL_TOKEN=your-mixpanel-token
ANALYTICS_ENABLED=true

# Performance Monitoring
ENABLE_PROMETHEUS_METRICS=true
LOG_LEVEL=INFO
ENABLE_REQUEST_LOGGING=true

# ======================
# RATE LIMITING
# ======================
RATE_LIMIT_ENABLED=true
REQUESTS_PER_MINUTE=60
BURST_LIMIT=10

# API Rate Limits
AUTH_RATE_LIMIT=5,1min
MATCHING_RATE_LIMIT=50,1hour
MESSAGING_RATE_LIMIT=100,1hour
```

### Frontend Environment Variables (.env.local)

```bash
# React App Configuration
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
REACT_APP_ENVIRONMENT=development

# Stripe Configuration
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Features
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_ERROR_REPORTING=true
REACT_APP_DEBUG_MODE=true

# Build Configuration
GENERATE_SOURCEMAP=true
REACT_APP_VERSION=$npm_package_version
```

## External Service Setup

### 1. OpenAI API Setup
```bash
# 1. Go to https://platform.openai.com/api-keys
# 2. Create new API key
# 3. Add to .env file
OPENAI_API_KEY=sk-your-key-here

# Test the connection
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.openai.com/v1/models
```

### 2. Anthropic Claude API Setup
```bash
# 1. Go to https://console.anthropic.com/
# 2. Create new API key
# 3. Add to .env file
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Test the connection
curl -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"claude-3-sonnet-20240229","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}' \
     https://api.anthropic.com/v1/messages
```

### 3. Stripe Payment Setup
```bash
# Development Setup
# 1. Go to https://dashboard.stripe.com/test/apikeys
# 2. Copy publishable and secret keys
# 3. Add to .env files

# Create webhook endpoint
# 1. Go to https://dashboard.stripe.com/test/webhooks
# 2. Add endpoint: http://localhost:8000/api/v1/stripe/webhook
# 3. Select events: customer.subscription.created, customer.subscription.updated, invoice.payment_succeeded
# 4. Copy webhook secret to .env

# Test webhook locally
stripe listen --forward-to localhost:8000/api/v1/stripe/webhook
```

### 4. SendGrid Email Setup
```bash
# 1. Go to https://app.sendgrid.com/settings/api_keys
# 2. Create new API key with Mail Send permissions
# 3. Add to .env file
SENDGRID_API_KEY=SG.your-key-here

# Verify setup
curl -X "POST" "https://api.sendgrid.com/v3/mail/send" \
     -H "Authorization: Bearer $SENDGRID_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "personalizations": [{"to": [{"email": "test@example.com"}]}],
       "from": {"email": "noreply@apexmatch.com"},
       "subject": "Test Email",
       "content": [{"type": "text/plain", "value": "Hello World!"}]
     }'
```

### 5. AWS S3 Photo Storage
```bash
# 1. Create S3 bucket
aws s3 mb s3://apexmatch-photos-dev

# 2. Set bucket policy for public read access to photos
aws s3api put-bucket-policy --bucket apexmatch-photos-dev --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::apexmatch-photos-dev/photos/*"
  }]
}'

# 3. Configure CORS
aws s3api put-bucket-cors --bucket apexmatch-photos-dev --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "POST", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }]
}'
```

## Database Setup

### Automatic Setup (Docker)
```bash
# Database is automatically created with Docker Compose
docker-compose up -d postgres

# Run migrations
docker-compose exec backend alembic upgrade head
```

### Manual Setup (Local Development)
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create user and database
sudo -u postgres createuser --interactive apexmatch
sudo -u postgres createdb apexmatch_dev -O apexmatch

# Set password
sudo -u postgres psql -c "ALTER USER apexmatch PASSWORD 'secure_password';"

# Test connection
psql -h localhost -U apexmatch -d apexmatch_dev -c "SELECT version();"
```

### Migration Management
```bash
# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "Add new feature"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback migration
docker-compose exec backend alembic downgrade -1

# Show migration history
docker-compose exec backend alembic history
```

## Feature Configuration

### 1. Trust System Configuration
```python
# backend/config.py - Trust system settings
TRUST_SETTINGS = {
    "initial_score": 0.5,
    "ghosting_penalty": 0.1,
    "positive_feedback_bonus": 0.02,
    "violation_thresholds": {
        "ghosting": 0.8,
        "harassment": 0.9,
        "spam": 0.7
    },
    "tier_boundaries": {
        "toxic": (0.0, 0.2),
        "low": (0.2, 0.4),
        "standard": (0.4, 0.7),
        "high": (0.7, 0.9),
        "elite": (0.9, 1.0)
    }
}
```

### 2. BGP System Configuration
```python
# Behavioral Graph Profiling settings
BGP_SETTINGS = {
    "dimensions": 22,
    "learning_rate": 0.1,
    "confidence_threshold": 0.3,
    "auto_analysis": True,
    "analysis_interval": "daily",
    "decay_factor": 0.95  # How much old behavior matters
}
```

### 3. Photo Reveal Configuration
```python
# Sacred photo reveal system
REVEAL_SETTINGS = {
    "emotional_threshold": 0.7,  # 70% emotional connection required
    "conversation_depth_threshold": 0.6,
    "mutual_interest_threshold": 3,
    "stages": {
        1: "silhouette",
        2: "environment", 
        3: "partial_face",
        4: "full_face_blur",
        5: "clear_face",
        6: "full_profile"
    },
    "stage_unlock_intervals": 24  # hours between stages
}
```

### 4. Subscription Tiers
```python
# Subscription configuration
SUBSCRIPTION_TIERS = {
    "free": {
        "daily_matches": 1,
        "ai_wingman_requests": 0,
        "reveal_requests": 1,
        "active_conversations": 3,
        "price": 0
    },
    "connection": {
        "daily_matches": 10,
        "ai_wingman_requests": 10,
        "reveal_requests": 5,
        "active_conversations": "unlimited",
        "premium_filters": True,
        "read_receipts": True,
        "price": 19.99
    },
    "elite": {
        "daily_matches": 25,
        "ai_wingman_requests": 25,
        "reveal_requests": 15,
        "active_conversations": "unlimited",
        "premium_filters": True,
        "read_receipts": True,
        "concierge_matching": True,
        "relationship_coaching": True,
        "price": 39.99
    }
}
```

## Testing Your Setup

### 1. Health Check Script
```bash
#!/bin/bash
# test-setup.sh

echo "🔍 Testing ApexMatch Setup..."

# Test backend API
echo "Testing Backend API..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
if [ $BACKEND_STATUS -eq 200 ]; then
    echo "✅ Backend API is running"
else
    echo "❌ Backend API failed (Status: $BACKEND_STATUS)"
fi

# Test frontend
echo "Testing Frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ $FRONTEND_STATUS -eq 200 ]; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend failed (Status: $FRONTEND_STATUS)"
fi

# Test database connection
echo "Testing Database..."
DB_TEST=$(docker-compose exec -T backend python -c "
from database import engine
try:
    engine.execute('SELECT 1')
    print('✅ Database connected')
except Exception as e:
    print('❌ Database failed:', e)
")
echo $DB_TEST

# Test Redis connection
echo "Testing Redis..."
REDIS_TEST=$(docker-compose exec -T redis redis-cli ping)
if [ "$REDIS_TEST" = "PONG" ]; then
    echo "✅ Redis is running"
else
    echo "❌ Redis failed"
fi

# Test AI services (if keys provided)
if [ ! -z "$OPENAI_API_KEY" ]; then
    echo "Testing OpenAI connection..."
    OPENAI_TEST=$(curl -s -H "Authorization: Bearer $OPENAI_API_KEY" \
                       https://api.openai.com/v1/models | jq -r '.data[0].id' 2>/dev/null)
    if [ ! -z "$OPENAI_TEST" ] && [ "$OPENAI_TEST" != "null" ]; then
        echo "✅ OpenAI API connected"
    else
        echo "⚠️  OpenAI API key not configured or invalid"
    fi
fi

echo "🎉 Setup test completed!"
```

### 2. Sample Data Creation
```python
# scripts/create_sample_data.py
#!/usr/bin/env python3

import asyncio
from sqlalchemy.orm import sessionmaker
from database import engine
from models.user import User
from models.bgp import BGPProfile
from models.trust import TrustProfile

async def create_sample_users():
    """Create sample users for testing"""
    
    sample_users = [
        {
            "email": "alice@example.com",
            "first_name": "Alice",
            "age": 28,
            "location": "New York, NY"
        },
        {
            "email": "bob@example.com", 
            "first_name": "Bob",
            "age": 32,
            "location": "Los Angeles, CA"
        },
        {
            "email": "charlie@example.com",
            "first_name": "Charlie", 
            "age": 25,
            "location": "Chicago, IL"
        }
    ]
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    for user_data in sample_users:
        # Create user
        user = User(**user_data)
        user.set_password("password123")
        session.add(user)
        session.flush()
        
        # Create BGP profile
        bgp = BGPProfile(user_id=user.id)
        session.add(bgp)
        
        # Create trust profile
        trust = TrustProfile(user_id=user.id)
        session.add(trust)
        
        print(f"✅ Created user: {user.email}")
    
    session.commit()
    session.close()
    print("🎉 Sample data created successfully!")

if __name__ == "__main__":
    asyncio.run(create_sample_users())
```

### 3. Integration Tests
```python
# tests/test_integration.py
import pytest
import asyncio
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_user_registration_flow():
    """Test complete user registration and BGP creation"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Register user
        response = await ac.post("/api/v1/auth/register", json={
            "email": "test@example.com",
            "password": "password123",
            "first_name": "Test",
            "age": 25,
            "location": "Test City"
        })
        assert response.status_code == 201
        
        user_data = response.json()
        token = user_data["access_token"]
        
        # Get BGP profile
        response = await ac.get(
            "/api/v1/bgp/profile",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        bgp_data = response.json()
        assert bgp_data["data_confidence"] >= 0.0

@pytest.mark.asyncio
async def test_matching_flow():
    """Test behavioral matching system"""
    # This would test the complete matching flow
    pass

@pytest.mark.asyncio  
async def test_trust_system():
    """Test trust scoring and violations"""
    # This would test trust system functionality
    pass
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
sudo lsof -i :3000
sudo lsof -i :8000

# Kill process
sudo kill -9 <PID>

# Or use different ports
docker-compose down
# Edit docker-compose.yml to use different ports
docker-compose up -d
```

#### 2. Database Connection Issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Reset database
docker-compose down -v  # WARNING: This deletes all data
docker-compose up -d postgres
docker-compose exec backend alembic upgrade head
```

#### 3. Redis Connection Issues
```bash
# Check Redis is running
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping

# Clear Redis cache
docker-compose exec redis redis-cli flushall
```

#### 4. Frontend Build Issues
```bash
# Clear npm cache
cd frontend
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Or rebuild container
docker-compose build frontend --no-cache
```

#### 5. AI API Issues
```bash
# Test OpenAI connection
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# Test Anthropic connection  
curl -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
     https://api.anthropic.com/v1/messages \
     -d '{"model":"claude-3-sonnet-20240229","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

### Debug Mode Setup
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
export DEBUG=true

# Start with debug output
docker-compose up

# View detailed logs
docker-compose logs -f backend
```

### Performance Issues
```bash
# Check system resources
docker stats

# Monitor database performance
docker-compose exec postgres psql -U apexmatch -d apexmatch_db -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
"

# Check Redis memory usage
docker-compose exec redis redis-cli info memory
```

## Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/new-matching-algorithm

# Make changes
# ... development work ...

# Test locally
docker-compose up -d
./test-setup.sh

# Commit and push
git add .
git commit -m "Add new matching algorithm"
git push origin feature/new-matching-algorithm
```

### 2. Code Quality
```bash
# Backend code formatting
cd backend
black .
isort .
flake8 .

# Frontend code formatting  
cd frontend
npm run lint
npm run format

# Run tests
cd backend && pytest
cd frontend && npm test
```

### 3. Database Migrations
```bash
# Create migration for model changes
docker-compose exec backend alembic revision --autogenerate -m "Add new field"

# Review generated migration
cat backend/alembic/versions/xxx_add_new_field.py

# Apply migration
docker-compose exec backend alembic upgrade head
```

## Next Steps

### 1. Configure Your Platform
1. **Set up external services** (OpenAI, Stripe, etc.)
2. **Customize trust system** parameters
3. **Configure BGP dimensions** for your target market
4. **Set subscription pricing** and features
5. **Upload your branding** and customize UI

### 2. Add Sample Data
```bash
# Create sample users and profiles
docker-compose exec backend python scripts/create_sample_data.py

# Generate test matches
docker-compose exec backend python scripts/generate_test_matches.py
```

### 3. Test Core Features
1. **User Registration** → **BGP Building** → **Matching**
2. **Trust System** → **Violation Reporting** → **Score Adjustment**
3. **Photo Reveal** → **Emotional Connection** → **Stage Progression**
4. **AI Wingman** → **Conversation Suggestions** → **Success Tracking**
5. **Subscriptions** → **Payment Processing** → **Feature Access**

### 4. Production Deployment
Follow the [DEPLOYMENT.md](./DEPLOYMENT.md) guide for production setup.

## Support

- **Documentation:** Full API docs at `/docs` when running
- **Community:** Join our Discord for developer support
- **Issues:** Report bugs on GitHub Issues
- **Email:** technical-support@apexmatch.com

## Revolutionary Features Summary

🎯 **What You Just Built:**
- **Behavioral AI Matching** - 22+ personality dimensions
- **Sacred Photo Reveals** - 70% emotional threshold system  
- **Trust Justice System** - "Shit matches shit" behavioral tracking
- **AI Wingman** - OpenAI + Claude conversation assistance
- **Real-time Chat** - WebSocket emotional analysis
- **Subscription Tiers** - Complete monetization system

Your ApexMatch platform is now ready to revolutionize online dating by prioritizing authentic emotional connections over superficial attraction! 🚀💕

---

**Welcome to the future of authentic dating. Let's build meaningful connections together.** ✨