# ============================================
# backend/routes/upgrade.py - Subscription Upgrade Routes
# ============================================
"""
ApexMatch Subscription Upgrade Routes
Handle subscription plans, upgrades, and billing management
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum

from database import get_db
from models.user import User, SubscriptionTier
from models.subscription import Subscription, PaymentHistory, PromoCode
from clients.stripe_client import stripe_client
from middleware.auth_middleware import get_current_user, require_verification
from middleware.logging_middleware import billing_logger
from clients.redis_client import redis_client

# Fixed router name
router = APIRouter()

class SubscriptionPlan(str, Enum):
    FREE = "free"
    CONNECTION = "connection"  # $19.99/month
    ELITE = "elite"           # $39.99/month

class PaymentMethod(BaseModel):
    payment_method_id: str
    save_card: bool = True

class UpgradeRequest(BaseModel):
    plan: SubscriptionPlan
    payment_method: PaymentMethod
    promo_code: Optional[str] = None
    billing_period: str = "monthly"  # monthly, annually

class SubscriptionInfo(BaseModel):
    current_plan: str
    current_price: float
    next_billing_date: Optional[str]
    features: List[str]
    usage_stats: Dict[str, Any]
    available_upgrades: List[Dict[str, Any]]

class BillingHistoryResponse(BaseModel):
    payments: List[Dict[str, Any]]
    total_spent: float
    subscription_history: List[Dict[str, Any]]

@router.get("/plans")
async def get_subscription_plans():
    """Get available subscription plans and features"""
    
    plans = {
        "free": {
            "name": "Free",
            "price": 0,
            "billing_period": "forever",
            "features": [
                "Basic matching (limited daily)",
                "1 photo reveal request per day",
                "Basic profile features",
                "Limited conversations"
            ],
            "limits": {
                "daily_matches": 5,
                "daily_reveals": 1,
                "ai_wingman_requests": 0,
                "conversation_analysis": False
            }
        },
        "connection": {
            "name": "Connection",
            "price": 19.99,
            "annual_price": 199.99,  # ~17% discount
            "billing_period": "monthly",
            "features": [
                "Unlimited high-quality matching",
                "5 photo reveal requests per day",
                "AI Wingman conversation assistance (10 requests/day)",
                "Advanced conversation insights",
                "Trust score acceleration",
                "Priority customer support"
            ],
            "limits": {
                "daily_matches": -1,  # Unlimited
                "daily_reveals": 5,
                "ai_wingman_requests": 10,
                "conversation_analysis": True
            },
            "popular": True
        },
        "elite": {
            "name": "Elite",
            "price": 39.99,
            "annual_price": 399.99,  # ~17% discount
            "billing_period": "monthly",
            "features": [
                "Elite member matching pool",
                "15 photo reveal requests per day",
                "Unlimited AI Wingman assistance",
                "Comprehensive conversation health analysis",
                "Advanced trust tier benefits",
                "Beta features early access",
                "Concierge customer support",
                "Profile boost and premium visibility"
            ],
            "limits": {
                "daily_matches": -1,  # Unlimited
                "daily_reveals": 15,
                "ai_wingman_requests": -1,  # Unlimited
                "conversation_analysis": True,
                "conversation_health": True,
                "profile_boost": True
            },
            "premium": True
        }
    }
    
    return {
        "plans": plans,
        "current_promotions": [
            {
                "code": "APEXLAUNCH",
                "description": "50% off first 3 months",
                "valid_until": "2025-12-31",
                "applicable_plans": ["connection", "elite"]
            },
            {
                "code": "STUDENT20",
                "description": "20% off for students",
                "valid_until": "2025-12-31",
                "applicable_plans": ["connection", "elite"],
                "requires_verification": True
            }
        ]
    }

@router.get("/current", response_model=SubscriptionInfo)
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's current subscription information"""
    
    try:
        # Get current subscription
        subscription = db.query(Subscription).filter(
            Subscription.user_id == current_user.id,
            Subscription.is_active == True
        ).first()
        
        current_plan = subscription.plan_name if subscription else "free"
        current_price = subscription.amount if subscription else 0
        next_billing = subscription.next_billing_date.isoformat() if subscription and subscription.next_billing_date else None
        
        # Get plan features
        plan_features = {
            "free": [
                "Basic matching (5 per day)",
                "1 photo reveal per day",
                "Basic profile features"
            ],
            "connection": [
                "Unlimited matching",
                "5 photo reveals per day",
                "AI Wingman (10 requests/day)",
                "Conversation insights",
                "Trust score boost"
            ],
            "elite": [
                "Elite member pool",
                "15 photo reveals per day", 
                "Unlimited AI Wingman",
                "Conversation health analysis",
                "Premium support",
                "Beta features"
            ]
        }
        
        features = plan_features.get(current_plan, [])
        
        # Get usage statistics
        today = datetime.utcnow().strftime('%Y%m%d')
        month = datetime.utcnow().strftime('%Y%m')
        
        daily_ai_usage = await redis_client.redis.get(f"ai_usage_daily:{current_user.id}:{today}") or 0
        monthly_ai_usage = await redis_client.redis.get(f"ai_usage_monthly:{current_user.id}:{month}") or 0
        daily_reveals = await redis_client.redis.get(f"reveals_daily:{current_user.id}:{today}") or 0
        
        usage_stats = {
            "ai_wingman_daily": int(daily_ai_usage),
            "ai_wingman_monthly": int(monthly_ai_usage),
            "reveals_today": int(daily_reveals),
            "trust_score": current_user.trust_score or 0,
            "account_age_days": (datetime.utcnow() - current_user.created_at).days
        }
        
        # Available upgrades
        available_upgrades = []
        if current_plan == "free":
            available_upgrades.extend([
                {
                    "plan": "connection",
                    "name": "Connection",
                    "price": 19.99,
                    "savings": "Perfect for serious daters",
                    "key_features": ["AI Wingman", "5x more reveals", "Unlimited matching"]
                },
                {
                    "plan": "elite", 
                    "name": "Elite",
                    "price": 39.99,
                    "savings": "Best value for premium experience",
                    "key_features": ["Elite member pool", "Unlimited AI", "Conversation health"]
                }
            ])
        elif current_plan == "connection":
            available_upgrades.append({
                "plan": "elite",
                "name": "Elite",
                "price": 39.99,
                "savings": "Upgrade for $20/month more",
                "key_features": ["Elite member pool", "3x more reveals", "Unlimited AI"]
            })
        
        return SubscriptionInfo(
            current_plan=current_plan,
            current_price=current_price,
            next_billing_date=next_billing,
            features=features,
            usage_stats=usage_stats,
            available_upgrades=available_upgrades
        )
        
    except Exception as e:
        billing_logger.log_billing_event(
            user_id=current_user.id,
            event_type="get_subscription_error",
            amount=0,
            description=f"Error getting subscription info: {str(e)}"
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get subscription information"
        )

