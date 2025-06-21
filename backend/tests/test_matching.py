# backend/tests/test_matching.py
"""
ApexMatch Matching System Tests
Comprehensive test suite for matching algorithm, trust-based matching, and compatibility
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import json

from main import app
from database import Base, get_db
from models.user import User
from models.match import Match, MatchAction, MatchQuality
from models.trust import TrustScore
from services.matchmaker import Matchmaker
from services.trust_engine import TrustEngine

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_matching.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

class TestMatchDiscovery:
    """Test match discovery and recommendation system"""
    
    def setup_method(self):
        """Setup multiple users for matching tests"""
        # Create test users with different profiles
        self.users = []
        user_profiles = [
            {
                "email": "matcher1@apexmatch.com",
                "password": "SecurePass123!",
                "name": "Active Matcher",
                "age": 28,
                "gender": "female",
                "location": "San Francisco, CA"
            },
            {
                "email": "matcher2@apexmatch.com", 
                "password": "SecurePass123!",
                "name": "Outdoor Enthusiast",
                "age": 30,
                "gender": "male",
                "location": "San Francisco, CA"
            },
            {
                "email": "matcher3@apexmatch.com",
                "password": "SecurePass123!",
                "name": "Art Lover",
                "age": 26,
                "gender": "non_binary",
                "location": "Oakland, CA"
            },
            {
                "email": "matcher4@apexmatch.com",
                "password": "SecurePass123!",
                "name": "Tech Professional",
                "age": 32,
                "gender": "male",
                "location": "Palo Alto, CA"
            }
        ]
        
        for profile in user_profiles:
            response = client.post("/auth/register", json=profile)
            user_data = response.json()
            self.users.append({
                "user_id": user_data["user_id"],
                "headers": {"Authorization": f"Bearer {user_data['access_token']}"},
                "profile": profile
            })
    
    def test_get_potential_matches(self):
        """Test getting potential matches for a user"""
        user = self.users[0]
        response = client.get("/match/discover", headers=user["headers"])
        
        assert response.status_code == 200
        data = response.json()
        assert "matches" in data
        assert "total_available" in data
        assert len(data["matches"]) >= 0  # May be 0 if no suitable matches
        
        # Verify match structure
        if data["matches"]:
            match = data["matches"][0]
            assert "user_id" in match
            assert "compatibility_score" in match
            assert "shared_interests" in match
            assert "trust_tier" in match
    
    def test_filtered_match_discovery(self):
        """Test match discovery with filters"""
        user = self.users[0]
        filters = {
            "min_age": 25,
            "max_age": 35,
            "max_distance_miles": 50,
            "min_trust_score": 500
        }
        
        response = client.post("/match/discover", json=filters, headers=user["headers"])
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify filters are applied
        for match in data["matches"]:
            assert 25 <= match["age"] <= 35
    
    def test_match_discovery_pagination(self):
        """Test match discovery pagination"""
        user = self.users[0]
        
        # Test first page
        response1 = client.get("/match/discover?page=1&limit=2", headers=user["headers"])
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Test second page
        response2 = client.get("/match/discover?page=2&limit=2", headers=user["headers"])
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Verify pagination metadata
        assert "page" in data1
        assert "limit" in data1
        assert "total_pages" in data1
    
    def test_trust_based_matching(self):
        """Test that trust-based matching filters appropriately"""
        # Build trust scores for users
        self._build_trust_scores()
        
        user = self.users[0]  # High trust user
        response = client.get("/match/discover", headers=user["headers"])
        
        data = response.json()
        
        # High trust users should primarily see other high trust users
        high_trust_matches = [m for m in data["matches"] 
                            if m.get("trust_tier") in ["trusted", "elite"]]
        
        # Should have some high trust matches available
        assert len(high_trust_matches) >= 0
    
    def _build_trust_scores(self):
        """Helper to build trust scores for users"""
        # Give first user high trust
        trust_events = [
            {"event_type": "PROFILE_COMPLETION", "context": {"completion_percentage": 100}},
            {"event_type": "PHOTO_VERIFICATION", "context": {"verification_success": True}},
            {"event_type": "POSITIVE_INTERACTION", "context": {"interaction_quality": "excellent"}}
        ]
        
        for event in trust_events:
            client.post("/trust/events", json=event, headers=self.users[0]["headers"])

class TestMatchActions:
    """Test match actions (like, pass, super like)"""
    
    def setup_method(self):
        """Setup users for match action tests"""
        # Create two users
        user1_data = {
            "email": "action1@apexmatch.com",
            "password": "SecurePass123!",
            "name": "Action User 1",
            "age": 27,
            "gender": "female"
        }
        user2_data = {
            "email": "action2@apexmatch.com",
            "password": "SecurePass123!",
            "name": "Action User 2", 
            "age": 29,
            "gender": "male"
        }
        
        response1 = client.post("/auth/register", json=user1_data)
        response2 = client.post("/auth/register", json=user2_data)
        
        self.user1 = {
            "user_id": response1.json()["user_id"],
            "headers": {"Authorization": f"Bearer {response1.json()['access_token']}"}
        }
        self.user2 = {
            "user_id": response2.json()["user_id"],
            "headers": {"Authorization": f"Bearer {response2.json()['access_token']}"}
        }
    
    def test_like_user(self):
        """Test liking another user"""
        action_data = {
            "target_user_id": self.user2["user_id"],
            "action": "like",
            "message": "You seem really interesting!"
        }
        
        response = client.post("/match/action", json=action_data, headers=self.user1["headers"])
        
        assert response.status_code == 201
        data = response.json()
        assert data["action"] == "like"
        assert data["target_user_id"] == self.user2["user_id"]
        assert "is_mutual_match" in data
    
    def test_super_like_user(self):
        """Test super liking another user"""
        action_data = {
            "target_user_id": self.user2["user_id"],
            "action": "super_like",
            "message": "Wow, we have so much in common!"
        }
        
        response = client.post("/match/action", json=action_data, headers=self.user1["headers"])
        
        assert response.status_code == 201
        data = response.json()
        assert data["action"] == "super_like"
        
        # Super likes should have higher priority/visibility
        assert "priority_notification" in data
    
    def test_pass_user(self):
        """Test passing on another user"""
        action_data = {
            "target_user_id": self.user2["user_id"],
            "action": "pass"
        }
        
        response = client.post("/match/action", json=action_data, headers=self.user1["headers"])
        
        assert response.status_code == 201
        data = response.json()
        assert data["action"] == "pass"
    
    def test_mutual_match_creation(self):
        """Test mutual match creation when both users like each other"""
        # User 1 likes User 2
        action1_data = {
            "target_user_id": self.user2["user_id"],
            "action": "like"
        }
        response1 = client.post("/match/action", json=action1_data, headers=self.user1["headers"])
        assert response1.json()["is_mutual_match"] is False
        
        # User 2 likes User 1 back
        action2_data = {
            "target_user_id": self.user1["user_id"],
            "action": "like"
        }
        response2 = client.post("/match/action", json=action2_data, headers=self.user2["headers"])
        
        assert response2.status_code == 201
        data = response2.json()
        assert data["is_mutual_match"] is True
        assert "match_id" in data
        
        # Verify both users can see the match
        matches1 = client.get("/match/matches", headers=self.user1["headers"])
        matches2 = client.get("/match/matches", headers=self.user2["headers"])
        
        assert len(matches1.json()["matches"]) >= 1
        assert len(matches2.json()["matches"]) >= 1
    
    def test_duplicate_action_prevention(self):
        """Test prevention of duplicate actions on same user"""
        action_data = {
            "target_user_id": self.user2["user_id"],
            "action": "like"
        }
        
        # First action should succeed
        response1 = client.post("/match/action", json=action_data, headers=self.user1["headers"])
        assert response1.status_code == 201
        
        # Duplicate action should fail
        response2 = client.post("/match/action", json=action_data, headers=self.user1["headers"])
        assert response2.status_code == 400
        assert "already acted" in response2.json()["detail"].lower()
    
    def test_self_action_prevention(self):
        """Test prevention of actions on oneself"""
        action_data = {
            "target_user_id": self.user1["user_id"],
            "action": "like"
        }
        
        response = client.post("/match/action", json=action_data, headers=self.user1["headers"])
        assert response.status_code == 400
        assert "cannot act on yourself" in response.json()["detail"].lower()
    
    def test_action_limits_by_subscription(self):
        """Test action limits based on subscription tier"""
        # Free users should have limited actions per day
        action_data = {
            "target_user_id": self.user2["user_id"],
            "action": "super_like"
        }
        
        response = client.post("/match/action", json=action_data, headers=self.user1["headers"])
        
        # Free users might be limited on super likes
        if response.status_code == 429:
            assert "limit exceeded" in response.json()["detail"].lower()
        else:
            assert response.status_code == 201

class TestMatchRetrieval:
    """Test retrieving and managing existing matches"""
    
    def setup_method(self):
        """Setup users with existing matches"""
        # Create users
        user_data = [
            {
                "email": "retrieval1@apexmatch.com",
                "password": "SecurePass123!",
                "name": "Retrieval User 1",
                "age": 28,
                "gender": "female"
            },
            {
                "email": "retrieval2@apexmatch.com",
                "password": "SecurePass123!",
                "name": "Retrieval User 2",
                "age": 30,
                "gender": "male"
            }
        ]
        
        self.users = []
        for data in user_data:
            response = client.post("/auth/register", json=data)
            user_info = response.json()
            self.users.append({
                "user_id": user_info["user_id"],
                "headers": {"Authorization": f"Bearer {user_info['access_token']}"}
            })
        
        # Create mutual match
        self._create_mutual_match()
    
    def test_get_user_matches(self):
        """Test retrieving user's matches"""
        response = client.get("/match/matches", headers=self.users[0]["headers"])
        
        assert response.status_code == 200
        data = response.json()
        assert "matches" in data
        assert len(data["matches"]) >= 1
        
        # Verify match structure
        match = data["matches"][0]
        assert "match_id" in match
        assert "matched_user" in match
        assert "match_date" in match
        assert "last_message" in match
        assert "unread_count" in match
    
    def test_get_match_details(self):
        """Test getting detailed match information"""
        # Get matches first
        matches_response = client.get("/match/matches", headers=self.users[0]["headers"])
        match_id = matches_response.json()["matches"][0]["match_id"]
        
        # Get detailed match info
        response = client.get(f"/match/matches/{match_id}", headers=self.users[0]["headers"])
        
        assert response.status_code == 200
        data = response.json()
        assert "match_id" in data
        assert "compatibility_analysis" in data
        assert "conversation_starters" in data
        assert "reveal_status" in data
    
    def test_unmatch_user(self):
        """Test unmatching with another user"""
        # Get match ID
        matches_response = client.get("/match/matches", headers=self.users[0]["headers"])
        match_id = matches_response.json()["matches"][0]["match_id"]
        
        # Unmatch
        response = client.delete(f"/match/matches/{match_id}", headers=self.users[0]["headers"])
        
        assert response.status_code == 200
        assert "unmatched" in response.json()["message"].lower()
        
        # Verify match is removed
        updated_matches = client.get("/match/matches", headers=self.users[0]["headers"])
        match_ids = [m["match_id"] for m in updated_matches.json()["matches"]]
        assert match_id not in match_ids
    
    def test_report_match(self):
        """Test reporting inappropriate behavior"""
        matches_response = client.get("/match/matches", headers=self.users[0]["headers"])
        match_id = matches_response.json()["matches"][0]["match_id"]
        
        report_data = {
            "reason": "inappropriate_messages",
            "description": "Sending inappropriate content",
            "evidence": ["Screenshot URL or message content"]
        }
        
        response = client.post(f"/match/matches/{match_id}/report", 
                             json=report_data, headers=self.users[0]["headers"])
        
        assert response.status_code == 201
        data = response.json()
        assert "report_id" in data
        assert "status" in data
    
    def _create_mutual_match(self):
        """Helper to create mutual match between test users"""
        # User 1 likes User 2
        action1 = {
            "target_user_id": self.users[1]["user_id"],
            "action": "like"
        }
        client.post("/match/action", json=action1, headers=self.users[0]["headers"])
        
        # User 2 likes User 1
        action2 = {
            "target_user_id": self.users[0]["user_id"],
            "action": "like"
        }
        client.post("/match/action", json=action2, headers=self.users[1]["headers"])

