# backend/utils/helpers.py
"""
ApexMatch Helper Utilities
Common utility functions, data transformations, and business logic helpers
"""

import hashlib
import uuid
import random
import string
import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union, Tuple
import json
import re
from geopy.distance import geodesic
from geopy.geocoders import Nominatim
import phonenumbers
from phonenumbers import NumberParseException
import logging

logger = logging.getLogger(__name__)

class DateTimeHelpers:
    """Date and time utility functions"""
    
    @staticmethod
    def utc_now() -> datetime:
        """Get current UTC datetime"""
        return datetime.now(timezone.utc)
    
    @staticmethod
    def to_utc(dt: datetime) -> datetime:
        """Convert datetime to UTC"""
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    
    @staticmethod
    def format_time_ago(dt: datetime) -> str:
        """Format datetime as 'time ago' string"""
        now = DateTimeHelpers.utc_now()
        dt_utc = DateTimeHelpers.to_utc(dt)
        
        diff = now - dt_utc
        
        if diff.days > 365:
            years = diff.days // 365
            return f"{years} year{'s' if years != 1 else ''} ago"
        elif diff.days > 30:
            months = diff.days // 30
            return f"{months} month{'s' if months != 1 else ''} ago"
        elif diff.days > 0:
            return f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        else:
            return "Just now"
    
    @staticmethod
    def calculate_age(birthdate: datetime) -> int:
        """Calculate age from birthdate"""
        today = datetime.now().date()
        birth_date = birthdate.date() if isinstance(birthdate, datetime) else birthdate
        
        age = today.year - birth_date.year
        if today < birth_date.replace(year=today.year):
            age -= 1
        
        return age
    
    @staticmethod
    def get_zodiac_sign(birthdate: datetime) -> str:
        """Get zodiac sign from birthdate"""
        month = birthdate.month
        day = birthdate.day
        
        zodiac_signs = [
            (1, 20, "Capricorn"), (2, 19, "Aquarius"), (3, 21, "Pisces"),
            (4, 20, "Aries"), (5, 21, "Taurus"), (6, 21, "Gemini"),
            (7, 23, "Cancer"), (8, 23, "Leo"), (9, 23, "Virgo"),
            (10, 23, "Libra"), (11, 22, "Scorpio"), (12, 22, "Sagittarius"),
            (12, 31, "Capricorn")
        ]
        
        for end_month, end_day, sign in zodiac_signs:
            if month < end_month or (month == end_month and day <= end_day):
                return sign
        
        return "Capricorn"
    
    @staticmethod
    def is_within_hours(dt: datetime, hours: int) -> bool:
        """Check if datetime is within specified hours from now"""
        now = DateTimeHelpers.utc_now()
        dt_utc = DateTimeHelpers.to_utc(dt)
        
        return abs((now - dt_utc).total_seconds()) <= hours * 3600

