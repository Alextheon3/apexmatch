"""
ApexMatch Claude AI Client
Handles advanced conversation analysis and relationship coaching
"""

import anthropic
import asyncio
import json
import logging
import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import hashlib
import time

logger = logging.getLogger(__name__)


class ClaudeClient:
    """
    Anthropic Claude client for advanced AI Wingman features
    """
    
    def __init__(self):
        # Get settings from environment variables directly
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        self.model = os.getenv('ANTHROPIC_MODEL', 'claude-3-5-sonnet-20241022')  # Updated model
        self.max_tokens = int(os.getenv('ANTHROPIC_MAX_TOKENS', '1000'))
        self.temperature = 0.7
        
        # Initialize Anthropic client
        if self.api_key:
            self.client = anthropic.AsyncAnthropic(api_key=self.api_key)  # Use AsyncAnthropic
        else:
            logger.warning("ANTHROPIC_API_KEY not found in environment variables")
            self.client = None
    
    async def analyze_relationship_compatibility(
        self, 
        user1_profile: Dict, 
        user2_profile: Dict,
        conversation_history: List[Dict]
    ) -> Dict[str, Any]:
        """
        Deep relationship compatibility analysis
        """
        try:
            if not self.client:
                return self._get_fallback_compatibility_analysis()
            
            # Format conversation for analysis
            conversation_text = self._format_conversation(conversation_history)
            
            prompt = f"""
            Analyze the deep relationship compatibility between these two dating app users:
            
            User 1 Profile:
            {json.dumps(user1_profile, indent=2)}
            
            User 2 Profile:
            {json.dumps(user2_profile, indent=2)}
            
            Conversation History:
            {conversation_text}
            
            Provide a comprehensive compatibility analysis covering:
            1. Core values alignment
            2. Communication style compatibility
            3. Emotional intelligence match
            4. Long-term relationship potential
            5. Areas of potential conflict
            6. Growth opportunities together
            
            Return detailed JSON analysis:
            {{
                "overall_compatibility": 0.0-1.0,
                "compatibility_breakdown": {{
                    "values": 0.0-1.0,
                    "communication": 0.0-1.0,
                    "emotional": 0.0-1.0,
                    "lifestyle": 0.0-1.0,
                    "long_term": 0.0-1.0
                }},
                "strengths": ["strength1", "strength2"],
                "challenges": ["challenge1", "challenge2"],
                "recommendations": ["recommendation1", "recommendation2"],
                "relationship_insights": "detailed analysis"
            }}
            """
            
            response = await self._make_claude_request(prompt)
            result = self._parse_json_response(response)
            
            if not result:
                return self._get_fallback_compatibility_analysis()
            
            result["analyzed_at"] = datetime.utcnow().isoformat()
            result["model_used"] = self.model
            
            return result
            
        except Exception as e:
            logger.error(f"Compatibility analysis error: {e}")
            return self._get_fallback_compatibility_analysis()
    
    def _get_fallback_compatibility_analysis(self) -> Dict[str, Any]:
        """Get fallback compatibility analysis when AI is unavailable"""
        return {
            "overall_compatibility": 0.6,
            "compatibility_breakdown": {
                "values": 0.6,
                "communication": 0.6,
                "emotional": 0.6,
                "lifestyle": 0.6,
                "long_term": 0.6
            },
            "strengths": ["Active communication", "Mutual interest"],
            "challenges": ["Need more emotional depth"],
            "recommendations": ["Continue building trust", "Share more personal stories"],
            "relationship_insights": "Basic compatibility analysis available",
            "fallback": True
        }
    
    async def generate_conversation_advice(
        self,
        conversation_context: List[Dict],
        user_personality: Dict,
        goal: str = "deepen_connection"
    ) -> Dict[str, Any]:
        """
        Generate advanced conversation advice
        """
        try:
            if not self.client:
                return self._get_fallback_conversation_advice()
            
            context_text = self._format_conversation(conversation_context)
            
            prompt = f"""
            As an expert relationship coach, provide advanced conversation advice:
            
            Current Conversation:
            {context_text}
            
            User Personality Profile:
            {json.dumps(user_personality, indent=2)}
            
            Goal: {goal}
            
            Provide sophisticated conversation guidance:
            1. Conversation flow analysis
            2. Emotional undertones assessment
            3. Strategic response suggestions
            4. Relationship progression advice
            
            Return JSON:
            {{
                "conversation_analysis": "detailed analysis of current conversation state",
                "emotional_temperature": 0.0-1.0,
                "recommended_responses": [
                    {{"text": "response", "strategy": "why this works", "emotional_impact": "expected result"}},
                    {{"text": "response", "strategy": "why this works", "emotional_impact": "expected result"}}
                ],
                "progression_advice": "how to move the relationship forward",
                "caution_areas": ["potential issues to avoid"],
                "confidence_score": 0.0-1.0
            }}
            """
            
            response = await self._make_claude_request(prompt)
            result = self._parse_json_response(response)
            
            if not result:
                return self._get_fallback_conversation_advice()
            
            result["generated_at"] = datetime.utcnow().isoformat()
            result["advice_type"] = goal
            
            return result
            
        except Exception as e:
            logger.error(f"Conversation advice error: {e}")
            return self._get_fallback_conversation_advice()
    
    def _get_fallback_conversation_advice(self) -> Dict[str, Any]:
        """Get fallback conversation advice when AI is unavailable"""
        return {
            "conversation_analysis": "Basic conversation analysis available",
            "emotional_temperature": 0.5,
            "recommended_responses": [
                {"text": "That's really interesting! Tell me more about that.", "strategy": "Show genuine interest", "emotional_impact": "Positive engagement"},
                {"text": "I can relate to that feeling. How did you handle it?", "strategy": "Build emotional connection", "emotional_impact": "Increased intimacy"}
            ],
            "progression_advice": "Continue building emotional connection through active listening",
            "caution_areas": ["Avoid being too personal too quickly"],
            "confidence_score": 0.5,
            "fallback": True
        }
    
    async def _make_claude_request(self, prompt: str, retries: int = 3) -> str:
        """Make request to Claude API with retry logic"""
        for attempt in range(retries):
            try:
                if not self.client:
                    raise ValueError("Claude client not available")
                
                message = await self.client.messages.create(
                    model=self.model,
                    max_tokens=self.max_tokens,
                    temperature=self.temperature,
                    messages=[
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                )
                
                return message.content[0].text if message.content else ""
                
            except anthropic.RateLimitError as e:
                logger.warning(f"Rate limit hit, attempt {attempt + 1}: {e}")
                if attempt < retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise
            except Exception as e:
                logger.error(f"Claude API request error on attempt {attempt + 1}: {e}")
                if attempt < retries - 1:
                    await asyncio.sleep(1)
                else:
                    raise
    
    def _parse_json_response(self, response: str) -> Optional[Dict]:
        """Parse JSON response from Claude"""
        try:
            # Sometimes Claude wraps JSON in markdown code blocks
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
        """Check Claude API health"""
        try:
            if not self.client:
                return {
                    "status": "unavailable",
                    "error": "API key not configured",
                    "model": self.model
                }
            
            # Make a simple test request
            test_response = await self._make_claude_request("Respond with exactly: 'API_HEALTHY'")
            
            return {
                "status": "healthy" if "API_HEALTHY" in test_response else "degraded",
                "model": self.model,
                "max_tokens": self.max_tokens,
                "response_received": True
            }
        except Exception as e:
            logger.error(f"Claude health check error: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "model": self.model
            }


# Lazy initialization - only create client when needed
_claude_client_instance = None

def get_claude_client() -> ClaudeClient:
    """Get Claude client instance (lazy loading)"""
    global _claude_client_instance
    if _claude_client_instance is None:
        _claude_client_instance = ClaudeClient()
    return _claude_client_instance

# For backward compatibility
claude_client = get_claude_client()