@router.post("/upgrade")
@require_verification()
async def upgrade_subscription(
    request: UpgradeRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upgrade user's subscription plan"""
    
    try:
        # Validate plan
        if request.plan not in [SubscriptionPlan.CONNECTION, SubscriptionPlan.ELITE]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid subscription plan"
            )
        
        # Get plan pricing
        plan_pricing = {
            SubscriptionPlan.CONNECTION: {
                "monthly": 19.99,
                "annually": 199.99
            },
            SubscriptionPlan.ELITE: {
                "monthly": 39.99,
                "annually": 399.99
            }
        }
        
        amount = plan_pricing[request.plan][request.billing_period]
        
        # Check for existing subscription
        existing_subscription = db.query(Subscription).filter(
            Subscription.user_id == current_user.id,
            Subscription.is_active == True
        ).first()
        
        # Validate promo code if provided
        promo_discount = 0
        promo_code_obj = None
        if request.promo_code:
            promo_code_obj = db.query(PromoCode).filter(
                PromoCode.code == request.promo_code,
                PromoCode.is_active == True,
                PromoCode.valid_until > datetime.utcnow()
            ).first()
            
            if not promo_code_obj:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired promo code"
                )
            
            # Check if user already used this promo
            existing_usage = db.query(PaymentHistory).filter(
                PaymentHistory.user_id == current_user.id,
                PaymentHistory.promo_code == request.promo_code
            ).first()
            
            if existing_usage and promo_code_obj.single_use:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Promo code already used"
                )
            
            promo_discount = (amount * promo_code_obj.discount_percentage) / 100
        
        final_amount = amount - promo_discount
        
        # Create Stripe subscription
        stripe_response = await stripe_client.create_subscription(
            user_id=current_user.id,
            plan_name=request.plan.value,
            amount=final_amount,
            billing_period=request.billing_period,
            payment_method_id=request.payment_method.payment_method_id,
            promo_code=request.promo_code
        )
        
        if not stripe_response.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=stripe_response.get("error", "Payment failed")
            )
        
        # Cancel existing subscription if upgrading
        if existing_subscription:
            existing_subscription.is_active = False
            existing_subscription.cancelled_at = datetime.utcnow()
            
            # Handle prorations for mid-cycle upgrades
            if existing_subscription.plan_name != "free":
                # Calculate proration credit (simplified)
                days_remaining = (existing_subscription.next_billing_date - datetime.utcnow()).days
                daily_rate = existing_subscription.amount / 30
                proration_credit = days_remaining * daily_rate
                
                # Apply credit to new subscription (would be handled by Stripe in production)
                final_amount = max(0, final_amount - proration_credit)
        
        # Create new subscription record
        subscription = Subscription(
            user_id=current_user.id,
            plan_name=request.plan.value,
            amount=final_amount,
            billing_period=request.billing_period,
            stripe_subscription_id=stripe_response.get("subscription_id"),
            stripe_customer_id=stripe_response.get("customer_id"),
            status="active",
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow() + timedelta(days=30 if request.billing_period == "monthly" else 365),
            next_billing_date=datetime.utcnow() + timedelta(days=30 if request.billing_period == "monthly" else 365),
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        db.add(subscription)
        
        # Update user subscription tier
        current_user.subscription_tier = SubscriptionTier.CONNECTION if request.plan == SubscriptionPlan.CONNECTION else SubscriptionTier.ELITE
        current_user.subscription_id = subscription.id
        
        # Create payment history record
        payment = PaymentHistory(
            user_id=current_user.id,
            subscription_id=subscription.id,
            amount=final_amount,
            original_amount=amount,
            discount_amount=promo_discount,
            promo_code=request.promo_code,
            stripe_payment_intent_id=stripe_response.get("payment_intent_id"),
            status="completed",
            created_at=datetime.utcnow()
        )
        
        db.add(payment)
        
        # Update promo code usage
        if promo_code_obj:
            promo_code_obj.usage_count = (promo_code_obj.usage_count or 0) + 1
        
        db.commit()
        
        # Log billing event
        billing_logger.log_billing_event(
            user_id=current_user.id,
            event_type="subscription_upgrade",
            amount=final_amount,
            description=f"Upgraded to {request.plan.value} plan",
            context={
                "plan": request.plan.value,
                "billing_period": request.billing_period,
                "promo_code": request.promo_code,
                "discount": promo_discount
            }
        )
        
        # Add background tasks
        background_tasks.add_task(send_upgrade_confirmation, current_user.id, request.plan.value, final_amount)
        background_tasks.add_task(update_feature_access, current_user.id, request.plan.value)
        
        return {
            "message": "Subscription upgraded successfully",
            "plan": request.plan.value,
            "amount_charged": final_amount,
            "discount_applied": promo_discount,
            "next_billing_date": subscription.next_billing_date.isoformat(),
            "features_unlocked": get_plan_features(request.plan.value)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        
        billing_logger.log_billing_event(
            user_id=current_user.id,
            event_type="upgrade_error",
            amount=0,
            description=f"Upgrade failed: {str(e)}"
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upgrade subscription"
        )

@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel current subscription"""
    
    try:
        subscription = db.query(Subscription).filter(
            Subscription.user_id == current_user.id,
            Subscription.is_active == True
        ).first()
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active subscription found"
            )
        
        # Cancel with Stripe
        cancellation_result = await stripe_client.cancel_subscription(
            subscription.stripe_subscription_id
        )
        
        if not cancellation_result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cancel subscription with payment provider"
            )
        
        # Update subscription record
        subscription.is_active = False
        subscription.cancelled_at = datetime.utcnow()
        subscription.status = "cancelled"
        
        # Revert user to free tier at end of billing period
        current_user.subscription_tier = SubscriptionTier.FREE
        
        db.commit()
        
        # Log cancellation
        billing_logger.log_billing_event(
            user_id=current_user.id,
            event_type="subscription_cancelled",
            amount=0,
            description=f"Cancelled {subscription.plan_name} subscription"
        )
        
        return {
            "message": "Subscription cancelled successfully",
            "access_until": subscription.current_period_end.isoformat(),
            "plan_after_expiry": "free"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )

@router.get("/billing-history", response_model=BillingHistoryResponse)
async def get_billing_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's billing history"""
    
    try:
        # Get payment history
        payments = db.query(PaymentHistory).filter(
            PaymentHistory.user_id == current_user.id
        ).order_by(PaymentHistory.created_at.desc()).limit(50).all()
        
        payments_data = []
        total_spent = 0
        
        for payment in payments:
            payments_data.append({
                "id": payment.id,
                "amount": payment.amount,
                "original_amount": payment.original_amount,
                "discount_amount": payment.discount_amount or 0,
                "promo_code": payment.promo_code,
                "status": payment.status,
                "created_at": payment.created_at.isoformat(),
                "description": f"{payment.subscription.plan_name.title()} Plan" if payment.subscription else "Payment"
            })
            
            if payment.status == "completed":
                total_spent += payment.amount
        
        # Get subscription history
        subscriptions = db.query(Subscription).filter(
            Subscription.user_id == current_user.id
        ).order_by(Subscription.created_at.desc()).all()
        
        subscription_history = []
        for sub in subscriptions:
            subscription_history.append({
                "plan": sub.plan_name,
                "amount": sub.amount,
                "billing_period": sub.billing_period,
                "started_at": sub.created_at.isoformat(),
                "ended_at": sub.cancelled_at.isoformat() if sub.cancelled_at else None,
                "status": sub.status,
                "is_active": sub.is_active
            })
        
        return BillingHistoryResponse(
            payments=payments_data,
            total_spent=total_spent,
            subscription_history=subscription_history
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get billing history"
        )

def get_plan_features(plan_name: str) -> List[str]:
    """Get features for a specific plan"""
    features = {
        "free": [
            "Basic matching",
            "1 photo reveal per day",
            "Basic profile"
        ],
        "connection": [
            "Unlimited matching",
            "5 photo reveals per day",
            "AI Wingman (10/day)",
            "Conversation insights",
            "Trust acceleration"
        ],
        "elite": [
            "Elite member pool",
            "15 photo reveals per day",
            "Unlimited AI Wingman",
            "Conversation health",
            "Premium support",
            "Beta features"
        ]
    }
    
    return features.get(plan_name, [])

async def send_upgrade_confirmation(user_id: int, plan: str, amount: float):
    """Background task to send upgrade confirmation"""
    try:
        confirmation_data = {
            "user_id": user_id,
            "type": "subscription_upgrade",
            "title": f"Welcome to {plan.title()}!",
            "message": f"Your subscription has been activated. Amount charged: ${amount:.2f}",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await redis_client.redis.lpush(f"notifications:{user_id}", str(confirmation_data))
        
    except Exception as e:
        billing_logger.log_billing_event(
            user_id=user_id,
            event_type="notification_error",
            amount=0,
            description=f"Failed to send upgrade confirmation: {str(e)}"
        )

async def update_feature_access(user_id: int, plan: str):
    """Background task to update user feature access"""
    try:
        # Reset daily usage limits for new plan
        today = datetime.utcnow().strftime('%Y%m%d')
        
        # Update AI usage limits
        plan_limits = {
            "connection": 10,
            "elite": -1  # Unlimited
        }
        
        limit = plan_limits.get(plan, 0)
        if limit > 0:
            await redis_client.redis.set(f"ai_limit:{user_id}", limit, ex=86400)
        elif limit == -1:
            await redis_client.redis.delete(f"ai_limit:{user_id}")
        
        # Update reveal limits
        reveal_limits = {
            "connection": 5,
            "elite": 15
        }
        
        reveal_limit = reveal_limits.get(plan, 1)
        await redis_client.redis.set(f"reveal_limit:{user_id}", reveal_limit, ex=86400)
        
    except Exception as e:
        billing_logger.log_billing_event(
            user_id=user_id,
            event_type="feature_access_error",
            amount=0,
            description=f"Failed to update feature access: {str(e)}"
        )

@router.get("/health")
async def upgrade_health_check():
    """Subscription system health check"""
    return {
        "status": "healthy",
        "service": "subscription_upgrade",
        "payment_provider": {
            "stripe": await stripe_client.health_check()
        },
        "features": {
            "plan_management": "available",
            "payment_processing": "available",
            "promo_codes": "available",
            "billing_history": "available"
        }
    }