"""
ApexMatch AI Wingman Service
Generates personalized conversation starters based on behavioral compatibility
"""

from typing import Dict, List, Optional
from sqlalchemy.orm import Session
import openai
from datetime import datetime
import json

from models.user import User
from models.match import Match
from models.bgp import BGPProfile
from clients.gpt_client import GPTClient
from clients.redis_client import RedisClient
from config import settings


class AIWingmanService:
    """
    AI service that analyzes behavioral compatibility and generates
    personalized conversation starters for matches
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.gpt_client = GPTClient()
        self.redis_client = RedisClient()
        self.cache_ttl = 3600  # 1 hour cache
    
    async def generate_introduction(self, match_id: int, requesting_user_id: int) -> Dict[str, str]:
        """
        Generate personalized AI introduction for a match
        """
        # Get match and users
        match = self.db.query(Match).filter(Match.id == match_id).first()
        if not match or not match.is_participant(requesting_user_id):
            raise ValueError("Invalid match or user")
        
        # Check if user can use AI Wingman
        requesting_user = self.db.query(User).filter(User.id == requesting_user_id).first()
        if not requesting_user.can_use_ai_wingman():
            raise ValueError("AI Wingman usage limit reached")
        
        # Check if already used for this match
        if not match.can_use_ai_wingman(requesting_user_id):
            raise ValueError("AI Wingman already used for this match")
        
        # Get other user
        other_user_id = match.get_other_user_id(requesting_user_id)
        other_user = self.db.query(User).filter(User.id == other_user_id).first()
        
        # Check cache first
        cache_key = f"ai_wingman:{match_id}:{requesting_user_id}"
        cached_response = await self.redis_client.get(cache_key)
        if cached_response:
            return json.loads(cached_response)
        
        # Generate introduction
        introduction_data = await self._create_behavioral_introduction(
            requesting_user, other_user, match
        )
        
        # Cache the response
        await self.redis_client.set(
            cache_key, 
            json.dumps(introduction_data), 
            ex=self.cache_ttl
        )
        
        # Record usage
        match.record_ai_wingman_usage(introduction_data['introduction'])
        requesting_user.ai_wingman_uses_today += 1
        self.db.commit()
        
        return introduction_data
    
    async def _create_behavioral_introduction(
        self, 
        user1: User, 
        user2: User, 
        match: Match
    ) -> Dict[str, str]:
        """
        Create behavioral introduction using GPT analysis
        """
        # Gather behavioral data
        bgp1 = user1.bgp_profile
        bgp2 = user2.bgp_profile
        
        # Create behavioral summary for AI
        behavioral_summary = self._create_behavioral_summary(bgp1, bgp2, match)
        
        # Generate introduction using GPT
        prompt = self._create_introduction_prompt(behavioral_summary, user1.first_name, user2.first_name)
        
        try:
            response = await self.gpt_client.generate_completion(
                prompt=prompt,
                max_tokens=150,
                temperature=0.7
            )
            
            introduction_text = response.strip()
            
            # Generate conversation starters
            starters = await self._generate_conversation_starters(behavioral_summary)
            
            return {
                'introduction': introduction_text,
                'conversation_starters': starters,
                'compatibility_highlights': self._get_compatibility_highlights(bgp1, bgp2),
                'behavioral_insights': self._get_behavioral_insights(bgp1, bgp2)
            }
            
        except Exception as e:
            # Fallback to template-based introduction
            return self._create_fallback_introduction(user1, user2, match)
    
    def _create_behavioral_summary(self, bgp1: BGPProfile, bgp2: BGPProfile, match: Match) -> Dict:
        """Create summary of behavioral compatibility for AI"""
        
        compatibility_explanation = match.match_explanation or {}
        reasons = compatibility_explanation.get('reasons', [])
        
        return {
            'compatibility_score': match.compatibility_score,
            'trust_compatibility': match.trust_compatibility,
            'compatibility_reasons': reasons,
            'user1_traits': {
                'communication_style': self._describe_communication_style(bgp1),
                'emotional_style': self._describe_emotional_style(bgp1),
                'decision_style': self._describe_decision_style(bgp1),
                'social_energy': self._describe_social_energy(bgp1)
            },
            'user2_traits': {
                'communication_style': self._describe_communication_style(bgp2),
                'emotional_style': self._describe_emotional_style(bgp2),
                'decision_style': self._describe_decision_style(bgp2),
                'social_energy': self._describe_social_energy(bgp2)
            },
            'shared_patterns': self._identify_shared_patterns(bgp1, bgp2),
            'complementary_traits': self._identify_complementary_traits(bgp1, bgp2)
        }
    
    def _describe_communication_style(self, bgp: BGPProfile) -> str:
        """Describe communication style"""
        if bgp.response_speed_avg > 0.7:
            speed = "quick responder"
        elif bgp.response_speed_avg < 0.3:
            speed = "thoughtful responder"
        else:
            speed = "balanced responder"
        
        if bgp.conversation_depth_pref > 0.7:
            depth = "loves deep conversations"
        elif bgp.conversation_depth_pref < 0.3:
            depth = "prefers lighter topics"
        else:
            depth = "enjoys varied conversation depths"
        
        return f"{speed} who {depth}"
    
    def _describe_emotional_style(self, bgp: BGPProfile) -> str:
        """Describe emotional style"""
        if bgp.vulnerability_comfort > 0.7:
            return "emotionally open and expressive"
        elif bgp.vulnerability_comfort < 0.3:
            return "more private, opens up gradually"
        else:
            return "balanced emotional expression"
    
    def _describe_decision_style(self, bgp: BGPProfile) -> str:
        """Describe decision making style"""
        if bgp.decision_making_speed > 0.7:
            return "decisive and intuitive"
        elif bgp.decision_making_speed < 0.3:
            return "careful and deliberate"
        else:
            return "balanced decision maker"
    
    def _describe_social_energy(self, bgp: BGPProfile) -> str:
        """Describe social energy"""
        if bgp.social_battery > 0.7:
            return "socially energetic"
        elif bgp.social_battery < 0.3:
            return "values quiet time"
        else:
            return "socially balanced"
    
    def _identify_shared_patterns(self, bgp1: BGPProfile, bgp2: BGPProfile) -> List[str]:
        """Identify shared behavioral patterns"""
        shared = []
        
        # Communication patterns
        if abs(bgp1.response_speed_avg - bgp2.response_speed_avg) < 0.2:
            shared.append("similar communication pacing")
        
        if abs(bgp1.conversation_depth_pref - bgp2.conversation_depth_pref) < 0.2:
            shared.append("compatible conversation styles")
        
        # Emotional patterns
        if abs(bgp1.vulnerability_comfort - bgp2.vulnerability_comfort) < 0.2:
            shared.append("similar emotional openness")
        
        # Decision patterns
        if abs(bgp1.decision_making_speed - bgp2.decision_making_speed) < 0.2:
            shared.append("compatible decision-making styles")
        
        return shared[:3]  # Top 3 shared patterns
    
    def _identify_complementary_traits(self, bgp1: BGPProfile, bgp2: BGPProfile) -> List[str]:
        """Identify complementary traits"""
        complementary = []
        
        # Complementary decision making
        if abs(bgp1.decision_making_speed - bgp2.decision_making_speed) > 0.6:
            complementary.append("complementary decision-making styles")
        
        # Complementary social energy
        if abs(bgp1.social_battery - bgp2.social_battery) > 0.5:
            complementary.append("balanced social energies")
        
        return complementary[:2]  # Top 2 complementary traits
    
    def _create_introduction_prompt(self, behavioral_summary: Dict, name1: str, name2: str) -> str:
        """Create prompt for GPT introduction generation"""
        
        return f"""
