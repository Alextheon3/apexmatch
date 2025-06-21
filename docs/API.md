# ApexMatch API Documentation

## Overview

ApexMatch API provides a revolutionary behavioral-based dating platform with AI-powered matching, trust scoring, and staged photo reveals. The API is built with FastAPI and follows RESTful principles with real-time WebSocket support.

**Base URL:** `http://localhost:8000` (development)
**API Version:** v1
**Documentation:** `/docs` (Swagger UI) or `/redoc` (ReDoc)

## Authentication

ApexMatch uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "age": 28,
  "location": "New York, NY"
}
```

**Response:**
```json
{
  "user_id": 123,
  "email": "user@example.com",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "onboarding_status": "started"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Authorization: Bearer <refresh_token>
```

## Core Features

### 1. Behavioral Graph Profiling (BGP)

#### Get BGP Profile
```http
GET /api/v1/bgp/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user_id": 123,
  "behavioral_vector": [0.7, 0.8, 0.6, ...],
  "data_confidence": 0.85,
  "personality_insights": {
    "communication": "Quick responder who values immediate connection",
    "emotional": "Emotionally stable and consistent",
    "attachment": "Securely attached, comfortable with intimacy"
  },
  "matching_strengths": [
    "High emotional intelligence",
    "Excellent boundary awareness"
  ]
}
```

#### Update BGP from Conversation Analysis
```http
POST /api/v1/bgp/analyze-conversation
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversation_id": 456,
  "analysis_results": {
    "avg_response_time": 120,
    "avg_message_length": 85,
    "emoji_rate": 0.3,
    "depth_score": 0.7,
    "emotional_expression": 0.8
  }
}
```

### 2. Trust System

#### Get Trust Profile
```http
GET /api/v1/trust/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "overall_trust_score": 0.78,
  "trust_tier": "high",
  "communication_reliability": 0.85,
  "emotional_honesty": 0.80,
  "respect_score": 0.90,
  "ghosting_rate": 0.05,
  "is_in_reformation": false,
  "trust_feedback": {
    "strengths": ["Reliable communication", "Respects boundaries"],
    "improvements": []
  },
  "trust_perks": [
    "Access to high-trust user pool",
    "Priority in matching queue"
  ]
}
```

#### Report Trust Violation
```http
POST /api/v1/trust/report-violation
Authorization: Bearer <token>
Content-Type: application/json

{
  "reported_user_id": 789,
  "violation_type": "ghosting",
  "severity": 0.8,
  "description": "User stopped responding after 3 days of conversation",
  "evidence_data": "conversation_id:456"
}
```

### 3. Matching System

#### Get Potential Matches
```http
GET /api/v1/matches/discover?limit=10
Authorization: Bearer <token>
```

**Response:**
```json
{
  "matches": [
    {
      "match_id": 789,
      "compatibility_score": 0.87,
      "trust_compatibility": 0.92,
      "overall_match_quality": 0.89,
      "match_explanation": [
        "You have very similar communication rhythms",
        "Your emotional stability patterns align well",
        "Compatible trust-building styles"
      ],
      "is_premium_boost": false,
      "estimated_connection_probability": 0.78
    }
  ],
  "daily_matches_remaining": 8,
  "next_match_available": "2025-06-14T09:00:00Z"
}
```

#### Accept/Decline Match
```http
POST /api/v1/matches/{match_id}/respond
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "accept", // or "decline"
  "reason": "strong_compatibility" // optional
}
```

#### Get Match Details
```http
GET /api/v1/matches/{match_id}
Authorization: Bearer <token>
```

### 4. Conversations & Messaging

#### Get Conversations
```http
GET /api/v1/conversations?active_only=true
Authorization: Bearer <token>
```

#### Send Message
```http
POST /api/v1/conversations/{conversation_id}/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hey! Your profile caught my attention. What's your favorite way to spend weekends?",
  "message_type": "text"
}
```

#### Get Messages
```http
GET /api/v1/conversations/{conversation_id}/messages?limit=50&offset=0
Authorization: Bearer <token>
```

#### Mark as Read
```http
POST /api/v1/conversations/{conversation_id}/read
Authorization: Bearer <token>
```

### 5. Photo Reveal System

#### Check Reveal Eligibility
```http
GET /api/v1/reveal/{match_id}/eligibility
Authorization: Bearer <token>
```

**Response:**
```json
{
  "eligible": true,
  "emotional_connection_score": 0.78,
  "conversation_depth_score": 0.65,
  "threshold_met": true,
  "reveal_status": "eligible",
  "requirements": {
    "emotional_connection": "✅ 78% (70% required)",
    "conversation_depth": "✅ 65% (60% required)",
    "mutual_interest": "✅ 5 indicators (3+ required)"
  }
}
```

#### Request Photo Reveal
```http
POST /api/v1/reveal/{match_id}/request
Authorization: Bearer <token>
Content-Type: application/json

