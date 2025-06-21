# backend/tests/test_bgp.py
"""
ApexMatch BGP (Behavioral Graph Profiling) Tests
Comprehensive test suite for behavioral profiling, personality analysis, and compatibility
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
from models.bgp import BGPProfile, BGPEvent, BGPTrait
from services.bgp_builder import BGPBuilder
from schemas.bgp_schema import BGPEventType, BGPCategory

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_bgp.db"
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

class TestBGPProfileCreation:
    """Test BGP profile creation and initialization"""
    
    def setup_method(self):
        """Setup test user and BGP service"""
        # Create test user
        user_data = {
            "email": "bgp@apexmatch.com",
            "password": "SecurePass123!",
            "name": "BGP Test User",
            "age": 28,
            "gender": "female"
        }
        response = client.post("/auth/register", json=user_data)
        self.tokens = response.json()
        self.headers = {"Authorization": f"Bearer {self.tokens['access_token']}"}
        self.user_id = self.tokens["user_id"]
        
        # Initialize BGP service
        db = TestingSessionLocal()
        self.bgp_service = BGPBuilder(db)
        db.close()
    
    def test_initial_bgp_profile_creation(self):
        """Test that BGP profile is created on user registration"""
        response = client.get("/bgp/profile", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == self.user_id
        assert data["maturity_level"] == "initial"
        assert data["total_events"] == 0
        assert len(data["traits"]) == 22  # All 22 BGP traits initialized
    
    def test_bgp_trait_initialization(self):
        """Test that all BGP traits are properly initialized"""
        response = client.get("/bgp/traits", headers=self.headers)
        
        assert response.status_code == 200
        traits = response.json()
        
        expected_traits = [
            "openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism",
            "emotional_intelligence", "empathy", "humor_style", "communication_style",
            "conflict_resolution", "attachment_style", "love_language", "intimacy_comfort",
            "commitment_readiness", "lifestyle_compatibility", "social_preferences",
            "adventure_seeking", "cultural_interests", "family_values", "career_ambition",
            "financial_compatibility", "health_wellness"
        ]
        
        trait_names = [trait["trait_name"] for trait in traits]
        for expected_trait in expected_traits:
            assert expected_trait in trait_names
        
        # Check initial values
        for trait in traits:
            assert 0 <= trait["value"] <= 1
            assert trait["confidence"] <= 0.1  # Low confidence initially

class TestBGPEventLogging:
    """Test BGP event logging and trait updates"""
    
    def setup_method(self):
        """Setup authenticated user"""
        user_data = {
            "email": "bgp_events@apexmatch.com",
            "password": "SecurePass123!",
            "name": "BGP Events Test",
            "age": 30,
            "gender": "male"
        }
        response = client.post("/auth/register", json=user_data)
        self.tokens = response.json()
        self.headers = {"Authorization": f"Bearer {self.tokens['access_token']}"}
        self.user_id = self.tokens["user_id"]
    
    def test_log_message_sent_event(self):
        """Test logging message sent event"""
        event_data = {
            "event_type": "MESSAGE_SENT",
            "category": "communication",
            "context": {
                "message_length": 150,
                "emotional_tone": "positive",
                "contains_questions": True,
                "response_time_minutes": 5
            }
        }
        
        response = client.post("/bgp/events", json=event_data, headers=self.headers)
        
        assert response.status_code == 201
        data = response.json()
        assert data["event_type"] == "MESSAGE_SENT"
        assert data["category"] == "communication"
        assert "traits_updated" in data
    
    def test_log_profile_view_event(self):
        """Test logging profile view event"""
        event_data = {
            "event_type": "PROFILE_VIEW",
            "category": "social",
            "context": {
                "view_duration_seconds": 45,
                "sections_viewed": ["photos", "bio", "interests"],
                "interaction_depth": "thorough"
            }
        }
        
        response = client.post("/bgp/events", json=event_data, headers=self.headers)
        
        assert response.status_code == 201
        data = response.json()
        assert data["traits_updated"] > 0
    
    def test_log_date_completion_event(self):
        """Test logging date completion event"""
        event_data = {
            "event_type": "DATE_COMPLETED",
            "category": "relationship",
            "context": {
                "date_duration_hours": 3,
                "satisfaction_rating": 8,
                "follow_up_interest": True,
                "conversation_quality": "excellent",
                "chemistry_level": "high"
            }
        }
        
        response = client.post("/bgp/events", json=event_data, headers=self.headers)
        
        assert response.status_code == 201
        data = response.json()
        assert data["traits_updated"] >= 3  # Should update multiple traits
    
    def test_invalid_event_data(self):
        """Test logging with invalid event data"""
        invalid_events = [
            {"event_type": "INVALID_TYPE"},  # Invalid type
            {"category": "communication"},   # Missing event_type
            {                               # Missing required fields
                "context": {"some": "data"}
            }
        ]
        
        for invalid_event in invalid_events:
            response = client.post("/bgp/events", json=invalid_event, headers=self.headers)
            assert response.status_code == 422

class TestBGPTraitUpdates:
    """Test BGP trait value updates and learning"""
    
    def setup_method(self):
        """Setup user with some BGP history"""
        user_data = {
            "email": "bgp_traits@apexmatch.com",
            "password": "SecurePass123!",
            "name": "BGP Traits Test",
            "age": 25,
            "gender": "non_binary"
        }
        response = client.post("/auth/register", json=user_data)
        self.tokens = response.json()
        self.headers = {"Authorization": f"Bearer {self.tokens['access_token']}"}
        self.user_id = self.tokens["user_id"]
    
    def test_communication_trait_learning(self):
        """Test communication traits update based on messaging behavior"""
        # Log multiple communication events
        events = [
            {
                "event_type": "MESSAGE_SENT",
                "category": "communication",
                "context": {
                    "message_length": 200,
                    "emotional_tone": "enthusiastic",
                    "contains_questions": True,
                    "response_time_minutes": 2
                }
            },
            {
                "event_type": "MESSAGE_SENT", 
                "category": "communication",
                "context": {
                    "message_length": 180,
                    "emotional_tone": "warm",
                    "contains_questions": True,
                    "response_time_minutes": 1
                }
            },
            {
                "event_type": "MESSAGE_SENT",
                "category": "communication", 
                "context": {
                    "message_length": 220,
                    "emotional_tone": "positive",
                    "contains_questions": True,
                    "response_time_minutes": 3
                }
            }
        ]
        
        for event in events:
            client.post("/bgp/events", json=event, headers=self.headers)
        
        # Check trait updates
        response = client.get("/bgp/traits", headers=self.headers)
        traits = response.json()
        
        communication_trait = next(t for t in traits if t["trait_name"] == "communication_style")
        assert communication_trait["confidence"] > 0.1  # Should have increased
        assert communication_trait["value"] > 0.5  # Should show responsive communication
    
    def test_emotional_intelligence_learning(self):
        """Test emotional intelligence trait learning"""
        # Log empathetic responses
        event_data = {
            "event_type": "MESSAGE_RECEIVED_REACTION",
            "category": "emotional",
            "context": {
                "reaction_type": "supportive",
                "emotional_context": "partner_stressed",
                "response_appropriateness": "high",
                "empathy_demonstrated": True
            }
        }
        
        # Log multiple empathetic responses
        for i in range(5):
            client.post("/bgp/events", json=event_data, headers=self.headers)
        
        response = client.get("/bgp/traits", headers=self.headers)
        traits = response.json()
        
        emotional_trait = next(t for t in traits if t["trait_name"] == "emotional_intelligence")
        empathy_trait = next(t for t in traits if t["trait_name"] == "empathy")
        
        assert emotional_trait["value"] > 0.6
        assert empathy_trait["value"] > 0.6
        assert emotional_trait["confidence"] > 0.2
    
    def test_lifestyle_trait_learning(self):
        """Test lifestyle compatibility trait learning"""
        event_data = {
            "event_type": "ACTIVITY_PREFERENCE",
            "category": "lifestyle",
            "context": {
                "activity_type": "outdoor_adventure",
                "enthusiasm_level": "high",
                "frequency_preference": "weekly",
                "social_setting": "small_group"
            }
        }
        
        client.post("/bgp/events", json=event_data, headers=self.headers)
        
        response = client.get("/bgp/traits", headers=self.headers)
        traits = response.json()
        
        adventure_trait = next(t for t in traits if t["trait_name"] == "adventure_seeking")
        social_trait = next(t for t in traits if t["trait_name"] == "social_preferences")
        
        assert adventure_trait["value"] > 0.5
        assert social_trait["confidence"] > 0.05

class TestBGPCompatibilityAnalysis:
    """Test BGP compatibility analysis between users"""
    
    def setup_method(self):
        """Setup two users for compatibility testing"""
        # User 1
        user1_data = {
            "email": "compat1@apexmatch.com",
            "password": "SecurePass123!",
            "name": "Compatibility User 1",
            "age": 28,
            "gender": "female"
        }
        response1 = client.post("/auth/register", json=user1_data)
        self.user1_tokens = response1.json()
        self.user1_headers = {"Authorization": f"Bearer {self.user1_tokens['access_token']}"}
        self.user1_id = self.user1_tokens["user_id"]
        
        # User 2
        user2_data = {
            "email": "compat2@apexmatch.com",
            "password": "SecurePass123!",
            "name": "Compatibility User 2",
            "age": 30,
            "gender": "male"
        }
        response2 = client.post("/auth/register", json=user2_data)
        self.user2_tokens = response2.json()
        self.user2_headers = {"Authorization": f"Bearer {self.user2_tokens['access_token']}"}
        self.user2_id = self.user2_tokens["user_id"]
    
    def test_basic_compatibility_analysis(self):
        """Test basic compatibility analysis between two users"""
        # Build some BGP data for both users
        self._build_user_bgp_profiles()
        
        # Test compatibility analysis
        compat_data = {"target_user_id": self.user2_id}
        response = client.post("/bgp/compatibility", json=compat_data, headers=self.user1_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "overall_compatibility" in data
        assert "category_scores" in data
        assert "strengths" in data
        assert "potential_challenges" in data
        assert 0 <= data["overall_compatibility"] <= 1
    
    def test_detailed_compatibility_report(self):
        """Test detailed compatibility report generation"""
        self._build_user_bgp_profiles()
        
        compat_data = {"target_user_id": self.user2_id, "detailed": True}
        response = client.post("/bgp/compatibility", json=compat_data, headers=self.user1_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "trait_comparisons" in data
        assert "relationship_predictions" in data
        assert "communication_insights" in data
        assert len(data["trait_comparisons"]) > 0
    
    def test_compatibility_with_insufficient_data(self):
        """Test compatibility analysis with insufficient BGP data"""
        # Don't build BGP profiles (users have minimal data)
        compat_data = {"target_user_id": self.user2_id}
        response = client.post("/bgp/compatibility", json=compat_data, headers=self.user1_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["confidence_level"] == "low"
        assert "insufficient_data" in data["notes"]
    
    def test_self_compatibility_analysis(self):
        """Test that users cannot analyze compatibility with themselves"""
        compat_data = {"target_user_id": self.user1_id}
        response = client.post("/bgp/compatibility", json=compat_data, headers=self.user1_headers)
        
        assert response.status_code == 400
        assert "cannot analyze compatibility with yourself" in response.json()["detail"].lower()
    
    def _build_user_bgp_profiles(self):
        """Helper method to build BGP profiles for test users"""
        # Build User 1 profile (extraverted, agreeable)
        user1_events = [
            {
                "event_type": "MESSAGE_SENT",
                "category": "communication",
                "context": {"message_length": 180, "emotional_tone": "enthusiastic", "response_time_minutes": 2}
            },
            {
                "event_type": "SOCIAL_INTERACTION",
                "category": "social",
                "context": {"interaction_type": "group_activity", "enthusiasm_level": "high", "initiation": True}
            },
            {
                "event_type": "DATE_COMPLETED",
                "category": "relationship",
                "context": {"satisfaction_rating": 9, "conversation_quality": "excellent", "follow_up_interest": True}
            }
        ]
        
        # Build User 2 profile (introverted, thoughtful)
        user2_events = [
            {
                "event_type": "MESSAGE_SENT",
                "category": "communication",
                "context": {"message_length": 250, "emotional_tone": "thoughtful", "response_time_minutes": 15}
            },
            {
                "event_type": "PROFILE_VIEW",
                "category": "social",
                "context": {"view_duration_seconds": 120, "interaction_depth": "thorough"}
            },
            {
                "event_type": "DATE_COMPLETED",
                "category": "relationship",
                "context": {"satisfaction_rating": 8, "conversation_quality": "deep", "follow_up_interest": True}
            }
        ]
        
        # Log events for both users
        for event in user1_events:
            client.post("/bgp/events", json=event, headers=self.user1_headers)
        
        for event in user2_events:
            client.post("/bgp/events", json=event, headers=self.user2_headers)

class TestBGPLearningSystem:
    """Test BGP learning and adaptation system"""
    
    def setup_method(self):
        """Setup user for learning tests"""
        user_data = {
            "email": "bgp_learning@apexmatch.com",
            "password": "SecurePass123!",
            "name": "BGP Learning Test",
            "age": 26,
            "gender": "female"
        }
        response = client.post("/auth/register", json=user_data)
        self.tokens = response.json()
        self.headers = {"Authorization": f"Bearer {self.tokens['access_token']}"}
        self.user_id = self.tokens["user_id"]
    
    def test_trait_confidence_increase(self):
        """Test that trait confidence increases with more data"""
        # Get initial confidence
        initial_response = client.get("/bgp/traits", headers=self.headers)
        initial_traits = initial_response.json()
        initial_confidence = sum(t["confidence"] for t in initial_traits) / len(initial_traits)
        
        # Log many consistent events
        for i in range(10):
            event_data = {
                "event_type": "MESSAGE_SENT",
                "category": "communication",
                "context": {
                    "message_length": 150 + i * 10,
                    "emotional_tone": "positive",
                    "response_time_minutes": 3 + i
                }
            }
            client.post("/bgp/events", json=event_data, headers=self.headers)
        
        # Check updated confidence
        updated_response = client.get("/bgp/traits", headers=self.headers)
        updated_traits = updated_response.json()
        updated_confidence = sum(t["confidence"] for t in updated_traits) / len(updated_traits)
        
        assert updated_confidence > initial_confidence
    
    def test_contradictory_behavior_handling(self):
        """Test system handles contradictory behavior appropriately"""
        # Log contradictory events
        events = [
            {
                "event_type": "SOCIAL_INTERACTION",
                "category": "social",
                "context": {"interaction_type": "large_party", "enthusiasm_level": "high"}
            },
            {
                "event_type": "SOCIAL_INTERACTION",
                "category": "social", 
                "context": {"interaction_type": "quiet_dinner", "enthusiasm_level": "high"}
            },
            {
                "event_type": "SOCIAL_INTERACTION",
                "category": "social",
                "context": {"interaction_type": "large_party", "enthusiasm_level": "low"}
            }
        ]
        
        for event in events:
            client.post("/bgp/events", json=event, headers=self.headers)
        
        response = client.get("/bgp/traits", headers=self.headers)
        traits = response.json()
        
        social_trait = next(t for t in traits if t["trait_name"] == "social_preferences")
        # Confidence should be moderate due to contradictory data
        assert 0.3 <= social_trait["confidence"] <= 0.7
    
    def test_bgp_maturity_progression(self):
        """Test BGP profile maturity progression"""
        # Check initial maturity
        initial_response = client.get("/bgp/profile", headers=self.headers)
        assert initial_response.json()["maturity_level"] == "initial"
        
        # Log many events to reach developing stage
        for i in range(50):
            event_data = {
                "event_type": "MESSAGE_SENT",
                "category": "communication",
                "context": {"message_length": 100 + i, "emotional_tone": "neutral"}
            }
            client.post("/bgp/events", json=event_data, headers=self.headers)
        
        # Check maturity progression
        updated_response = client.get("/bgp/profile", headers=self.headers)
        updated_profile = updated_response.json()
        assert updated_profile["maturity_level"] in ["developing", "mature"]
        assert updated_profile["total_events"] >= 50

class TestBGPAnalytics:
    """Test BGP analytics and insights"""
    
    def setup_method(self):
        """Setup user with BGP history"""
        user_data = {
            "email": "bgp_analytics@apexmatch.com",
            "password": "SecurePass123!",
            "name": "BGP Analytics Test",
            "age": 29,
            "gender": "male"
        }
        response = client.post("/auth/register", json=user_data)
        self.tokens = response.json()
        self.headers = {"Authorization": f"Bearer {self.tokens['access_token']}"}
        self.user_id = self.tokens["user_id"]
        
        # Build some BGP history
        self._build_bgp_history()
    
    def test_get_bgp_insights(self):
        """Test getting BGP insights and recommendations"""
        response = client.get("/bgp/insights", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "personality_summary" in data
        assert "strengths" in data
        assert "growth_areas" in data
        assert "dating_recommendations" in data
        assert len(data["strengths"]) > 0
    
    def test_get_trait_history(self):
        """Test getting trait evolution history"""
        response = client.get("/bgp/traits/communication_style/history", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "trait_name" in data
        assert "evolution" in data
        assert len(data["evolution"]) > 0
        
        # Check evolution data structure
        for point in data["evolution"]:
            assert "timestamp" in point
            assert "value" in point
            assert "confidence" in point
    
    def test_get_category_breakdown(self):
        """Test getting BGP category breakdown"""
        response = client.get("/bgp/categories", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        expected_categories = ["communication", "emotional", "lifestyle", "values", "interests"]
        for category in expected_categories:
            assert category in data
            assert "traits" in data[category]
            assert "average_confidence" in data[category]
    
    def test_export_bgp_data(self):
        """Test exporting BGP data"""
        response = client.get("/bgp/export", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "profile_summary" in data
        assert "trait_values" in data
        assert "event_history" in data
        assert "compatibility_patterns" in data
    
    def _build_bgp_history(self):
        """Helper to build BGP history for analytics tests"""
        events = [
            {
                "event_type": "MESSAGE_SENT",
                "category": "communication",
                "context": {"message_length": 150, "emotional_tone": "positive"}
            },
            {
                "event_type": "DATE_COMPLETED",
                "category": "relationship",
                "context": {"satisfaction_rating": 8, "follow_up_interest": True}
            },
            {
                "event_type": "PROFILE_VIEW",
                "category": "social",
                "context": {"view_duration_seconds": 60, "interaction_depth": "surface"}
            },
            {
                "event_type": "ACTIVITY_PREFERENCE",
                "category": "lifestyle",
                "context": {"activity_type": "outdoor_adventure", "enthusiasm_level": "medium"}
            }
        ]
        
        for event in events:
            client.post("/bgp/events", json=event, headers=self.headers)

class TestBGPService:
    """Test BGP service class directly"""
    
    def setup_method(self):
        """Setup BGP service for testing"""
        self.db = TestingSessionLocal()
        self.bgp_service = BGPBuilder(self.db)
    
    def teardown_method(self):
        """Cleanup database session"""
        self.db.close()
    
    def test_trait_update_algorithm(self):
        """Test trait update algorithm directly"""
        # Create test user
        from models.user import User
        user = User(
            email="service_test@apexmatch.com",
            name="Service Test",
            age=25,
            gender="female"
        )
        self.db.add(user)
        self.db.commit()
        
        # Initialize BGP profile
        self.bgp_service.initialize_bgp_profile(user.id)
        
        # Test trait update
        context = {
            "message_length": 200,
            "emotional_tone": "enthusiastic",
            "response_time_minutes": 2
        }
        
        result = self.bgp_service.update_traits_from_event(
            user_id=user.id,
            event_type="MESSAGE_SENT",
            category="communication",
            context=context
        )
        
        assert result["traits_updated"] > 0
        assert "communication_style" in result["affected_traits"]
    
    @patch('services.bgp_builder.openai_client')
    def test_ai_personality_analysis(self, mock_openai):
        """Test AI-powered personality analysis"""
        # Mock OpenAI response
        mock_openai.analyze_personality.return_value = {
            "personality_insights": {
                "dominant_traits": ["openness", "extraversion"],
                "communication_style": "enthusiastic",
                "emotional_patterns": ["positive", "expressive"]
            },
            "confidence": 0.8
        }
        
        # Create test user
        from models.user import User
        user = User(
            email="ai_test@apexmatch.com",
            name="AI Test",
            age=25,
            gender="male"
        )
        self.db.add(user)
        self.db.commit()
        
        # Test AI analysis
        result = self.bgp_service.analyze_personality_with_ai(user.id)
        
        assert result["confidence"] == 0.8
        assert "dominant_traits" in result["personality_insights"]
        mock_openai.analyze_personality.assert_called_once()
    
    def test_compatibility_calculation(self):
        """Test compatibility calculation algorithm"""
        # Create two test users
        from models.user import User
        user1 = User(email="comp1@test.com", name="User 1", age=25, gender="female")
        user2 = User(email="comp2@test.com", name="User 2", age=27, gender="male")
        
        self.db.add_all([user1, user2])
        self.db.commit()
        
        # Initialize BGP profiles
        self.bgp_service.initialize_bgp_profile(user1.id)
        self.bgp_service.initialize_bgp_profile(user2.id)
        
        # Update some traits to create differences
        self.bgp_service.update_trait_value(user1.id, "extraversion", 0.8, 0.7)
        self.bgp_service.update_trait_value(user2.id, "extraversion", 0.3, 0.7)
        
        # Calculate compatibility
        compatibility = self.bgp_service.calculate_compatibility(user1.id, user2.id)
        
        assert 0 <= compatibility["overall_score"] <= 1
        assert "category_scores" in compatibility
        assert "trait_comparisons" in compatibility

class TestBGPDataIntegrity:
    """Test BGP data integrity and error handling"""
    
    def setup_method(self):
        """Setup user for data integrity tests"""
        user_data = {
            "email": "bgp_integrity@apexmatch.com",
            "password": "SecurePass123!",
            "name": "BGP Integrity Test",
            "age": 31,
            "gender": "non_binary"
        }
        response = client.post("/auth/register", json=user_data)
        self.tokens = response.json()
        self.headers = {"Authorization": f"Bearer {self.tokens['access_token']}"}
        self.user_id = self.tokens["user_id"]
    
    def test_invalid_trait_values(self):
        """Test handling of invalid trait values"""
        # This would be tested at the service level
        db = TestingSessionLocal()
        bgp_service = BGPBuilder(db)
        
        # Test invalid trait value (outside 0-1 range)
        with pytest.raises(ValueError):
            bgp_service.update_trait_value(self.user_id, "openness", 1.5, 0.8)
        
        with pytest.raises(ValueError):
            bgp_service.update_trait_value(self.user_id, "openness", -0.1, 0.8)
        
        db.close()
    
    def test_nonexistent_user_bgp(self):
        """Test BGP operations on nonexistent user"""
        fake_headers = {"Authorization": "Bearer fake_token"}
        
        response = client.get("/bgp/profile", headers=fake_headers)
        assert response.status_code == 401
    
    def test_bgp_event_validation(self):
        """Test BGP event data validation"""
        invalid_events = [
            {"event_type": "", "category": "communication"},  # Empty event type
            {"event_type": "MESSAGE_SENT", "category": ""},   # Empty category
            {"event_type": "MESSAGE_SENT", "category": "invalid_category"},  # Invalid category
        ]
        
        for invalid_event in invalid_events:
            response = client.post("/bgp/events", json=invalid_event, headers=self.headers)
            assert response.status_code == 422
    
    def test_concurrent_bgp_updates(self):
        """Test handling of concurrent BGP updates"""
        import threading
        import time
        
        def log_event():
            event_data = {
                "event_type": "MESSAGE_SENT",
                "category": "communication",
                "context": {"message_length": 100}
            }
            client.post("/bgp/events", json=event_data, headers=self.headers)
        
        # Create multiple threads to simulate concurrent updates
        threads = []
        for i in range(5):
            thread = threading.Thread(target=log_event)
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Verify data integrity
        response = client.get("/bgp/profile", headers=self.headers)
        profile = response.json()
        assert profile["total_events"] == 5

# Pytest configuration and fixtures
@pytest.fixture(scope="function")
def clean_database():
    """Clean database before each test"""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def mock_ai_service():
    """Mock AI service for testing"""
    with patch('services.bgp_builder.openai_client') as mock:
        mock.analyze_personality.return_value = {
            "personality_insights": {
                "dominant_traits": ["openness", "conscientiousness"],
                "confidence": 0.75
            }
        }
        yield mock

if __name__ == "__main__":
    pytest.main([__file__, "-v"])