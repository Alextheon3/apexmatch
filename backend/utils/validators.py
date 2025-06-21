# backend/utils/validators.py
"""
ApexMatch Validation Utilities
Comprehensive input validation, data sanitization, and business rule validation
"""

import re
import json
from datetime import datetime, date
from typing import Any, Dict, List, Optional, Union, Tuple
from email_validator import validate_email, EmailNotValidError
from pydantic import BaseModel, validator
import phonenumbers
from phonenumbers import NumberParseException
import logging

logger = logging.getLogger(__name__)

class ValidationError(Exception):
    """Custom validation error"""
    def __init__(self, message: str, field: str = None, code: str = None):
        self.message = message
        self.field = field
        self.code = code
        super().__init__(self.message)

class ValidationResult:
    """Validation result container"""
    def __init__(self, is_valid: bool = True, errors: List[Dict] = None, warnings: List[str] = None):
        self.is_valid = is_valid
        self.errors = errors or []
        self.warnings = warnings or []
    
    def add_error(self, message: str, field: str = None, code: str = None):
        """Add validation error"""
        self.is_valid = False
        self.errors.append({
            "message": message,
            "field": field,
            "code": code
        })
    
    def add_warning(self, message: str):
        """Add validation warning"""
        self.warnings.append(message)

class ApexMatchValidators:
    """Core validators for ApexMatch platform"""
    
    @staticmethod
    def validate_email(email: str) -> ValidationResult:
        """Validate email address format and deliverability"""
        result = ValidationResult()
        
        if not email:
            result.add_error("Email is required", "email", "REQUIRED")
            return result
        
        try:
            # Basic format validation
            validated_email = validate_email(email)
            normalized_email = validated_email.email
            
            # Check for common disposable email domains
            disposable_domains = [
                "10minutemail.com", "tempmail.org", "guerrillamail.com",
                "mailinator.com", "yopmail.com", "throwaway.email"
            ]
            
            domain = normalized_email.split("@")[1].lower()
            if domain in disposable_domains:
                result.add_warning("Disposable email detected - consider using a permanent email")
            
            # Check for plus addressing (email+tag@domain.com)
            if "+" in normalized_email.split("@")[0]:
                result.add_warning("Plus addressing detected")
            
        except EmailNotValidError as e:
            result.add_error(f"Invalid email format: {str(e)}", "email", "INVALID_FORMAT")
        
        return result
    
    @staticmethod
    def validate_password(password: str) -> ValidationResult:
        """Validate password strength and security"""
        result = ValidationResult()
        
        if not password:
            result.add_error("Password is required", "password", "REQUIRED")
            return result
        
        # Length check
        if len(password) < 8:
            result.add_error("Password must be at least 8 characters long", "password", "TOO_SHORT")
        
        if len(password) > 128:
            result.add_error("Password cannot exceed 128 characters", "password", "TOO_LONG")
        
        # Character variety checks
        checks = [
            (re.search(r"[a-z]", password), "lowercase letter"),
            (re.search(r"[A-Z]", password), "uppercase letter"),
            (re.search(r"\d", password), "number"),
            (re.search(r"[!@#$%^&*(),.?\":{}|<>]", password), "special character")
        ]
        
        missing_types = [char_type for check, char_type in checks if not check]
        if missing_types:
            result.add_error(
                f"Password must contain: {', '.join(missing_types)}", 
                "password", 
                "INSUFFICIENT_COMPLEXITY"
            )
        
        # Common password check
        common_passwords = [
            "password", "123456", "password123", "admin", "qwerty",
            "letmein", "welcome", "monkey", "dragon", "master",
            "123456789", "password1", "abc123", "admin123"
        ]
        
        if password.lower() in common_passwords:
            result.add_error("Password is too common", "password", "COMMON_PASSWORD")
        
        # Sequential or repeated characters
        if re.search(r"(.)\1{2,}", password):
            result.add_warning("Avoid repeating characters")
        
        if re.search(r"(012|123|234|345|456|567|678|789|abc|bcd|cde)", password.lower()):
            result.add_warning("Avoid sequential characters")
        
        return result
    
    @staticmethod
    def validate_age(age: int, min_age: int = 18, max_age: int = 100) -> ValidationResult:
        """Validate user age for dating platform compliance"""
        result = ValidationResult()
        
        if age is None:
            result.add_error("Age is required", "age", "REQUIRED")
            return result
        
        if not isinstance(age, int):
            result.add_error("Age must be a number", "age", "INVALID_TYPE")
            return result
        
        if age < min_age:
            result.add_error(f"Minimum age is {min_age}", "age", "UNDERAGE")
        
        if age > max_age:
            result.add_error(f"Maximum age is {max_age}", "age", "OVERAGE")
        
        # Suspicious age patterns
        if age > 80:
            result.add_warning("High age detected - verify accuracy")
        
        return result
    
    @staticmethod
    def validate_birthdate(birthdate: Union[str, date]) -> ValidationResult:
        """Validate birthdate and calculate age"""
        result = ValidationResult()
        
        if not birthdate:
            result.add_error("Birthdate is required", "birthdate", "REQUIRED")
            return result
        
        try:
            if isinstance(birthdate, str):
                birth_date = datetime.strptime(birthdate, "%Y-%m-%d").date()
            else:
                birth_date = birthdate
            
            today = date.today()
            age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            
            # Validate calculated age
            age_validation = ApexMatchValidators.validate_age(age)
            if not age_validation.is_valid:
                result.errors.extend(age_validation.errors)
            
            # Future date check
            if birth_date > today:
                result.add_error("Birthdate cannot be in the future", "birthdate", "FUTURE_DATE")
            
            # Reasonable date range (not too far in the past)
            if birth_date.year < 1900:
                result.add_error("Birthdate too far in the past", "birthdate", "TOO_OLD")
            
        except ValueError:
            result.add_error("Invalid date format. Use YYYY-MM-DD", "birthdate", "INVALID_FORMAT")
        
        return result
    
    @staticmethod
    def validate_name(name: str, field_name: str = "name") -> ValidationResult:
        """Validate user names (first name, last name, display name)"""
        result = ValidationResult()
        
        if not name:
            result.add_error(f"{field_name.title()} is required", field_name, "REQUIRED")
            return result
        
        # Length checks
        if len(name) < 2:
            result.add_error(f"{field_name.title()} must be at least 2 characters", field_name, "TOO_SHORT")
        
        if len(name) > 50:
            result.add_error(f"{field_name.title()} cannot exceed 50 characters", field_name, "TOO_LONG")
        
        # Character validation (allow letters, spaces, hyphens, apostrophes)
        if not re.match(r"^[a-zA-Z\s\-']+$", name):
            result.add_error(
                f"{field_name.title()} can only contain letters, spaces, hyphens, and apostrophes",
                field_name,
                "INVALID_CHARACTERS"
            )
        
        # Check for suspicious patterns
        if re.search(r"(.)\1{3,}", name):  # 4+ repeated characters
            result.add_warning("Name contains many repeated characters")
        
        if name.lower() in ["test", "admin", "user", "example", "dummy"]:
            result.add_warning("Name appears to be a placeholder")
        
        return result
    
    @staticmethod
    def validate_phone_number(phone: str, country_code: str = "US") -> ValidationResult:
        """Validate phone number format and region"""
        result = ValidationResult()
        
        if not phone:
            result.add_error("Phone number is required", "phone", "REQUIRED")
            return result
        
        try:
            parsed_number = phonenumbers.parse(phone, country_code)
            
            if not phonenumbers.is_valid_number(parsed_number):
                result.add_error("Invalid phone number", "phone", "INVALID")
            
            if not phonenumbers.is_possible_number(parsed_number):
                result.add_error("Phone number format is not possible", "phone", "IMPOSSIBLE")
            
            # Format validation
            formatted_number = phonenumbers.format_number(parsed_number, phonenumbers.PhoneNumberFormat.E164)
            
        except NumberParseException as e:
            result.add_error(f"Phone number parsing error: {e}", "phone", "PARSE_ERROR")
        
        return result
    
    @staticmethod
    def validate_gender(gender: str) -> ValidationResult:
        """Validate gender selection"""
        result = ValidationResult()
        
        valid_genders = ["male", "female", "non_binary", "other", "prefer_not_to_say"]
        
        if not gender:
            result.add_error("Gender is required", "gender", "REQUIRED")
            return result
        
        if gender.lower() not in valid_genders:
            result.add_error(
                f"Invalid gender. Must be one of: {', '.join(valid_genders)}",
                "gender",
                "INVALID_OPTION"
            )
        
        return result
    
    @staticmethod
    def validate_location(location: str) -> ValidationResult:
        """Validate location/address format"""
        result = ValidationResult()
        
        if not location:
            result.add_error("Location is required", "location", "REQUIRED")
            return result
        
        if len(location) < 3:
            result.add_error("Location must be at least 3 characters", "location", "TOO_SHORT")
        
        if len(location) > 200:
            result.add_error("Location cannot exceed 200 characters", "location", "TOO_LONG")
        
        # Basic format validation (city, state or city, country)
        if not re.search(r"[a-zA-Z\s,.-]+", location):
            result.add_error("Invalid location format", "location", "INVALID_FORMAT")
        
        return result
    
    @staticmethod
    def validate_bio(bio: str) -> ValidationResult:
        """Validate user bio/description"""
        result = ValidationResult()
        
        if bio and len(bio) > 2000:
            result.add_error("Bio cannot exceed 2000 characters", "bio", "TOO_LONG")
        
        # Check for inappropriate content patterns
        inappropriate_patterns = [
            r"\b(fuck|shit|bitch|asshole)\b",  # Strong profanity
            r"\b(whatsapp|telegram|snapchat|kik)\b",  # External contact attempts
            r"\$\d+",  # Money references
            r"\b(escort|sugar|daddy|baby)\b",  # Suggestive terms
        ]
        
        for pattern in inappropriate_patterns:
            if re.search(pattern, bio.lower()):
                result.add_warning("Bio may contain inappropriate content")
                break
        
        # Check for contact information
        contact_patterns = [
            r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",  # Phone numbers
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",  # Email
            r"@[A-Za-z0-9_]+",  # Social media handles
        ]
        
        for pattern in contact_patterns:
            if re.search(pattern, bio):
                result.add_warning("Bio contains contact information")
                break
        
        return result
    
    @staticmethod
    def validate_interests(interests: List[str]) -> ValidationResult:
        """Validate user interests list"""
        result = ValidationResult()
        
        if not interests:
            result.add_error("At least one interest is required", "interests", "REQUIRED")
            return result
        
        if len(interests) > 20:
            result.add_error("Maximum 20 interests allowed", "interests", "TOO_MANY")
        
        valid_interests = [
            "hiking", "photography", "cooking", "travel", "music", "art", "reading",
            "fitness", "yoga", "dancing", "movies", "gaming", "sports", "technology",
            "nature", "animals", "volunteering", "meditation", "wine", "coffee",
            "fashion", "design", "writing", "languages", "history", "science"
        ]
        
        for interest in interests:
            if not isinstance(interest, str):
                result.add_error("All interests must be text", "interests", "INVALID_TYPE")
                continue
            
            if len(interest) > 50:
                result.add_error("Interest names cannot exceed 50 characters", "interests", "TOO_LONG")
            
            if interest.lower() not in valid_interests:
                result.add_warning(f"'{interest}' is not a recognized interest")
        
        return result

