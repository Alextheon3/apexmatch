"""
ApexMatch Matchmaking Service
Core behavioral matching algorithm implementation
"""

from typing import List, Optional, Dict, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, not_
from datetime import datetime, timedelta
import random
import math

from models.user import User, SubscriptionTier
from models.bgp import BGPProfile
from models.trust import TrustProfile, TrustTier
from models.match import Match, MatchStatus, MatchPreference
from config import settings


class MatchmakingService:
    """
    Core matchmaking service implementing ApexMatch's behavioral matching algorithm
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.similarity_threshold = settings.MATCH_SIMILARITY_THRESHOLD
    
    def find_matches_for_user(self, user_id: int, max_matches: int = 1) -> List[Match]:
        """
        Find potential matches for a user based on behavioral compatibility
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.bgp_profile or not user.trust_profile:
            return []
        
        # Get user's matching preferences
        preferences = self._get_user_preferences(user_id)
        
        # Get candidate pool
        candidates = self._get_candidate_pool(user, preferences)
        
        # Calculate compatibility scores
        scored_candidates = []
        for candidate in candidates:
            compatibility = self._calculate_compatibility(user, candidate)
            if compatibility['overall_score'] >= self.similarity_threshold:
                scored_candidates.append((candidate, compatibility))
        
        # Sort by compatibility score (descending)
        scored_candidates.sort(key=lambda x: x[1]['overall_score'], reverse=True)
        
        # Create matches
        matches = []
        for candidate, compatibility in scored_candidates[:max_matches]:
            match = self._create_match(user, candidate, compatibility)
            if match:
                matches.append(match)
        
        return matches
    
    def _get_user_preferences(self, user_id: int) -> MatchPreference:
        """Get user's matching preferences or create defaults"""
        preferences = self.db.query(MatchPreference).filter(
            MatchPreference.user_id == user_id
        ).first()
        
        if not preferences:
            # Create default preferences
            preferences = MatchPreference(user_id=user_id)
            self.db.add(preferences)
            self.db.commit()
        
        return preferences
    
    def _get_candidate_pool(self, user: User, preferences: MatchPreference) -> List[User]:
        """
        Get pool of potential match candidates based on basic filters
        """
        query = self.db.query(User).join(BGPProfile).join(TrustProfile)
        
        # Exclude self
        query = query.filter(User.id != user.id)
        
        # Must be active and verified
        query = query.filter(
            User.is_active == True,
            User.is_blocked == False,
            User.deleted_at.is_(None)
        )
        
        # Must have BGP profile ready for matching
        query = query.filter(BGPProfile.data_confidence >= 0.3)
        
        # Age filters
        if preferences.min_age:
            query = query.filter(User.age >= preferences.min_age)
        if preferences.max_age:
            query = query.filter(User.age <= preferences.max_age)
        
        # Trust level filters
        if preferences.minimum_trust_score:
            query = query.filter(TrustProfile.overall_trust_score >= preferences.minimum_trust_score)
        
        if preferences.exclude_ghosters:
            query = query.filter(TrustProfile.ghosting_rate <= 0.3)
        
        # Exclude users already matched with
        existing_matches = self.db.query(Match.target_id).filter(
            Match.initiator_id == user.id,
            Match.status.notin_([MatchStatus.EXPIRED, MatchStatus.REJECTED])
        ).union(
            self.db.query(Match.initiator_id).filter(
                Match.target_id == user.id,
                Match.status.notin_([MatchStatus.EXPIRED, MatchStatus.REJECTED])
            )
        )
        query = query.filter(User.id.notin_(existing_matches))
        
        # Trust tier compatibility (implement "shit matches shit")
        user_trust_tier = user.trust_profile.trust_tier
        compatible_tiers = self._get_compatible_trust_tiers(user_trust_tier)
        query = query.filter(TrustProfile.trust_tier.in_(compatible_tiers))
        
        # Limit results for performance
        return query.limit(100).all()
    
    def _get_compatible_trust_tiers(self, user_tier: TrustTier) -> List[TrustTier]:
        """
        Get compatible trust tiers implementing "shit matches shit" system
        """
        compatibility_map = {
            TrustTier.TOXIC: [TrustTier.TOXIC, TrustTier.LOW],
            TrustTier.LOW: [TrustTier.TOXIC, TrustTier.LOW, TrustTier.STANDARD],
            TrustTier.STANDARD: [TrustTier.LOW, TrustTier.STANDARD, TrustTier.HIGH],
            TrustTier.HIGH: [TrustTier.STANDARD, TrustTier.HIGH, TrustTier.ELITE],
            TrustTier.ELITE: [TrustTier.HIGH, TrustTier.ELITE]
        }
        return compatibility_map.get(user_tier, [TrustTier.STANDARD])
    
    def _calculate_compatibility(self, user1: User, user2: User) -> Dict[str, float]:
        """
        Calculate comprehensive compatibility between two users
        """
        bgp1 = user1.bgp_profile
        bgp2 = user2.bgp_profile
        trust1 = user1.trust_profile
        trust2 = user2.trust_profile
        
        # Behavioral compatibility (from BGP)
        behavioral_score = bgp1.calculate_compatibility(bgp2)
        
        # Trust compatibility
        trust_score = self._calculate_trust_compatibility(trust1, trust2)
        
        # Lifestyle compatibility
        lifestyle_score = self._calculate_lifestyle_compatibility(user1, user2)
        
        # Communication timing compatibility
        timing_score = self._calculate_timing_compatibility(bgp1, bgp2)
        
        # Weighted overall score
        weights = {
            'behavioral': 0.50,
            'trust': 0.30,
            'lifestyle': 0.15,
            'timing': 0.05
        }
        
        overall_score = (
            behavioral_score * weights['behavioral'] +
            trust_score * weights['trust'] +
            lifestyle_score * weights['lifestyle'] +
            timing_score * weights['timing']
        )
        
        return {
            'overall_score': overall_score,
            'behavioral_score': behavioral_score,
            'trust_score': trust_score,
            'lifestyle_score': lifestyle_score,
            'timing_score': timing_score,
            'explanation': self._generate_match_explanation(user1, user2, {
                'behavioral': behavioral_score,
                'trust': trust_score,
                'lifestyle': lifestyle_score,
                'timing': timing_score
            })
        }
    
    def _calculate_trust_compatibility(self, trust1: TrustProfile, trust2: TrustProfile) -> float:
        """Calculate trust-based compatibility"""
        # Higher trust users should match with other high trust users
        # Lower trust users get matched with each other (shit matches shit)
        
        avg_trust = (trust1.overall_trust_score + trust2.overall_trust_score) / 2
        trust_diff = abs(trust1.overall_trust_score - trust2.overall_trust_score)
        
        # Prefer similar trust levels, with bonus for high trust
        similarity_score = 1.0 - trust_diff
        trust_bonus = min(0.2, avg_trust * 0.2)  # Bonus for high average trust
        
        return min(1.0, similarity_score + trust_bonus)
    
    def _calculate_lifestyle_compatibility(self, user1: User, user2: User) -> float:
        """Calculate lifestyle compatibility"""
        score = 0.0
        factors = 0
        
        # Age compatibility
        if user1.age and user2.age:
            age_diff = abs(user1.age - user2.age)
            age_score = max(0.0, 1.0 - (age_diff / 20))  # Full compatibility within 20 years
            score += age_score
            factors += 1
        
        # Location compatibility (if available)
        if user1.location and user2.location:
            # Simple same-location check (would implement distance calculation)
            location_score = 1.0 if user1.location == user2.location else 0.3
            score += location_score
            factors += 1
        
        # Subscription tier compatibility
        user1_premium = user1.is_premium()
        user2_premium = user2.is_premium()
        tier_score = 1.0 if user1_premium == user2_premium else 0.7
        score += tier_score
        factors += 1
        
        return score / factors if factors > 0 else 0.5
    
    def _calculate_timing_compatibility(self, bgp1: BGPProfile, bgp2: BGPProfile) -> float:
        """Calculate communication timing compatibility"""
        # Response speed compatibility
        speed_diff = abs(bgp1.response_speed_avg - bgp2.response_speed_avg)
        speed_score = 1.0 - speed_diff
        
        # Morning/evening person compatibility
        timing_diff = abs(bgp1.morning_evening_person - bgp2.morning_evening_person)
        timing_score = 1.0 - timing_diff
        
        # Communication consistency compatibility
        consistency_diff = abs(bgp1.response_consistency - bgp2.response_consistency)
        consistency_score = 1.0 - consistency_diff
        
        return (speed_score + timing_score + consistency_score) / 3
    
    def _generate_match_explanation(self, user1: User, user2: User, scores: Dict[str, float]) -> Dict[str, any]:
        """Generate human-readable explanation for why users were matched"""
        explanations = []
        
        # Behavioral explanations
        if scores['behavioral'] > 0.8:
            explanations.append("You have very similar behavioral patterns and emotional rhythms")
        elif scores['behavioral'] > 0.6:
            explanations.append("Your behavioral styles complement each other well")
        
        # Trust explanations
        if scores['trust'] > 0.8:
            trust1 = user1.trust_profile.trust_tier
            if trust1 in [TrustTier.HIGH, TrustTier.ELITE]:
                explanations.append("You both have demonstrated high trust and reliability")
            else:
                explanations.append("You both are working on building trust and connection skills")
        
        # Communication timing
        if scores['timing'] > 0.7:
            explanations.append("You have compatible communication styles and timing")
        
        # BGP-specific insights
        bgp1, bgp2 = user1.bgp_profile, user2.bgp_profile
        bgp_explanations = bgp1.get_compatibility_explanation(bgp2)
        explanations.extend(bgp_explanations[:2])  # Top 2 explanations
        
        return {
            'reasons': explanations,
            'overall_quality': self._get_match_quality_description(scores['overall_score']),
            'strongest_compatibility': self._get_strongest_compatibility_area(scores),
            'scores': scores
        }
    
    def _get_match_quality_description(self, score: float) -> str:
        """Get human-readable match quality description"""
        if score >= 0.9:
            return "Exceptional compatibility"
        elif score >= 0.8:
            return "Very high compatibility"
        elif score >= 0.7:
            return "High compatibility"
        elif score >= 0.6:
            return "Good compatibility"
        else:
            return "Moderate compatibility"
    
    def _get_strongest_compatibility_area(self, scores: Dict[str, float]) -> str:
        """Identify the strongest area of compatibility"""
        max_score = max(scores['behavioral'], scores['trust'], scores['lifestyle'], scores['timing'])
        
        if scores['behavioral'] == max_score:
            return "behavioral_patterns"
        elif scores['trust'] == max_score:
            return "trust_and_reliability"
        elif scores['lifestyle'] == max_score:
            return "lifestyle_alignment"
        else:
            return "communication_timing"
    
    def _create_match(self, initiator: User, target: User, compatibility: Dict[str, float]) -> Optional[Match]:
        """Create a new match between two users"""
        try:
            # Set expiration time
            expires_at = datetime.utcnow() + timedelta(hours=24)
            
            match = Match(
                initiator_id=initiator.id,
                target_id=target.id,
                compatibility_score=compatibility['behavioral_score'],
                trust_compatibility=compatibility['trust_score'],
                overall_match_quality=compatibility['overall_score'],
                match_explanation=compatibility['explanation'],
                expires_at=expires_at,
                matching_algorithm_version="1.0"
            )
            
            self.db.add(match)
            self.db.commit()
            
            # Update user match counts
            self._update_user_match_counts(initiator.id, target.id)
            
            return match
            
        except Exception as e:
            self.db.rollback()
            print(f"Error creating match: {e}")
            return None
    
    def _update_user_match_counts(self, initiator_id: int, target_id: int) -> None:
        """Update match count tracking for users"""
        # Update initiator's match count
        initiator = self.db.query(User).filter(User.id == initiator_id).first()
        if initiator:
            initiator.matches_this_period += 1
        
        # Target doesn't count against their limit since they didn't initiate
    
    def get_match_queue_for_user(self, user_id: int) -> List[Match]:
        """Get pending matches for a user"""
        return self.db.query(Match).filter(
            Match.target_id == user_id,
            Match.status == MatchStatus.PENDING,
            Match.expires_at > datetime.utcnow()
        ).order_by(Match.overall_match_quality.desc()).all()
    
    def accept_match(self, match_id: int, user_id: int) -> bool:
        """Accept a match"""
        match = self.db.query(Match).filter(Match.id == match_id).first()
        if not match or not match.is_participant(user_id):
            return False
        
        success = match.accept_match(user_id)
        if success:
            self.db.commit()
        
        return success
    
    def reject_match(self, match_id: int, user_id: int, reason: str = None) -> bool:
        """Reject a match"""
        match = self.db.query(Match).filter(Match.id == match_id).first()
        if not match or not match.is_participant(user_id):
            return False
        
        success = match.reject_match(user_id, reason)
        if success:
            self.db.commit()
        
        return success
    
    def cleanup_expired_matches(self) -> int:
        """Clean up expired matches"""
        expired_matches = self.db.query(Match).filter(
            Match.expires_at < datetime.utcnow(),
            Match.status.in_([MatchStatus.PENDING, MatchStatus.ACTIVE])
        ).all()
        
        count = 0
        for match in expired_matches:
            if match.check_expiration():
                count += 1
        
        self.db.commit()
        return count
    
    def get_match_statistics(self, user_id: int) -> Dict[str, any]:
        """Get matching statistics for a user"""
        user_matches = self.db.query(Match).filter(
            or_(Match.initiator_id == user_id, Match.target_id == user_id)
        ).all()
        
        stats = {
            'total_matches': len(user_matches),
            'active_matches': len([m for m in user_matches if m.status == MatchStatus.ACTIVE]),
            'successful_connections': len([m for m in user_matches if m.status == MatchStatus.CONNECTED]),
            'average_compatibility': 0.0,
            'reveal_rate': 0.0,
            'connection_rate': 0.0
        }
        
        if user_matches:
            stats['average_compatibility'] = sum(m.overall_match_quality for m in user_matches) / len(user_matches)
            
            revealed = [m for m in user_matches if m.status in [MatchStatus.REVEALED, MatchStatus.CONNECTED]]
            stats['reveal_rate'] = len(revealed) / len(user_matches)
            
            connected = [m for m in user_matches if m.status == MatchStatus.CONNECTED]
            stats['connection_rate'] = len(connected) / len(user_matches)
        
        return stats