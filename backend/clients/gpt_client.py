"""
ApexMatch OpenAI GPT Client
Handles AI Wingman conversation assistance and BGP analysis
"""

import openai
import asyncio
import json
import logging
import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import hashlib

logger = logging.getLogger(__name__)


class GPTClient:
    """
    OpenAI GPT client for AI Wingman and conversation analysis
    """
    
    def __init__(self):
        # Get settings from environment variables directly
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.model = os.getenv('OPENAI_MODEL', 'gpt-4o')  # Updated to latest model
        self.max_tokens = int(os.getenv('OPENAI_MAX_TOKENS', '1000'))
        self.temperature = 0.7
        
        # Initialize OpenAI client
        if self.api_key:
            self.client = openai.AsyncOpenAI(api_key=self.api_key)  # Use AsyncOpenAI
        else:
            logger.warning("OPENAI_API_KEY not found in environment variables")
            self.client = None
        
        # System prompts for different AI Wingman modes
        self.system_prompts = {
            "icebreaker": """You are an expert dating coach specializing in meaningful conversation starters. 
            Create authentic, engaging opening messages that focus on emotional connection rather than surface-level attraction.
            Consider the person's BGP (Behavioral Graph Profile) traits and interests.
            Avoid generic pickup lines. Focus on genuine curiosity and shared values.""",
            
            "deepening": """You are a relationship expert helping users deepen emotional connections.
            Analyze the conversation flow and suggest thoughtful questions or responses that encourage vulnerability and authentic sharing.
            Focus on emotional intelligence and building trust.""",
            
            "humor": """You are a witty conversation coach who helps add appropriate humor to dating conversations.
            Suggest light, intelligent humor that shows personality without being offensive or crude.
            Match the conversation tone and the other person's communication style.""",
            
            "vulnerability": """You are an emotional intelligence coach helping users share authentically.
            Suggest ways to open up and be vulnerable in healthy, appropriate ways that build connection.
            Focus on emotional safety and mutual understanding.""",
            
            "conflict_resolution": """You are a communication expert helping resolve misunderstandings in dating.
            Provide empathetic, constructive approaches to address concerns while maintaining emotional connection.
            Focus on de-escalation and understanding.""",
            
            "compatibility_insight": """You are a relationship analyst providing insights about compatibility.
            Analyze conversation patterns, communication styles, and shared values to assess relationship potential.
            Provide constructive, honest feedback about connection quality.""",
            
            "reveal_preparation": """You are a dating coach helping users prepare for photo reveals.
            Guide them through the emotional readiness process and help craft meaningful conversations before the reveal.
            Focus on building anticipation and emotional intimacy.""",
            
            "relationship_coaching": """You are a professional relationship coach providing guidance on building lasting connections.
            Offer strategic advice on relationship progression, maintaining interest, and developing deeper bonds.
            Focus on long-term relationship success."""
        }
    
    async def generate_conversation_starter(
        self, 
        user_bgp: Dict, 
        match_bgp: Dict, 
        match_interests: List[str],
        context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Generate personalized conversation starter based on BGP compatibility
        """
        try:
            # Check if API key is available
            if not self.api_key or not self.client:
                return self._get_fallback_starters()
            
            # Create cache key
            cache_key = self._create_cache_key("starter", user_bgp, match_bgp, match_interests)
            
            # Analyze compatibility for context
            compatibility_factors = self._analyze_compatibility_factors(user_bgp, match_bgp)
            
            # Create prompt
            prompt = f"""
            Create 3 conversation starters for a dating app user based on these factors:
            
            User's BGP Traits:
            - Communication Style: {user_bgp.get('communication_style', 'unknown')}
            - Emotional Depth: {user_bgp.get('emotional_depth', 'unknown')}
            - Interests: {user_bgp.get('interests', [])}
            
            Match's BGP Traits:
            - Communication Style: {match_bgp.get('communication_style', 'unknown')}
            - Emotional Depth: {match_bgp.get('emotional_depth', 'unknown')}
            - Interests: {match_interests}
            
            Compatibility Insights:
            {compatibility_factors}
            
            Additional Context: {context or {}}
            
            Requirements:
            1. Each starter should be 20-40 words
            2. Focus on shared interests or complementary traits
            3. Encourage meaningful dialogue
            4. Avoid generic pickup lines
            5. Show genuine curiosity
            
            Return response as JSON with this structure:
            {{
                "starters": [
                    {{"text": "starter message", "reasoning": "why this works", "confidence": 0.8}},
                    {{"text": "starter message", "reasoning": "why this works", "confidence": 0.9}},
                    {{"text": "starter message", "reasoning": "why this works", "confidence": 0.7}}
                ],
                "compatibility_notes": "brief analysis of why these users might connect"
            }}
            """
            
            response = await self._make_gpt_request(
                system_prompt=self.system_prompts["icebreaker"],
                user_prompt=prompt,
                temperature=0.8
            )
            
            # Parse and validate response
            result = self._parse_json_response(response)
            if not result or "starters" not in result:
                return self._get_fallback_starters()
            
            # Add metadata
            result["generated_at"] = datetime.utcnow().isoformat()
            result["model_used"] = self.model
            result["suggestion_type"] = "conversation_starter"
            
            return result
            
        except Exception as e:
            logger.error(f"Conversation starter generation error: {e}")
            return self._get_fallback_starters()
    
    def _get_fallback_starters(self) -> Dict[str, Any]:
        """Get fallback conversation starters when AI is unavailable"""
        return {
            "starters": [
                {"text": "I noticed we both enjoy similar things. What's something you're passionate about lately?", "reasoning": "Shows interest in shared passions", "confidence": 0.6},
                {"text": "Your profile caught my attention. What's been the highlight of your week?", "reasoning": "Open-ended question about recent positive experiences", "confidence": 0.5},
                {"text": "I'd love to know more about you. What's something that always makes you smile?", "reasoning": "Focuses on positive emotions and personal connection", "confidence": 0.5}
            ],
            "compatibility_notes": "Using general conversation starters",
            "fallback": True
        }
    
    async def analyze_conversation_emotion(
        self, 
        messages: List[Dict], 
        user_id: int, 
        match_id: int
    ) -> Dict[str, Any]:
        """
        Analyze emotional content and connection level in conversation
        """
        try:
            if not self.api_key or not self.client:
                return self._get_fallback_emotion_analysis()
            
            # Format conversation for analysis
            conversation_text = self._format_conversation(messages)
            
            prompt = f"""
            Analyze this dating app conversation for emotional connection and provide insights:
            
            Conversation:
            {conversation_text}
            
            Analyze for:
            1. Emotional depth and vulnerability
            2. Mutual interest and engagement
            3. Communication compatibility
            4. Red flags or concerns
            5. Connection progression
            6. Readiness for photo reveal (70% emotional connection threshold)
            
            Return JSON:
            {{
                "emotional_connection_score": 0.0-1.0,
                "engagement_level": "low|medium|high",
                "emotional_depth": "surface|moderate|deep",
                "mutual_interest": true/false,
                "red_flags": ["concern1", "concern2"],
                "positive_indicators": ["indicator1", "indicator2"],
                "reveal_readiness": {{"ready": true/false, "percentage": 0-100, "missing_elements": []}},
                "conversation_insights": "detailed analysis",
                "next_step_suggestions": ["suggestion1", "suggestion2"]
            }}
            """
            
            response = await self._make_gpt_request(
                system_prompt="You are an expert relationship psychologist analyzing dating conversations for emotional connection and compatibility.",
                user_prompt=prompt,
                temperature=0.3
            )
            
            result = self._parse_json_response(response)
            if not result:
                return self._get_fallback_emotion_analysis()
            
            result["analyzed_at"] = datetime.utcnow().isoformat()
            result["message_count"] = len(messages)
            
            return result
            
        except Exception as e:
            logger.error(f"Conversation emotion analysis error: {e}")
            return self._get_fallback_emotion_analysis()
    
    def _get_fallback_emotion_analysis(self) -> Dict[str, Any]:
        """Get fallback emotion analysis when AI is unavailable"""
        return {
            "emotional_connection_score": 0.3,
            "engagement_level": "medium",
            "emotional_depth": "moderate",
            "mutual_interest": True,
            "red_flags": [],
            "positive_indicators": ["Active conversation"],
            "reveal_readiness": {"ready": False, "percentage": 30, "missing_elements": ["More emotional depth needed"]},
            "conversation_insights": "Basic conversation analysis available",
            "next_step_suggestions": ["Continue building emotional connection"],
            "fallback": True
        }
    
    # Helper Methods
    
    async def _make_gpt_request(
        self, 
        system_prompt: str, 
        user_prompt: str, 
        temperature: float = None,
        retries: int = 3
    ) -> str:
        """Make request to OpenAI GPT API with retry logic"""
        for attempt in range(retries):
            try:
                if not self.api_key or not self.client:
                    raise ValueError("OpenAI API key not available")
                
                temp = temperature if temperature is not None else self.temperature
                
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_tokens=self.max_tokens,
                    temperature=temp,
                    timeout=30
                )
                
                return response.choices[0].message.content.strip()
                
            except openai.RateLimitError as e:
                logger.warning(f"Rate limit hit, attempt {attempt + 1}: {e}")
                if attempt < retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise
            except Exception as e:
                logger.error(f"OpenAI API request error on attempt {attempt + 1}: {e}")
                if attempt < retries - 1:
                    await asyncio.sleep(1)
                else:
                    raise
    
    def _parse_json_response(self, response: str) -> Optional[Dict]:
        """Parse JSON response from GPT"""
        try:
            # Sometimes GPT wraps JSON in markdown code blocks
            if response.startswith("```json"):
                response = response.replace("```json", "").replace("```", "").strip()
            elif response.startswith("```"):
                # Handle generic code blocks
                lines = response.split('\n')
                response = '\n'.join(lines[1:-1]) if len(lines) > 2 else response
            
            return json.loads(response)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e}, Response: {response}")
            return None
    
    def _create_cache_key(self, operation: str, *args) -> str:
        """Create consistent cache key for AI responses"""
        key_data = f"{operation}:{json.dumps(args, sort_keys=True, default=str)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def _analyze_compatibility_factors(self, user_bgp: Dict, match_bgp: Dict) -> str:
        """Analyze BGP compatibility for context"""
        factors = []
        
        # Communication style compatibility
        user_comm = user_bgp.get('communication_style', 'unknown')
        match_comm = match_bgp.get('communication_style', 'unknown')
        if user_comm != 'unknown' and match_comm != 'unknown':
            factors.append(f"Communication styles: {user_comm} + {match_comm}")
        
        # Emotional depth compatibility
        user_emotion = user_bgp.get('emotional_depth', 'unknown')
        match_emotion = match_bgp.get('emotional_depth', 'unknown')
        if user_emotion != 'unknown' and match_emotion != 'unknown':
            factors.append(f"Emotional depth: {user_emotion} + {match_emotion}")
        
        # Shared interests
        user_interests = set(user_bgp.get('interests', []))
        match_interests = set(match_bgp.get('interests', []))
        shared = user_interests.intersection(match_interests)
        if shared:
            factors.append(f"Shared interests: {', '.join(shared)}")
        
        return "; ".join(factors) if factors else "Limited compatibility data available"
    
    def _format_conversation(self, messages: List[Dict]) -> str:
        """Format conversation messages for analysis"""
        formatted = []
        for msg in messages[-10:]:  # Last 10 messages
            sender = "User" if msg.get('is_sender') else "Match"
            timestamp = msg.get('created_at', 'unknown')
            content = msg.get('content', '')
            formatted.append(f"{sender} ({timestamp}): {content}")
        
        return "\n".join(formatted)
    
    async def health_check(self) -> Dict[str, Any]:
        """Check OpenAI API health"""
        try:
            if not self.api_key or not self.client:
                return {
                    "status": "unavailable",
                    "error": "API key not configured",
                    "model": self.model
                }
            
            # Make a simple test request
            test_response = await self._make_gpt_request(
                system_prompt="You are a helpful assistant.",
                user_prompt="Respond with exactly: 'API_HEALTHY'",
                temperature=0
            )
            
            return {
                "status": "healthy" if "API_HEALTHY" in test_response else "degraded",
                "model": self.model,
                "max_tokens": self.max_tokens,
                "response_received": True
            }
        except Exception as e:
            logger.error(f"OpenAI health check error: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "model": self.model
            }


# Lazy initialization - only create client when needed
_gpt_client_instance = None

def get_gpt_client() -> GPTClient:
    """Get GPT client instance (lazy loading)"""
    global _gpt_client_instance
    if _gpt_client_instance is None:
        _gpt_client_instance = GPTClient()
    return _gpt_client_instance

# For backward compatibility
gpt_client = get_gpt_client()