class BGPValidators:
    """Validators for BGP (Behavioral Graph Profiling) system"""
    
    @staticmethod
    def validate_trait_value(trait_name: str, value: float) -> ValidationResult:
        """Validate BGP trait value"""
        result = ValidationResult()
        
        if value is None:
            result.add_error("Trait value is required", "value", "REQUIRED")
            return result
        
        if not isinstance(value, (int, float)):
            result.add_error("Trait value must be a number", "value", "INVALID_TYPE")
            return result
        
        if not (0 <= value <= 1):
            result.add_error("Trait value must be between 0 and 1", "value", "OUT_OF_RANGE")
        
        return result
    
    @staticmethod
    def validate_bgp_event(event_type: str, category: str, context: Dict) -> ValidationResult:
        """Validate BGP event data"""
        result = ValidationResult()
        
        valid_event_types = [
            "MESSAGE_SENT", "MESSAGE_RECEIVED", "PROFILE_VIEW", "PHOTO_LIKE",
            "DATE_COMPLETED", "CONVERSATION_STARTED", "RESPONSE_TIME",
            "EMOJI_USAGE", "QUESTION_ASKED", "PERSONAL_SHARING"
        ]
        
        valid_categories = [
            "communication", "emotional", "social", "lifestyle", "values", "interests"
        ]
        
        if event_type not in valid_event_types:
            result.add_error(f"Invalid event type: {event_type}", "event_type", "INVALID")
        
        if category not in valid_categories:
            result.add_error(f"Invalid category: {category}", "category", "INVALID")
        
        if not isinstance(context, dict):
            result.add_error("Context must be a dictionary", "context", "INVALID_TYPE")
        
        return result