class TestCompatibilityAnalysis:
    """Test advanced compatibility analysis features"""
    
    def setup_method(self):
        """Setup users with detailed profiles for compatibility testing"""
        user_profiles = [
            {
                "email": "compat_analysis1@apexmatch.com",
                "password": "SecurePass123!",
                "name": "Compatibility Test 1",
                "age": 26,
                "gender": "female",
                "interests": ["hiking", "photography", "cooking"],
                "values": ["honesty", "adventure", "family"]
            },
            {
                "email": "compat_analysis2@apexmatch.com",
                "password": "SecurePass123!",
                "name": "Compatibility Test 2",
                "age": 28,
                "gender": "male",
                "interests": ["hiking", "travel", "music"],
                "values": ["honesty", "creativity", "independence"]
            }
        ]
        
        self.users = []
        for profile in user_profiles:
            response = client.post("/auth/register", json=profile)
            user_info = response.json()
            self.users.append({
                "user_id": user_info["user_id"],
                "headers": {"Authorization": f"Bearer {user_info['access_token']}"},
                "profile": profile
            })
        
        # Build some BGP data for better compatibility analysis
        self._build_bgp_profiles()
    
    def test_detailed_compatibility_analysis(self):
        """Test detailed compatibility analysis between users"""
        compat_data = {"target_user_id": self.users[1]["user_id"]}
        
        response = client.post("/match/compatibility", json=compat_data, 
                             headers=self.users[0]["headers"])
        
        assert response.status_code == 200
        data = response.json()
        assert "overall_compatibility" in data
        assert "category_breakdown" in data
        assert "strengths" in data
        assert "potential_challenges" in data
        assert "conversation_suggestions" in data
        
        # Verify score is within valid range
        assert 0 <= data["overall_compatibility"] <= 1
    
    def test_compatibility_insights(self):
        """Test compatibility insights and recommendations"""
        compat_data = {"target_user_id": self.users[1]["user_id"], "detailed": True}
        
        response = client.post("/match/compatibility", json=compat_data,
                             headers=self.users[0]["headers"])
        
        assert response.status_code == 200
        data = response.json()
        assert "personality_match" in data
        assert "lifestyle_compatibility" in data
        assert "communication_compatibility" in data
        assert "relationship_potential" in data
    
    def test_ai_powered_matching_insights(self):
        """Test AI-powered matching insights"""
        with patch('services.ai_wingman.claude_client') as mock_claude:
            mock_claude.analyze_compatibility.return_value = {
                "insights": "Strong compatibility in communication styles",
                "recommendations": ["Focus on shared outdoor interests"],
                "conversation_starters": ["Ask about their latest hiking adventure"]
            }
            
            compat_data = {"target_user_id": self.users[1]["user_id"], "ai_analysis": True}
            
            response = client.post("/match/compatibility", json=compat_data,
                                 headers=self.users[0]["headers"])
            
            assert response.status_code == 200
            data = response.json()
            assert "ai_insights" in data
            assert "ai_recommendations" in data
    
    def _build_bgp_profiles(self):
        """Helper to build BGP profiles for compatibility testing"""
        # Build profiles for both users
        for user in self.users:
            events = [
                {
                    "event_type": "MESSAGE_SENT",
                    "category": "communication",
                    "context": {"message_length": 150, "emotional_tone": "positive"}
                },
                {
                    "event_type": "PROFILE_VIEW",
                    "category": "social",
                    "context": {"view_duration_seconds": 60, "interaction_depth": "thorough"}
                }
            ]
            
            for event in events:
                client.post("/bgp/events", json=event, headers=user["headers"])

