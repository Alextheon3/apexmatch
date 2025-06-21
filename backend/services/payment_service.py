# backend/services/payment_service.py
"""
ApexMatch Payment Service
Handles subscription payments, billing management, and revenue operations
"""

from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from models.user import User, SubscriptionTier
from models.subscription import Subscription, PaymentHistory, PromoCode
from clients.stripe_client import stripe_client
from clients.redis_client import redis_client
from config import settings

logger = logging.getLogger(__name__)


class PaymentService:
    """
    Service for handling all payment and subscription operations
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.subscription_plans = {
            "connection": {
                "monthly": {"price": 19.99, "features": ["AI Wingman", "5 reveals/day", "Unlimited matching"]},
                "annually": {"price": 199.99, "features": ["AI Wingman", "5 reveals/day", "Unlimited matching"]}
            },
            "elite": {
                "monthly": {"price": 39.99, "features": ["Elite pool", "15 reveals/day", "Unlimited AI", "Conversation health"]},
                "annually": {"price": 399.99, "features": ["Elite pool", "15 reveals/day", "Unlimited AI", "Conversation health"]}
            }
        }
    
    async def create_subscription(
        self,
        user_id: int,
        plan_name: str,
        billing_period: str,
        payment_method_id: str,
        promo_code: Optional[str] = None
    ) -> Dict:
        """Create a new subscription for user"""
        
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return {"success": False, "error": "User not found"}
            
            # Validate plan
            if plan_name not in self.subscription_plans:
                return {"success": False, "error": "Invalid subscription plan"}
            
            plan_info = self.subscription_plans[plan_name][billing_period]
            base_amount = plan_info["price"]
            
            # Check for existing active subscription
            existing_sub = self.db.query(Subscription).filter(
                Subscription.user_id == user_id,
                Subscription.is_active == True
            ).first()
            
            # Process promo code if provided
            discount_amount = 0
            promo_code_obj = None
            if promo_code:
                promo_result = await self._validate_and_apply_promo_code(
                    promo_code, user_id, base_amount
                )
                if promo_result["valid"]:
                    discount_amount = promo_result["discount_amount"]
                    promo_code_obj = promo_result["promo_code_obj"]
                else:
                    return {"success": False, "error": promo_result["error"]}
            
            final_amount = base_amount - discount_amount
            
            # Handle existing subscription (upgrade/downgrade)
            if existing_sub:
                proration_credit = await self._calculate_proration_credit(existing_sub)
                final_amount = max(0, final_amount - proration_credit)
                
                # Cancel existing subscription
                existing_sub.is_active = False
                existing_sub.cancelled_at = datetime.utcnow()
            
            # Create Stripe subscription
            stripe_result = await stripe_client.create_subscription(
                user_id=user_id,
                plan_name=plan_name,
                amount=final_amount,
                billing_period=billing_period,
                payment_method_id=payment_method_id,
                promo_code=promo_code
            )
            
            if not stripe_result.get("success"):
                return {"success": False, "error": stripe_result.get("error", "Payment failed")}
            
            # Create subscription record
            subscription = Subscription(
                user_id=user_id,
                plan_name=plan_name,
                amount=final_amount,
                billing_period=billing_period,
                stripe_subscription_id=stripe_result.get("subscription_id"),
                stripe_customer_id=stripe_result.get("customer_id"),
                status="active",
                current_period_start=datetime.utcnow(),
                current_period_end=self._calculate_period_end(billing_period),
                next_billing_date=self._calculate_period_end(billing_period),
                is_active=True,
                created_at=datetime.utcnow()
            )
            
            self.db.add(subscription)
            
            # Update user subscription tier
            if plan_name == "connection":
                user.subscription_tier = SubscriptionTier.CONNECTION
            elif plan_name == "elite":
                user.subscription_tier = SubscriptionTier.ELITE
            
            user.subscription_id = subscription.id
            
            # Create payment history record
            payment = PaymentHistory(
                user_id=user_id,
                subscription_id=subscription.id,
                amount=final_amount,
                original_amount=base_amount,
                discount_amount=discount_amount,
                promo_code=promo_code,
                stripe_payment_intent_id=stripe_result.get("payment_intent_id"),
                status="completed",
                created_at=datetime.utcnow()
            )
            
            self.db.add(payment)
            
            # Update promo code usage
            if promo_code_obj:
                promo_code_obj.usage_count = (promo_code_obj.usage_count or 0) + 1
            
            self.db.commit()
            
            # Update user features in cache
            await self._update_user_features_cache(user_id, plan_name)
            
            # Send confirmation
            await self._send_subscription_confirmation(user_id, subscription, payment)
            
            return {
                "success": True,
                "subscription_id": subscription.id,
                "amount_charged": final_amount,
                "discount_applied": discount_amount,
                "next_billing_date": subscription.next_billing_date.isoformat(),
                "features_unlocked": plan_info["features"]
            }
            
        except Exception as e:
            logger.error(f"Error creating subscription: {e}")
            self.db.rollback()
            return {"success": False, "error": "Failed to create subscription"}
    
    async def _validate_and_apply_promo_code(
        self, 
        promo_code: str, 
        user_id: int, 
        base_amount: float
    ) -> Dict:
        """Validate and apply promo code"""
        
        # Get promo code from database
        promo_code_obj = self.db.query(PromoCode).filter(
            PromoCode.code == promo_code,
            PromoCode.is_active == True,
            PromoCode.valid_until > datetime.utcnow()
        ).first()
        
        if not promo_code_obj:
            return {"valid": False, "error": "Invalid or expired promo code"}
        
        # Check usage limits
        if promo_code_obj.max_uses and promo_code_obj.usage_count >= promo_code_obj.max_uses:
            return {"valid": False, "error": "Promo code usage limit exceeded"}
        
        # Check if user already used this promo code
        if promo_code_obj.single_use:
            existing_usage = self.db.query(PaymentHistory).filter(
                PaymentHistory.user_id == user_id,
                PaymentHistory.promo_code == promo_code
            ).first()
            
            if existing_usage:
                return {"valid": False, "error": "Promo code already used"}
        
        # Calculate discount
        discount_amount = (base_amount * promo_code_obj.discount_percentage) / 100
        
        return {
            "valid": True,
            "discount_amount": discount_amount,
            "promo_code_obj": promo_code_obj
        }
    
    async def _calculate_proration_credit(self, existing_subscription: Subscription) -> float:
        """Calculate proration credit for subscription changes"""
        
        if not existing_subscription.next_billing_date:
            return 0.0
        
        # Calculate remaining days in current billing period
        remaining_days = (existing_subscription.next_billing_date - datetime.utcnow()).days
        
        if remaining_days <= 0:
            return 0.0
        
        # Calculate daily rate of current subscription
        if existing_subscription.billing_period == "monthly":
            total_days = 30
        else:  # annually
            total_days = 365
        
        daily_rate = existing_subscription.amount / total_days
        proration_credit = daily_rate * remaining_days
        
        return round(proration_credit, 2)
    
    def _calculate_period_end(self, billing_period: str) -> datetime:
        """Calculate subscription period end date"""
        
        if billing_period == "monthly":
            return datetime.utcnow() + timedelta(days=30)
        else:  # annually
            return datetime.utcnow() + timedelta(days=365)
    
    async def _update_user_features_cache(self, user_id: int, plan_name: str) -> None:
        """Update user's feature access in cache"""
        
        feature_limits = {
            "connection": {
                "daily_reveals": 5,
                "ai_wingman_requests": 10,
                "unlimited_matching": True,
                "conversation_insights": True
            },
            "elite": {
                "daily_reveals": 15,
                "ai_wingman_requests": -1,  # Unlimited
                "unlimited_matching": True,
                "conversation_insights": True,
                "conversation_health": True,
                "profile_boost": True
            }
        }
        
        features = feature_limits.get(plan_name, {})
        
        await redis_client.set_json(
            f"user_features:{user_id}",
            {
                "plan": plan_name,
                "features": features,
                "updated_at": datetime.utcnow().isoformat()
            },
            ex=86400  # 24 hours
        )
    
    async def _send_subscription_confirmation(
        self, 
        user_id: int, 
        subscription: Subscription, 
        payment: PaymentHistory
    ) -> None:
        """Send subscription confirmation notification"""
        
        confirmation = {
            "type": "subscription_confirmation",
            "title": f"Welcome to {subscription.plan_name.title()}!",
            "message": f"Your subscription is now active. Amount charged: ${payment.amount:.2f}",
            "subscription_details": {
                "plan": subscription.plan_name,
                "billing_period": subscription.billing_period,
                "next_billing_date": subscription.next_billing_date.isoformat(),
                "features": self.subscription_plans[subscription.plan_name][subscription.billing_period]["features"]
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await redis_client.send_user_notification(user_id, confirmation)
    
    async def cancel_subscription(self, user_id: int, reason: Optional[str] = None) -> Dict:
        """Cancel user's active subscription"""
        
        try:
            subscription = self.db.query(Subscription).filter(
                Subscription.user_id == user_id,
                Subscription.is_active == True
            ).first()
            
            if not subscription:
                return {"success": False, "error": "No active subscription found"}
            
            # Cancel with Stripe
            stripe_result = await stripe_client.cancel_subscription(
                subscription.stripe_subscription_id
            )
            
            if not stripe_result.get("success"):
                return {"success": False, "error": "Failed to cancel with payment provider"}
            
            # Update subscription record
            subscription.is_active = False
            subscription.cancelled_at = datetime.utcnow()
            subscription.cancellation_reason = reason
            subscription.status = "cancelled"
            
            # Update user tier (keep benefits until period end)
            user = self.db.query(User).filter(User.id == user_id).first()
            if user:
                user.subscription_tier = SubscriptionTier.FREE
            
            self.db.commit()
            
            # Schedule feature downgrade at period end
            await self._schedule_feature_downgrade(user_id, subscription.current_period_end)
            
            # Send cancellation confirmation
            await self._send_cancellation_confirmation(user_id, subscription)
            
            return {
                "success": True,
                "message": "Subscription cancelled successfully",
                "access_until": subscription.current_period_end.isoformat(),
                "refund_eligible": await self._check_refund_eligibility(subscription)
            }
            
        except Exception as e:
            logger.error(f"Error cancelling subscription: {e}")
            self.db.rollback()
            return {"success": False, "error": "Failed to cancel subscription"}
    
    async def _schedule_feature_downgrade(self, user_id: int, downgrade_date: datetime) -> None:
        """Schedule feature downgrade at subscription end"""
        
        downgrade_data = {
            "user_id": user_id,
            "downgrade_date": downgrade_date.isoformat(),
            "target_plan": "free"
        }
        
        # Schedule with Redis (would use a proper job queue in production)
        delay_seconds = int((downgrade_date - datetime.utcnow()).total_seconds())
        
        await redis_client.redis.setex(
            f"scheduled_downgrade:{user_id}",
            delay_seconds,
            str(downgrade_data)
        )
    
    async def _check_refund_eligibility(self, subscription: Subscription) -> bool:
        """Check if subscription is eligible for refund"""
        
        # Refund eligible if cancelled within 7 days of creation
        refund_window = timedelta(days=7)
        return (datetime.utcnow() - subscription.created_at) <= refund_window
    
    async def _send_cancellation_confirmation(self, user_id: int, subscription: Subscription) -> None:
        """Send cancellation confirmation"""
        
        confirmation = {
            "type": "subscription_cancelled",
            "title": "Subscription Cancelled",
            "message": f"Your {subscription.plan_name} subscription has been cancelled.",
            "details": {
                "access_until": subscription.current_period_end.isoformat(),
                "plan_after_expiry": "Free",
                "cancellation_date": subscription.cancelled_at.isoformat()
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await redis_client.send_user_notification(user_id, confirmation)
    
    async def process_stripe_webhook(self, event_type: str, event_data: Dict) -> Dict:
        """Process Stripe webhook events"""
        
        try:
            if event_type == "invoice.payment_succeeded":
                return await self._handle_payment_succeeded(event_data)
            
            elif event_type == "invoice.payment_failed":
                return await self._handle_payment_failed(event_data)
            
            elif event_type == "customer.subscription.updated":
                return await self._handle_subscription_updated(event_data)
            
            elif event_type == "customer.subscription.deleted":
                return await self._handle_subscription_deleted(event_data)
            
            else:
                logger.info(f"Unhandled webhook event: {event_type}")
                return {"success": True, "message": "Event received but not processed"}
                
        except Exception as e:
            logger.error(f"Error processing webhook {event_type}: {e}")
            return {"success": False, "error": "Failed to process webhook"}
    
    async def _handle_payment_succeeded(self, event_data: Dict) -> Dict:
        """Handle successful payment webhook"""
        
        stripe_subscription_id = event_data.get("subscription")
        amount_paid = event_data.get("amount_paid", 0) / 100  # Convert from cents
        
        # Find subscription
        subscription = self.db.query(Subscription).filter(
            Subscription.stripe_subscription_id == stripe_subscription_id
        ).first()
        
        if not subscription:
            return {"success": False, "error": "Subscription not found"}
        
        # Update subscription period
        subscription.current_period_start = datetime.utcnow()
        subscription.current_period_end = self._calculate_period_end(subscription.billing_period)
        subscription.next_billing_date = subscription.current_period_end
        
        # Create payment record
        payment = PaymentHistory(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            amount=amount_paid,
            stripe_payment_intent_id=event_data.get("payment_intent"),
            status="completed",
            created_at=datetime.utcnow()
        )
        
        self.db.add(payment)
        self.db.commit()
        
        # Send payment confirmation
        await self._send_payment_confirmation(subscription.user_id, payment)
        
        return {"success": True, "message": "Payment processed successfully"}
    
    async def _handle_payment_failed(self, event_data: Dict) -> Dict:
        """Handle failed payment webhook"""
        
        stripe_subscription_id = event_data.get("subscription")
        
        subscription = self.db.query(Subscription).filter(
            Subscription.stripe_subscription_id == stripe_subscription_id
        ).first()
        
        if not subscription:
            return {"success": False, "error": "Subscription not found"}
        
        # Create failed payment record
        payment = PaymentHistory(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            amount=subscription.amount,
            status="failed",
            failure_reason=event_data.get("failure_reason", "Payment failed"),
            created_at=datetime.utcnow()
        )
        
        self.db.add(payment)
        
        # Update subscription status
        subscription.status = "past_due"
        
        self.db.commit()
        
        # Send payment failure notification
        await self._send_payment_failure_notification(subscription.user_id, subscription)
        
        # Schedule retry or cancellation
        await self._schedule_payment_retry(subscription)
        
        return {"success": True, "message": "Payment failure processed"}
    
    async def _send_payment_confirmation(self, user_id: int, payment: PaymentHistory) -> None:
        """Send payment confirmation notification"""
        
        confirmation = {
            "type": "payment_confirmation",
            "title": "Payment Successful",
            "message": f"Your payment of ${payment.amount:.2f} has been processed successfully.",
            "payment_details": {
                "amount": payment.amount,
                "payment_date": payment.created_at.isoformat()
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await redis_client.send_user_notification(user_id, confirmation)
    
    async def _send_payment_failure_notification(self, user_id: int, subscription: Subscription) -> None:
        """Send payment failure notification"""
        
        notification = {
            "type": "payment_failed",
            "title": "Payment Failed",
            "message": "We couldn't process your payment. Please update your payment method.",
            "action_required": True,
            "subscription_at_risk": True,
            "retry_date": (datetime.utcnow() + timedelta(days=3)).isoformat(),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await redis_client.send_user_notification(user_id, notification)
    
    async def _schedule_payment_retry(self, subscription: Subscription) -> None:
        """Schedule payment retry for failed payments"""
        
        retry_data = {
            "subscription_id": subscription.id,
            "user_id": subscription.user_id,
            "retry_attempt": 1,
            "retry_date": (datetime.utcnow() + timedelta(days=3)).isoformat()
        }
        
        await redis_client.redis.setex(
            f"payment_retry:{subscription.id}",
            86400 * 3,  # 3 days
            str(retry_data)
        )
    
    async def get_billing_history(self, user_id: int, limit: int = 50) -> Dict:
        """Get user's billing history"""
        
        payments = self.db.query(PaymentHistory).filter(
            PaymentHistory.user_id == user_id
        ).order_by(PaymentHistory.created_at.desc()).limit(limit).all()
        
        subscriptions = self.db.query(Subscription).filter(
            Subscription.user_id == user_id
        ).order_by(Subscription.created_at.desc()).all()
        
        # Calculate totals
        total_spent = sum(p.amount for p in payments if p.status == "completed")
        
        # Format payment history
        payment_history = []
        for payment in payments:
            payment_history.append({
                "id": payment.id,
                "amount": payment.amount,
                "original_amount": payment.original_amount,
                "discount_amount": payment.discount_amount or 0,
                "promo_code": payment.promo_code,
                "status": payment.status,
                "created_at": payment.created_at.isoformat(),
                "description": f"{payment.subscription.plan_name.title()} Plan" if payment.subscription else "Payment"
            })
        
        # Format subscription history
        subscription_history = []
        for sub in subscriptions:
            subscription_history.append({
                "id": sub.id,
                "plan": sub.plan_name,
                "amount": sub.amount,
                "billing_period": sub.billing_period,
                "status": sub.status,
                "started_at": sub.created_at.isoformat(),
                "ended_at": sub.cancelled_at.isoformat() if sub.cancelled_at else None,
                "is_active": sub.is_active
            })
        
        return {
            "total_spent": total_spent,
            "payment_history": payment_history,
            "subscription_history": subscription_history,
            "summary": {
                "total_payments": len(payments),
                "successful_payments": len([p for p in payments if p.status == "completed"]),
                "failed_payments": len([p for p in payments if p.status == "failed"]),
                "total_subscriptions": len(subscriptions)
            }
        }
    
    async def apply_promo_code(self, user_id: int, promo_code: str) -> Dict:
        """Apply a promo code for future subscription"""
        
        try:
            # Validate promo code
            validation_result = await self._validate_and_apply_promo_code(
                promo_code, user_id, 0  # Amount doesn't matter for validation
            )
            
            if not validation_result["valid"]:
                return {"success": False, "error": validation_result["error"]}
            
            promo_code_obj = validation_result["promo_code_obj"]
            
            # Store promo code for user's next subscription
            await redis_client.set_json(
                f"pending_promo:{user_id}",
                {
                    "promo_code": promo_code,
                    "discount_percentage": promo_code_obj.discount_percentage,
                    "expires_at": promo_code_obj.valid_until.isoformat(),
                    "applied_at": datetime.utcnow().isoformat()
                },
                ex=86400 * 7  # Valid for 7 days
            )
            
            return {
                "success": True,
                "message": f"Promo code applied! {promo_code_obj.discount_percentage}% discount on your next subscription",
                "discount_percentage": promo_code_obj.discount_percentage,
                "valid_until": promo_code_obj.valid_until.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error applying promo code: {e}")
            return {"success": False, "error": "Failed to apply promo code"}
    
    async def get_subscription_analytics(self, user_id: Optional[int] = None) -> Dict:
        """Get subscription analytics (admin only)"""
        
        # This would have admin permission checks in production
        
        # Revenue metrics
        total_revenue = self.db.query(func.sum(PaymentHistory.amount)).filter(
            PaymentHistory.status == "completed"
        ).scalar() or 0
        
        monthly_revenue = self.db.query(func.sum(PaymentHistory.amount)).filter(
            PaymentHistory.status == "completed",
            PaymentHistory.created_at >= datetime.utcnow() - timedelta(days=30)
        ).scalar() or 0
        
        # Subscription metrics
        active_subscriptions = self.db.query(Subscription).filter(
            Subscription.is_active == True
        ).count()
        
        # Plan distribution
        plan_distribution = {}
        for plan in ["connection", "elite"]:
            count = self.db.query(Subscription).filter(
                Subscription.plan_name == plan,
                Subscription.is_active == True
            ).count()
            plan_distribution[plan] = count
        
        # Churn rate (simplified)
        cancelled_this_month = self.db.query(Subscription).filter(
            Subscription.cancelled_at >= datetime.utcnow() - timedelta(days=30)
        ).count()
        
        churn_rate = (cancelled_this_month / max(active_subscriptions, 1)) * 100
        
        return {
            "revenue_metrics": {
                "total_revenue": round(total_revenue, 2),
                "monthly_revenue": round(monthly_revenue, 2),
                "average_revenue_per_user": round(total_revenue / max(active_subscriptions, 1), 2)
            },
            "subscription_metrics": {
                "active_subscriptions": active_subscriptions,
                "plan_distribution": plan_distribution,
                "churn_rate_percentage": round(churn_rate, 1)
            },
            "growth_metrics": {
                "new_subscriptions_this_month": self.db.query(Subscription).filter(
                    Subscription.created_at >= datetime.utcnow() - timedelta(days=30)
                ).count(),
                "cancellations_this_month": cancelled_this_month
            }
        }
    
    async def _handle_subscription_updated(self, event_data: Dict) -> Dict:
        """Handle subscription updated webhook"""
        
        stripe_subscription_id = event_data.get("id")
        
        subscription = self.db.query(Subscription).filter(
            Subscription.stripe_subscription_id == stripe_subscription_id
        ).first()
        
        if not subscription:
            return {"success": False, "error": "Subscription not found"}
        
        # Update subscription details from Stripe data
        subscription.status = event_data.get("status", subscription.status)
        
        if event_data.get("current_period_end"):
            subscription.current_period_end = datetime.fromtimestamp(
                event_data["current_period_end"]
            )
            subscription.next_billing_date = subscription.current_period_end
        
        self.db.commit()
        
        return {"success": True, "message": "Subscription updated"}
    
    async def _handle_subscription_deleted(self, event_data: Dict) -> Dict:
        """Handle subscription deleted webhook"""
        
        stripe_subscription_id = event_data.get("id")
        
        subscription = self.db.query(Subscription).filter(
            Subscription.stripe_subscription_id == stripe_subscription_id
        ).first()
        
        if not subscription:
            return {"success": False, "error": "Subscription not found"}
        
        # Mark subscription as cancelled
        subscription.is_active = False
        subscription.cancelled_at = datetime.utcnow()
        subscription.status = "cancelled"
        
        # Update user tier
        user = self.db.query(User).filter(User.id == subscription.user_id).first()
        if user:
            user.subscription_tier = SubscriptionTier.FREE
        
        self.db.commit()
        
        # Send cancellation notification
        await self._send_cancellation_confirmation(subscription.user_id, subscription)
        
        return {"success": True, "message": "Subscription cancelled"}
    
    async def update_payment_method(self, user_id: int, payment_method_id: str) -> Dict:
        """Update user's payment method"""
        
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return {"success": False, "error": "User not found"}
            
            subscription = self.db.query(Subscription).filter(
                Subscription.user_id == user_id,
                Subscription.is_active == True
            ).first()
            
            if not subscription:
                return {"success": False, "error": "No active subscription found"}
            
            # Update payment method with Stripe
            stripe_result = await stripe_client.update_payment_method(
                subscription.stripe_customer_id,
                payment_method_id
            )
            
            if not stripe_result.get("success"):
                return {"success": False, "error": stripe_result.get("error", "Failed to update payment method")}
            
            return {"success": True, "message": "Payment method updated successfully"}
            
        except Exception as e:
            logger.error(f"Error updating payment method: {e}")
            return {"success": False, "error": "Failed to update payment method"}
    
    async def process_refund(self, user_id: int, payment_id: int, reason: str) -> Dict:
        """Process a refund for a payment"""
        
        try:
            payment = self.db.query(PaymentHistory).filter(
                PaymentHistory.id == payment_id,
                PaymentHistory.user_id == user_id,
                PaymentHistory.status == "completed"
            ).first()
            
            if not payment:
                return {"success": False, "error": "Payment not found or not eligible for refund"}
            
            # Check refund eligibility (7 days)
            if (datetime.utcnow() - payment.created_at).days > 7:
                return {"success": False, "error": "Refund window has expired"}
            
            # Process refund with Stripe
            stripe_result = await stripe_client.create_refund(
                payment.stripe_payment_intent_id,
                payment.amount,
                reason
            )
            
            if not stripe_result.get("success"):
                return {"success": False, "error": stripe_result.get("error", "Failed to process refund")}
            
            # Update payment record
            payment.status = "refunded"
            payment.refund_amount = payment.amount
            payment.refund_reason = reason
            payment.refunded_at = datetime.utcnow()
            
            self.db.commit()
            
            # Send refund confirmation
            await self._send_refund_confirmation(user_id, payment)
            
            return {
                "success": True,
                "refund_amount": payment.amount,
                "refund_id": stripe_result.get("refund_id"),
                "message": "Refund processed successfully"
            }
            
        except Exception as e:
            logger.error(f"Error processing refund: {e}")
            self.db.rollback()
            return {"success": False, "error": "Failed to process refund"}
    
    async def _send_refund_confirmation(self, user_id: int, payment: PaymentHistory) -> None:
        """Send refund confirmation notification"""
        
        confirmation = {
            "type": "refund_confirmation",
            "title": "Refund Processed",
            "message": f"Your refund of ${payment.refund_amount:.2f} has been processed.",
            "refund_details": {
                "amount": payment.refund_amount,
                "original_payment_date": payment.created_at.isoformat(),
                "refund_date": payment.refunded_at.isoformat(),
                "reason": payment.refund_reason
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await redis_client.send_user_notification(user_id, confirmation)
    
    async def get_subscription_status(self, user_id: int) -> Dict:
        """Get detailed subscription status for user"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}
        
        subscription = self.db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.is_active == True
        ).first()
        
        if not subscription:
            return {
                "has_subscription": False,
                "current_plan": "free",
                "features": self._get_free_tier_features(),
                "upgrade_options": self._get_upgrade_options()
            }
        
        # Get usage statistics
        today = datetime.utcnow().strftime('%Y%m%d')
        month = datetime.utcnow().strftime('%Y%m')
        
        daily_ai_usage = await redis_client.redis.get(f"ai_usage_daily:{user_id}:{today}") or 0
        daily_reveals = await redis_client.redis.get(f"reveals_daily:{user_id}:{today}") or 0
        
        return {
            "has_subscription": True,
            "current_plan": subscription.plan_name,
            "billing_period": subscription.billing_period,
            "amount": subscription.amount,
            "status": subscription.status,
            "current_period_end": subscription.current_period_end.isoformat(),
            "next_billing_date": subscription.next_billing_date.isoformat() if subscription.next_billing_date else None,
            "features": self.subscription_plans[subscription.plan_name][subscription.billing_period]["features"],
            "usage": {
                "ai_wingman_today": int(daily_ai_usage),
                "reveals_today": int(daily_reveals)
            },
            "limits": self._get_plan_limits(subscription.plan_name),
            "cancellation_eligible": subscription.is_active
        }
    
    def _get_free_tier_features(self) -> List[str]:
        """Get features for free tier"""
        return [
            "Basic matching (5 per day)",
            "1 photo reveal per day",
            "Basic profile features",
            "Limited conversations"
        ]
    
    def _get_upgrade_options(self) -> List[Dict]:
        """Get available upgrade options"""
        return [
            {
                "plan": "connection",
                "name": "Connection",
                "monthly_price": 19.99,
                "annual_price": 199.99,
                "savings": "Perfect for serious daters",
                "key_features": ["AI Wingman", "5x more reveals", "Unlimited matching"]
            },
            {
                "plan": "elite",
                "name": "Elite", 
                "monthly_price": 39.99,
                "annual_price": 399.99,
                "savings": "Best value for premium experience",
                "key_features": ["Elite member pool", "Unlimited AI", "Conversation health"]
            }
        ]
    
    def _get_plan_limits(self, plan_name: str) -> Dict:
        """Get limits for specific plan"""
        
        limits = {
            "connection": {
                "daily_reveals": 5,
                "ai_wingman_daily": 10,
                "ai_wingman_monthly": 300,
                "unlimited_matching": True
            },
            "elite": {
                "daily_reveals": 15,
                "ai_wingman_daily": -1,  # Unlimited
                "ai_wingman_monthly": -1,  # Unlimited
                "unlimited_matching": True,
                "conversation_health": True
            }
        }
        
        return limits.get(plan_name, {
            "daily_reveals": 1,
            "ai_wingman_daily": 0,
            "ai_wingman_monthly": 0,
            "unlimited_matching": False
        })
    
    async def check_feature_access(self, user_id: int, feature: str) -> Dict:
        """Check if user has access to specific feature"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"has_access": False, "reason": "User not found"}
        
        subscription = self.db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.is_active == True
        ).first()
        
        plan_name = subscription.plan_name if subscription else "free"
        
        # Feature access rules
        feature_access = {
            "ai_wingman": ["connection", "elite"],
            "unlimited_matching": ["connection", "elite"],
            "conversation_health": ["elite"],
            "profile_boost": ["elite"],
            "beta_features": ["elite"],
            "priority_support": ["connection", "elite"],
            "advanced_insights": ["connection", "elite"]
        }
        
        required_plans = feature_access.get(feature, [])
        
        if not required_plans:  # Feature available to all
            return {"has_access": True}
        
        if plan_name in required_plans:
            return {"has_access": True}
        
        return {
            "has_access": False,
            "reason": f"Requires {' or '.join(required_plans)} subscription",
            "upgrade_required": True,
            "available_plans": required_plans
        }
    
    async def get_promo_codes(self, admin_user_id: int) -> Dict:
        """Get all promo codes (admin only)"""
        
        # This would have admin permission checks in production
        
        promo_codes = self.db.query(PromoCode).order_by(
            PromoCode.created_at.desc()
        ).all()
        
        promo_data = []
        for promo in promo_codes:
            promo_data.append({
                "id": promo.id,
                "code": promo.code,
                "discount_percentage": promo.discount_percentage,
                "max_uses": promo.max_uses,
                "usage_count": promo.usage_count or 0,
                "single_use": promo.single_use,
                "is_active": promo.is_active,
                "valid_until": promo.valid_until.isoformat(),
                "created_at": promo.created_at.isoformat()
            })
        
        return {
            "promo_codes": promo_data,
            "total_codes": len(promo_data),
            "active_codes": len([p for p in promo_data if p["is_active"]])
        }
    
    async def create_promo_code(
        self,
        admin_user_id: int,
        code: str,
        discount_percentage: float,
        max_uses: Optional[int] = None,
        valid_days: int = 30,
        single_use: bool = False
    ) -> Dict:
        """Create new promo code (admin only)"""
        
        try:
            # Check if code already exists
            existing = self.db.query(PromoCode).filter(PromoCode.code == code).first()
            if existing:
                return {"success": False, "error": "Promo code already exists"}
            
            # Create promo code
            promo_code = PromoCode(
                code=code.upper(),
                discount_percentage=discount_percentage,
                max_uses=max_uses,
                usage_count=0,
                single_use=single_use,
                is_active=True,
                valid_until=datetime.utcnow() + timedelta(days=valid_days),
                created_at=datetime.utcnow()
            )
            
            self.db.add(promo_code)
            self.db.commit()
            
            return {
                "success": True,
                "promo_code": {
                    "id": promo_code.id,
                    "code": promo_code.code,
                    "discount_percentage": promo_code.discount_percentage,
                    "valid_until": promo_code.valid_until.isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error creating promo code: {e}")
            self.db.rollback()
            return {"success": False, "error": "Failed to create promo code"}
    
    async def health_check(self) -> Dict:
        """Payment service health check"""
        
        try:
            # Check database connectivity
            active_subs = self.db.query(Subscription).filter(
                Subscription.is_active == True
            ).count()
            
            # Check Stripe connectivity
            stripe_health = await stripe_client.health_check()
            
            return {
                "status": "healthy",
                "service": "payment_service",
                "database": "connected",
                "stripe": stripe_health.get("status", "unknown"),
                "active_subscriptions": active_subs,
                "features": {
                    "subscription_management": "available",
                    "payment_processing": "available",
                    "promo_codes": "available",
                    "refunds": "available",
                    "analytics": "available"
                }
            }
            
        except Exception as e:
            logger.error(f"Payment service health check failed: {e}")
            return {
                "status": "unhealthy",
                "service": "payment_service",
                "error": str(e)
            }