class MatchValidators:
    """Validators for matching system"""
    
    @staticmethod
    def validate_match_filters(filters: Dict) -> ValidationResult:
        """Validate match discovery filters"""
        result = ValidationResult()
        
        # Age range validation
        if "min_age" in filters:
            if not isinstance(filters["min_age"], int) or filters["min_age"] < 18:
                result.add_error("Minimum age must be at least 18", "min_age", "INVALID")
        
        if "max_age" in filters:
            if not isinstance(filters["max_age"], int) or filters["max_age"] > 100:
                result.add_error("Maximum age cannot exceed 100", "max_age", "INVALID")
        
        if "min_age" in filters and "max_age" in filters:
            if filters["min_age"] > filters["max_age"]:
                result.add_error("Minimum age cannot be greater than maximum age", "age_range", "INVALID")
        
        # Distance validation
        if "max_distance_miles" in filters:
            distance = filters["max_distance_miles"]
            if not isinstance(distance, (int, float)) or distance <= 0:
                result.add_error("Distance must be a positive number", "max_distance_miles", "INVALID")
            if distance > 1000:
                result.add_error("Maximum distance cannot exceed 1000 miles", "max_distance_miles", "TOO_LARGE")
        
        # Trust score validation
        if "min_trust_score" in filters:
            trust_score = filters["min_trust_score"]
            if not isinstance(trust_score, int) or not (0 <= trust_score <= 1000):
                result.add_error("Trust score must be between 0 and 1000", "min_trust_score", "INVALID")
        
        return result
    
    @staticmethod
    def validate_match_action(action: str, target_user_id: int, message: str = None) -> ValidationResult:
        """Validate match action (like, pass, super_like)"""
        result = ValidationResult()
        
        valid_actions = ["like", "pass", "super_like"]
        
        if action not in valid_actions:
            result.add_error(f"Invalid action. Must be one of: {', '.join(valid_actions)}", "action", "INVALID")
        
        if not isinstance(target_user_id, int) or target_user_id <= 0:
            result.add_error("Invalid target user ID", "target_user_id", "INVALID")
        
        if message:
            if len(message) > 500:
                result.add_error("Message cannot exceed 500 characters", "message", "TOO_LONG")
            
            # Check for inappropriate content
            if re.search(r"\b(fuck|shit|bitch)\b", message.lower()):
                result.add_warning("Message may contain inappropriate language")
        
        return result

