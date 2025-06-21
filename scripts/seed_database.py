#!/usr/bin/env python3
"""
ApexMatch Database Seeding Script
Creates sample data for development and testing
"""

import asyncio
import random
import json
import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
import bcrypt
import uuid
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Import models
try:
    from models.user import User, SubscriptionTier, OnboardingStatus
    from models.bgp import BGPProfile
    from models.trust import TrustProfile, TrustTier
    from models.match import Match, MatchStatus
    from models.conversation import Conversation, Message, MessageType, EmotionalTone
    from models.subscription import Subscription, Payment, PaymentStatus
    from database import engine, Base
    from config import settings
except ImportError as e:
    logger.error(f"Failed to import models: {e}")
    logger.error("Make sure you're running this from the project root directory")
    sys.exit(1)

# Configuration
SEED_CONFIG = {
    "users": 50,
    "premium_users_percentage": 0.3,
    "matches_per_user": 3,
    "conversations_percentage": 0.6,
    "messages_per_conversation": 15,
    "trust_violations_percentage": 0.1
}

# Sample data
SAMPLE_NAMES = [
    "Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "Gabriel", "Hannah",
    "Ian", "Julia", "Kevin", "Luna", "Marcus", "Nina", "Oliver", "Petra",
    "Quinn", "Rosa", "Samuel", "Tara", "Uriel", "Violet", "William", "Xara",
    "Yves", "Zoe", "Adrian", "Bella", "Connor", "Delilah", "Elena", "Felix",
    "Grace", "Hugo", "Iris", "James", "Kira", "Logan", "Maya", "Nathan",
    "Olivia", "Pablo", "Quinn", "Ruby", "Sebastian", "Thea", "Uma", "Victor",
    "Wendy", "Xavier"
]

SAMPLE_LOCATIONS = [
    "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Phoenix, AZ",
    "Philadelphia, PA", "San Antonio, TX", "San Diego, CA", "Dallas, TX", "San Jose, CA",
    "Austin, TX", "Jacksonville, FL", "Fort Worth, TX", "Columbus, OH", "Charlotte, NC",
    "San Francisco, CA", "Indianapolis, IN", "Seattle, WA", "Denver, CO", "Washington, DC",
    "Boston, MA", "El Paso, TX", "Nashville, TN", "Detroit, MI", "Oklahoma City, OK",
    "Portland, OR", "Las Vegas, NV", "Memphis, TN", "Louisville, KY", "Baltimore, MD",
    "Milwaukee, WI", "Albuquerque, NM", "Tucson, AZ", "Fresno, CA", "Sacramento, CA",
    "Mesa, AZ", "Kansas City, MO", "Atlanta, GA", "Long Beach, CA", "Colorado Springs, CO"
]

SAMPLE_BIOS = [
    "Love hiking and discovering new coffee shops. Looking for someone who shares my passion for adventure.",
    "Bookworm by day, chef by night. Let's cook together and discuss our favorite novels.",
    "Yoga instructor who believes in mindful living. Seeking genuine connections and deep conversations.",
    "Photographer capturing life's beautiful moments. Would love to explore the world with someone special.",
    "Tech enthusiast with a creative soul. Building apps by day, painting by night.",
    "Fitness lover who enjoys outdoor activities. Let's go for a run or hike together!",
    "Music producer and vinyl collector. Life's too short for bad music and shallow conversations.",
    "Travel blogger who's been to 30+ countries. Ready to explore life with the right person.",
    "Dog lover and weekend warrior. My golden retriever is my co-pilot in life.",
    "Foodie always hunting for the best local restaurants. Bonus points if you know hidden gems!",
    "Meditation teacher seeking balance in all things. Let's find harmony together.",
    "Rock climber and outdoor enthusiast. Adventure is calling - will you answer with me?",
    "Artist who sees beauty in everyday moments. Looking for someone who appreciates creativity.",
    "Entrepreneur building something meaningful. Work hard, love harder.",
    "Wine enthusiast and weekend chef. Let's share a bottle and our life stories."
]

SAMPLE_MESSAGES = [
    "Hey! Your profile really caught my attention. How's your day going?",
    "I love that you mentioned hiking in your bio. What's your favorite trail?",
    "Your smile is absolutely infectious! Tell me something that made you happy today.",
    "I see we both love coffee - what's your go-to order?",
    "Your photography skills are amazing! Do you have a favorite subject to shoot?",
    "I'm intrigued by your passion for cooking. What's your signature dish?",
    "We seem to have similar music taste. Have you discovered any new artists lately?",
    "Your sense of adventure is inspiring. What's the most spontaneous thing you've done?",
    "I appreciate your thoughtful responses. What's something you're grateful for today?",
    "Your book recommendations sound fantastic. What are you reading right now?",
    "I love your positive energy! What keeps you motivated?",
    "That's such an interesting perspective. I never thought about it that way.",
    "You have such a great sense of humor! 😄",
    "I feel like we really connect on a deeper level.",
    "Thanks for sharing that story - it really resonated with me."
]

