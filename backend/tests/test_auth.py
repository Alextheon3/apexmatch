# backend/tests/test_auth.py
"""
ApexMatch Authentication Tests
Comprehensive test suite for user authentication, registration, and JWT handling
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import jwt

from main import app
from database import Base, get_db
from models.user import User
from utils.auth_utils import create_access_token, verify_password, hash_password

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_auth.db"
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

class TestUserRegistration:
    """Test user registration functionality"""
    
    def test_successful_registration(self):
        """Test successful user registration with valid data"""
        user_data = {
            "email": "test@apexmatch.com",
            "password": "SecurePass123!",
            "name": "Test User",
            "age": 25,
            "gender": "male",
            "location": "San Francisco, CA"
        }
        
        response = client.post("/auth/register", json=user_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["name"] == user_data["name"]
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["subscription_tier"] == "free"
        assert data["trust_tier"] == "challenged"
    
    def test_registration_duplicate_email(self):
        """Test registration fails with duplicate email"""
        user_data = {
            "email": "duplicate@apexmatch.com",
            "password": "SecurePass123!",
            "name": "First User",
            "age": 25,
            "gender": "female"
        }
        
        # First registration
        response1 = client.post("/auth/register", json=user_data)
        assert response1.status_code == 201
        
        # Duplicate registration
        user_data["name"] = "Second User"
        response2 = client.post("/auth/register", json=user_data)
        assert response2.status_code == 400
        assert "already registered" in response2.json()["detail"].lower()
    
    def test_registration_invalid_age(self):
        """Test registration fails with invalid age"""
        user_data = {
            "email": "young@apexmatch.com",
            "password": "SecurePass123!",
            "name": "Too Young",
            "age": 17,  # Under 18
            "gender": "non_binary"
        }
        
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 422
    
    def test_registration_weak_password(self):
        """Test registration fails with weak password"""
        user_data = {
            "email": "weak@apexmatch.com",
            "password": "123",  # Too weak
            "name": "Weak Password",
            "age": 25,
            "gender": "male"
        }
        
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 422
    
    def test_registration_invalid_email(self):
        """Test registration fails with invalid email format"""
        user_data = {
            "email": "not-an-email",  # Invalid format
            "password": "SecurePass123!",
            "name": "Invalid Email",
            "age": 25,
            "gender": "female"
        }
        
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 422

class TestUserLogin:
    """Test user login functionality"""
    
    def setup_method(self):
        """Setup test user for login tests"""
        self.test_email = "login@apexmatch.com"
        self.test_password = "SecurePass123!"
        
        # Create test user
        user_data = {
            "email": self.test_email,
            "password": self.test_password,
            "name": "Login Test",
            "age": 28,
            "gender": "female"
        }
        client.post("/auth/register", json=user_data)
    
    def test_successful_login(self):
        """Test successful login with valid credentials"""
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        response = client.post("/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == self.test_email
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["subscription_tier"] == "free"
    
    def test_login_wrong_password(self):
        """Test login fails with wrong password"""
        login_data = {
            "email": self.test_email,
            "password": "WrongPassword123!"
        }
        
        response = client.post("/auth/login", json=login_data)
        assert response.status_code == 401
        assert "invalid credentials" in response.json()["detail"].lower()
    
    def test_login_nonexistent_user(self):
        """Test login fails with non-existent email"""
        login_data = {
            "email": "nonexistent@apexmatch.com",
            "password": "SomePassword123!"
        }
        
        response = client.post("/auth/login", json=login_data)
        assert response.status_code == 401
    
    def test_login_empty_credentials(self):
        """Test login fails with empty credentials"""
        response = client.post("/auth/login", json={})
        assert response.status_code == 422

class TestJWTTokens:
    """Test JWT token functionality"""
    
    def setup_method(self):
        """Setup test user"""
        self.test_email = "jwt@apexmatch.com"
        user_data = {
            "email": self.test_email,
            "password": "SecurePass123!",
            "name": "JWT Test",
            "age": 30,
            "gender": "male"
        }
        response = client.post("/auth/register", json=user_data)
        self.tokens = response.json()
    
    def test_access_protected_route_with_valid_token(self):
        """Test accessing protected route with valid token"""
        headers = {"Authorization": f"Bearer {self.tokens['access_token']}"}
        response = client.get("/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == self.test_email
    
    def test_access_protected_route_without_token(self):
        """Test accessing protected route without token"""
        response = client.get("/auth/me")
        assert response.status_code == 401
    
    def test_access_protected_route_with_invalid_token(self):
        """Test accessing protected route with invalid token"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/auth/me", headers=headers)
        assert response.status_code == 401
    
    def test_token_refresh(self):
        """Test token refresh functionality"""
        refresh_data = {"refresh_token": self.tokens["refresh_token"]}
        response = client.post("/auth/refresh", json=refresh_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
    
    def test_token_refresh_invalid(self):
        """Test token refresh with invalid refresh token"""
        refresh_data = {"refresh_token": "invalid_refresh_token"}
        response = client.post("/auth/refresh", json=refresh_data)
        assert response.status_code == 401
    
    @patch('utils.auth_utils.datetime')
    def test_expired_token(self, mock_datetime):
        """Test behavior with expired token"""
        # Mock expired time
        mock_datetime.utcnow.return_value = datetime.utcnow() + timedelta(hours=25)
        
        headers = {"Authorization": f"Bearer {self.tokens['access_token']}"}
        response = client.get("/auth/me", headers=headers)
        assert response.status_code == 401

class TestPasswordReset:
    """Test password reset functionality"""
    
    def setup_method(self):
        """Setup test user"""
        self.test_email = "reset@apexmatch.com"
        user_data = {
            "email": self.test_email,
            "password": "OldPassword123!",
            "name": "Reset Test",
            "age": 32,
            "gender": "female"
        }
        client.post("/auth/register", json=user_data)
    
    @patch('services.email_service.send_reset_email')
    def test_password_reset_request(self, mock_send_email):
        """Test password reset request"""
        mock_send_email.return_value = True
        
        reset_data = {"email": self.test_email}
        response = client.post("/auth/reset-password", json=reset_data)
        
        assert response.status_code == 200
        assert "reset link sent" in response.json()["message"].lower()
        mock_send_email.assert_called_once()
    
    def test_password_reset_nonexistent_email(self):
        """Test password reset for non-existent email"""
        reset_data = {"email": "nonexistent@apexmatch.com"}
        response = client.post("/auth/reset-password", json=reset_data)
        
        # Should return success for security (don't reveal if email exists)
        assert response.status_code == 200
    
    def test_password_change_with_valid_token(self):
        """Test password change with valid reset token"""
        # First request reset
        reset_data = {"email": self.test_email}
        client.post("/auth/reset-password", json=reset_data)
        
        # Mock valid reset token
        reset_token = create_access_token(data={"sub": self.test_email, "type": "reset"})
        
        change_data = {
            "token": reset_token,
            "new_password": "NewPassword123!"
        }
        response = client.post("/auth/reset-password/confirm", json=change_data)
        
        assert response.status_code == 200
        
        # Test login with new password
        login_data = {
            "email": self.test_email,
            "password": "NewPassword123!"
        }
        login_response = client.post("/auth/login", json=login_data)
        assert login_response.status_code == 200

class TestUserProfile:
    """Test user profile management"""
    
    def setup_method(self):
        """Setup authenticated user"""
        user_data = {
            "email": "profile@apexmatch.com",
            "password": "SecurePass123!",
            "name": "Profile Test",
            "age": 27,
            "gender": "non_binary"
        }
        response = client.post("/auth/register", json=user_data)
        self.tokens = response.json()
        self.headers = {"Authorization": f"Bearer {self.tokens['access_token']}"}
    
    def test_get_user_profile(self):
        """Test getting user profile"""
        response = client.get("/auth/me", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "profile@apexmatch.com"
        assert data["name"] == "Profile Test"
        assert data["age"] == 27
    
    def test_update_user_profile(self):
        """Test updating user profile"""
        update_data = {
            "name": "Updated Name",
            "bio": "This is my updated bio",
            "location": "New York, NY"
        }
        
        response = client.put("/auth/profile", json=update_data, headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["bio"] == "This is my updated bio"
        assert data["location"] == "New York, NY"
    
    def test_update_profile_invalid_data(self):
        """Test updating profile with invalid data"""
        update_data = {
            "age": 15  # Invalid age
        }
        
        response = client.put("/auth/profile", json=update_data, headers=self.headers)
        assert response.status_code == 422
    
    def test_delete_user_account(self):
        """Test account deletion"""
        response = client.delete("/auth/account", headers=self.headers)
        
        assert response.status_code == 200
        assert "account deleted" in response.json()["message"].lower()
        
        # Verify user can't login after deletion
        login_data = {
            "email": "profile@apexmatch.com",
            "password": "SecurePass123!"
        }
        login_response = client.post("/auth/login", json=login_data)
        assert login_response.status_code == 401

class TestAuthUtilities:
    """Test authentication utility functions"""
    
    def test_password_hashing(self):
        """Test password hashing and verification"""
        password = "TestPassword123!"
        hashed = hash_password(password)
        
        assert hashed != password
        assert verify_password(password, hashed) is True
        assert verify_password("wrong_password", hashed) is False
    
    def test_jwt_token_creation(self):
        """Test JWT token creation and decoding"""
        test_data = {"sub": "test@apexmatch.com", "user_id": 123}
        token = create_access_token(data=test_data)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode and verify
        from config import SECRET_KEY, ALGORITHM
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert decoded["sub"] == "test@apexmatch.com"
        assert decoded["user_id"] == 123
    
    def test_token_expiration(self):
        """Test token expiration handling"""
        # Create token with very short expiration
        test_data = {"sub": "test@apexmatch.com"}
        token = create_access_token(data=test_data, expires_delta=timedelta(seconds=-1))
        
        from config import SECRET_KEY, ALGORITHM
        with pytest.raises(jwt.ExpiredSignatureError):
            jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

class TestAuthMiddleware:
    """Test authentication middleware"""
    
    def test_cors_headers(self):
        """Test CORS headers are properly set"""
        response = client.options("/auth/login")
        
        assert "access-control-allow-origin" in response.headers
        assert "access-control-allow-methods" in response.headers
        assert "access-control-allow-headers" in response.headers
    
    def test_rate_limiting_auth_endpoints(self):
        """Test rate limiting on authentication endpoints"""
        # This would require testing the rate limiter middleware
        # Implementation depends on your rate limiting strategy
        pass
    
    @patch('middleware.logging_middleware.logger')
    def test_request_logging(self, mock_logger):
        """Test request logging middleware"""
        response = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "password"
        })
        
        # Verify logging was called (exact implementation depends on your logger)
        assert mock_logger.info.called or mock_logger.error.called

class TestSecurityFeatures:
    """Test security features and edge cases"""
    
    def test_sql_injection_protection(self):
        """Test protection against SQL injection"""
        malicious_data = {
            "email": "'; DROP TABLE users; --",
            "password": "password"
        }
        
        response = client.post("/auth/login", json=malicious_data)
        # Should fail validation, not cause database errors
        assert response.status_code in [401, 422]
    
    def test_xss_protection(self):
        """Test XSS protection in user input"""
        user_data = {
            "email": "xss@apexmatch.com",
            "password": "SecurePass123!",
            "name": "<script>alert('xss')</script>",
            "age": 25,
            "gender": "male"
        }
        
        response = client.post("/auth/register", json=user_data)
        if response.status_code == 201:
            # Check that script tags are escaped or sanitized
            profile_response = client.get("/auth/me", headers={
                "Authorization": f"Bearer {response.json()['access_token']}"
            })
            profile_data = profile_response.json()
            assert "<script>" not in profile_data["name"]
    
    def test_password_complexity_requirements(self):
        """Test password complexity enforcement"""
        weak_passwords = [
            "123456",           # Too simple
            "password",         # Common word
            "12345678",         # No letters
            "abcdefgh",         # No numbers
            "Pass1",            # Too short
        ]
        
        for weak_password in weak_passwords:
            user_data = {
                "email": f"weak{weak_password}@apexmatch.com",
                "password": weak_password,
                "name": "Test User",
                "age": 25,
                "gender": "male"
            }
            
            response = client.post("/auth/register", json=user_data)
            assert response.status_code == 422

# Pytest configuration and fixtures
@pytest.fixture(scope="function")
def clean_database():
    """Clean database before each test"""
    # Clear all tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup after test
    Base.metadata.drop_all(bind=engine)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])