class TrustValidators:
    """Validators for trust scoring system"""
    
    @staticmethod
    def validate_trust_event(event_type: str, context: Dict) -> ValidationResult:
        """Validate trust event data"""
        result = ValidationResult()
        
        valid_trust_events = [
            "PROFILE_COMPLETION", "PHOTO_VERIFICATION", "EMAIL_VERIFICATION",
            "PHONE_VERIFICATION", "POSITIVE_INTERACTION", "NEGATIVE_INTERACTION",
            "REPORT_FILED", "REPORT_VALIDATED", "ACCOUNT_AGE_MILESTONE",
            "CONSISTENT_BEHAVIOR", "POLICY_VIOLATION", "SPAM_DETECTED"
        ]
        
        if event_type not in valid_trust_events:
            result.add_error(f"Invalid trust event type: {event_type}", "event_type", "INVALID")
        
        if not isinstance(context, dict):
            result.add_error("Context must be a dictionary", "context", "INVALID_TYPE")
        
        # Event-specific context validation
        if event_type == "PROFILE_COMPLETION":
            if "completion_percentage" not in context:
                result.add_error("Profile completion requires completion_percentage", "context", "MISSING_FIELD")
            elif not (0 <= context["completion_percentage"] <= 100):
                result.add_error("Completion percentage must be 0-100", "context", "INVALID_RANGE")
        
        elif event_type == "POSITIVE_INTERACTION":
            if "interaction_quality" not in context:
                result.add_error("Positive interaction requires interaction_quality", "context", "MISSING_FIELD")
        
        return result