class DatabaseSeeder:
    """Main class for seeding the ApexMatch database"""
    
    def __init__(self):
        self.engine = engine
        self.Session = sessionmaker(bind=self.engine)
        self.session = self.Session()
        
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.session.rollback()
        else:
            self.session.commit()
        self.session.close()
    
    def clear_existing_data(self) -> None:
        """Clear existing data (for development only)"""
        logger.warning("Clearing existing data...")
        
        # Order matters due to foreign key constraints
        tables_to_clear = [
            'messages', 'conversations', 'matches', 'trust_violations',
            'payments', 'subscriptions', 'trust_profiles', 'bgp_profiles', 'users'
        ]
        
        for table in tables_to_clear:
            try:
                self.session.execute(f"DELETE FROM {table}")
                logger.info(f"Cleared {table}")
            except Exception as e:
                logger.warning(f"Could not clear {table}: {e}")
        
        self.session.commit()
        logger.info("✅ Existing data cleared")
    
    def create_users(self) -> List[User]:
        """Create sample users with realistic data"""
        logger.info(f"Creating {SEED_CONFIG['users']} users...")
        
        users = []
        for i in range(SEED_CONFIG['users']):
            # Generate user data
            name = random.choice(SAMPLE_NAMES)
            age = random.randint(21, 45)
            location = random.choice(SAMPLE_LOCATIONS)
            bio = random.choice(SAMPLE_BIOS)
            
            # Create user
            user = User(
                email=f"{name.lower()}{i}@example.com",
                first_name=name,
                age=age,
                location=location,
                bio=bio,
                subscription_tier=SubscriptionTier.FREE,
                onboarding_status=OnboardingStatus.READY_TO_MATCH,
                is_active=True,
                is_verified=True,
                timezone="America/New_York",
                last_active=datetime.utcnow() - timedelta(hours=random.randint(0, 72))
            )
            
            # Set password
            user.set_password("password123")
            
            # Random subscription tier
            if random.random() < SEED_CONFIG['premium_users_percentage']:
                if random.random() < 0.5:
                    user.subscription_tier = SubscriptionTier.CONNECTION
                else:
                    user.subscription_tier = SubscriptionTier.ELITE
                user.subscription_expires_at = datetime.utcnow() + timedelta(days=30)
            
            self.session.add(user)
            users.append(user)
        
        self.session.flush()  # Get user IDs
        
        logger.info(f"✅ Created {len(users)} users")
        return users
    
    def create_bgp_profiles(self, users: List[User]) -> List[BGPProfile]:
        """Create Behavioral Graph Profiles for users"""
        logger.info("Creating BGP profiles...")
        
        bgp_profiles = []
        for user in users:
            # Generate realistic behavioral dimensions
            bgp = BGPProfile(
                user_id=user.id,
                
                # Communication patterns (with some correlation)
                response_speed_avg=random.uniform(0.2, 0.9),
                response_consistency=random.uniform(0.4, 0.95),
                conversation_depth_pref=random.uniform(0.3, 0.9),
                emoji_usage_rate=random.uniform(0.1, 0.8),
                message_length_avg=random.uniform(0.3, 0.8),
                
                # Emotional rhythm
                emotional_volatility=random.uniform(0.1, 0.7),
                vulnerability_comfort=random.uniform(0.2, 0.8),
                conflict_resolution_style=random.uniform(0.2, 0.9),
                empathy_indicators=random.uniform(0.4, 0.95),
                humor_compatibility=random.uniform(0.3, 0.9),
                
                # Attachment & trust patterns
                attachment_security=random.uniform(0.3, 0.9),
                ghosting_likelihood=random.uniform(0.0, 0.3),
                commitment_readiness=random.uniform(0.4, 0.9),
                boundary_respect=random.uniform(0.6, 1.0),
                trust_building_pace=random.uniform(0.2, 0.8),
                
                # Decision making & focus
                decision_making_speed=random.uniform(0.2, 0.9),
                spontaneity_vs_planning=random.uniform(0.1, 0.9),
                focus_stability=random.uniform(0.3, 0.9),
                risk_tolerance=random.uniform(0.2, 0.8),
                introspection_level=random.uniform(0.3, 0.9),
                
                # Activity & energy patterns
                activity_level=random.uniform(0.2, 0.9),
                social_battery=random.uniform(0.2, 0.9),
                morning_evening_person=random.uniform(0.0, 1.0),
                routine_vs_variety=random.uniform(0.1, 0.9),
                
                # Profile quality
                data_confidence=random.uniform(0.5, 0.95),
                profile_stability=random.uniform(0.6, 0.9),
                
                # Initialize with some events
                communication_events=[],
                emotional_events=[],
                decision_events=[],
                focus_events=[]
            )
            
            # Add some sample behavioral events
            for _ in range(random.randint(5, 20)):
                bgp.log_communication_event(
                    event_type=random.choice(["message_sent", "response_time", "emoji_used"]),
                    metadata={"sample": True, "value": random.uniform(0, 1)}
                )
            
            self.session.add(bgp)
            bgp_profiles.append(bgp)
        
        logger.info(f"✅ Created {len(bgp_profiles)} BGP profiles")
        return bgp_profiles
    
    def create_trust_profiles(self, users: List[User]) -> List[TrustProfile]:
        """Create trust profiles with realistic distributions"""
        logger.info("Creating trust profiles...")
        
        trust_profiles = []
        for user in users:
            # Generate trust score with realistic distribution
            # Most users should be in standard range
            trust_score = random.betavariate(2, 2)  # Bell curve around 0.5
            
            # Adjust based on subscription tier (premium users tend to be more trustworthy)
            if user.subscription_tier != SubscriptionTier.FREE:
                trust_score = min(1.0, trust_score + 0.2)
            
            trust = TrustProfile(
                user_id=user.id,
                overall_trust_score=trust_score,
                
                # Component scores
                communication_reliability=min(1.0, trust_score + random.uniform(-0.1, 0.1)),
                emotional_honesty=min(1.0, trust_score + random.uniform(-0.1, 0.1)),
                respect_score=min(1.0, trust_score + random.uniform(-0.05, 0.15)),
                follow_through_rate=min(1.0, trust_score + random.uniform(-0.15, 0.1)),
                conflict_resolution=min(1.0, trust_score + random.uniform(-0.1, 0.1)),
                
                # Behavioral tracking
                ghosting_count=random.randint(0, 2) if trust_score < 0.6 else 0,
                ghosting_rate=random.uniform(0, 0.3) if trust_score < 0.6 else random.uniform(0, 0.1),
                reported_violations=random.randint(0, 1) if trust_score < 0.4 else 0,
                confirmed_violations=0,
                
                # Positive tracking
                successful_connections=random.randint(1, 10),
                positive_feedback_count=random.randint(0, 15),
                helped_others_count=random.randint(0, 5),
                
                # Trust building
                trust_building_streak=random.randint(0, 30),
                last_positive_action=datetime.utcnow() - timedelta(days=random.randint(0, 7))
            )
            
            # Set trust tier based on score
            trust.update_trust_tier()
            
            # Some users might be in reformation
            if trust.overall_trust_score < 0.4 and random.random() < 0.3:
                trust.start_reformation()
            
            self.session.add(trust)
            trust_profiles.append(trust)
        
        logger.info(f"✅ Created {len(trust_profiles)} trust profiles")
        return trust_profiles
    
    def create_subscriptions(self, users: List[User]) -> List[Subscription]:
        """Create subscription records for premium users"""
        logger.info("Creating subscriptions...")
        
        subscriptions = []
        for user in users:
            if user.subscription_tier != SubscriptionTier.FREE:
                subscription = Subscription(
                    user_id=user.id,
                    tier=user.subscription_tier,
                    status="active",
                    amount=19.99 if user.subscription_tier == SubscriptionTier.CONNECTION else 39.99,
                    currency="USD",
                    current_period_start=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                    current_period_end=datetime.utcnow() + timedelta(days=30),
                    stripe_customer_id=f"cus_test_{user.id}",
                    stripe_subscription_id=f"sub_test_{user.id}"
                )
                
                self.session.add(subscription)
                subscriptions.append(subscription)
                
                # Create a successful payment
                payment = Payment(
                    subscription_id=subscription.id,
                    user_id=user.id,
                    amount=subscription.amount,
                    currency="USD",
                    status=PaymentStatus.SUCCEEDED,
                    description=f"{subscription.tier.value.title()} subscription",
                    processed_at=subscription.current_period_start,
                    stripe_payment_intent_id=f"pi_test_{user.id}"
                )
                
                self.session.add(payment)
        
        logger.info(f"✅ Created {len(subscriptions)} subscriptions")
        return subscriptions
    
    def create_matches(self, users: List[User], bgp_profiles: List[BGPProfile], 
                      trust_profiles: List[TrustProfile]) -> List[Match]:
        """Create behavioral matches between users"""
        logger.info("Creating matches...")
        
        matches = []
        bgp_by_user = {bgp.user_id: bgp for bgp in bgp_profiles}
        trust_by_user = {trust.user_id: trust for trust in trust_profiles}
        
        for user in users[:30]:  # Create matches for first 30 users
            user_bgp = bgp_by_user[user.id]
            user_trust = trust_by_user[user.id]
            
            # Find compatible users
            potential_matches = []
            for other_user in users:
                if other_user.id == user.id:
                    continue
                
                other_bgp = bgp_by_user[other_user.id]
                other_trust = trust_by_user[other_user.id]
                
                # Calculate compatibility
                bgp_compatibility = user_bgp.calculate_compatibility(other_bgp)
                trust_compatibility = 1.0 - abs(user_trust.overall_trust_score - other_trust.overall_trust_score)
                
                # Check trust tier compatibility
                if not user_trust.can_match_with_tier(other_trust.trust_tier):
                    continue
                
                overall_score = (bgp_compatibility * 0.7 + trust_compatibility * 0.3)
                
                if overall_score > 0.6:  # Good compatibility threshold
                    potential_matches.append((other_user, bgp_compatibility, trust_compatibility, overall_score))
            
            # Sort by compatibility and take top matches
            potential_matches.sort(key=lambda x: x[3], reverse=True)
            
            # Create matches
            for i, (match_user, bgp_comp, trust_comp, overall) in enumerate(potential_matches[:SEED_CONFIG['matches_per_user']]):
                match = Match(
                    initiator_id=user.id,
                    target_id=match_user.id,
                    compatibility_score=bgp_comp,
                    trust_compatibility=trust_comp,
                    overall_match_quality=overall,
                    status=MatchStatus.ACTIVE if random.random() > 0.3 else MatchStatus.PENDING,
                    emotional_connection_score=random.uniform(0.1, 0.8),
                    conversation_depth_score=random.uniform(0.1, 0.7),
                    mutual_interest_indicators=random.randint(0, 8),
                    created_at=datetime.utcnow() - timedelta(days=random.randint(1, 14)),
                    last_activity_at=datetime.utcnow() - timedelta(hours=random.randint(1, 48))
                )
                
                # Set match explanation
                explanations = user_bgp.get_compatibility_explanation(bgp_by_user[match_user.id])
                match.match_explanation = explanations
                
                # Some matches are mutual
                if random.random() > 0.4:
                    match.initiator_engaged = True
                    match.target_engaged = True
                    match.first_message_sent_at = match.created_at + timedelta(hours=random.randint(1, 24))
                
                self.session.add(match)
                matches.append(match)
        
        logger.info(f"✅ Created {len(matches)} matches")
        return matches
    
    def create_conversations(self, matches: List[Match]) -> List[Conversation]:
        """Create conversations for active matches"""
        logger.info("Creating conversations...")
        
        conversations = []
        
        # Select matches that should have conversations
        active_matches = [m for m in matches if m.status == MatchStatus.ACTIVE and m.initiator_engaged and m.target_engaged]
        conversation_matches = random.sample(active_matches, int(len(active_matches) * SEED_CONFIG['conversations_percentage']))
        
        for match in conversation_matches:
            conversation = Conversation(
                match_id=match.id,
                participant_1_id=match.initiator_id,
                participant_2_id=match.target_id,
                is_active=True,
                is_blind=True,  # Start with blind conversations
                first_message_at=match.first_message_sent_at,
                last_message_at=match.last_activity_at,
                created_at=match.first_message_sent_at or match.created_at
            )
            
            self.session.add(conversation)
            self.session.flush()  # Get conversation ID
            
            # Create messages
            self.create_messages(conversation, match)
            
            # Update conversation metrics
            conversation.analyze_emotional_connection()
            conversation.analyze_conversation_depth()
            conversation.detect_mutual_interest()
            
            # Some conversations might be ready for reveal
            if conversation.emotional_connection_score >= 0.7:
                conversation.is_blind = False
                match.reveal_status = "completed"
                match.reveal_completed_at = conversation.last_message_at
            
            conversations.append(conversation)
        
        logger.info(f"✅ Created {len(conversations)} conversations")
        return conversations
    
    def create_messages(self, conversation: Conversation, match: Match) -> None:
        """Create realistic message exchanges"""
        message_count = random.randint(5, SEED_CONFIG['messages_per_conversation'])
        
        participants = [conversation.participant_1_id, conversation.participant_2_id]
        current_time = conversation.first_message_at or conversation.created_at
        
        for i in range(message_count):
            # Alternate between participants with some randomness
            if i == 0:
                sender_id = conversation.participant_1_id
            else:
                sender_id = random.choice(participants)
            
            # Select message content
            content = random.choice(SAMPLE_MESSAGES)
            
            # Create message
            message = Message(
                conversation_id=conversation.id,
                sender_id=sender_id,
                content=content,
                message_type=MessageType.TEXT,
                created_at=current_time,
                word_count=len(content.split()),
                contains_question="?" in content,
                contains_emoji=any(ord(char) > 127 for char in content)
            )
            
            # Analyze message content
            message.analyze_content()
            
            # Random emotional tone
            message.emotional_tone = random.choice(list(EmotionalTone))
            message.sentiment_score = random.uniform(-0.2, 0.8)  # Mostly positive
            
            self.session.add(message)
            
            # Update conversation metrics
            conversation.total_messages += 1
            conversation.last_message_at = current_time
            
            if sender_id == conversation.participant_1_id:
                conversation.participant_1_message_count += 1
            else:
                conversation.participant_2_message_count += 1
            
            # Increment time for next message
            current_time += timedelta(minutes=random.randint(10, 480))  # 10 min to 8 hours
    
    def create_sample_admin_user(self) -> User:
        """Create an admin user for testing"""
        logger.info("Creating admin user...")
        
        admin = User(
            email="admin@apexmatch.com",
            first_name="Admin",
            age=30,
            location="San Francisco, CA",
            bio="ApexMatch platform administrator",
            subscription_tier=SubscriptionTier.ELITE,
            onboarding_status=OnboardingStatus.READY_TO_MATCH,
            is_active=True,
            is_verified=True,
            timezone="America/Los_Angeles"
        )
        
        admin.set_password("admin123")
        self.session.add(admin)
        self.session.flush()
        
        # Create BGP and trust profiles
        bgp = BGPProfile(
            user_id=admin.id,
            data_confidence=1.0,
            profile_stability=1.0
        )
        
        trust = TrustProfile(
            user_id=admin.id,
            overall_trust_score=1.0,
            trust_tier=TrustTier.ELITE,
            communication_reliability=1.0,
            emotional_honesty=1.0,
            respect_score=1.0,
            follow_through_rate=1.0,
            conflict_resolution=1.0
        )
        
        self.session.add(bgp)
        self.session.add(trust)
        
        logger.info("✅ Created admin user (admin@apexmatch.com / admin123)")
        return admin
    
    def seed_database(self, clear_existing: bool = False) -> Dict[str, Any]:
        """Main seeding function"""
        start_time = datetime.utcnow()
        logger.info("🌱 Starting database seeding...")
        
        try:
            if clear_existing:
                self.clear_existing_data()
            
            # Create core data
            admin_user = self.create_sample_admin_user()
            users = self.create_users()
            all_users = [admin_user] + users
            
            bgp_profiles = self.create_bgp_profiles(all_users)
            trust_profiles = self.create_trust_profiles(all_users)
            subscriptions = self.create_subscriptions(all_users)
            
            matches = self.create_matches(all_users, bgp_profiles, trust_profiles)
            conversations = self.create_conversations(matches)
            
            # Commit all changes
            self.session.commit()
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            # Generate summary
            summary = {
                "success": True,
                "duration_seconds": duration,
                "created": {
                    "users": len(all_users),
                    "bgp_profiles": len(bgp_profiles),
                    "trust_profiles": len(trust_profiles),
                    "subscriptions": len(subscriptions),
                    "matches": len(matches),
                    "conversations": len(conversations),
                    "messages": sum(conv.total_messages for conv in conversations)
                },
                "admin_credentials": {
                    "email": "admin@apexmatch.com",
                    "password": "admin123"
                },
                "sample_users": [
                    {
                        "email": user.email,
                        "name": user.first_name,
                        "subscription_tier": user.subscription_tier.value,
                        "trust_score": next(t.overall_trust_score for t in trust_profiles if t.user_id == user.id)
                    }
                    for user in all_users[:5]
                ]
            }
            
            logger.info("✅ Database seeding completed successfully!")
            logger.info(f"   Duration: {duration:.2f} seconds")
            logger.info(f"   Users: {len(all_users)}")
            logger.info(f"   Matches: {len(matches)}")
            logger.info(f"   Conversations: {len(conversations)}")
            
            return summary
            
        except Exception as e:
            logger.error(f"❌ Database seeding failed: {e}")
            self.session.rollback()
            raise
    
    def generate_analytics_data(self) -> Dict[str, Any]:
        """Generate analytics summary of seeded data"""
        logger.info("Generating analytics data...")
        
        # Query data for analytics
        users_by_tier = {}
        trust_distribution = {"toxic": 0, "low": 0, "standard": 0, "high": 0, "elite": 0}
        bgp_confidence_avg = 0
        
        users = self.session.query(User).all()
        trust_profiles = self.session.query(TrustProfile).all()
        bgp_profiles = self.session.query(BGPProfile).all()
        matches = self.session.query(Match).all()
        conversations = self.session.query(Conversation).all()
        
        # Calculate statistics
        for user in users:
            tier = user.subscription_tier.value
            users_by_tier[tier] = users_by_tier.get(tier, 0) + 1
        
        for trust in trust_profiles:
            trust_distribution[trust.trust_tier.value] += 1
        
        if bgp_profiles:
            bgp_confidence_avg = sum(bgp.data_confidence for bgp in bgp_profiles) / len(bgp_profiles)
        
        match_success_rate = len([m for m in matches if m.status == MatchStatus.ACTIVE]) / len(matches) if matches else 0
        conversation_rate = len(conversations) / len(matches) if matches else 0
        
        avg_emotional_connection = sum(c.emotional_connection_score for c in conversations) / len(conversations) if conversations else 0
        
        reveal_ready = len([c for c in conversations if c.is_ready_for_reveal()])
        
        analytics = {
            "user_statistics": {
                "total_users": len(users),
                "by_subscription_tier": users_by_tier,
                "average_age": sum(u.age for u in users if u.age) / len([u for u in users if u.age])
            },
            "trust_statistics": {
                "distribution": trust_distribution,
                "average_score": sum(t.overall_trust_score for t in trust_profiles) / len(trust_profiles)
            },
            "bgp_statistics": {
                "average_confidence": bgp_confidence_avg,
                "profiles_ready": len([bgp for bgp in bgp_profiles if bgp.is_ready_for_matching()])
            },
            "matching_statistics": {
                "total_matches": len(matches),
                "success_rate": match_success_rate,
                "average_compatibility": sum(m.compatibility_score for m in matches) / len(matches) if matches else 0
            },
            "conversation_statistics": {
                "total_conversations": len(conversations),
                "conversation_rate": conversation_rate,
                "average_emotional_connection": avg_emotional_connection,
                "ready_for_reveal": reveal_ready,
                "total_messages": sum(c.total_messages for c in conversations)
            }
        }
        
        return analytics


