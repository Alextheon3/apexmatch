# backend/services/trust_engine.py
"""
ApexMatch Trust Engine Service
Implements the revolutionary "Shit Matches Shit" trust scoring system
"""

from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
from enum import Enum
import numpy as np
import logging

from models.user import User, TrustTier
from models.trust import TrustScore, TrustEvent, TrustViolation, ViolationStatus
from models.conversation import Conversation, Message
from models.match import Match, MatchStatus
from clients.redis_client import redis_client
from config import settings

logger = logging.getLogger(__name__)


class TrustEventType(str, Enum):
    PROFILE_COMPLETION = "profile_completion"
    EMAIL_VERIFICATION = "email_verification"
    PHONE_VERIFICATION = "phone_verification"
    PHOTO_VERIFICATION = "photo_verification"
    CONVERSATION_QUALITY = "conversation_quality"
    RESPONSE_CONSISTENCY = "response_consistency"
    MUTUAL_MATCH = "mutual_match"
    SUCCESSFUL_REVEAL = "successful_reveal"
    POSITIVE_FEEDBACK = "positive_feedback"
    REPORT_VIOLATION = "report_violation"
    SUSPICIOUS_BEHAVIOR = "suspicious_behavior"
    ACCOUNT_AGE_MILESTONE = "account_age_milestone"