class MessageValidators:
    """Validators for messaging system"""
    
    @staticmethod
    def validate_message_content(content: str) -> ValidationResult:
        """Validate message content for appropriateness and safety"""
        result = ValidationResult()
        
        if not content or not content.strip():
            result.add_error("Message content cannot be empty", "content", "REQUIRED")
            return result
        
        if len(content) > 5000:
            result.add_error("Message cannot exceed 5000 characters", "content", "TOO_LONG")
        
        # Spam detection patterns
        spam_patterns = [
            r"\b(click here|visit now|buy now)\b",
            r"https?://[^\s]+",  # URLs
            r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",  # Phone numbers
            r"\$\d+",  # Money amounts
            r"\b(free|win|prize|offer|deal)\b.*\b(now|today|limited)\b"
        ]
        
        spam_score = 0
        for pattern in spam_patterns:
            if re.search(pattern, content.lower()):
                spam_score += 1
        
        if spam_score >= 2:
            result.add_warning("Message may be spam")
        
        # Inappropriate content detection
        inappropriate_patterns = [
            r"\b(fuck|shit|bitch|asshole|damn)\b",
            r"\b(sex|sexual|nude|naked)\b",
            r"\b(drugs|cocaine|weed|marijuana)\b"
        ]
        
        for pattern in inappropriate_patterns:
            if re.search(pattern, content.lower()):
                result.add_warning("Message may contain inappropriate content")
                break
        
        return result

class PhotoValidators:
    """Validators for photo upload and management"""
    
    @staticmethod
    def validate_photo_metadata(filename: str, file_size: int, content_type: str) -> ValidationResult:
        """Validate photo file metadata"""
        result = ValidationResult()
        
        # File extension validation
        allowed_extensions = [".jpg", ".jpeg", ".png", ".heic", ".webp"]
        file_extension = filename.lower().split(".")[-1] if "." in filename else ""
        
        if f".{file_extension}" not in allowed_extensions:
            result.add_error(
                f"Invalid file type. Allowed: {', '.join(allowed_extensions)}",
                "filename",
                "INVALID_TYPE"
            )
        
        # File size validation (10MB max)
        max_size = 10 * 1024 * 1024  # 10MB
        if file_size > max_size:
            result.add_error("File size cannot exceed 10MB", "file_size", "TOO_LARGE")
        
        # Content type validation
        allowed_content_types = ["image/jpeg", "image/png", "image/heic", "image/webp"]
        if content_type not in allowed_content_types:
            result.add_error("Invalid content type", "content_type", "INVALID")
        
        return result

class SubscriptionValidators:
    """Validators for subscription and payment system"""
    
    @staticmethod
    def validate_subscription_tier(tier: str) -> ValidationResult:
        """Validate subscription tier"""
        result = ValidationResult()
        
        valid_tiers = ["free", "connection", "elite"]
        
        if tier not in valid_tiers:
            result.add_error(f"Invalid subscription tier: {tier}", "tier", "INVALID")
        
        return result
    
    @staticmethod
    def validate_promo_code(promo_code: str) -> ValidationResult:
        """Validate promo code format"""
        result = ValidationResult()
        
        if not promo_code:
            result.add_error("Promo code is required", "promo_code", "REQUIRED")
            return result
        
        # Promo code format: alphanumeric, 4-20 characters
        if not re.match(r"^[A-Za-z0-9]{4,20}$", promo_code):
            result.add_error(
                "Promo code must be 4-20 alphanumeric characters",
                "promo_code",
                "INVALID_FORMAT"
            )
        
        return result