def main():
    """Main function to run database seeding"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Seed ApexMatch database with sample data")
    parser.add_argument("--clear", action="store_true", help="Clear existing data before seeding")
    parser.add_argument("--users", type=int, default=50, help="Number of users to create")
    parser.add_argument("--matches", type=int, default=3, help="Matches per user")
    parser.add_argument("--analytics", action="store_true", help="Generate analytics report")
    parser.add_argument("--output", type=str, help="Output file for analytics data")
    parser.add_argument("--config", type=str, help="JSON config file for seeding parameters")
    
    args = parser.parse_args()
    
    # Update configuration from arguments
    if args.users:
        SEED_CONFIG["users"] = args.users
    if args.matches:
        SEED_CONFIG["matches_per_user"] = args.matches
    
    # Load custom configuration if provided
    if args.config:
        try:
            with open(args.config, 'r') as f:
                custom_config = json.load(f)
                SEED_CONFIG.update(custom_config)
                logger.info(f"Loaded configuration from {args.config}")
        except Exception as e:
            logger.warning(f"Could not load config file {args.config}: {e}")
    
    # Print header
    print("\n" + "="*60)
    print("🌱 APEXMATCH DATABASE SEEDING")
    print("="*60)
    print(f"Configuration:")
    print(f"  Users to create: {SEED_CONFIG['users']}")
    print(f"  Matches per user: {SEED_CONFIG['matches_per_user']}")
    print(f"  Premium users: {SEED_CONFIG['premium_users_percentage']*100:.0f}%")
    print(f"  Clear existing: {args.clear}")
    print("="*60 + "\n")
    
    try:
        # Check database connection
        try:
            engine.execute("SELECT 1")
            logger.info("✅ Database connection successful")
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            sys.exit(1)
        
        # Run seeding
        with DatabaseSeeder() as seeder:
            summary = seeder.seed_database(clear_existing=args.clear)
            
            # Generate analytics if requested
            if args.analytics:
                analytics = seeder.generate_analytics_data()
                summary["analytics"] = analytics
            
            # Output results
            print("\n" + "="*60)
            print("🎉 SEEDING COMPLETED SUCCESSFULLY!")
            print("="*60)
            print(f"Duration: {summary['duration_seconds']:.2f} seconds")
            print(f"Users created: {summary['created']['users']}")
            print(f"Matches created: {summary['created']['matches']}")
            print(f"Conversations: {summary['created']['conversations']}")
            print(f"Messages: {summary['created']['messages']}")
            print("\n🔑 Admin Credentials:")
            print(f"  Email: {summary['admin_credentials']['email']}")
            print(f"  Password: {summary['admin_credentials']['password']}")
            
            print("\n👥 Sample Users:")
            for user in summary['sample_users']:
                print(f"  {user['email']} ({user['name']}) - {user['subscription_tier']} - Trust: {user['trust_score']:.2f}")
            
            if args.analytics:
                print("\n📊 Analytics Summary:")
                analytics = summary['analytics']
                print(f"  Average Trust Score: {analytics['trust_statistics']['average_score']:.2f}")
                print(f"  Match Success Rate: {analytics['matching_statistics']['success_rate']*100:.1f}%")
                print(f"  Conversation Rate: {analytics['conversation_statistics']['conversation_rate']*100:.1f}%")
                print(f"  Ready for Reveal: {analytics['conversation_statistics']['ready_for_reveal']}")
            
            # Save output file if requested
            if args.output:
                with open(args.output, 'w') as f:
                    json.dump(summary, f, indent=2, default=str)
                print(f"\n💾 Full results saved to: {args.output}")
            
            print("\n🚀 Your ApexMatch platform is now populated with realistic data!")
            print("   Ready to test behavioral matching, trust systems, and photo reveals!")
            print("="*60 + "\n")
            
    except KeyboardInterrupt:
        logger.info("❌ Seeding interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Seeding failed: {e}")
        sys.exit(1)


def create_development_config():
    """Create a sample configuration file for development"""
    config = {
        "users": 100,
        "premium_users_percentage": 0.4,
        "matches_per_user": 5,
        "conversations_percentage": 0.8,
        "messages_per_conversation": 20,
        "trust_violations_percentage": 0.05,
        "custom_scenarios": {
            "create_high_trust_users": 10,
            "create_problem_users": 5,
            "create_power_couples": 3
        }
    }
    
    with open("seed_config_dev.json", "w") as f:
        json.dump(config, f, indent=2)
    
    print("📄 Created seed_config_dev.json with development settings")


def create_test_scenarios(seeder: DatabaseSeeder):
    """Create specific test scenarios"""
    logger.info("Creating test scenarios...")
    
    # Scenario 1: Perfect match couple
    perfect_user1 = User(
        email="perfect1@test.com",
        first_name="Alex",
        age=28,
        location="San Francisco, CA",
        bio="Looking for my soulmate",
        subscription_tier=SubscriptionTier.ELITE
    )
    perfect_user1.set_password("password123")
    
    perfect_user2 = User(
        email="perfect2@test.com", 
        first_name="Jordan",
        age=26,
        location="San Francisco, CA",
        bio="Seeking deep connection",
        subscription_tier=SubscriptionTier.ELITE
    )
    perfect_user2.set_password("password123")
    
    seeder.session.add(perfect_user1)
    seeder.session.add(perfect_user2)
    seeder.session.flush()
    
    # Create highly compatible BGP profiles
    bgp1 = BGPProfile(
        user_id=perfect_user1.id,
        response_speed_avg=0.8,
        empathy_indicators=0.9,
        attachment_security=0.9,
        data_confidence=0.95
    )
    
    bgp2 = BGPProfile(
        user_id=perfect_user2.id,
        response_speed_avg=0.75,  # Slightly different but compatible
        empathy_indicators=0.95,
        attachment_security=0.85,
        data_confidence=0.95
    )
    
    # High trust profiles
    trust1 = TrustProfile(
        user_id=perfect_user1.id,
        overall_trust_score=0.95,
        trust_tier=TrustTier.ELITE
    )
    
    trust2 = TrustProfile(
        user_id=perfect_user2.id,
        overall_trust_score=0.92,
        trust_tier=TrustTier.ELITE
    )
    
    seeder.session.add_all([bgp1, bgp2, trust1, trust2])
    
    # Create perfect match
    perfect_match = Match(
        initiator_id=perfect_user1.id,
        target_id=perfect_user2.id,
        compatibility_score=0.95,
        trust_compatibility=0.96,
        overall_match_quality=0.95,
        status=MatchStatus.ACTIVE,
        emotional_connection_score=0.8,
        conversation_depth_score=0.85,
        initiator_engaged=True,
        target_engaged=True
    )
    
    seeder.session.add(perfect_match)
    
    # Scenario 2: Problem user (low trust)
    problem_user = User(
        email="problem@test.com",
        first_name="Problem",
        age=30,
        location="New York, NY",
        bio="Just here for fun",
        subscription_tier=SubscriptionTier.FREE
    )
    problem_user.set_password("password123")
    seeder.session.add(problem_user)
    seeder.session.flush()
    
    problem_bgp = BGPProfile(
        user_id=problem_user.id,
        ghosting_likelihood=0.7,
        boundary_respect=0.3,
        empathy_indicators=0.2,
        data_confidence=0.6
    )
    
    problem_trust = TrustProfile(
        user_id=problem_user.id,
        overall_trust_score=0.15,
        trust_tier=TrustTier.TOXIC,
        ghosting_count=5,
        ghosting_rate=0.8,
        reported_violations=3,
        confirmed_violations=2
    )
    
    seeder.session.add_all([problem_bgp, problem_trust])
    
    logger.info("✅ Created test scenarios")


if __name__ == "__main__":
    # Check if we're being asked to create a config file
    if len(sys.argv) > 1 and sys.argv[1] == "--create-config":
        create_development_config()
        sys.exit(0)
    
    main()


# Additional utility functions for specific use cases
class AdvancedSeeder(DatabaseSeeder):
    """Extended seeder with advanced scenarios"""
    
    def create_dating_pool_simulation(self, city: str, age_range: tuple, count: int):
        """Create a realistic dating pool for a specific city and age range"""
        logger.info(f"Creating dating pool simulation for {city}, ages {age_range[0]}-{age_range[1]}")
        
        users = []
        for i in range(count):
            age = random.randint(age_range[0], age_range[1])
            
            # Age-based behavior patterns
            if age < 25:
                # Younger users: more social media savvy, higher emoji usage
                emoji_usage = random.uniform(0.6, 0.9)
                social_battery = random.uniform(0.7, 1.0)
                spontaneity = random.uniform(0.6, 0.9)
            elif age > 35:
                # Older users: more deliberate, higher emotional intelligence
                emoji_usage = random.uniform(0.2, 0.6)
                empathy_indicators = random.uniform(0.7, 0.95)
                commitment_readiness = random.uniform(0.7, 0.9)
            else:
                # Middle range: balanced
                emoji_usage = random.uniform(0.4, 0.7)
                empathy_indicators = random.uniform(0.5, 0.8)
                commitment_readiness = random.uniform(0.5, 0.8)
            
            user = User(
                email=f"user_{city.lower()}_{i}@test.com",
                first_name=random.choice(SAMPLE_NAMES),
                age=age,
                location=city,
                bio=random.choice(SAMPLE_BIOS)
            )
            user.set_password("password123")
            
            users.append(user)
        
        return users
    
    def simulate_behavioral_evolution(self, user_id: int, days: int):
        """Simulate how a user's BGP evolves over time"""
        bgp = self.session.query(BGPProfile).filter_by(user_id=user_id).first()
        if not bgp:
            return
        
        # Simulate behavioral events over time
        for day in range(days):
            event_date = datetime.utcnow() - timedelta(days=days-day)
            
            # Random behavioral events
            if random.random() < 0.8:  # 80% chance of communication event
                bgp.log_communication_event(
                    "daily_interaction",
                    {
                        "response_time": random.uniform(60, 3600),
                        "message_quality": random.uniform(0.3, 0.9),
                        "engagement_level": random.uniform(0.4, 1.0)
                    }
                )
            
            if random.random() < 0.3:  # 30% chance of emotional event
                bgp.log_emotional_event(
                    "emotional_expression",
                    random.uniform(0.2, 0.9),
                    {"context": "conversation", "authenticity": random.uniform(0.5, 1.0)}
                )
            
            # Update BGP scores with learning
            if day % 7 == 0:  # Weekly updates
                bgp.data_confidence = min(1.0, bgp.data_confidence + 0.02)
                
                # Small random evolution in traits
                bgp.empathy_indicators += random.uniform(-0.02, 0.02)
                bgp.communication_reliability += random.uniform(-0.02, 0.02)
                
                # Clamp values
                bgp.empathy_indicators = max(0, min(1, bgp.empathy_indicators))
                bgp.communication_reliability = max(0, min(1, bgp.communication_reliability))
    
    def create_success_story(self):
        """Create a complete success story from match to relationship"""
        logger.info("Creating success story scenario...")
        
        # Create two highly compatible users
        user1 = User(
            email="success1@story.com",
            first_name="Emma",
            age=29,
            location="Austin, TX",
            bio="Looking for genuine connection and shared adventures",
            subscription_tier=SubscriptionTier.CONNECTION
        )
        
        user2 = User(
            email="success2@story.com",
            first_name="David",
            age=31, 
            location="Austin, TX",
            bio="Seeking meaningful relationship with emotional depth",
            subscription_tier=SubscriptionTier.CONNECTION
        )
        
        for user in [user1, user2]:
            user.set_password("password123")
            self.session.add(user)
        
        self.session.flush()
        
        # Create BGP profiles that complement each other
        bgp1 = BGPProfile(
            user_id=user1.id,
            response_speed_avg=0.7,
            empathy_indicators=0.9,
            vulnerability_comfort=0.8,
            attachment_security=0.85,
            data_confidence=0.9
        )
        
        bgp2 = BGPProfile(
            user_id=user2.id,
            response_speed_avg=0.65,  # Slightly slower but consistent
            empathy_indicators=0.85,
            vulnerability_comfort=0.85,
            attachment_security=0.9,
            data_confidence=0.9
        )
        
        # High trust scores
        trust1 = TrustProfile(
            user_id=user1.id,
            overall_trust_score=0.88,
            trust_tier=TrustTier.HIGH,
            successful_connections=5,
            positive_feedback_count=12
        )
        
        trust2 = TrustProfile(
            user_id=user2.id,
            overall_trust_score=0.91,
            trust_tier=TrustTier.HIGH,
            successful_connections=7,
            positive_feedback_count=15
        )
        
        self.session.add_all([bgp1, bgp2, trust1, trust2])
        self.session.flush()
        
        # Create the match
        match = Match(
            initiator_id=user1.id,
            target_id=user2.id,
            compatibility_score=0.92,
            trust_compatibility=0.89,
            overall_match_quality=0.91,
            status=MatchStatus.REVEALED,  # They've progressed through reveals
            emotional_connection_score=0.85,
            conversation_depth_score=0.9,
            mutual_interest_indicators=8,
            initiator_engaged=True,
            target_engaged=True,
            first_message_sent_at=datetime.utcnow() - timedelta(days=21),
            reveal_completed_at=datetime.utcnow() - timedelta(days=7)
        )
        
        self.session.add(match)
        self.session.flush()
        
        # Create conversation with progression
        conversation = Conversation(
            match_id=match.id,
            participant_1_id=user1.id,
            participant_2_id=user2.id,
            is_active=True,
            is_blind=False,  # Photos revealed
            total_messages=45,
            emotional_connection_score=0.85,
            conversation_depth_score=0.9,
            mutual_interest_score=0.88,
            first_message_at=match.first_message_sent_at,
            last_message_at=datetime.utcnow() - timedelta(hours=2)
        )
        
        self.session.add(conversation)
        
        logger.info("✅ Created success story scenario")
        return user1, user2, match, conversation