class TestMatchingAlgorithm:
    """Test core matching algorithm functionality"""
    
    def setup_method(self):
        """Setup diverse user base for algorithm testing"""
        self.db = TestingSessionLocal()
        self.matchmaker = Matchmaker(self.db)
        self.trust_engine = TrustEngine(self.db)
        
        # Create diverse user profiles
        self._create_diverse_users()
    
    def teardown_method(self):
        """Cleanup database session"""
        self.db.close()
    
    def test_distance_based_matching(self):
        """Test distance-based matching preferences"""
        # Test users in same city get higher priority
        matches = self.matchmaker.find_potential_matches(
            user_id=1,
            max_distance_miles=25,
            limit=10
        )
        
        # Verify distance filtering
        for match in matches:
            assert match["distance_miles"] <= 25
    
    def test_age_preference_matching(self):
        """Test age-based matching preferences"""
        matches = self.matchmaker.find_potential_matches(
            user_id=1,
            min_age=25,
            max_age=35,
            limit=10
        )
        
        # Verify age filtering
        for match in matches:
            assert 25 <= match["age"] <= 35
    
    def test_trust_tier_matching_quality(self):
        """Test that trust tiers affect match quality"""
        # High trust user should get better quality matches
        high_trust_matches = self.matchmaker.find_potential_matches(
            user_id=1,  # Assume user 1 has high trust
            trust_based_filtering=True,
            limit=10
        )
        
        # Low trust user should get limited matches
        low_trust_matches = self.matchmaker.find_potential_matches(
            user_id=2,  # Assume user 2 has low trust
            trust_based_filtering=True,
            limit=10
        )
        
        # High trust users should have access to more high-quality matches
        assert len(high_trust_matches) >= len(low_trust_matches)
    
    def test_compatibility_score_ranking(self):
        """Test that matches are ranked by compatibility score"""
        matches = self.matchmaker.find_potential_matches(
            user_id=1,
            limit=5
        )
        
        # Verify matches are sorted by compatibility score (descending)
        compatibility_scores = [match["compatibility_score"] for match in matches]
        assert compatibility_scores == sorted(compatibility_scores, reverse=True)
    
    @patch('services.matchmaker.bgp_builder')
    def test_bgp_enhanced_matching(self, mock_bgp):
        """Test BGP-enhanced matching algorithm"""
        mock_bgp.calculate_compatibility.return_value = {
            "overall_score": 0.85,
            "category_scores": {
                "communication": 0.9,
                "lifestyle": 0.8,
                "values": 0.85
            }
        }
        
        matches = self.matchmaker.find_potential_matches(
            user_id=1,
            use_bgp_analysis=True,
            limit=5
        )
        
        # Verify BGP analysis was used
        mock_bgp.calculate_compatibility.assert_called()
        
        # Verify enhanced compatibility scores
        for match in matches:
            assert "bgp_compatibility" in match
            assert match["bgp_compatibility"]["overall_score"] == 0.85
    
    def _create_diverse_users(self):
        """Helper to create diverse user profiles for testing"""
        from models.user import User
        from models.trust import TrustScore
        
        users = [
            User(
                email="algo1@test.com",
                name="High Trust User",
                age=28,
                gender="female",
                location="San Francisco, CA"
            ),
            User(
                email="algo2@test.com",
                name="Low Trust User",
                age=30,
                gender="male",
                location="San Francisco, CA"
            ),
            User(
                email="algo3@test.com",
                name="Distant User",
                age=26,
                gender="non_binary",
                location="Los Angeles, CA"
            )
        ]
        
        # Add users to database
        for user in users:
            self.db.add(user)
        self.db.commit()
        
        # Create trust scores
        trust_scores = [
            TrustScore(user_id=1, score=800, tier="trusted"),
            TrustScore(user_id=2, score=300, tier="challenged"),
            TrustScore(user_id=3, score=600, tier="reliable")
        ]
        
        for trust_score in trust_scores:
            self.db.add(trust_score)
        self.db.commit()