class DataSanitizer:
    """Data sanitization utilities"""
    
    @staticmethod
    def sanitize_text(text: str, max_length: int = None) -> str:
        """Sanitize text input"""
        if not text:
            return ""
        
        # Remove extra whitespace
        sanitized = re.sub(r'\s+', ' ', text.strip())
        
        # Remove potentially harmful characters
        sanitized = re.sub(r'[<>"\'\x00-\x1f\x7f-\x9f]', '', sanitized)
        
        # Truncate if necessary
        if max_length and len(sanitized) > max_length:
            sanitized = sanitized[:max_length].rstrip()
        
        return sanitized
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename for safe storage"""
        if not filename:
            return "unnamed_file"
        
        # Remove path separators and dangerous characters
        sanitized = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '', filename)
        
        # Limit length
        if len(sanitized) > 255:
            name, ext = sanitized.rsplit('.', 1) if '.' in sanitized else (sanitized, '')
            sanitized = name[:250] + ('.' + ext if ext else '')
        
        return sanitized or "unnamed_file"
    
    @staticmethod
    def sanitize_location(location: str) -> str:
        """Sanitize location input"""
        if not location:
            return ""
        
        # Allow letters, numbers, spaces, commas, periods, hyphens
        sanitized = re.sub(r'[^a-zA-Z0-9\s,.-]', '', location)
        
        # Remove extra whitespace and limit length
        sanitized = re.sub(r'\s+', ' ', sanitized.strip())[:200]
        
        return sanitized

class BusinessRuleValidators:
    """Business rule validators specific to ApexMatch"""
    
    @staticmethod
    def validate_match_eligibility(user_age: int, target_age: int, user_location: str, target_location: str) -> ValidationResult:
        """Validate if two users are eligible to match"""
        result = ValidationResult()
        
        # Age compatibility check (max 20 year difference)
        age_difference = abs(user_age - target_age)
        if age_difference > 20:
            result.add_warning("Large age difference detected")
        
        # Location check (same general area recommended)
        if user_location and target_location:
            user_area = user_location.split(',')[0].strip().lower()
            target_area = target_location.split(',')[0].strip().lower()
            
            if user_area != target_area:
                result.add_warning("Users are in different locations")
        
        return result
    
    @staticmethod
    def validate_reveal_eligibility(emotional_score: float, conversation_length: int) -> ValidationResult:
        """Validate eligibility for photo reveal (70% emotional threshold)"""
        result = ValidationResult()
        
        if emotional_score < 0.7:
            result.add_error(
                "Emotional connection threshold not met (70% required)",
                "emotional_score",
                "THRESHOLD_NOT_MET"
            )
        
        if conversation_length < 10:
            result.add_warning("Short conversation - consider building more connection")
        
        return result
    
    @staticmethod
    def validate_trust_tier_action(user_trust_tier: str, action: str) -> ValidationResult:
        """Validate if user's trust tier allows specific action"""
        result = ValidationResult()
        
        tier_permissions = {
            "challenged": ["basic_matching", "limited_messages"],
            "building": ["basic_matching", "standard_messages", "profile_boost"],
            "reliable": ["standard_matching", "standard_messages", "photo_reveals"],
            "trusted": ["premium_matching", "unlimited_messages", "report_users"],
            "elite": ["exclusive_matching", "priority_support", "beta_features"]
        }
        
        user_permissions = tier_permissions.get(user_trust_tier, [])
        
        if action not in user_permissions:
            result.add_error(
                f"Trust tier '{user_trust_tier}' does not allow action '{action}'",
                "trust_tier",
                "INSUFFICIENT_TRUST"
            )
        
        return result

# Utility functions for common validation patterns
def validate_required_fields(data: Dict, required_fields: List[str]) -> ValidationResult:
    """Validate that all required fields are present and not empty"""
    result = ValidationResult()
    
    for field in required_fields:
        if field not in data or not data[field]:
            result.add_error(f"{field} is required", field, "REQUIRED")
    
    return result

def validate_field_lengths(data: Dict, field_limits: Dict[str, int]) -> ValidationResult:
    """Validate field length limits"""
    result = ValidationResult()
    
    for field, max_length in field_limits.items():
        if field in data and isinstance(data[field], str):
            if len(data[field]) > max_length:
                result.add_error(
                    f"{field} cannot exceed {max_length} characters",
                    field,
                    "TOO_LONG"
                )
    
    return result

def combine_validation_results(*results: ValidationResult) -> ValidationResult:
    """Combine multiple validation results"""
    combined = ValidationResult()
    
    for result in results:
        if not result.is_valid:
            combined.is_valid = False
        combined.errors.extend(result.errors)
        combined.warnings.extend(result.warnings)
    
    return combined

# Comprehensive validation function for user registration
def validate_user_registration(user_data: Dict) -> ValidationResult:
    """Comprehensive validation for user registration"""
    results = []
    
    # Required fields check
    required_fields = ["email", "password", "name", "age", "gender"]
    results.append(validate_required_fields(user_data, required_fields))
    
    # Individual field validations
    if "email" in user_data:
        results.append(ApexMatchValidators.validate_email(user_data["email"]))
    
    if "password" in user_data:
        results.append(ApexMatchValidators.validate_password(user_data["password"]))
    
    if "name" in user_data:
        results.append(ApexMatchValidators.validate_name(user_data["name"]))
    
    if "age" in user_data:
        results.append(ApexMatchValidators.validate_age(user_data["age"]))
    
    if "gender" in user_data:
        results.append(ApexMatchValidators.validate_gender(user_data["gender"]))
    
    if "bio" in user_data:
        results.append(ApexMatchValidators.validate_bio(user_data["bio"]))
    
    if "location" in user_data:
        results.append(ApexMatchValidators.validate_location(user_data["location"]))
    
    if "interests" in user_data:
        results.append(ApexMatchValidators.validate_interests(user_data["interests"]))
    
    return combine_validation_results(*results)