# Example usage and testing functions
def run_quick_test():
    """Quick test function for development"""
    print("🧪 Running quick database seed test...")
    
    # Override config for quick test
    SEED_CONFIG.update({
        "users": 10,
        "matches_per_user": 2,
        "messages_per_conversation": 5
    })
    
    with DatabaseSeeder() as seeder:
        summary = seeder.seed_database(clear_existing=True)
        analytics = seeder.generate_analytics_data()
        
        print(f"✅ Quick test completed:")
        print(f"   Users: {summary['created']['users']}")
        print(f"   Matches: {summary['created']['matches']}")
        print(f"   Average compatibility: {analytics['matching_statistics']['average_compatibility']:.2f}")


def validate_seeded_data():
    """Validate that seeded data meets ApexMatch requirements"""
    print("🔍 Validating seeded data...")
    
    with DatabaseSeeder() as seeder:
        # Check user distribution
        users = seeder.session.query(User).all()
        premium_count = len([u for u in users if u.subscription_tier != SubscriptionTier.FREE])
        premium_percentage = premium_count / len(users) if users else 0
        
        # Check BGP profiles
        bgp_profiles = seeder.session.query(BGPProfile).all()
        ready_for_matching = len([bgp for bgp in bgp_profiles if bgp.is_ready_for_matching()])
        
        # Check trust distribution
        trust_profiles = seeder.session.query(TrustProfile).all()
        trust_distribution = {}
        for trust in trust_profiles:
            tier = trust.trust_tier.value
            trust_distribution[tier] = trust_distribution.get(tier, 0) + 1
        
        # Check matches
        matches = seeder.session.query(Match).all()
        high_quality_matches = len([m for m in matches if m.overall_match_quality > 0.7])
        
        print(f"📊 Validation Results:")
        print(f"   Premium users: {premium_percentage:.1%} (target: 30%)")
        print(f"   BGP profiles ready: {ready_for_matching}/{len(bgp_profiles)}")
        print(f"   Trust distribution: {trust_distribution}")
        print(f"   High-quality matches: {high_quality_matches}/{len(matches)}")
        
        # Validation checks
        checks = [
            ("Premium percentage reasonable", 0.1 <= premium_percentage <= 0.5),
            ("Most BGP profiles ready", ready_for_matching >= len(bgp_profiles) * 0.8),
            ("Trust distribution realistic", trust_distribution.get('standard', 0) > trust_distribution.get('toxic', 0)),
            ("Good match quality", high_quality_matches >= len(matches) * 0.4)
        ]
        
        print("\n✅ Validation Checks:")
        all_passed = True
        for check_name, passed in checks:
            status = "✅" if passed else "❌"
            print(f"   {status} {check_name}")
            if not passed:
                all_passed = False
        
        if all_passed:
            print("\n🎉 All validation checks passed! Data quality is good.")
        else:
            print("\n⚠️  Some validation checks failed. Consider adjusting seed parameters.")


if __name__ == "__main__":
    # Special commands
    if len(sys.argv) > 1:
        if sys.argv[1] == "--quick-test":
            run_quick_test()
            sys.exit(0)
        elif sys.argv[1] == "--validate":
            validate_seeded_data()
            sys.exit(0)
        elif sys.argv[1] == "--create-config":
            create_development_config()
            sys.exit(0)
    
    # Normal execution
    main()#!/usr/bin/env python3
"""
ApexMatch Database Seeding Script
Creates sample data for development and testing
"""

import asyncio
import random
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
import bcrypt
import uuid
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import models
try:
    from models.user import User, SubscriptionTier, OnboardingStatus
    from models.bgp import BGPProfile
    from models.trust import TrustProfile, TrustTier
    from models.match import Match, MatchStatus