You are ApexMatch's AI Wingman. Create a warm, insightful introduction for {name1} and {name2} who have been matched based on behavioral compatibility.

Behavioral Analysis:
- Compatibility Score: {behavioral_summary['compatibility_score']:.1f}/1.0
- {name1}'s style: {behavioral_summary['user1_traits']['communication_style']}, {behavioral_summary['user1_traits']['emotional_style']}
- {name2}'s style: {behavioral_summary['user2_traits']['communication_style']}, {behavioral_summary['user2_traits']['emotional_style']}
- Shared patterns: {', '.join(behavioral_summary['shared_patterns'])}
- Why they matched: {', '.join(behavioral_summary['compatibility_reasons'][:2])}

Create a personalized introduction that:
1. Highlights their behavioral connection (2-3 specific points)
2. Suggests why they might connect well
3. Ends with an encouraging, warm note
4. Keep it under 100 words
5. Be natural and conversational, not overly formal

Focus on behavioral patterns, not physical appearance. Make it feel like insight from a wise friend.
"""
    
    async def _generate_conversation_starters(self, behavioral_summary: Dict) -> List[str]:
        """Generate personalized conversation starters"""
        
        prompt = f"""
Based on these behavioral patterns, suggest 3 conversation starters:

Shared traits: {', '.join(behavioral_summary['shared_patterns'])}
Compatibility reasons: {', '.join(behavioral_summary['compatibility_reasons'][:2])}