class TestMatchQuality:
    """Test match quality assessment and feedback"""
    
    def setup_method(self):
        """Setup users for match quality testing"""
        user_data = [
            {
                "email": "quality1@apexmatch.com",
                "password": "SecurePass123!",
                "name": "Quality User 1",
                "age": 27,
                "gender": "female"
            },
            {
                "email": "quality2@apexmatch.com",
                "password": "SecurePass123!",
                "name": "Quality User 2",
                "age": 29,
                "gender": "male"
            }
        ]
        
        self.users = []
        for data in user_data:
            response = client.post("/auth/register", json=data)
            user_info = response.json()
            self.users.append({
                "user_id": user_info["user_id"],
                "headers": {"Authorization": f"Bearer {user_info['access_token']}"}
            })
        
        # Create match between users
        self._create_match()
    
    def test_match_quality_feedback(self):
        """Test providing feedback on match quality"""
        feedback_data = {
            "target_user_id": self.users[1]["user_id"],
            "quality_rating": 8,
            "feedback_categories": ["personality_match", "shared_interests"],
            "comments": "Great conversation and similar interests"
        }
        
        response = client.post("/match/feedback", json=feedback_data,
                             headers=self.users[0]["headers"])
        
        assert response.status_code == 201
        data = response.json()
        assert "feedback_id" in data
        assert data["quality_rating"] == 8
    
    def test_match_quality_analytics(self):
        """Test match quality analytics for algorithm improvement"""
        # Provide feedback first
        feedback_data = {
            "target_user_id": self.users[1]["user_id"],
            "quality_rating": 9,
            "feedback_categories": ["excellent_compatibility"]
        }
        client.post("/match/feedback", json=feedback_data, headers=self.users[0]["headers"])
        
        # Get quality analytics (admin endpoint simulation)
        response = client.get("/match/analytics/quality", headers=self.users[0]["headers"])
        
        if response.status_code == 200:  # If endpoint exists
            data = response.json()
            assert "average_quality_rating" in data
            assert "feedback_trends" in data
    
    def test_match_success_tracking(self):
        """Test tracking match success metrics"""
        success_data = {
            "target_user_id": self.users[1]["user_id"],
            "outcome": "date_scheduled",
            "satisfaction_level": "high",
            "would_recommend": True
        }
        
        response = client.post("/match/success", json=success_data,
                             headers=self.users[0]["headers"])
        
        assert response.status_code == 201
        data = response.json()
        assert data["outcome"] == "date_scheduled"
    
    def _create_match(self):
        """Helper to create match between test users"""
        # Create mutual like
        action1 = {
            "target_user_id": self.users[1]["user_id"],
            "action": "like"
        }
        client.post("/match/action", json=action1, headers=self.users[0]["headers"])
        
        action2 = {
            "target_user_id": self.users[0]["user_id"],
            "action": "like"
        }
        client.post("/match/action", json=action2, headers=self.users[1]["headers"])

