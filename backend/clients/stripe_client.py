"""
ApexMatch Stripe Client
Handles subscription payments, billing, and premium feature access
"""

import stripe
import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal

from config import settings
from clients.redis_client import redis_client

logger = logging.getLogger(__name__)


class StripeClient:
    """
    Stripe client for ApexMatch subscription and payment processing
    """
    
    def __init__(self):
        # Initialize Stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        self.webhook_secret = settings.STRIPE_WEBHOOK_SECRET
        self.api_version = "2023-10-16"
        
        # ApexMatch subscription plans
        self.subscription_plans = {
            "free": {
                "name": "Free",
                "price": 0,
                "currency": "usd",
                "interval": "month",
                "features": {
                    "daily_matches": 1,
                    "ai_wingman_suggestions": 0,
                    "reveal_requests": 1,
                    "premium_filters": False,
                    "read_receipts": False,
                    "boost_profile": False,
                    "unlimited_rewinds": False,
                    "concierge_matching": False
                }
            },
            "connection": {
                "name": "Connection",
                "price": 1999,  # $19.99 in cents
                "currency": "usd",
                "interval": "month",
                "stripe_price_id": settings.STRIPE_CONNECTION_PRICE_ID,
                "features": {
                    "daily_matches": 10,
                    "ai_wingman_suggestions": 10,
                    "reveal_requests": 5,
                    "premium_filters": True,
                    "read_receipts": True,
                    "boost_profile": True,
                    "unlimited_rewinds": True,
                    "concierge_matching": False
                }
            },
            "elite": {
                "name": "Elite",
                "price": 3999,  # $39.99 in cents
                "currency": "usd",
                "interval": "month",
                "stripe_price_id": settings.STRIPE_ELITE_PRICE_ID,
                "features": {
                    "daily_matches": 25,
                    "ai_wingman_suggestions": 25,
                    "reveal_requests": 15,
                    "premium_filters": True,
                    "read_receipts": True,
                    "boost_profile": True,
                    "unlimited_rewinds": True,
                    "concierge_matching": True,
                    "priority_support": True,
                    "exclusive_events": True
                }
            }
        }
        
        # Promo codes and discounts
        self.promo_codes = {
            "APEXLAUNCH": {"discount": 50, "type": "percent", "duration": "forever", "max_uses": 1000},
            "STUDENT20": {"discount": 20, "type": "percent", "duration": "repeating", "max_uses": None},
            "REFER25": {"discount": 25, "type": "percent", "duration": "once", "max_uses": None},
            "NEWUSER": {"discount": 1000, "type": "amount", "duration": "once", "max_uses": None}  # $10 off
        }
    
    async def create_customer(
        self, 
        user_id: int, 
        email: str, 
        name: str, 
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Create a new Stripe customer for a user
        """
        try:
            customer_metadata = {
                "apex_user_id": str(user_id),
                "signup_date": datetime.utcnow().isoformat(),
                **(metadata or {})
            }
            
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata=customer_metadata,
                description=f"ApexMatch user {user_id}"
            )
            
            # Cache customer info
            await redis_client.set_json(
                f"stripe_customer:{user_id}",
                {
                    "customer_id": customer.id,
                    "email": email,
                    "name": name,
                    "created_at": datetime.utcnow().isoformat()
                },
                ex=86400 * 30  # Cache for 30 days
            )
            
            logger.info(f"Created Stripe customer {customer.id} for user {user_id}")
            
            return {
                "customer_id": customer.id,
                "email": customer.email,
                "name": customer.name,
                "created": customer.created
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe customer creation error: {e}")
            raise Exception(f"Failed to create customer: {e.user_message}")
        except Exception as e:
            logger.error(f"Customer creation error: {e}")
            raise
    
    async def create_subscription(
        self, 
        user_id: int, 
        plan_name: str, 
        payment_method_id: str,
        promo_code: Optional[str] = None,
        trial_days: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Create a new subscription for a user
        """
        try:
            if plan_name not in self.subscription_plans:
                raise ValueError(f"Invalid plan: {plan_name}")
            
            plan = self.subscription_plans[plan_name]
            
            # Get or create customer
            customer_data = await self._get_or_create_customer_data(user_id)
            customer_id = customer_data["customer_id"]
            
            # Attach payment method to customer
            stripe.PaymentMethod.attach(payment_method_id, customer=customer_id)
            
            # Set as default payment method
            stripe.Customer.modify(
                customer_id,
                invoice_settings={"default_payment_method": payment_method_id}
            )
            
            # Prepare subscription parameters
            subscription_params = {
                "customer": customer_id,
                "items": [{"price": plan["stripe_price_id"]}],
                "payment_behavior": "default_incomplete",
                "payment_settings": {"save_default_payment_method": "on_subscription"},
                "expand": ["latest_invoice.payment_intent"],
                "metadata": {
                    "apex_user_id": str(user_id),
                    "plan_name": plan_name,
                    "created_via": "apexmatch_app"
                }
            }
            
            # Add trial period if specified
            if trial_days:
                subscription_params["trial_period_days"] = trial_days
            
            # Apply promo code if provided
            if promo_code and promo_code in self.promo_codes:
                coupon_id = await self._create_or_get_coupon(promo_code)
                subscription_params["coupon"] = coupon_id
            
            # Create subscription
            subscription = stripe.Subscription.create(**subscription_params)
            
            # Cache subscription info
            await redis_client.set_json(
                f"stripe_subscription:{user_id}",
                {
                    "subscription_id": subscription.id,
                    "customer_id": customer_id,
                    "plan_name": plan_name,
                    "status": subscription.status,
                    "current_period_start": subscription.current_period_start,
                    "current_period_end": subscription.current_period_end,
                    "trial_end": subscription.trial_end,
                    "created_at": datetime.utcnow().isoformat()
                },
                ex=86400 * 30  # Cache for 30 days
            )
            
            logger.info(f"Created subscription {subscription.id} for user {user_id}, plan {plan_name}")
            
            return {
                "subscription_id": subscription.id,
                "status": subscription.status,
                "client_secret": subscription.latest_invoice.payment_intent.client_secret,
                "current_period_end": subscription.current_period_end,
                "trial_end": subscription.trial_end,
                "plan": plan_name,
                "amount": plan["price"]
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe subscription creation error: {e}")
            raise Exception(f"Failed to create subscription: {e.user_message}")
        except Exception as e:
            logger.error(f"Subscription creation error: {e}")
            raise
    
    async def update_subscription(
        self, 
        user_id: int, 
        new_plan_name: str,
        prorate: bool = True
    ) -> Dict[str, Any]:
        """
        Update user's subscription to a new plan
        """
        try:
            if new_plan_name not in self.subscription_plans:
                raise ValueError(f"Invalid plan: {new_plan_name}")
            
            new_plan = self.subscription_plans[new_plan_name]
            
            # Get current subscription
            subscription_data = await redis_client.get_json(f"stripe_subscription:{user_id}")
            if not subscription_data:
                raise ValueError("No active subscription found")
            
            subscription_id = subscription_data["subscription_id"]
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            # Update subscription
            updated_subscription = stripe.Subscription.modify(
                subscription_id,
                items=[{
                    "id": subscription["items"]["data"][0]["id"],
                    "price": new_plan["stripe_price_id"]
                }],
                proration_behavior="create_prorations" if prorate else "none",
                metadata={
                    **subscription.metadata,
                    "plan_name": new_plan_name,
                    "upgraded_at": datetime.utcnow().isoformat()
                }
            )
            
            # Update cache
            subscription_data.update({
                "plan_name": new_plan_name,
                "status": updated_subscription.status,
                "updated_at": datetime.utcnow().isoformat()
            })
            await redis_client.set_json(f"stripe_subscription:{user_id}", subscription_data, ex=86400 * 30)
            
            logger.info(f"Updated subscription {subscription_id} for user {user_id} to {new_plan_name}")
            
            return {
                "subscription_id": subscription_id,
                "new_plan": new_plan_name,
                "status": updated_subscription.status,
                "proration_amount": self._calculate_proration_amount(subscription, new_plan) if prorate else 0
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe subscription update error: {e}")
            raise Exception(f"Failed to update subscription: {e.user_message}")
        except Exception as e:
            logger.error(f"Subscription update error: {e}")
            raise
    
    async def cancel_subscription(
        self, 
        user_id: int, 
        immediately: bool = False,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Cancel user's subscription
        """
        try:
            # Get current subscription
            subscription_data = await redis_client.get_json(f"stripe_subscription:{user_id}")
            if not subscription_data:
                raise ValueError("No active subscription found")
            
            subscription_id = subscription_data["subscription_id"]
            
            if immediately:
                # Cancel immediately
                subscription = stripe.Subscription.delete(subscription_id)
                status = "canceled"
                ends_at = datetime.utcnow()
            else:
                # Cancel at period end
                subscription = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True,
                    metadata={
                        "cancellation_reason": reason or "user_requested",
                        "canceled_at": datetime.utcnow().isoformat()
                    }
                )
                status = "active_until_period_end"
                ends_at = datetime.fromtimestamp(subscription.current_period_end)
            
            # Update cache
            subscription_data.update({
                "status": status,
                "canceled_at": datetime.utcnow().isoformat(),
                "ends_at": ends_at.isoformat(),
                "cancellation_reason": reason
            })
            await redis_client.set_json(f"stripe_subscription:{user_id}", subscription_data, ex=86400 * 30)
            
            logger.info(f"Canceled subscription {subscription_id} for user {user_id}, immediately: {immediately}")
            
            return {
                "subscription_id": subscription_id,
                "status": status,
                "ends_at": ends_at.isoformat(),
                "immediately": immediately
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe subscription cancellation error: {e}")
            raise Exception(f"Failed to cancel subscription: {e.user_message}")
        except Exception as e:
            logger.error(f"Subscription cancellation error: {e}")
            raise
    
    async def process_one_time_payment(
        self, 
        user_id: int, 
        amount: int, 
        currency: str,
        payment_method_id: str,
        description: str,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Process a one-time payment (e.g., for premium features, boosts)
        """
        try:
            # Get or create customer
            customer_data = await self._get_or_create_customer_data(user_id)
            customer_id = customer_data["customer_id"]
            
            # Create payment intent
            payment_intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency,
                customer=customer_id,
                payment_method=payment_method_id,
                confirmation_method="manual",
                confirm=True,
                description=description,
                metadata={
                    "apex_user_id": str(user_id),
                    "payment_type": "one_time",
                    **(metadata or {})
                }
            )
            
            # Log transaction
            await redis_client.set_json(
                f"payment_transaction:{payment_intent.id}",
                {
                    "user_id": user_id,
                    "amount": amount,
                    "currency": currency,
                    "description": description,
                    "status": payment_intent.status,
                    "created_at": datetime.utcnow().isoformat()
                },
                ex=86400 * 90  # Keep for 90 days
            )
            
            logger.info(f"Processed one-time payment {payment_intent.id} for user {user_id}, amount: {amount} {currency}")
            
            return {
                "payment_intent_id": payment_intent.id,
                "status": payment_intent.status,
                "amount": amount,
                "currency": currency,
                "client_secret": payment_intent.client_secret if payment_intent.status == "requires_action" else None
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe one-time payment error: {e}")
            raise Exception(f"Failed to process payment: {e.user_message}")
        except Exception as e:
            logger.error(f"One-time payment error: {e}")
            raise
    
    async def create_promo_code(
        self, 
        code: str, 
        discount_percent: Optional[int] = None,
        discount_amount: Optional[int] = None,
        currency: str = "usd",
        duration: str = "once",
        max_redemptions: Optional[int] = None,
        expires_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Create a new promo code
        """
        try:
            # Create coupon first
            coupon_params = {
                "id": f"coupon_{code.lower()}",
                "duration": duration,
                "name": f"ApexMatch {code} Discount"
            }
            
            if discount_percent:
                coupon_params["percent_off"] = discount_percent
            elif discount_amount:
                coupon_params["amount_off"] = discount_amount
                coupon_params["currency"] = currency
            else:
                raise ValueError("Must specify either discount_percent or discount_amount")
            
            if duration == "repeating":
                coupon_params["duration_in_months"] = 12  # Default to 12 months
            
            coupon = stripe.Coupon.create(**coupon_params)
            
            # Create promo code
            promo_code_params = {
                "coupon": coupon.id,
                "code": code,
                "active": True,
                "metadata": {
                    "created_via": "apexmatch_admin",
                    "created_at": datetime.utcnow().isoformat()
                }
            }
            
            if max_redemptions:
                promo_code_params["max_redemptions"] = max_redemptions
            
            if expires_at:
                promo_code_params["expires_at"] = int(expires_at.timestamp())
            
            promo_code = stripe.PromotionCode.create(**promo_code_params)
            
            # Cache promo code info
            await redis_client.set_json(
                f"promo_code:{code.upper()}",
                {
                    "promo_code_id": promo_code.id,
                    "coupon_id": coupon.id,
                    "discount_percent": discount_percent,
                    "discount_amount": discount_amount,
                    "currency": currency,
                    "duration": duration,
                    "max_redemptions": max_redemptions,
                    "expires_at": expires_at.isoformat() if expires_at else None,
                    "created_at": datetime.utcnow().isoformat()
                },
                ex=86400 * 365  # Cache for 1 year
            )
            
            logger.info(f"Created promo code {code} with coupon {coupon.id}")
            
            return {
                "promo_code_id": promo_code.id,
                "code": code,
                "discount_percent": discount_percent,
                "discount_amount": discount_amount,
                "duration": duration,
                "max_redemptions": max_redemptions,
                "expires_at": expires_at.isoformat() if expires_at else None
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe promo code creation error: {e}")
            raise Exception(f"Failed to create promo code: {e.user_message}")
        except Exception as e:
            logger.error(f"Promo code creation error: {e}")
            raise
    
    async def validate_promo_code(self, code: str, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Validate a promo code and return discount information
        """
        try:
            # Check cache first
            cached_promo = await redis_client.get_json(f"promo_code:{code.upper()}")
            if cached_promo:
                return {
                    "valid": True,
                    "discount_percent": cached_promo.get("discount_percent"),
                    "discount_amount": cached_promo.get("discount_amount"),
                    "currency": cached_promo.get("currency"),
                    "duration": cached_promo.get("duration"),
                    "expires_at": cached_promo.get("expires_at")
                }
            
            # Query Stripe for promo code
            promo_codes = stripe.PromotionCode.list(code=code, active=True, limit=1)
            
            if not promo_codes.data:
                return {"valid": False, "error": "Promo code not found or expired"}
            
            promo_code = promo_codes.data[0]
            coupon = promo_code.coupon
            
            # Check expiration
            if promo_code.expires_at and datetime.utcnow().timestamp() > promo_code.expires_at:
                return {"valid": False, "error": "Promo code has expired"}
            
            # Check usage limits
            if promo_code.max_redemptions and promo_code.times_redeemed >= promo_code.max_redemptions:
                return {"valid": False, "error": "Promo code usage limit reached"}
            
            # Check if user has already used this code (if user_id provided)
            if user_id:
                usage_key = f"promo_usage:{code.upper()}:{user_id}"
                if await redis_client.get(usage_key):
                    return {"valid": False, "error": "Promo code already used by this user"}
            
            return {
                "valid": True,
                "discount_percent": coupon.percent_off,
                "discount_amount": coupon.amount_off,
                "currency": coupon.currency,
                "duration": coupon.duration,
                "duration_in_months": coupon.duration_in_months,
                "times_redeemed": promo_code.times_redeemed,
                "max_redemptions": promo_code.max_redemptions,
                "expires_at": datetime.fromtimestamp(promo_code.expires_at).isoformat() if promo_code.expires_at else None
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe promo code validation error: {e}")
            return {"valid": False, "error": "Failed to validate promo code"}
        except Exception as e:
            logger.error(f"Promo code validation error: {e}")
            return {"valid": False, "error": "Validation error occurred"}
    
    async def get_subscription_status(self, user_id: int) -> Dict[str, Any]:
        """
        Get current subscription status for a user
        """
        try:
            # Check cache first
            subscription_data = await redis_client.get_json(f"stripe_subscription:{user_id}")
            if subscription_data:
                # Verify with Stripe if cache is older than 1 hour
                cache_age = datetime.utcnow() - datetime.fromisoformat(subscription_data.get("created_at", "2000-01-01"))
                if cache_age.total_seconds() < 3600:  # Less than 1 hour old
                    return self._format_subscription_status(subscription_data)
            
            # Get from Stripe
            customer_data = await redis_client.get_json(f"stripe_customer:{user_id}")
            if not customer_data:
                return {"status": "no_subscription", "plan": "free"}
            
            customer_id = customer_data["customer_id"]
            subscriptions = stripe.Subscription.list(customer=customer_id, status="all", limit=1)
            
            if not subscriptions.data:
                return {"status": "no_subscription", "plan": "free"}
            
            subscription = subscriptions.data[0]
            
            # Update cache
            subscription_cache_data = {
                "subscription_id": subscription.id,
                "customer_id": customer_id,
                "plan_name": subscription.metadata.get("plan_name", "unknown"),
                "status": subscription.status,
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "trial_end": subscription.trial_end,
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "created_at": datetime.utcnow().isoformat()
            }
            await redis_client.set_json(f"stripe_subscription:{user_id}", subscription_cache_data, ex=86400 * 30)
            
            return self._format_subscription_status(subscription_cache_data)
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe subscription status error: {e}")
            return {"status": "error", "error": str(e)}
        except Exception as e:
            logger.error(f"Subscription status error: {e}")
            return {"status": "error", "error": str(e)}
    
    async def handle_webhook(self, payload: str, sig_header: str) -> Dict[str, Any]:
        """
        Handle Stripe webhook events
        """
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, self.webhook_secret)
            
            logger.info(f"Received Stripe webhook: {event['type']}")
            
            # Handle different event types
            if event["type"] == "invoice.payment_succeeded":
                return await self._handle_payment_succeeded(event["data"]["object"])
            elif event["type"] == "invoice.payment_failed":
                return await self._handle_payment_failed(event["data"]["object"])
            elif event["type"] == "customer.subscription.created":
                return await self._handle_subscription_created(event["data"]["object"])
            elif event["type"] == "customer.subscription.updated":
                return await self._handle_subscription_updated(event["data"]["object"])
            elif event["type"] == "customer.subscription.deleted":
                return await self._handle_subscription_deleted(event["data"]["object"])
            elif event["type"] == "customer.subscription.trial_will_end":
                return await self._handle_trial_ending(event["data"]["object"])
            else:
                logger.info(f"Unhandled webhook event type: {event['type']}")
                return {"status": "ignored", "event_type": event["type"]}
            
        except ValueError as e:
            logger.error(f"Invalid webhook payload: {e}")
            raise Exception("Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {e}")
            raise Exception("Invalid signature")
        except Exception as e:
            logger.error(f"Webhook handling error: {e}")
            raise
    
    # Helper Methods
    
    async def _get_or_create_customer_data(self, user_id: int) -> Dict[str, Any]:
        """Get existing customer data or create placeholder for external creation"""
        customer_data = await redis_client.get_json(f"stripe_customer:{user_id}")
        if not customer_data:
            # This should be handled by creating customer first
            raise ValueError(f"No Stripe customer found for user {user_id}")
        return customer_data
    
    async def _create_or_get_coupon(self, promo_code: str) -> str:
        """Create or get existing coupon for promo code"""
        if promo_code not in self.promo_codes:
            raise ValueError(f"Unknown promo code: {promo_code}")
        
        promo_config = self.promo_codes[promo_code]
        coupon_id = f"coupon_{promo_code.lower()}"
        
        try:
            # Try to retrieve existing coupon
            stripe.Coupon.retrieve(coupon_id)
            return coupon_id
        except stripe.error.InvalidRequestError:
            # Create new coupon
            coupon_params = {
                "id": coupon_id,
                "duration": promo_config["duration"],
                "name": f"ApexMatch {promo_code} Discount"
            }
            
            if promo_config["type"] == "percent":
                coupon_params["percent_off"] = promo_config["discount"]
            else:
                coupon_params["amount_off"] = promo_config["discount"]
                coupon_params["currency"] = "usd"
            
            coupon = stripe.Coupon.create(**coupon_params)
            return coupon.id
    
    def _calculate_proration_amount(self, current_subscription: Any, new_plan: Dict) -> int:
        """Calculate proration amount for plan changes"""
        # Simplified proration calculation
        # In practice, Stripe handles this automatically
        current_amount = current_subscription.items.data[0].price.unit_amount
        new_amount = new_plan["price"]
        
        # Calculate remaining period
        now = datetime.utcnow().timestamp()
        period_start = current_subscription.current_period_start
        period_end = current_subscription.current_period_end
        total_period = period_end - period_start
        remaining_period = period_end - now
        
        if remaining_period <= 0:
            return 0
        
        # Calculate prorated amounts
        remaining_ratio = remaining_period / total_period
        current_unused = int(current_amount * remaining_ratio)
        new_amount_prorated = int(new_amount * remaining_ratio)
        
        return new_amount_prorated - current_unused
    
    def _format_subscription_status(self, subscription_data: Dict) -> Dict[str, Any]:
        """Format subscription data for API response"""
        return {
            "status": subscription_data.get("status", "unknown"),
            "plan": subscription_data.get("plan_name", "free"),
            "current_period_end": subscription_data.get("current_period_end"),
            "trial_end": subscription_data.get("trial_end"),
            "cancel_at_period_end": subscription_data.get("cancel_at_period_end", False),
            "features": self.subscription_plans.get(subscription_data.get("plan_name", "free"), {}).get("features", {})
        }
    
    # Webhook Event Handlers
    
    async def _handle_payment_succeeded(self, invoice: Any) -> Dict[str, Any]:
        """Handle successful payment webhook"""
        try:
            user_id = int(invoice.metadata.get("apex_user_id", 0))
            if user_id:
                # Update subscription cache
                subscription_data = await redis_client.get_json(f"stripe_subscription:{user_id}")
                if subscription_data:
                    subscription_data["last_payment_succeeded"] = datetime.utcnow().isoformat()
                    await redis_client.set_json(f"stripe_subscription:{user_id}", subscription_data, ex=86400 * 30)
                
                # Track successful payment
                await redis_client.set_json(
                    f"payment_success:{user_id}:{invoice.id}",
                    {
                        "amount": invoice.amount_paid,
                        "currency": invoice.currency,
                        "paid_at": datetime.utcnow().isoformat()
                    },
                    ex=86400 * 90
                )
                
                logger.info(f"Payment succeeded for user {user_id}, invoice {invoice.id}")
            
            return {"status": "processed", "event": "payment_succeeded"}
        except Exception as e:
            logger.error(f"Payment succeeded webhook error: {e}")
            return {"status": "error", "error": str(e)}
    
    async def _handle_payment_failed(self, invoice: Any) -> Dict[str, Any]:
        """Handle failed payment webhook"""
        try:
            user_id = int(invoice.metadata.get("apex_user_id", 0))
            if user_id:
                # Track failed payment
                await redis_client.set_json(
                    f"payment_failed:{user_id}:{invoice.id}",
                    {
                        "amount": invoice.amount_due,
                        "currency": invoice.currency,
                        "failed_at": datetime.utcnow().isoformat(),
                        "attempt_count": invoice.attempt_count
                    },
                    ex=86400 * 90
                )
                
                logger.warning(f"Payment failed for user {user_id}, invoice {invoice.id}")
            
            return {"status": "processed", "event": "payment_failed"}
        except Exception as e:
            logger.error(f"Payment failed webhook error: {e}")
            return {"status": "error", "error": str(e)}
    
    async def _handle_subscription_created(self, subscription: Any) -> Dict[str, Any]:
        """Handle subscription created webhook"""
        try:
            user_id = int(subscription.metadata.get("apex_user_id", 0))
            if user_id:
                # Cache subscription data
                subscription_data = {
                    "subscription_id": subscription.id,
                    "customer_id": subscription.customer,
                    "plan_name": subscription.metadata.get("plan_name", "unknown"),
                    "status": subscription.status,
                    "current_period_start": subscription.current_period_start,
                    "current_period_end": subscription.current_period_end,
                    "trial_end": subscription.trial_end,
                    "created_at": datetime.utcnow().isoformat()
                }
                await redis_client.set_json(f"stripe_subscription:{user_id}", subscription_data, ex=86400 * 30)
                
                logger.info(f"Subscription created for user {user_id}, subscription {subscription.id}")
            
            return {"status": "processed", "event": "subscription_created"}
        except Exception as e:
            logger.error(f"Subscription created webhook error: {e}")
            return {"status": "error", "error": str(e)}
    
    async def _handle_subscription_updated(self, subscription: Any) -> Dict[str, Any]:
        """Handle subscription updated webhook"""
        try:
            user_id = int(subscription.metadata.get("apex_user_id", 0))
            if user_id:
                # Update cached subscription data
                subscription_data = await redis_client.get_json(f"stripe_subscription:{user_id}")
                if subscription_data:
                    subscription_data.update({
                        "status": subscription.status,
                        "current_period_start": subscription.current_period_start,
                        "current_period_end": subscription.current_period_end,
                        "trial_end": subscription.trial_end,
                        "cancel_at_period_end": subscription.cancel_at_period_end,
                        "updated_at": datetime.utcnow().isoformat()
                    })
                    await redis_client.set_json(f"stripe_subscription:{user_id}", subscription_data, ex=86400 * 30)
                
                logger.info(f"Subscription updated for user {user_id}, subscription {subscription.id}")
            
            return {"status": "processed", "event": "subscription_updated"}
        except Exception as e:
            logger.error(f"Subscription updated webhook error: {e}")
            return {"status": "error", "error": str(e)}
    
    async def _handle_subscription_deleted(self, subscription: Any) -> Dict[str, Any]:
        """Handle subscription deleted webhook"""
        try:
            user_id = int(subscription.metadata.get("apex_user_id", 0))
            if user_id:
                # Update subscription status to canceled
                subscription_data = await redis_client.get_json(f"stripe_subscription:{user_id}")
                if subscription_data:
                    subscription_data.update({
                        "status": "canceled",
                        "canceled_at": datetime.utcnow().isoformat()
                    })
                    await redis_client.set_json(f"stripe_subscription:{user_id}", subscription_data, ex=86400 * 30)
                
                logger.info(f"Subscription deleted for user {user_id}, subscription {subscription.id}")
            
            return {"status": "processed", "event": "subscription_deleted"}
        except Exception as e:
            logger.error(f"Subscription deleted webhook error: {e}")
            return {"status": "error", "error": str(e)}
    
    async def _handle_trial_ending(self, subscription: Any) -> Dict[str, Any]:
        """Handle trial ending webhook"""
        try:
            user_id = int(subscription.metadata.get("apex_user_id", 0))
            if user_id:
                # Track trial ending for notifications
                await redis_client.set_json(
                    f"trial_ending:{user_id}",
                    {
                        "subscription_id": subscription.id,
                        "trial_end": subscription.trial_end,
                        "notified_at": datetime.utcnow().isoformat()
                    },
                    ex=86400 * 7  # Keep for 7 days
                )
                
                logger.info(f"Trial ending for user {user_id}, subscription {subscription.id}")
            
            return {"status": "processed", "event": "trial_ending"}
        except Exception as e:
            logger.error(f"Trial ending webhook error: {e}")
            return {"status": "error", "error": str(e)}
    
    async def health_check(self) -> Dict[str, Any]:
        """Check Stripe API health"""
        try:
            # Test API connection
            stripe.Account.retrieve()
            
            return {
                "status": "healthy",
                "api_version": self.api_version,
                "webhook_configured": bool(self.webhook_secret),
                "plans_configured": len(self.subscription_plans)
            }
        except Exception as e:
            logger.error(f"Stripe health check error: {e}")
            return {
                "status": "unhealthy",
                "error": str(e)
            }


# Global Stripe client instance
stripe_client = StripeClient()