class StringHelpers:
    """String manipulation utilities"""
    
    @staticmethod
    def generate_random_string(length: int = 8, include_digits: bool = True, include_special: bool = False) -> str:
        """Generate random string with specified criteria"""
        chars = string.ascii_letters
        if include_digits:
            chars += string.digits
        if include_special:
            chars += "!@#$%^&*"
        
        return ''.join(random.choice(chars) for _ in range(length))
    
    @staticmethod
    def generate_uuid() -> str:
        """Generate UUID string"""
        return str(uuid.uuid4())
    
    @staticmethod
    def slug_from_text(text: str) -> str:
        """Create URL-friendly slug from text"""
        # Convert to lowercase and replace spaces/special chars with hyphens
        slug = re.sub(r'[^\w\s-]', '', text.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')
    
    @staticmethod
    def truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
        """Truncate text with suffix"""
        if len(text) <= max_length:
            return text
        
        return text[:max_length - len(suffix)] + suffix
    
    @staticmethod
    def extract_hashtags(text: str) -> List[str]:
        """Extract hashtags from text"""
        return re.findall(r'#\w+', text)
    
    @staticmethod
    def extract_mentions(text: str) -> List[str]:
        """Extract @mentions from text"""
        return re.findall(r'@\w+', text)
    
    @staticmethod
    def clean_phone_number(phone: str) -> str:
        """Clean and format phone number"""
        # Remove all non-digit characters
        digits_only = re.sub(r'\D', '', phone)
        
        # Format as international if it looks like US number
        if len(digits_only) == 10:
            return f"+1{digits_only}"
        elif len(digits_only) == 11 and digits_only.startswith('1'):
            return f"+{digits_only}"
        
        return digits_only
    
    @staticmethod
    def mask_email(email: str) -> str:
        """Mask email for privacy (user@domain.com -> u***@domain.com)"""
        if '@' not in email:
            return email
        
        local, domain = email.split('@', 1)
        if len(local) <= 2:
            masked_local = local
        else:
            masked_local = local[0] + '*' * (len(local) - 2) + local[-1]
        
        return f"{masked_local}@{domain}"
    
    @staticmethod
    def format_name(first_name: str, last_name: str = None) -> str:
        """Format display name from first and last name"""
        if not last_name:
            return first_name.title()
        
        return f"{first_name.title()} {last_name[0].upper()}."

class LocationHelpers:
    """Location and geography utilities"""
    
    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float, unit: str = "miles") -> float:
        """Calculate distance between two coordinates"""
        try:
            distance_km = geodesic((lat1, lon1), (lat2, lon2)).kilometers
            
            if unit == "miles":
                return distance_km * 0.621371
            elif unit == "km":
                return distance_km
            else:
                raise ValueError("Unit must be 'miles' or 'km'")
        except Exception as e:
            logger.error(f"Distance calculation error: {e}")
            return float('inf')
    
    @staticmethod
    def geocode_location(location: str) -> Optional[Tuple[float, float]]:
        """Get coordinates from location string"""
        try:
            geolocator = Nominatim(user_agent="apexmatch")
            location_data = geolocator.geocode(location)
            
            if location_data:
                return (location_data.latitude, location_data.longitude)
            
            return None
        except Exception as e:
            logger.error(f"Geocoding error: {e}")
            return None
    
    @staticmethod
    def reverse_geocode(lat: float, lon: float) -> Optional[str]:
        """Get location string from coordinates"""
        try:
            geolocator = Nominatim(user_agent="apexmatch")
            location = geolocator.reverse(f"{lat}, {lon}")
            
            if location:
                return location.address
            
            return None
        except Exception as e:
            logger.error(f"Reverse geocoding error: {e}")
            return None
    
    @staticmethod
    def format_location(location: str) -> str:
        """Format location string for display"""
        # Extract city and state/country from full address
        parts = [part.strip() for part in location.split(',')]
        
        if len(parts) >= 2:
            return f"{parts[0]}, {parts[1]}"
        
        return location
    
    @staticmethod
    def is_within_radius(center_lat: float, center_lon: float, point_lat: float, point_lon: float, radius_miles: float) -> bool:
        """Check if point is within radius of center"""
        distance = LocationHelpers.calculate_distance(center_lat, center_lon, point_lat, point_lon, "miles")
        return distance <= radius_miles