{
  "stage": 1, // 1-6 reveal stages
  "personal_message": "I feel like we have a real connection. Ready to see each other?"
}
```

#### Respond to Reveal Request
```http
POST /api/v1/reveal/{match_id}/respond
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "accept", // or "decline"
  "stage": 1
}
```

### 6. AI Wingman

#### Get Conversation Suggestions
```http
POST /api/v1/wingman/suggest
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversation_id": 456,
  "context": "need_icebreaker", // or "deepening_conversation", "conflict_resolution"
  "personality_match": true
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "message": "I noticed you mentioned loving hiking. Have you tried any trails recently that took your breath away?",
      "reasoning": "Builds on shared interest while inviting personal storytelling",
      "confidence": 0.9
    }
  ],
  "conversation_insights": {
    "current_depth": 0.6,
    "emotional_tone": "positive",
    "suggested_direction": "personal_experiences"
  },
  "usage_remaining": 7
}
```

#### Get Introduction Message
```http
POST /api/v1/wingman/introduction/{match_id}
Authorization: Bearer <token>
```

### 7. Subscription Management

#### Get Subscription Status
```http
GET /api/v1/subscription/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "tier": "connection",
  "status": "active",
  "is_premium": true,
  "amount": 19.99,
  "currency": "USD",
  "days_until_renewal": 15,
  "features": {
    "daily_matches": 10,
    "ai_wingman_suggestions": 10,
    "reveal_requests": 5,
    "premium_filters": true,
    "read_receipts": true
  },
  "usage_summary": {
    "matches": {
      "used_today": 3,
      "remaining_today": 7
    },
    "ai_requests": {
      "used_today": 2,
      "remaining_today": 8
    }
  }
}
```

#### Upgrade Subscription
```http
POST /api/v1/subscription/upgrade
Authorization: Bearer <token>
Content-Type: application/json

{
  "tier": "elite",
  "payment_method_id": "pm_1234567890",
  "promo_code": "ELITE50" // optional
}
```

## WebSocket Connections

### Real-time Chat
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8000/ws/chat/{conversation_id}?token={jwt_token}');

// Send message
ws.send(JSON.stringify({
  "type": "message",
  "content": "Hello!",
  "message_type": "text"
}));

// Receive messages
ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  // Handle: message, typing_indicator, user_online, etc.
};
```

### Typing Indicators
```javascript
// Send typing indicator
ws.send(JSON.stringify({
  "type": "typing",
  "is_typing": true
}));
```

## Error Handling

### Standard Error Response
```json
{
  "detail": "Error description",
  "error_code": "TRUST_SCORE_TOO_LOW",
  "timestamp": "2025-06-13T18:00:00Z",
  "request_id": "req_123456"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INSUFFICIENT_TRUST` | User's trust score too low for action |
| `DAILY_LIMIT_EXCEEDED` | Daily usage limit reached |
| `SUBSCRIPTION_REQUIRED` | Premium subscription needed |
| `EMOTIONAL_THRESHOLD_NOT_MET` | Not ready for photo reveal |
| `ALREADY_MATCHED` | Users already have active match |
| `VIOLATION_REPORTED` | Account under review |

## Rate Limiting

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Authentication | 5 requests | 1 minute |
| Matching | 50 requests | 1 hour |
| Messaging | 100 messages | 1 hour |
| AI Wingman | 25 requests | 1 hour |
| General API | 1000 requests | 1 hour |

## Subscription Tiers & Limits

### Free Tier
- 1 match per day
- 3 active conversations max
- No AI Wingman
- Basic reveal (1 per day)

### Connection Tier ($19.99/month)
- 10 matches per day
- 10 AI suggestions per day
- 5 reveals per day
- Premium filters
- Read receipts

### Elite Tier ($39.99/month)
- 25 matches per day
- 25 AI suggestions per day
- 15 reveals per day
- Concierge matching
- Relationship coaching
- Priority support

## Webhooks

ApexMatch can send webhooks for key events:

### Match Events
```http
POST {your_webhook_url}
Content-Type: application/json

{
  "event": "match.created",
  "data": {
    "match_id": 789,
    "users": [123, 456],
    "compatibility_score": 0.87
  },
  "timestamp": "2025-06-13T18:00:00Z"
}
```

### Trust Events
```http
POST {your_webhook_url}
Content-Type: application/json

{
  "event": "trust.violation_reported",
  "data": {
    "reported_user_id": 123,
    "violation_type": "ghosting",
    "severity": 0.8
  },
  "timestamp": "2025-06-13T18:00:00Z"
}
```

## SDKs and Libraries

### JavaScript/Node.js
```javascript
import { ApexMatchClient } from '@apexmatch/js-sdk';

const client = new ApexMatchClient({
  apiKey: 'your_api_key',
  baseURL: 'https://api.apexmatch.com'
});

// Get matches
const matches = await client.matches.discover({ limit: 10 });
```

### Python
```python
from apexmatch import ApexMatchClient

client = ApexMatchClient(api_key='your_api_key')

# Get matches
matches = client.matches.discover(limit=10)
```

## Testing

### Test Environment
- **Base URL:** `http://localhost:8000`
- **Test User Accounts:** Available in development environment
- **Mock Payments:** Stripe test mode enabled

### Example Test Scenarios

1. **Complete User Journey:**
   - Register → Build BGP → Get Matches → Start Conversation → Reach Reveal Threshold → Photo Reveal

2. **Trust System Testing:**
   - Report violation → Trust score adjustment → Matching restrictions

3. **Subscription Flow:**
   - Free user hits limits → Upgrade prompt → Payment → Premium features

## Support

- **Documentation:** https://docs.apexmatch.com
- **API Status:** https://status.apexmatch.com
- **Support Email:** api-support@apexmatch.com
- **Developer Discord:** https://discord.gg/apexmatch-dev