Create conversation starters that:
1. Connect to their behavioral compatibility
2. Are engaging but not too personal initially
3. Allow both people to share comfortably
4. Are specific, not generic

Format as a simple list.
"""
        
        try:
            response = await self.gpt_client.generate_completion(
                prompt=prompt,
                max_tokens=100,
                temperature=0.8
            )
            
            # Parse response into list
            starters = [line.strip() for line in response.split('\n') if line.strip()]
            return starters[:3]
            
        except Exception:
            # Fallback starters
            return [
                "What's something that made you smile today?",
                "If you could learn any skill instantly, what would it be?",
                "What's your ideal way to spend a weekend?"
            ]
    
    def _get_compatibility_highlights(self, bgp1: BGPProfile, bgp2: BGPProfile) -> List[str]:
        """Get key compatibility highlights"""
        return bgp1.get_compatibility_explanation(bgp2)[:3]
    
    def _get_behavioral_insights(self, bgp1: BGPProfile, bgp2: BGPProfile) -> Dict[str, str]:
        """Get behavioral insights for both users"""
        return {
            'user1_insights': bgp1.get_personality_insights(),
            'user2_insights': bgp2.get_personality_insights(),
            'compatibility_strength': self._get_strongest_compatibility_area(bgp1, bgp2)
        }
    
    def _get_strongest_compatibility_area(self, bgp1: BGPProfile, bgp2: BGPProfile) -> str:
        """Identify strongest area of compatibility"""
        
        # Calculate compatibility in different areas
        comm_compat = 1.0 - abs(bgp1.conversation_depth_pref - bgp2.conversation_depth_pref)
        emotional_compat = 1.0 - abs(bgp1.vulnerability_comfort - bgp2.vulnerability_comfort)
        trust_compat = 1.0 - abs(bgp1.attachment_security - bgp2.attachment_security)
        decision_compat = 1.0 - abs(bgp1.decision_making_speed - bgp2.decision_making_speed)
        
        strongest = max([
            (comm_compat, "communication styles"),
            (emotional_compat, "emotional expression"),
            (trust_compat, "trust patterns"),
            (decision_compat, "decision making")
        ])
        
        return strongest[1]
    
    def _create_fallback_introduction(self, user1: User, user2: User, match: Match) -> Dict[str, str]:
        """Create fallback introduction when AI fails"""
        
        compatibility_score = match.compatibility_score
        
        if compatibility_score > 0.8:
            intro = f"You and {user2.first_name} have exceptional behavioral compatibility! You both share similar emotional rhythms and communication styles. This could be the start of something really meaningful."
        elif compatibility_score > 0.6:
            intro = f"You and {user2.first_name} have great behavioral alignment. Your conversation and emotional styles complement each other well. There's genuine potential here!"
        else:
            intro = f"You and {user2.first_name} have an interesting dynamic. Your different approaches could balance each other beautifully. Sometimes the best connections come from unexpected compatibility."
        
        return {
            'introduction': intro,
            'conversation_starters': [
                "What's something that made you smile today?",
                "If you could have dinner with anyone, who would it be?",
                "What's a small thing that brings you joy?"
            ],
            'compatibility_highlights': ["Behavioral compatibility", "Emotional rhythm alignment"],
            'behavioral_insights': {"compatibility_strength": "overall_connection"}
        }
    
    async def rate_wingman_introduction(self, match_id: int, user_id: int, rating: float) -> bool:
        """Rate the AI Wingman introduction quality"""
        
        match = self.db.query(Match).filter(Match.id == match_id).first()
        if not match:
            return False
        
        success = match.rate_ai_wingman(user_id, rating)
        if success:
            self.db.commit()
            
            # Store rating for AI improvement
            await self._store_wingman_feedback(match_id, user_id, rating)
        
        return success
    
    async def _store_wingman_feedback(self, match_id: int, user_id: int, rating: float) -> None:
        """Store wingman feedback for model improvement"""
        
        feedback_key = f"wingman_feedback:{match_id}:{user_id}"
        feedback_data = {
            'rating': rating,
            'timestamp': datetime.utcnow().isoformat(),
            'match_id': match_id,
            'user_id': user_id
        }
        
        await self.redis_client.set(
            feedback_key,
            json.dumps(feedback_data),
            ex=86400 * 30  # Store for 30 days
        )