class CryptoHelpers:
    """Cryptographic and hashing utilities"""
    
    @staticmethod
    def hash_string(text: str, algorithm: str = "sha256") -> str:
        """Hash string using specified algorithm"""
        if algorithm == "md5":
            return hashlib.md5(text.encode()).hexdigest()
        elif algorithm == "sha1":
            return hashlib.sha1(text.encode()).hexdigest()
        elif algorithm == "sha256":
            return hashlib.sha256(text.encode()).hexdigest()
        else:
            raise ValueError("Unsupported algorithm")
    
    @staticmethod
    def generate_hash_from_dict(data: Dict) -> str:
        """Generate consistent hash from dictionary"""
        # Sort keys to ensure consistent hashing
        sorted_items = sorted(data.items())
        serialized = json.dumps(sorted_items, sort_keys=True)
        return CryptoHelpers.hash_string(serialized)
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Generate cryptographically secure token"""
        import secrets
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def generate_numeric_code(length: int = 6) -> str:
        """Generate numeric verification code"""
        import secrets
        return ''.join(secrets.choice(string.digits) for _ in range(length))

class DataTransformers:
    """Data transformation utilities"""
    
    @staticmethod
    def flatten_dict(data: Dict, separator: str = ".") -> Dict:
        """Flatten nested dictionary"""
        def _flatten(obj, parent_key=""):
            items = []
            for key, value in obj.items():
                new_key = f"{parent_key}{separator}{key}" if parent_key else key
                if isinstance(value, dict):
                    items.extend(_flatten(value, new_key).items())
                else:
                    items.append((new_key, value))
            return dict(items)
        
        return _flatten(data)
    
    @staticmethod
    def unflatten_dict(data: Dict, separator: str = ".") -> Dict:
        """Unflatten dictionary with separator"""
        result = {}
        for key, value in data.items():
            keys = key.split(separator)
            current = result
            for k in keys[:-1]:
                current = current.setdefault(k, {})
            current[keys[-1]] = value
        return result
    
    @staticmethod
    def filter_dict_keys(data: Dict, allowed_keys: List[str]) -> Dict:
        """Filter dictionary to only include allowed keys"""
        return {k: v for k, v in data.items() if k in allowed_keys}
    
    @staticmethod
    def remove_none_values(data: Dict) -> Dict:
        """Remove None values from dictionary"""
        return {k: v for k, v in data.items() if v is not None}
    
    @staticmethod
    def convert_snake_to_camel(snake_str: str) -> str:
        """Convert snake_case to camelCase"""
        components = snake_str.split('_')
        return components[0] + ''.join(word.capitalize() for word in components[1:])
    
    @staticmethod
    def convert_camel_to_snake(camel_str: str) -> str:
        """Convert camelCase to snake_case"""
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', camel_str).lower()

class MatchingHelpers:
    """Helpers specific to matching logic"""
    
    @staticmethod
    def calculate_age_compatibility(age1: int, age2: int) -> float:
        """Calculate age compatibility score (0-1)"""
        age_diff = abs(age1 - age2)
        
        # Perfect score for 0-3 year difference
        if age_diff <= 3:
            return 1.0
        # Decreasing score for larger differences
        elif age_diff <= 10:
            return 1.0 - (age_diff - 3) * 0.1
        else:
            return max(0.0, 1.0 - age_diff * 0.05)
    
    @staticmethod
    def calculate_location_compatibility(distance_miles: float) -> float:
        """Calculate location compatibility score (0-1)"""
        if distance_miles <= 10:
            return 1.0
        elif distance_miles <= 50:
            return 1.0 - (distance_miles - 10) * 0.02
        else:
            return max(0.0, 1.0 - distance_miles * 0.01)
    
    @staticmethod
    def calculate_interest_overlap(interests1: List[str], interests2: List[str]) -> float:
        """Calculate interest overlap score (0-1)"""
        if not interests1 or not interests2:
            return 0.0
        
        set1 = set(interest.lower() for interest in interests1)
        set2 = set(interest.lower() for interest in interests2)
        
        intersection = len(set1.intersection(set2))
        union = len(set1.union(set2))
        
        return intersection / union if union > 0 else 0.0
    
    @staticmethod
    def calculate_comprehensive_compatibility(
        age_score: float,
        location_score: float,
        interest_score: float,
        bgp_score: float = None,
        trust_modifier: float = 1.0
    ) -> float:
        """Calculate comprehensive compatibility score"""
        weights = {
            "age": 0.2,
            "location": 0.25,
            "interests": 0.25,
            "bgp": 0.3 if bgp_score else 0.0
        }
        
        # Redistribute weights if BGP score not available
        if not bgp_score:
            weights["age"] = 0.3
            weights["location"] = 0.35
            weights["interests"] = 0.35
            bgp_score = 0.5  # Neutral score
        
        base_score = (
            weights["age"] * age_score +
            weights["location"] * location_score +
            weights["interests"] * interest_score +
            weights["bgp"] * bgp_score
        )
        
        # Apply trust modifier
        final_score = base_score * trust_modifier
        
        return min(1.0, max(0.0, final_score))

class TrustHelpers:
    """Helpers for trust scoring system"""
    
    @staticmethod
    def calculate_trust_modifier(user_trust: int, target_trust: int) -> float:
        """Calculate trust compatibility modifier"""
        trust_diff = abs(user_trust - target_trust)
        
        # Similar trust levels get bonus
        if trust_diff <= 100:
            return 1.1
        elif trust_diff <= 200:
            return 1.0
        else:
            return max(0.8, 1.0 - (trust_diff - 200) * 0.001)
    
    @staticmethod
    def get_trust_tier_from_score(score: int) -> str:
        """Get trust tier from numeric score"""
        if score >= 900:
            return "elite"
        elif score >= 700:
            return "trusted"
        elif score >= 500:
            return "reliable"
        elif score >= 300:
            return "building"
        else:
            return "challenged"
    
    @staticmethod
    def calculate_tier_progress(score: int) -> Dict[str, Any]:
        """Calculate progress within current tier"""
        tiers = [
            ("challenged", 0, 299),
            ("building", 300, 499),
            ("reliable", 500, 699),
            ("trusted", 700, 899),
            ("elite", 900, 1000)
        ]
        
        for tier_name, min_score, max_score in tiers:
            if min_score <= score <= max_score:
                progress = (score - min_score) / (max_score - min_score) if max_score > min_score else 1.0
                next_tier = None
                points_to_next = 0
                
                # Find next tier
                tier_index = next(i for i, (name, _, _) in enumerate(tiers) if name == tier_name)
                if tier_index < len(tiers) - 1:
                    next_tier = tiers[tier_index + 1][0]
                    points_to_next = tiers[tier_index + 1][1] - score
                
                return {
                    "current_tier": tier_name,
                    "progress": progress,
                    "next_tier": next_tier,
                    "points_to_next": max(0, points_to_next)
                }
        
        return {
            "current_tier": "challenged",
            "progress": 0.0,
            "next_tier": "building",
            "points_to_next": 300 - score
        }

class BGPHelpers:
    """Helpers for BGP (Behavioral Graph Profiling) system"""
    
    @staticmethod
    def normalize_trait_confidence(events_count: int, max_events: int = 100) -> float:
        """Calculate trait confidence based on event count"""
        if events_count <= 0:
            return 0.0
        
        # Logarithmic growth with diminishing returns
        confidence = min(1.0, math.log(events_count + 1) / math.log(max_events + 1))
        return round(confidence, 3)
    
    @staticmethod
    def calculate_personality_distance(traits1: Dict[str, float], traits2: Dict[str, float]) -> float:
        """Calculate Euclidean distance between personality profiles"""
        if not traits1 or not traits2:
            return 1.0  # Maximum distance
        
        common_traits = set(traits1.keys()).intersection(set(traits2.keys()))
        if not common_traits:
            return 1.0
        
        squared_differences = sum(
            (traits1[trait] - traits2[trait]) ** 2 
            for trait in common_traits
        )
        
        distance = math.sqrt(squared_differences / len(common_traits))
        return min(1.0, distance)
    
    @staticmethod
    def categorize_traits(traits: Dict[str, float]) -> Dict[str, Dict[str, float]]:
        """Categorize traits into personality dimensions"""
        categories = {
            "big_five": {
                "openness": traits.get("openness", 0.5),
                "conscientiousness": traits.get("conscientiousness", 0.5),
                "extraversion": traits.get("extraversion", 0.5),
                "agreeableness": traits.get("agreeableness", 0.5),
                "neuroticism": traits.get("neuroticism", 0.5)
            },
            "emotional": {
                "emotional_intelligence": traits.get("emotional_intelligence", 0.5),
                "empathy": traits.get("empathy", 0.5),
                "attachment_style": traits.get("attachment_style", 0.5)
            },
            "communication": {
                "communication_style": traits.get("communication_style", 0.5),
                "humor_style": traits.get("humor_style", 0.5),
                "conflict_resolution": traits.get("conflict_resolution", 0.5)
            },
            "lifestyle": {
                "adventure_seeking": traits.get("adventure_seeking", 0.5),
                "social_preferences": traits.get("social_preferences", 0.5),
                "lifestyle_compatibility": traits.get("lifestyle_compatibility", 0.5)
            },
            "values": {
                "family_values": traits.get("family_values", 0.5),
                "career_ambition": traits.get("career_ambition", 0.5),
                "cultural_interests": traits.get("cultural_interests", 0.5)
            }
        }
        
        return categories

class PhotoHelpers:
    """Helpers for photo reveal system"""
    
    @staticmethod
    def calculate_emotional_readiness(conversation_data: Dict) -> float:
        """Calculate emotional readiness for photo reveal"""
        factors = {
            "message_count": min(1.0, conversation_data.get("message_count", 0) / 20),
            "conversation_depth": conversation_data.get("depth_score", 0.5),
            "emotional_connection": conversation_data.get("emotional_score", 0.5),
            "mutual_interest": conversation_data.get("mutual_interest", 0.5),
            "time_spent": min(1.0, conversation_data.get("minutes_spent", 0) / 60)
        }
        
        weights = {
            "message_count": 0.2,
            "conversation_depth": 0.25,
            "emotional_connection": 0.3,
            "mutual_interest": 0.15,
            "time_spent": 0.1
        }
        
        readiness_score = sum(
            factors[factor] * weights[factor] 
            for factor in factors
        )
        
        return min(1.0, readiness_score)
    
    @staticmethod
    def get_reveal_stage_requirements(stage: str) -> Dict[str, Any]:
        """Get requirements for each reveal stage"""
        stages = {
            "preparation": {
                "min_messages": 5,
                "min_emotional_score": 0.3,
                "description": "Building initial connection"
            },
            "intention": {
                "min_messages": 10,
                "min_emotional_score": 0.5,
                "description": "Sharing deeper intentions"
            },
            "readiness": {
                "min_messages": 15,
                "min_emotional_score": 0.7,
                "description": "Confirming mutual readiness"
            },
            "countdown": {
                "min_messages": 20,
                "min_emotional_score": 0.7,
                "description": "Final preparation moment"
            },
            "reveal": {
                "min_messages": 20,
                "min_emotional_score": 0.7,
                "description": "Sacred reveal moment"
            },
            "integration": {
                "min_messages": 25,
                "min_emotional_score": 0.8,
                "description": "Processing the reveal together"
            }
        }
        
        return stages.get(stage, {})

class NotificationHelpers:
    """Helpers for notification system"""
    
    @staticmethod
    def format_notification_text(notification_type: str, context: Dict) -> str:
        """Format notification text based on type and context"""
        templates = {
            "new_match": "🎉 You have a new match with {name}!",
            "message_received": "💬 {name} sent you a message",
            "photo_reveal_ready": "📸 {name} is ready for photo reveal",
            "trust_tier_upgrade": "🏆 Congratulations! You've reached {tier} tier",
            "subscription_expiring": "⏰ Your {plan} subscription expires in {days} days",
            "profile_view": "👀 {name} viewed your profile",
            "super_like_received": "⭐ {name} super liked you!",
            "ai_suggestion": "💡 AI Wingman has conversation suggestions for {name}"
        }
        
        template = templates.get(notification_type, "You have a new notification")
        
        try:
            return template.format(**context)
        except KeyError:
            return template

class AnalyticsHelpers:
    """Helpers for analytics and metrics"""
    
    @staticmethod
    def calculate_engagement_score(user_data: Dict) -> float:
        """Calculate user engagement score"""
        factors = {
            "daily_logins": min(1.0, user_data.get("daily_logins", 0) / 7),
            "messages_sent": min(1.0, user_data.get("messages_sent", 0) / 20),
            "profile_updates": min(1.0, user_data.get("profile_updates", 0) / 5),
            "matches_made": min(1.0, user_data.get("matches_made", 0) / 10),
            "photos_shared": min(1.0, user_data.get("photos_shared", 0) / 3)
        }
        
        weights = {
            "daily_logins": 0.3,
            "messages_sent": 0.25,
            "profile_updates": 0.15,
            "matches_made": 0.2,
            "photos_shared": 0.1
        }
        
        engagement = sum(
            factors[factor] * weights[factor] 
            for factor in factors
        )
        
        return min(1.0, engagement)
    
    @staticmethod
    def calculate_conversion_metrics(user_data: Dict) -> Dict[str, float]:
        """Calculate conversion metrics for business analytics"""
        total_users = user_data.get("total_users", 1)
        
        return {
            "free_to_paid_conversion": user_data.get("paid_users", 0) / total_users,
            "trial_to_subscription": user_data.get("subscribers", 0) / max(1, user_data.get("trial_users", 1)),
            "daily_active_rate": user_data.get("daily_active", 0) / total_users,
            "monthly_active_rate": user_data.get("monthly_active", 0) / total_users,
            "retention_rate": user_data.get("retained_users", 0) / total_users
        }

class APIResponseHelpers:
    """Helpers for API response formatting"""
    
    @staticmethod
    def create_success_response(data: Any = None, message: str = "Success") -> Dict[str, Any]:
        """Create standardized success response"""
        response = {
            "success": True,
            "message": message,
            "timestamp": DateTimeHelpers.utc_now().isoformat()
        }
        
        if data is not None:
            response["data"] = data
        
        return response
    
    @staticmethod
    def create_error_response(message: str, error_code: str = None, details: Any = None) -> Dict[str, Any]:
        """Create standardized error response"""
        response = {
            "success": False,
            "message": message,
            "timestamp": DateTimeHelpers.utc_now().isoformat()
        }
        
        if error_code:
            response["error_code"] = error_code
        
        if details:
            response["details"] = details
        
        return response
    
    @staticmethod
    def create_paginated_response(
        items: List[Any],
        page: int,
        limit: int,
        total: int,
        message: str = "Success"
    ) -> Dict[str, Any]:
        """Create paginated response"""
        total_pages = math.ceil(total / limit) if limit > 0 else 1
        
        return {
            "success": True,
            "message": message,
            "data": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            },
            "timestamp": DateTimeHelpers.utc_now().isoformat()
        }

class ValidationHelpers:
    """Additional validation helpers"""
    
    @staticmethod
    def is_business_hours(timezone_name: str = "UTC") -> bool:
        """Check if current time is within business hours"""
        import pytz
        
        try:
            tz = pytz.timezone(timezone_name)
            local_time = DateTimeHelpers.utc_now().astimezone(tz)
            
            # Business hours: 9 AM to 6 PM, Monday to Friday
            if local_time.weekday() >= 5:  # Weekend
                return False
            
            return 9 <= local_time.hour < 18
        except Exception:
            return True  # Default to allowing if timezone error
    
    @staticmethod
    def calculate_spam_score(text: str) -> float:
        """Calculate spam probability score (0-1)"""
        spam_indicators = [
            r"\b(click here|visit now|buy now|limited time)\b",
            r"https?://[^\s]+",
            r"\$\d+",
            r"\b(free|win|prize|congratulations)\b",
            r"[A-Z]{3,}",  # ALL CAPS words
            r"!!+",  # Multiple exclamation marks
            r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b"  # Phone numbers
        ]
        
        score = 0
        for pattern in spam_indicators:
            if re.search(pattern, text, re.IGNORECASE):
                score += 0.15
        
        # Additional factors
        if len(text) > 1000:
            score += 0.1
        
        if text.count('!') > 5:
            score += 0.1
        
        return min(1.0, score)

# Utility decorators
def retry_on_failure(max_retries: int = 3, delay: float = 1.0):
    """Decorator to retry function on failure"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        time.sleep(delay * (2 ** attempt))  # Exponential backoff
                    continue
            
            raise last_exception
        return wrapper
    return decorator

def log_execution_time(func):
    """Decorator to log function execution time"""
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            logger.info(f"{func.__name__} executed in {execution_time:.3f} seconds")
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"{func.__name__} failed after {execution_time:.3f} seconds: {e}")
            raise
    return wrapper

# Import time for decorators
import time