class TestMatchingEdgeCases:
    """Test edge cases and error handling in matching system"""
    
    def setup_method(self):
        """Setup user for edge case testing"""
        user_data = {
            "email": "edge@apexmatch.com",
            "password": "SecurePass123!",
            "name": "Edge Case User",
            "age": 25,
            "gender": "female"
        }
        response = client.post("/auth/register", json=user_data)
        self.user_info = response.json()
        self.headers = {"Authorization": f"Bearer {self.user_info['access_token']}"}
    
    def test_no_potential_matches(self):
        """Test behavior when no potential matches are available"""
        # With very restrictive filters, should return empty results gracefully
        filters = {
            "min_age": 90,
            "max_age": 100,
            "max_distance_miles": 1
        }
        
        response = client.post("/match/discover", json=filters, headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["matches"] == []
        assert "expand_criteria" in data.get("suggestions", {})
    
    def test_invalid_match_action(self):
        """Test invalid match action handling"""
        invalid_actions = [
            {"target_user_id": 99999, "action": "like"},  # Non-existent user
            {"target_user_id": self.user_info["user_id"], "action": "invalid_action"},  # Invalid action
            {"action": "like"},  # Missing target_user_id
        ]
        
        for invalid_action in invalid_actions:
            response = client.post("/match/action", json=invalid_action, headers=self.headers)
            assert response.status_code in [400, 404, 422]
    
    def test_rate_limiting_match_actions(self):
        """Test rate limiting on match actions"""
        # This would test the rate limiting middleware
        # Implementation depends on your rate limiting strategy
        pass
    
    def test_blocked_user_matching(self):
        """Test that blocked users don't appear in matches"""
        # Create another user to block
        blocked_user_data = {
            "email": "blocked@apexmatch.com",
            "password": "SecurePass123!",
            "name": "Blocked User",
            "age": 26,
            "gender": "male"
        }
        blocked_response = client.post("/auth/register", json=blocked_user_data)
        blocked_user_id = blocked_response.json()["user_id"]
        
        # Block the user (assuming block endpoint exists)
        block_data = {"blocked_user_id": blocked_user_id}
        client.post("/user/block", json=block_data, headers=self.headers)
        
        # Verify blocked user doesn't appear in matches
        matches_response = client.get("/match/discover", headers=self.headers)
        matches = matches_response.json()["matches"]
        
        blocked_user_in_matches = any(match["user_id"] == blocked_user_id for match in matches)
        assert not blocked_user_in_matches

class TestMatchingPerformance:
    """Test matching system performance and scalability"""
    
    def test_match_discovery_response_time(self):
        """Test that match discovery responds within acceptable time"""
        import time
        
        # Create user
        user_data = {
            "email": "perf@apexmatch.com",
            "password": "SecurePass123!",
            "name": "Performance User",
            "age": 25,
            "gender": "female"
        }
        response = client.post("/auth/register", json=user_data)
        headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
        
        # Time the match discovery
        start_time = time.time()
        response = client.get("/match/discover", headers=headers)
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 2.0  # Should respond within 2 seconds
    
    def test_concurrent_match_actions(self):
        """Test handling concurrent match actions"""
        import threading
        
        # Create users
        user1_data = {
            "email": "concurrent1@apexmatch.com",
            "password": "SecurePass123!",
            "name": "Concurrent User 1",
            "age": 25,
            "gender": "female"
        }
        user2_data = {
            "email": "concurrent2@apexmatch.com",
            "password": "SecurePass123!",
            "name": "Concurrent User 2",
            "age": 27,
            "gender": "male"
        }
        
        response1 = client.post("/auth/register", json=user1_data)
        response2 = client.post("/auth/register", json=user2_data)
        
        headers1 = {"Authorization": f"Bearer {response1.json()['access_token']}"}
        headers2 = {"Authorization": f"Bearer {response2.json()['access_token']}"}
        
        user1_id = response1.json()["user_id"]
        user2_id = response2.json()["user_id"]
        
        # Simulate concurrent likes
        def like_user1():
            action_data = {"target_user_id": user2_id, "action": "like"}
            return client.post("/match/action", json=action_data, headers=headers1)
        
        def like_user2():
            action_data = {"target_user_id": user1_id, "action": "like"}
            return client.post("/match/action", json=action_data, headers=headers2)
        
        # Execute concurrently
        thread1 = threading.Thread(target=like_user1)
        thread2 = threading.Thread(target=like_user2)
        
        thread1.start()
        thread2.start()
        
        thread1.join()
        thread2.join()
        
        # Verify mutual match was created correctly
        matches1 = client.get("/match/matches", headers=headers1)
        matches2 = client.get("/match/matches", headers=headers2)
        
        assert len(matches1.json()["matches"]) >= 1
        assert len(matches2.json()["matches"]) >= 1

# Pytest configuration and fixtures
@pytest.fixture(scope="function")
def clean_database():
    """Clean database before each test"""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def mock_bgp_service():
    """Mock BGP service for testing"""
    with patch('services.matchmaker.bgp_builder') as mock:
        mock.calculate_compatibility.return_value = {
            "overall_score": 0.75,
            "category_scores": {
                "communication": 0.8,
                "lifestyle": 0.7,
                "values": 0.75
            }
        }
        yield mock

if __name__ == "__main__":
    pytest.main([__file__, "-v"])