class TrustEngine:
    """
    Core trust scoring engine implementing behavioral trust analysis
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.base_trust_score = 50.0  # Starting trust score
        self.tier_thresholds = {
            TrustTier.CHALLENGED: (0, 20),
            TrustTier.BUILDING: (20, 40),
            TrustTier.RELIABLE: (40, 70),
            TrustTier.TRUSTED: (70, 90),
            TrustTier.ELITE: (90, 100)
        }
    
    async def process_trust_event(
        self, 
        user_id: int, 
        event_type: TrustEventType, 
        context: Optional[Dict] = None,
        reported_user_id: Optional[int] = None
    ) -> Dict:
        """
        Process a trust-affecting event and update user's trust score
        """
        
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return {"success": False, "error": "User not found"}
            
            # Calculate score change based on event type and context
            score_change = self._calculate_score_change(event_type, context, user)
            
            # Apply behavioral modifiers
            modified_score_change = await self._apply_behavioral_modifiers(
                user, event_type, score_change, context
            )
            
            # Create trust event record
            trust_event = TrustEvent(
                user_id=user_id,
                event_type=event_type,
                score_change=modified_score_change,
                description=self._generate_event_description(event_type, context),
                context=context or {},
                created_at=datetime.utcnow()
            )
            
            self.db.add(trust_event)
            
            # Update user's trust score
            old_score = user.trust_score or self.base_trust_score
            new_score = max(0, min(100, old_score + modified_score_change))
            user.trust_score = new_score
            
            # Check for tier changes
            old_tier = user.trust_tier
            new_tier = self._calculate_trust_tier(new_score)
            tier_changed = False
            
            if new_tier != old_tier:
                user.trust_tier = new_tier
                tier_changed = True
                
                # Log tier change
                tier_event = TrustEvent(
                    user_id=user_id,
                    event_type=TrustEventType.ACCOUNT_AGE_MILESTONE,
                    score_change=0,
                    description=f"Trust tier changed from {old_tier.value if old_tier else 'none'} to {new_tier.value}",
                    context={"tier_change": {"from": old_tier.value if old_tier else None, "to": new_tier.value}},
                    created_at=datetime.utcnow()
                )
                self.db.add(tier_event)
                
                # Apply tier change benefits/consequences
                await self._apply_tier_change_effects(user, old_tier, new_tier)
            
            # Handle violation reports
            if event_type == TrustEventType.REPORT_VIOLATION and reported_user_id:
                await self._process_violation_report(user_id, reported_user_id, context)
            
            # Update trust metrics cache
            await self._update_trust_metrics_cache(user)
            
            self.db.commit()
            
            return {
                "success": True,
                "score_change": modified_score_change,
                "new_score": new_score,
                "old_tier": old_tier.value if old_tier else None,
                "new_tier": new_tier.value,
                "tier_changed": tier_changed,
                "trust_benefits": self._get_tier_benefits(new_tier)
            }
            
        except Exception as e:
            logger.error(f"Error processing trust event: {e}")
            self.db.rollback()
            return {"success": False, "error": "Failed to process trust event"}
    
    def _calculate_score_change(
        self, 
        event_type: TrustEventType, 
        context: Optional[Dict], 
        user: User
    ) -> float:
        """Calculate base score change for event type"""
        
        # Base score changes for different events
        base_changes = {
            TrustEventType.PROFILE_COMPLETION: 5,
            TrustEventType.EMAIL_VERIFICATION: 8,
            TrustEventType.PHONE_VERIFICATION: 10,
            TrustEventType.PHOTO_VERIFICATION: 12,
            TrustEventType.CONVERSATION_QUALITY: 2,
            TrustEventType.RESPONSE_CONSISTENCY: 1,
            TrustEventType.MUTUAL_MATCH: 3,
            TrustEventType.SUCCESSFUL_REVEAL: 5,
            TrustEventType.POSITIVE_FEEDBACK: 2,
            TrustEventType.REPORT_VIOLATION: -15,
            TrustEventType.SUSPICIOUS_BEHAVIOR: -10,
            TrustEventType.ACCOUNT_AGE_MILESTONE: 5
        }
        
        base_change = base_changes.get(event_type, 0)
        
        # Apply context-based modifiers
        if context:
            if event_type == TrustEventType.CONVERSATION_QUALITY:
                quality_score = context.get("quality_score", 0.5)
                base_change = int(base_change * quality_score * 2)  # 0-4 points
            
            elif event_type == TrustEventType.POSITIVE_FEEDBACK:
                feedback_rating = context.get("feedback_rating", 3)
                base_change = max(1, int(base_change * (feedback_rating / 3)))  # 1-3 points
            
            elif event_type == TrustEventType.SUSPICIOUS_BEHAVIOR:
                severity = context.get("severity", "medium")
                multipliers = {"low": 0.5, "medium": 1.0, "high": 1.5, "severe": 2.0}
                base_change = int(base_change * multipliers.get(severity, 1.0))
        
        return base_change
    
    async def _apply_behavioral_modifiers(
        self, 
        user: User, 
        event_type: TrustEventType, 
        base_score_change: float, 
        context: Optional[Dict]
    ) -> float:
        """Apply behavioral pattern modifiers to score change"""
        
        modified_change = base_score_change
        
        # Account age modifier (newer accounts get smaller gains)
        account_age_days = (datetime.utcnow() - user.created_at).days
        if account_age_days < 7:
            age_modifier = 0.5  # 50% for very new accounts
        elif account_age_days < 30:
            age_modifier = 0.7  # 70% for new accounts
        elif account_age_days < 90:
            age_modifier = 0.9  # 90% for young accounts
        else:
            age_modifier = 1.0  # Full score for established accounts
        
        if base_score_change > 0:
            modified_change *= age_modifier
        
        # Current trust tier modifier (diminishing returns for high trust users)
        current_tier = user.trust_tier
        if current_tier and base_score_change > 0:
            tier_modifiers = {
                TrustTier.CHALLENGED: 1.2,  # Easier to gain trust when starting low
                TrustTier.BUILDING: 1.1,
                TrustTier.RELIABLE: 1.0,
                TrustTier.TRUSTED: 0.8,     # Harder to gain more trust when already high
                TrustTier.ELITE: 0.6       # Very hard to gain more when at elite level
            }
            modified_change *= tier_modifiers.get(current_tier, 1.0)
        
        # Recent behavior pattern modifier
        recent_violations = await self._get_recent_violations(user.id)
        if recent_violations > 0 and base_score_change > 0:
            # Reduce positive gains if user has recent violations
            violation_penalty = min(0.5, recent_violations * 0.2)
            modified_change *= (1.0 - violation_penalty)
        
        # Consistency bonus (users who consistently behave well get slight bonuses)
        if base_score_change > 0:
            consistency_bonus = await self._calculate_consistency_bonus(user.id)
            modified_change += consistency_bonus
        
        return round(modified_change, 1)
    
    async def _get_recent_violations(self, user_id: int) -> int:
        """Get number of recent violations for user"""
        recent_threshold = datetime.utcnow() - timedelta(days=30)
        
        return self.db.query(TrustEvent).filter(
            TrustEvent.user_id == user_id,
            TrustEvent.event_type.in_([
                TrustEventType.REPORT_VIOLATION,
                TrustEventType.SUSPICIOUS_BEHAVIOR
            ]),
            TrustEvent.created_at >= recent_threshold
        ).count()
    
    async def _calculate_consistency_bonus(self, user_id: int) -> float:
        """Calculate consistency bonus for users with good behavioral patterns"""
        
        # Get recent positive events
        recent_threshold = datetime.utcnow() - timedelta(days=14)
        
        positive_events = self.db.query(TrustEvent).filter(
            TrustEvent.user_id == user_id,
            TrustEvent.score_change > 0,
            TrustEvent.created_at >= recent_threshold
        ).count()
        
        negative_events = self.db.query(TrustEvent).filter(
            TrustEvent.user_id == user_id,
            TrustEvent.score_change < 0,
            TrustEvent.created_at >= recent_threshold
        ).count()
        
        # Bonus for consistent positive behavior
        if positive_events >= 3 and negative_events == 0:
            return 0.5  # Small consistency bonus
        elif positive_events >= 5 and negative_events <= 1:
            return 0.3
        
        return 0.0
    
    def _generate_event_description(self, event_type: TrustEventType, context: Optional[Dict]) -> str:
        """Generate human-readable description for trust event"""
        
        descriptions = {
            TrustEventType.PROFILE_COMPLETION: "Completed profile setup",
            TrustEventType.EMAIL_VERIFICATION: "Verified email address",
            TrustEventType.PHONE_VERIFICATION: "Verified phone number", 
            TrustEventType.PHOTO_VERIFICATION: "Verified profile photos",
            TrustEventType.RESPONSE_CONSISTENCY: "Demonstrated consistent response patterns",
            TrustEventType.MUTUAL_MATCH: "Created mutual connection",
            TrustEventType.SUCCESSFUL_REVEAL: "Successfully completed photo reveal",
            TrustEventType.ACCOUNT_AGE_MILESTONE: "Reached account milestone"
        }
        
        if event_type == TrustEventType.CONVERSATION_QUALITY:
            quality = context.get("quality_score", 0.5) if context else 0.5
            return f"High-quality conversation (score: {quality:.1f})"
        
        elif event_type == TrustEventType.POSITIVE_FEEDBACK:
            rating = context.get("feedback_rating", 3) if context else 3
            return f"Received positive feedback (rating: {rating}/5)"
        
        elif event_type == TrustEventType.REPORT_VIOLATION:
            violation_type = context.get("violation_type", "general") if context else "general"
            return f"Reported user for {violation_type}"
        
        elif event_type == TrustEventType.SUSPICIOUS_BEHAVIOR:
            behavior_type = context.get("behavior_type", "unknown") if context else "unknown"
            return f"Suspicious behavior detected: {behavior_type}"
        
        return descriptions.get(event_type, f"Trust event: {event_type.value}")
    
    def _calculate_trust_tier(self, score: float) -> TrustTier:
        """Calculate trust tier based on score"""
        
        for tier, (min_score, max_score) in self.tier_thresholds.items():
            if min_score <= score < max_score:
                return tier
        
        # Handle edge case for perfect score
        if score >= 100:
            return TrustTier.ELITE
        
        return TrustTier.CHALLENGED
    
    async def _apply_tier_change_effects(self, user: User, old_tier: Optional[TrustTier], new_tier: TrustTier) -> None:
        """Apply effects of tier changes (benefits/restrictions)"""
        
        # Cache new tier benefits
        benefits = self._get_tier_benefits(new_tier)
        await redis_client.set_json(
            f"trust_benefits:{user.id}",
            {"tier": new_tier.value, "benefits": benefits},
            ex=86400  # 24 hours
        )
        
        # Send tier change notification
        if old_tier and new_tier.value != old_tier.value:
            await self._send_tier_change_notification(user.id, old_tier, new_tier)
        
        # Apply matching algorithm adjustments
        await self._update_matching_tier_preferences(user.id, new_tier)
    
    def _get_tier_benefits(self, tier: TrustTier) -> List[str]:
        """Get benefits for a specific trust tier"""
        
        benefits = {
            TrustTier.CHALLENGED: [
                "Basic matching (limited)",
                "1 photo reveal request per day",
                "Basic profile features"
            ],
            TrustTier.BUILDING: [
                "Improved match quality",
                "3 photo reveal requests per day",
                "Basic conversation insights",
                "Profile verification badges"
            ],
            TrustTier.RELIABLE: [
                "High-quality matches",
                "5 photo reveal requests per day",
                "Advanced conversation insights",
                "Priority customer support",
                "Trust badge on profile"
            ],
            TrustTier.TRUSTED: [
                "Premium match algorithm",
                "10 photo reveal requests per day",
                "AI Wingman basic features",
                "Advanced trust badges",
                "Violation reporting privileges",
                "Skip moderation queues"
            ],
            TrustTier.ELITE: [
                "Elite match pool access",
                "15 photo reveal requests per day",
                "Full AI Wingman features",
                "Elite trust badge",
                "Community moderation tools",
                "Beta feature access",
                "Concierge support"
            ]
        }
        
        return benefits.get(tier, [])
    
    async def _send_tier_change_notification(self, user_id: int, old_tier: TrustTier, new_tier: TrustTier) -> None:
        """Send notification about tier change"""
        
        if self._is_tier_upgrade(old_tier, new_tier):
            # Congratulatory notification for upgrade
            notification = {
                "type": "trust_tier_upgrade",
                "title": f"Trust Tier Upgraded!",
                "message": f"Congratulations! You've advanced to {new_tier.value.title()} tier.",
                "old_tier": old_tier.value,
                "new_tier": new_tier.value,
                "new_benefits": self._get_tier_benefits(new_tier),
                "celebration": True,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            # Informational notification for downgrade
            notification = {
                "type": "trust_tier_change",
                "title": "Trust Tier Updated",
                "message": f"Your trust tier has been updated to {new_tier.value.title()}.",
                "old_tier": old_tier.value,
                "new_tier": new_tier.value,
                "guidance": "Focus on positive interactions to rebuild trust",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        await redis_client.send_user_notification(user_id, notification)
    
    def _is_tier_upgrade(self, old_tier: TrustTier, new_tier: TrustTier) -> bool:
        """Check if tier change is an upgrade"""
        
        tier_order = [
            TrustTier.CHALLENGED,
            TrustTier.BUILDING,
            TrustTier.RELIABLE,
            TrustTier.TRUSTED,
            TrustTier.ELITE
        ]
        
        try:
            old_index = tier_order.index(old_tier)
            new_index = tier_order.index(new_tier)
            return new_index > old_index
        except ValueError:
            return False
    
    async def _update_matching_tier_preferences(self, user_id: int, new_tier: TrustTier) -> None:
        """Update matching algorithm preferences based on new tier"""
        
        # Cache tier-based matching preferences
        matching_preferences = {
            "user_id": user_id,
            "trust_tier": new_tier.value,
            "compatible_tiers": self._get_compatible_tiers(new_tier),
            "matching_priority": self._get_matching_priority(new_tier),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        await redis_client.set_json(
            f"matching_tier_prefs:{user_id}",
            matching_preferences,
            ex=86400 * 7  # 7 days
        )
    
    def _get_compatible_tiers(self, user_tier: TrustTier) -> List[str]:
        """Get compatible trust tiers implementing 'shit matches shit' system"""
        
        compatibility_map = {
            TrustTier.CHALLENGED: [TrustTier.CHALLENGED, TrustTier.BUILDING],
            TrustTier.BUILDING: [TrustTier.CHALLENGED, TrustTier.BUILDING, TrustTier.RELIABLE],
            TrustTier.RELIABLE: [TrustTier.BUILDING, TrustTier.RELIABLE, TrustTier.TRUSTED],
            TrustTier.TRUSTED: [TrustTier.RELIABLE, TrustTier.TRUSTED, TrustTier.ELITE],
            TrustTier.ELITE: [TrustTier.TRUSTED, TrustTier.ELITE]
        }
        
        compatible_tiers = compatibility_map.get(user_tier, [TrustTier.RELIABLE])
        return [tier.value for tier in compatible_tiers]
    
    def _get_matching_priority(self, tier: TrustTier) -> str:
        """Get matching priority based on trust tier"""
        
        priorities = {
            TrustTier.CHALLENGED: "low",
            TrustTier.BUILDING: "normal",
            TrustTier.RELIABLE: "normal",
            TrustTier.TRUSTED: "high",
            TrustTier.ELITE: "premium"
        }
        
        return priorities.get(tier, "normal")
    
    async def _process_violation_report(self, reporter_id: int, reported_user_id: int, context: Dict) -> None:
        """Process a violation report"""
        
        try:
            # Create violation record
            violation = TrustViolation(
                reported_user_id=reported_user_id,
                reporting_user_id=reporter_id,
                violation_type=context.get("violation_type", "general"),
                description=context.get("description", ""),
                context=context,
                status=ViolationStatus.PENDING,
                created_at=datetime.utcnow()
            )
            
            self.db.add(violation)
            
            # Apply immediate penalty to reported user
            penalty_score = self._calculate_violation_penalty(context.get("violation_type", "general"))
            
            await self.process_trust_event(
                user_id=reported_user_id,
                event_type=TrustEventType.SUSPICIOUS_BEHAVIOR,
                context={
                    "violation_id": violation.id,
                    "reporter_id": reporter_id,
                    "severity": context.get("severity", "medium"),
                    "auto_penalty": penalty_score
                }
            )
            
            # Queue for moderation review
            await self._queue_for_moderation(violation)
            
        except Exception as e:
            logger.error(f"Error processing violation report: {e}")
    
    def _calculate_violation_penalty(self, violation_type: str) -> float:
        """Calculate immediate penalty for violation type"""
        
        penalties = {
            "harassment": -15,
            "inappropriate_content": -10,
            "fake_profile": -20,
            "spam": -8,
            "threats": -25,
            "scam": -30,
            "underage": -50,
            "other": -5
        }
        
        return penalties.get(violation_type, -5)
    
    async def _queue_for_moderation(self, violation: TrustViolation) -> None:
        """Queue violation for moderation review"""
        
        moderation_item = {
            "violation_id": violation.id,
            "reported_user_id": violation.reported_user_id,
            "reporting_user_id": violation.reporting_user_id,
            "violation_type": violation.violation_type,
            "description": violation.description,
            "context": violation.context,
            "created_at": violation.created_at.isoformat(),
            "priority": self._get_moderation_priority(violation.violation_type)
        }
        
        await redis_client.redis.lpush(
            "moderation_queue",
            str(moderation_item)
        )
        
        # Set expiration for moderation items (7 days)
        await redis_client.redis.expire("moderation_queue", 86400 * 7)
    
    def _get_moderation_priority(self, violation_type: str) -> str:
        """Get moderation priority based on violation type"""
        
        high_priority = ["threats", "harassment", "underage", "scam"]
        medium_priority = ["inappropriate_content", "fake_profile"]
        
        if violation_type in high_priority:
            return "high"
        elif violation_type in medium_priority:
            return "medium"
        else:
            return "low"
    
    async def _update_trust_metrics_cache(self, user: User) -> None:
        """Update cached trust metrics for user"""
        
        metrics = {
            "user_id": user.id,
            "trust_score": user.trust_score,
            "trust_tier": user.trust_tier.value if user.trust_tier else "challenged",
            "tier_benefits": self._get_tier_benefits(user.trust_tier) if user.trust_tier else [],
            "compatible_tiers": self._get_compatible_tiers(user.trust_tier) if user.trust_tier else [],
            "last_updated": datetime.utcnow().isoformat()
        }
        
        await redis_client.set_json(
            f"trust_metrics:{user.id}",
            metrics,
            ex=86400  # 24 hours
        )
    
    async def get_trust_analysis(self, user_id: int) -> Dict:
        """Get comprehensive trust analysis for user"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}
        
        # Get trust events history
        trust_events = self.db.query(TrustEvent).filter(
            TrustEvent.user_id == user_id
        ).order_by(TrustEvent.created_at.desc()).limit(50).all()
        
        # Calculate trust metrics
        positive_events = len([e for e in trust_events if e.score_change > 0])
        negative_events = len([e for e in trust_events if e.score_change < 0])
        total_events = len(trust_events)
        
        # Trust consistency
        if total_events > 0:
            consistency = (positive_events - negative_events) / total_events
        else:
            consistency = 0.5
        
        # Recent trend
        recent_events = trust_events[:10]  # Last 10 events
        if recent_events:
            recent_trend = sum(e.score_change for e in recent_events) / len(recent_events)
        else:
            recent_trend = 0
        
        # Account health
        account_age_days = (datetime.utcnow() - user.created_at).days
        health_factors = {
            "account_age": min(1.0, account_age_days / 90),  # 90 days for full maturity
            "trust_consistency": max(0, consistency),
            "recent_behavior": max(0, min(1.0, (recent_trend + 5) / 10))  # Normalize to 0-1
        }
        
        overall_health = sum(health_factors.values()) / len(health_factors)
        
        return {
            "user_id": user_id,
            "current_trust_score": user.trust_score or self.base_trust_score,
            "trust_tier": user.trust_tier.value if user.trust_tier else "challenged",
            "trust_analysis": {
                "total_events": total_events,
                "positive_events": positive_events,
                "negative_events": negative_events,
                "trust_consistency": round(consistency, 2),
                "recent_trend": round(recent_trend, 2),
                "overall_health": round(overall_health, 2)
            },
            "tier_info": {
                "current_tier": user.trust_tier.value if user.trust_tier else "challenged",
                "tier_benefits": self._get_tier_benefits(user.trust_tier) if user.trust_tier else [],
                "compatible_tiers": self._get_compatible_tiers(user.trust_tier) if user.trust_tier else [],
                "next_tier_threshold": self._get_next_tier_threshold(user.trust_score or self.base_trust_score)
            },
            "recent_events": [
                {
                    "type": event.event_type.value,
                    "score_change": event.score_change,
                    "description": event.description,
                    "created_at": event.created_at.isoformat()
                }
                for event in trust_events[:5]
            ],
            "trust_trajectory": self._calculate_trust_trajectory(trust_events),
            "improvement_suggestions": self._generate_improvement_suggestions(user, trust_events)
        }
    
    def _get_next_tier_threshold(self, current_score: float) -> Optional[Dict]:
        """Get threshold for next trust tier"""
        
        current_tier = self._calculate_trust_tier(current_score)
        
        tier_order = [
            TrustTier.CHALLENGED,
            TrustTier.BUILDING,
            TrustTier.RELIABLE,
            TrustTier.TRUSTED,
            TrustTier.ELITE
        ]
        
        try:
            current_index = tier_order.index(current_tier)
            if current_index < len(tier_order) - 1:
                next_tier = tier_order[current_index + 1]
                next_threshold = self.tier_thresholds[next_tier][0]
                
                return {
                    "next_tier": next_tier.value,
                    "threshold_score": next_threshold,
                    "points_needed": max(0, next_threshold - current_score)
                }
        except ValueError:
            pass
        
        return None
    
    def _calculate_trust_trajectory(self, trust_events: List[TrustEvent]) -> Dict:
        """Calculate trust score trajectory over time"""
        
        if len(trust_events) < 2:
            return {"trend": "insufficient_data"}
        
        # Calculate score progression
        events_by_time = sorted(trust_events, key=lambda e: e.created_at)
        
        # Take samples over time for trend analysis
        if len(events_by_time) > 10:
            sample_size = 10
            step = len(events_by_time) // sample_size
            samples = [events_by_time[i] for i in range(0, len(events_by_time), step)]
        else:
            samples = events_by_time
        
        # Calculate running score
        running_score = self.base_trust_score
        trajectory_points = []
        
        for event in samples:
            running_score += event.score_change
            trajectory_points.append({
                "score": max(0, min(100, running_score)),
                "timestamp": event.created_at.isoformat()
            })
        
        # Determine trend
        if len(trajectory_points) >= 2:
            start_score = trajectory_points[0]["score"]
            end_score = trajectory_points[-1]["score"]
            
            if end_score > start_score + 5:
                trend = "improving"
            elif end_score < start_score - 5:
                trend = "declining"
            else:
                trend = "stable"
        else:
            trend = "stable"
        
        return {
            "trend": trend,
            "trajectory_points": trajectory_points[-10:],  # Last 10 points
            "score_change": trajectory_points[-1]["score"] - trajectory_points[0]["score"] if len(trajectory_points) >= 2 else 0
        }
    
    def _generate_improvement_suggestions(self, user: User, trust_events: List[TrustEvent]) -> List[str]:
        """Generate personalized trust improvement suggestions"""
        
        suggestions = []
        current_score = user.trust_score or self.base_trust_score
        current_tier = user.trust_tier
        
        # Analyze what user is missing
        recent_event_types = [e.event_type for e in trust_events[:20]]
        
        # Verification suggestions
        if TrustEventType.EMAIL_VERIFICATION not in recent_event_types:
            suggestions.append("Verify your email address for increased trust (+8 points)")
        
        if TrustEventType.PHONE_VERIFICATION not in recent_event_types:
            suggestions.append("Verify your phone number for enhanced security (+10 points)")
        
        if TrustEventType.PHOTO_VERIFICATION not in recent_event_types:
            suggestions.append("Verify your photos to show authenticity (+12 points)")
        
        # Behavioral suggestions based on current tier
        if current_tier in [TrustTier.CHALLENGED, TrustTier.BUILDING]:
            suggestions.append("Engage in quality conversations to build trust")
            suggestions.append("Complete your profile to show commitment")
        
        elif current_tier == TrustTier.RELIABLE:
            suggestions.append("Maintain consistent response patterns")
            suggestions.append("Help others by providing positive feedback")
        
        elif current_tier == TrustTier.TRUSTED:
            suggestions.append("Report violations to help maintain community standards")
            suggestions.append("Mentor newer users through positive interactions")
        
        # Recent violations check
        recent_violations = [e for e in trust_events[:10] if e.score_change < 0]
        if recent_violations:
            suggestions.append("Focus on positive interactions to rebuild trust")
            suggestions.append("Be respectful and follow community guidelines")
        
        return suggestions[:3]  # Return top 3 suggestions
    
    async def get_community_trust_stats(self) -> Dict:
        """Get community-wide trust statistics"""
        
        # Get tier distribution
        tier_counts = {}
        for tier in TrustTier:
            count = self.db.query(User).filter(User.trust_tier == tier).count()
            tier_counts[tier.value] = count
        
        total_users = sum(tier_counts.values())
        
        # Calculate percentages
        tier_percentages = {}
        if total_users > 0:
            for tier, count in tier_counts.items():
                tier_percentages[tier] = round((count / total_users) * 100, 1)
        
        # Get average trust score
        avg_score_result = self.db.query(func.avg(User.trust_score)).filter(
            User.trust_score.isnot(None)
        ).scalar()
        avg_trust_score = round(avg_score_result, 1) if avg_score_result else self.base_trust_score
        
        # Get recent trust events count
        recent_threshold = datetime.utcnow() - timedelta(days=7)
        recent_events = self.db.query(TrustEvent).filter(
            TrustEvent.created_at >= recent_threshold
        ).count()
        
        return {
            "community_stats": {
                "total_users": total_users,
                "average_trust_score": avg_trust_score,
                "recent_trust_events": recent_events
            },
            "tier_distribution": {
                "counts": tier_counts,
                "percentages": tier_percentages
            },
            "trust_quality": {
                "high_trust_percentage": tier_percentages.get("trusted", 0) + tier_percentages.get("elite", 0),
                "community_health": self._assess_community_health(tier_percentages),
                "trust_trend": "stable"  # Would calculate from historical data
            }
        }
    
    def _assess_community_health(self, tier_percentages: Dict[str, float]) -> str:
        """Assess overall community health based on tier distribution"""
        
        high_trust = tier_percentages.get("trusted", 0) + tier_percentages.get("elite", 0)
        low_trust = tier_percentages.get("challenged", 0)
        
        if high_trust > 30 and low_trust < 20:
            return "excellent"
        elif high_trust > 20 and low_trust < 30:
            return "good"
        elif high_trust > 10 and low_trust < 40:
            return "fair"
        else:
            return "needs_improvement"