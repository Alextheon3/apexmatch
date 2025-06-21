/**
 * ApexMatch Application Constants
 * Centralized configuration and constants for the revolutionary dating platform
 */

// ================================
// APP METADATA
// ================================

export const APP_INFO = {
  NAME: 'ApexMatch',
  TAGLINE: 'Revolutionary AI-Powered Dating',
  VERSION: process.env.REACT_APP_VERSION || '1.0.0',
  BUILD_DATE: process.env.REACT_APP_BUILD_DATE || new Date().toISOString(),
  GIT_COMMIT: process.env.REACT_APP_GIT_COMMIT || 'unknown',
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  
  // Contact information
  SUPPORT_EMAIL: 'support@apexmatch.com',
  FEEDBACK_EMAIL: 'feedback@apexmatch.com',
  BUSINESS_EMAIL: 'hello@apexmatch.com',
  
  // Social media
  SOCIAL_LINKS: {
    TWITTER: 'https://twitter.com/apexmatch',
    INSTAGRAM: 'https://instagram.com/apexmatch',
    FACEBOOK: 'https://facebook.com/apexmatch',
    LINKEDIN: 'https://linkedin.com/company/apexmatch',
    TIKTOK: 'https://tiktok.com/@apexmatch'
  },
  
  // Legal
  COMPANY_NAME: 'ApexMatch Inc.',
  COPYRIGHT_YEAR: '2025',
  TERMS_URL: '/legal/terms',
  PRIVACY_URL: '/legal/privacy'
};

// ================================
// SUBSCRIPTION TIERS & PRICING
// ================================

export const SUBSCRIPTION_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    billing: 'forever',
    color: '#6B7280',
    popular: false,
    features: {
      daily_matches: 1,
      ai_wingman_requests: 0,
      reveal_requests: 1,
      active_conversations: 3,
      premium_filters: false,
      read_receipts: false,
      boost_profile: false,
      unlimited_rewinds: false,
      concierge_matching: false,
      priority_support: false,
      exclusive_events: false,
      advanced_analytics: false
    },
    limits: {
      matches_per_day: 1,
      matches_per_month: 30,
      ai_requests_per_day: 0,
      reveals_per_day: 1,
      profile_boosts_per_month: 0,
      super_likes_per_month: 0
    },
    description: 'Perfect for getting started with authentic connections'
  },
  
  CONNECTION: {
    id: 'connection',
    name: 'Connection',
    price: 19.99,
    billing: 'monthly',
    color: '#8B5CF6',
    popular: true,
    features: {
      daily_matches: 10,
      ai_wingman_requests: 10,
      reveal_requests: 5,
      active_conversations: 'unlimited',
      premium_filters: true,
      read_receipts: true,
      boost_profile: true,
      unlimited_rewinds: true,
      concierge_matching: false,
      priority_support: true,
      exclusive_events: false,
      advanced_analytics: true
    },
    limits: {
      matches_per_day: 10,
      matches_per_month: 300,
      ai_requests_per_day: 10,
      reveals_per_day: 5,
      profile_boosts_per_month: 3,
      super_likes_per_month: 10
    },
    description: 'Enhanced features for meaningful connections',
    savings: 'Most popular choice'
  },
  
  ELITE: {
    id: 'elite',
    name: 'Elite',
    price: 39.99,
    billing: 'monthly',
    color: '#F59E0B',
    popular: false,
    features: {
      daily_matches: 25,
      ai_wingman_requests: 25,
      reveal_requests: 15,
      active_conversations: 'unlimited',
      premium_filters: true,
      read_receipts: true,
      boost_profile: true,
      unlimited_rewinds: true,
      concierge_matching: true,
      priority_support: true,
      exclusive_events: true,
      advanced_analytics: true,
      relationship_coaching: true
    },
    limits: {
      matches_per_day: 25,
      matches_per_month: 750,
      ai_requests_per_day: 25,
      reveals_per_day: 15,
      profile_boosts_per_month: 10,
      super_likes_per_month: 50
    },
    description: 'Premium experience with concierge matching',
    savings: 'Best value for serious daters'
  }
};

// ================================
// TRUST SYSTEM CONFIGURATION
// ================================

export const TRUST_SYSTEM = {
  // Trust tiers with thresholds
  TIERS: {
    TOXIC: {
      id: 'toxic',
      name: 'Toxic',
      range: [0.0, 0.2],
      color: '#DC2626',
      icon: '⚠️',
      description: 'Problematic behavior patterns detected',
      restrictions: [
        'Limited to matching with similar trust levels',
        'Reduced daily match limit',
        'Messages may be flagged for review',
        'Profile visibility reduced'
      ],
      improvement_path: 'Complete reformation program'
    },
    LOW: {
      id: 'low',
      name: 'Low',
      range: [0.2, 0.4],
      color: '#F59E0B',
      icon: '🔶',
      description: 'Some concerning patterns, room for improvement',
      restrictions: [
        'Limited matching pool',
        'Reduced feature access',
        'Enhanced monitoring'
      ],
      improvement_path: 'Focus on consistent, respectful behavior'
    },
    STANDARD: {
      id: 'standard',
      name: 'Standard',
      range: [0.4, 0.7],
      color: '#6B7280',
      icon: '🔘',
      description: 'Average user with typical dating patterns',
      restrictions: [],
      improvement_path: 'Continue building positive interactions'
    },
    HIGH: {
      id: 'high',
      name: 'High',
      range: [0.7, 0.9],
      color: '#10B981',
      icon: '🟢',
      description: 'Reliable, respectful, and trustworthy behavior',
      perks: [
        'Access to high-trust user pool',
        'Priority in matching queue',
        'Extended chat features',
        'Trust badge on profile'
      ],
      improvement_path: 'Maintain excellent behavior for Elite status'
    },
    ELITE: {
      id: 'elite',
      name: 'Elite',
      range: [0.9, 1.0],
      color: '#8B5CF6',
      icon: '👑',
      description: 'Exceptional behavioral track record',
      perks: [
        'Access to elite user pool',
        'Premium matching algorithms',
        'VIP customer support',
        'Trust badge with crown',
        'Advanced compatibility insights',
        'Exclusive events access'
      ],
      improvement_path: 'Maintain elite status'
    }
  },

  // Trust components and weights
  COMPONENTS: {
    COMMUNICATION_RELIABILITY: { weight: 0.25, name: 'Communication Reliability' },
    EMOTIONAL_HONESTY: { weight: 0.20, name: 'Emotional Honesty' },
    RESPECT_SCORE: { weight: 0.25, name: 'Respect & Boundaries' },
    FOLLOW_THROUGH_RATE: { weight: 0.20, name: 'Follow Through' },
    CONFLICT_RESOLUTION: { weight: 0.10, name: 'Conflict Resolution' }
  },

  // Violation types and penalties
  VIOLATIONS: {
    GHOSTING: { penalty: 0.1, severity: 'medium', description: 'Disappearing without explanation' },
    HARASSMENT: { penalty: 0.3, severity: 'high', description: 'Harassment or inappropriate behavior' },
    SPAM: { penalty: 0.2, severity: 'medium', description: 'Spamming or promotional content' },
    FAKE_PROFILE: { penalty: 0.4, severity: 'high', description: 'Using fake photos or information' },
    INAPPROPRIATE_CONTENT: { penalty: 0.2, severity: 'medium', description: 'Sharing inappropriate content' },
    BOUNDARY_VIOLATION: { penalty: 0.25, severity: 'high', description: 'Not respecting boundaries' },
    CATFISHING: { penalty: 0.5, severity: 'critical', description: 'Deceptive identity misrepresentation' },
    EMOTIONAL_MANIPULATION: { penalty: 0.3, severity: 'high', description: 'Manipulative behavior patterns' }
  },

  // Reformation system
  REFORMATION: {
    DURATION_DAYS: 30,
    REQUIRED_TASKS: 5,
    TARGET_SCORE: 0.5,
    PROGRESS_MILESTONES: [0.2, 0.4, 0.6, 0.8, 1.0]
  }
};

// ================================
// BEHAVIORAL GRAPH PROFILING (BGP)
// ================================

export const BGP_SYSTEM = {
  // Core behavioral dimensions
  DIMENSIONS: {
    // Communication Patterns
    RESPONSE_SPEED: { 
      id: 'response_speed_avg', 
      name: 'Response Speed', 
      category: 'communication',
      description: 'How quickly you typically respond to messages'
    },
    RESPONSE_CONSISTENCY: { 
      id: 'response_consistency', 
      name: 'Response Consistency', 
      category: 'communication',
      description: 'Consistency in your response timing patterns'
    },
    CONVERSATION_DEPTH: { 
      id: 'conversation_depth_pref', 
      name: 'Conversation Depth', 
      category: 'communication',
      description: 'Preference for surface-level vs deep conversations'
    },
    EMOJI_USAGE: { 
      id: 'emoji_usage_rate', 
      name: 'Emoji Usage', 
      category: 'communication',
      description: 'How much you use emojis to express emotions'
    },
    MESSAGE_LENGTH: { 
      id: 'message_length_avg', 
      name: 'Message Length', 
      category: 'communication',
      description: 'Tendency for concise vs detailed messages'
    },

    // Emotional Rhythm
    EMOTIONAL_VOLATILITY: { 
      id: 'emotional_volatility', 
      name: 'Emotional Stability', 
      category: 'emotional',
      description: 'Consistency of your emotional expressions'
    },
    VULNERABILITY_COMFORT: { 
      id: 'vulnerability_comfort', 
      name: 'Vulnerability Comfort', 
      category: 'emotional',
      description: 'Comfort level with emotional openness'
    },
    CONFLICT_RESOLUTION: { 
      id: 'conflict_resolution_style', 
      name: 'Conflict Resolution', 
      category: 'emotional',
      description: 'Approach to handling disagreements'
    },
    EMPATHY_INDICATORS: { 
      id: 'empathy_indicators', 
      name: 'Empathy Level', 
      category: 'emotional',
      description: 'Ability to understand and respond to emotions'
    },
    HUMOR_COMPATIBILITY: { 
      id: 'humor_compatibility', 
      name: 'Humor Style', 
      category: 'emotional',
      description: 'Type and appreciation of humor'
    },

    // Attachment & Trust
    ATTACHMENT_SECURITY: { 
      id: 'attachment_security', 
      name: 'Attachment Security', 
      category: 'attachment',
      description: 'Security in forming emotional bonds'
    },
    GHOSTING_LIKELIHOOD: { 
      id: 'ghosting_likelihood', 
      name: 'Ghosting Tendency', 
      category: 'attachment',
      description: 'Likelihood of disappearing from conversations'
    },
    COMMITMENT_READINESS: { 
      id: 'commitment_readiness', 
      name: 'Commitment Readiness', 
      category: 'attachment',
      description: 'Readiness for serious relationships'
    },
    BOUNDARY_RESPECT: { 
      id: 'boundary_respect', 
      name: 'Boundary Respect', 
      category: 'attachment',
      description: 'Respect for others\' boundaries and limits'
    },
    TRUST_BUILDING_PACE: { 
      id: 'trust_building_pace', 
      name: 'Trust Building Pace', 
      category: 'attachment',
      description: 'Speed of developing trust in relationships'
    },

    // Decision Making & Focus
    DECISION_MAKING_SPEED: { 
      id: 'decision_making_speed', 
      name: 'Decision Making Speed', 
      category: 'cognitive',
      description: 'Speed of making relationship decisions'
    },
    SPONTANEITY_VS_PLANNING: { 
      id: 'spontaneity_vs_planning', 
      name: 'Spontaneity vs Planning', 
      category: 'cognitive',
      description: 'Preference for spontaneous vs planned activities'
    },
    FOCUS_STABILITY: { 
      id: 'focus_stability', 
      name: 'Focus Stability', 
      category: 'cognitive',
      description: 'Attention span and focus consistency'
    },
    RISK_TOLERANCE: { 
      id: 'risk_tolerance', 
      name: 'Risk Tolerance', 
      category: 'cognitive',
      description: 'Comfort with uncertainty and new experiences'
    },
    INTROSPECTION_LEVEL: { 
      id: 'introspection_level', 
      name: 'Introspection Level', 
      category: 'cognitive',
      description: 'Tendency for self-reflection and awareness'
    },

    // Activity & Energy
    ACTIVITY_LEVEL: { 
      id: 'activity_level', 
      name: 'Activity Level', 
      category: 'energy',
      description: 'General energy and activity preferences'
    },
    SOCIAL_BATTERY: { 
      id: 'social_battery', 
      name: 'Social Battery', 
      category: 'energy',
      description: 'Social vs alone time preferences'
    },
    MORNING_EVENING_PERSON: { 
      id: 'morning_evening_person', 
      name: 'Circadian Preference', 
      category: 'energy',
      description: 'Morning vs evening person tendency'
    },
    ROUTINE_VS_VARIETY: { 
      id: 'routine_vs_variety', 
      name: 'Routine vs Variety', 
      category: 'energy',
      description: 'Preference for routine vs novelty'
    }
  },

  // BGP development thresholds
  CONFIDENCE_THRESHOLDS: {
    MINIMUM: 0.3,
    GOOD: 0.6,
    EXCELLENT: 0.8
  },

  // Matching compatibility thresholds
  COMPATIBILITY_THRESHOLDS: {
    POOR: 0.4,
    GOOD: 0.6,
    EXCELLENT: 0.8,
    PERFECT: 0.9
  }
};

// ================================
// PHOTO REVEAL SYSTEM
// ================================

export const REVEAL_SYSTEM = {
  // Emotional connection threshold for reveals
  EMOTIONAL_THRESHOLD: 0.7, // 70% emotional connection required
  CONVERSATION_DEPTH_THRESHOLD: 0.6,
  MUTUAL_INTEREST_THRESHOLD: 3,

  // Reveal stages with descriptions
  STAGES: {
    1: {
      name: 'Silhouette',
      description: 'A mysterious silhouette showing your outline',
      unlock_threshold: 0.3,
      preview: '👤'
    },
    2: {
      name: 'Environment',
      description: 'Your surroundings and setting context',
      unlock_threshold: 0.4,
      preview: '🏞️'
    },
    3: {
      name: 'Partial Face',
      description: 'Your eyes or smile - a glimpse of you',
      unlock_threshold: 0.5,
      preview: '👀'
    },
    4: {
      name: 'Blurred Portrait',
      description: 'Your full face with artistic blur',
      unlock_threshold: 0.6,
      preview: '🌫️'
    },
    5: {
      name: 'Clear Portrait',
      description: 'Your beautiful, clear face',
      unlock_threshold: 0.7,
      preview: '😊'
    },
    6: {
      name: 'Full Profile',
      description: 'Complete access to all your photos',
      unlock_threshold: 0.7,
      preview: '📸'
    }
  },

  // Stage unlock timing
  STAGE_UNLOCK_INTERVAL_HOURS: 24,
  
  // Reveal request settings
  MAX_PENDING_REQUESTS: 3,
  REQUEST_TIMEOUT_HOURS: 72
};

// ================================
// AI WINGMAN CONFIGURATION
// ================================

export const AI_WINGMAN = {
  // Personality styles
  PERSONALITIES: {
    SUPPORTIVE: {
      id: 'supportive',
      name: 'Supportive Friend',
      description: 'Encouraging and empathetic guidance',
      tone: 'warm',
      approach: 'gentle'
    },
    CONFIDENT: {
      id: 'confident',
      name: 'Confident Advisor',
      description: 'Direct and confident suggestions',
      tone: 'assertive',
      approach: 'direct'
    },
    HUMOROUS: {
      id: 'humorous',
      name: 'Witty Companion',
      description: 'Fun and playful conversation help',
      tone: 'playful',
      approach: 'lighthearted'
    },
    THOUGHTFUL: {
      id: 'thoughtful',
      name: 'Thoughtful Guide',
      description: 'Deep and meaningful conversation focus',
      tone: 'contemplative',
      approach: 'profound'
    }
  },

  // Suggestion types
  SUGGESTION_TYPES: {
    ICEBREAKER: 'icebreaker',
    DEEPENING: 'deepening_conversation',
    CONFLICT_RESOLUTION: 'conflict_resolution',
    ROMANTIC: 'romantic_escalation',
    CASUAL: 'casual_chat',
    QUESTION: 'thoughtful_question'
  },

  // Usage limits by subscription tier
  USAGE_LIMITS: {
    FREE: 0,
    CONNECTION: 10,
    ELITE: 25
  }
};

// ================================
// UI/UX CONSTANTS
// ================================

export const UI_CONSTANTS = {
  // Breakpoints (matching Tailwind CSS)
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px',
    LG: '1024px',
    XL: '1280px',
    '2XL': '1536px'
  },

  // Animation durations
  ANIMATIONS: {
    FAST: '150ms',
    NORMAL: '300ms',
    SLOW: '500ms',
    REVEAL: '1000ms'
  },

  // Color palette
  COLORS: {
    PRIMARY: {
      50: '#fdf4ff',
      100: '#fae8ff',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7c3aed',
      900: '#581c87'
    },
    SECONDARY: {
      50: '#fdf2f8',
      100: '#fce7f3',
      500: '#ec4899',
      600: '#db2777',
      700: '#be185d'
    },
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#3b82f6'
  },

  // Z-index scale
  Z_INDEX: {
    DROPDOWN: 1000,
    STICKY: 1020,
    FIXED: 1030,
    MODAL_BACKDROP: 1040,
    MODAL: 1050,
    POPOVER: 1060,
    TOOLTIP: 1070,
    TOAST: 1080
  },

  // Grid and spacing
  SPACING: {
    SECTION: '5rem',
    COMPONENT: '2rem',
    ELEMENT: '1rem'
  }
};

// ================================
// VALIDATION RULES
// ================================

export const VALIDATION_RULES = {
  USER: {
    EMAIL: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      maxLength: 255
    },
    PASSWORD: {
      required: true,
      minLength: 8,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      message: 'Password must contain at least 8 characters, including uppercase, lowercase, number and special character'
    },
    FIRST_NAME: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s-']+$/
    },
    AGE: {
      required: true,
      min: 18,
      max: 100
    },
    BIO: {
      maxLength: 500,
      pattern: /^[^<>]*$/ // No HTML tags
    }
  },

  PHOTOS: {
    MAX_COUNT: 6,
    MAX_SIZE_MB: 10,
    ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
    MIN_RESOLUTION: { width: 400, height: 400 },
    MAX_RESOLUTION: { width: 4000, height: 4000 }
  },

  MESSAGES: {
    MAX_LENGTH: 1000,
    MIN_LENGTH: 1,
    RATE_LIMIT: {
      MESSAGES_PER_MINUTE: 10,
      MESSAGES_PER_HOUR: 100
    }
  }
};

// ================================
// NOTIFICATION TYPES
// ================================

export const NOTIFICATION_TYPES = {
  // Match notifications
  NEW_MATCH: {
    id: 'new_match',
    title: 'New Match! 💕',
    icon: '💕',
    sound: true,
    priority: 'high'
  },
  MATCH_LIKED_BACK: {
    id: 'match_liked_back',
    title: 'They liked you back!',
    icon: '🎉',
    sound: true,
    priority: 'high'
  },

  // Message notifications
  NEW_MESSAGE: {
    id: 'new_message',
    title: 'New message',
    icon: '💬',
    sound: true,
    priority: 'medium'
  },
  TYPING_INDICATOR: {
    id: 'typing',
    title: 'Someone is typing...',
    icon: '✏️',
    sound: false,
    priority: 'low'
  },

  // Reveal notifications
  REVEAL_REQUEST: {
    id: 'reveal_request',
    title: 'Photo reveal request',
    icon: '📸',
    sound: true,
    priority: 'high'
  },
  REVEAL_UNLOCKED: {
    id: 'reveal_unlocked',
    title: 'New reveal stage unlocked!',
    icon: '🔓',
    sound: true,
    priority: 'high'
  },

  // Trust system notifications
  TRUST_SCORE_CHANGE: {
    id: 'trust_change',
    title: 'Trust score updated',
    icon: '🏆',
    sound: false,
    priority: 'medium'
  },
  VIOLATION_REPORTED: {
    id: 'violation_reported',
    title: 'Account under review',
    icon: '⚠️',
    sound: true,
    priority: 'critical'
  },

  // AI Wingman notifications
  WINGMAN_SUGGESTION: {
    id: 'wingman_suggestion',
    title: 'AI Wingman has a suggestion',
    icon: '🤖',
    sound: false,
    priority: 'low'
  },

  // Subscription notifications
  SUBSCRIPTION_EXPIRED: {
    id: 'subscription_expired',
    title: 'Subscription expired',
    icon: '💳',
    sound: false,
    priority: 'medium'
  },
  PAYMENT_FAILED: {
    id: 'payment_failed',
    title: 'Payment failed',
    icon: '❌',
    sound: true,
    priority: 'high'
  }
};

// ================================
// ERROR MESSAGES
// ================================

export const ERROR_MESSAGES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists',
  EMAIL_NOT_VERIFIED: 'Please verify your email address',
  PASSWORD_TOO_WEAK: 'Password does not meet security requirements',
  ACCOUNT_LOCKED: 'Account temporarily locked due to too many failed attempts',

  // Trust system errors
  TRUST_SCORE_TOO_LOW: 'Your trust score is too low for this action. Focus on building positive interactions.',
  VIOLATION_UNDER_REVIEW: 'Your account is under review for reported violations',
  IN_REFORMATION: 'Complete your reformation program to access this feature',

  // Matching errors
  DAILY_LIMIT_REACHED: 'You\'ve reached your daily match limit. Upgrade for more matches!',
  NO_MORE_MATCHES: 'No more potential matches in your area. Try adjusting your preferences.',
  ALREADY_MATCHED: 'You\'ve already matched with this person',
  INCOMPATIBLE_TRUST_LEVELS: 'Trust levels are not compatible for matching',

  // Reveal system errors
  EMOTIONAL_CONNECTION_TOO_LOW: 'Build a stronger emotional connection before requesting reveals',
  REVEAL_NOT_MUTUAL: 'Both users must agree to photo reveals',
  REVEAL_STAGE_LOCKED: 'This reveal stage is not yet unlocked',

  // Subscription errors
  SUBSCRIPTION_REQUIRED: 'This feature requires a premium subscription',
  PAYMENT_PROCESSING_ERROR: 'Error processing payment. Please try again.',
  SUBSCRIPTION_ALREADY_ACTIVE: 'You already have an active subscription',

  // General errors
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Our team has been notified.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment.',
  VALIDATION_ERROR: 'Please check your input and try again',
  FEATURE_NOT_AVAILABLE: 'This feature is not available in your region'
};

// ================================
// SUCCESS MESSAGES
// ================================

export const SUCCESS_MESSAGES = {
  // Authentication
  REGISTRATION_SUCCESS: 'Welcome to ApexMatch! Please check your email to verify your account.',
  LOGIN_SUCCESS: 'Welcome back!',
  PASSWORD_RESET_SENT: 'Password reset instructions sent to your email',
  EMAIL_VERIFIED: 'Email verified successfully!',

  // Profile
  PROFILE_UPDATED: 'Profile updated successfully',
  PHOTO_UPLOADED: 'Photo uploaded successfully',
  PHOTO_DELETED: 'Photo deleted',

  // Matching
  MATCH_CREATED: 'It\'s a match! 💕',
  SUPER_LIKE_SENT: 'Super like sent!',
  PROFILE_BOOSTED: 'Your profile has been boosted for 24 hours',

  // Reveals
  REVEAL_REQUEST_SENT: 'Photo reveal request sent',
  REVEAL_APPROVED: 'Photo reveal approved! Enjoy getting to know each other better.',
  STAGE_UNLOCKED: 'New reveal stage unlocked!',

  // Trust system
  POSITIVE_FEEDBACK_GIVEN: 'Thank you for your feedback. It helps improve our community.',
  VIOLATION_REPORTED: 'Report submitted. Our team will review this.',

  // Subscription
  SUBSCRIPTION_ACTIVATED: 'Welcome to premium! Enjoy your enhanced features.',
  SUBSCRIPTION_CANCELLED: 'Subscription cancelled. You\'ll retain access until the end of your billing period.',
  PAYMENT_SUCCESS: 'Payment processed successfully',

  // AI Wingman
  SUGGESTION_HELPFUL: 'Glad that suggestion was helpful!',
  FEEDBACK_RECEIVED: 'Thanks for the feedback! AI Wingman is learning.'
};

// ================================
// FEATURE FLAGS
// ================================

export const FEATURE_FLAGS = {
  // Core features
  TRUST_SYSTEM_ENABLED: process.env.REACT_APP_TRUST_SYSTEM === 'true',
  BGP_ENABLED: process.env.REACT_APP_BGP_ENABLED === 'true',
  REVEAL_SYSTEM_ENABLED: process.env.REACT_APP_REVEAL_SYSTEM === 'true',
  AI_WINGMAN_ENABLED: process.env.REACT_APP_AI_WINGMAN === 'true',
  
  // Premium features
  SUBSCRIPTION_ENABLED: process.env.REACT_APP_SUBSCRIPTIONS === 'true',
  EVENTS_ENABLED: process.env.REACT_APP_EVENTS === 'true',
  VIDEO_CHAT_ENABLED: process.env.REACT_APP_VIDEO_CHAT === 'true',
  
  // Experimental features
  VOICE_MESSAGES_ENABLED: process.env.REACT_APP_VOICE_MESSAGES === 'true',
  AR_FEATURES_ENABLED: process.env.REACT_APP_AR_FEATURES === 'true',
  SOCIAL_FEATURES_ENABLED: process.env.REACT_APP_SOCIAL_FEATURES === 'true',
  
  // Analytics and tracking
  ANALYTICS_ENABLED: process.env.REACT_APP_ANALYTICS === 'true',
  ERROR_REPORTING_ENABLED: process.env.REACT_APP_ERROR_REPORTING === 'true',
  PERFORMANCE_MONITORING: process.env.REACT_APP_PERFORMANCE_MONITORING === 'true'
};

// ================================
// CACHE CONFIGURATION
// ================================

export const CACHE_CONFIG = {
  // Cache durations (in milliseconds)
  USER_PROFILE: 5 * 60 * 1000, // 5 minutes
  MATCHES: 2 * 60 * 1000, // 2 minutes
  BGP_PROFILE: 10 * 60 * 1000, // 10 minutes
  TRUST_PROFILE: 10 * 60 * 1000, // 10 minutes
  CONVERSATIONS: 1 * 60 * 1000, // 1 minute
  SUBSCRIPTION_STATUS: 15 * 60 * 1000, // 15 minutes
  APP_CONFIG: 60 * 60 * 1000, // 1 hour
  
  // Cache keys
  KEYS: {
    USER_PROFILE: 'user_profile',
    BGP_PROFILE: 'bgp_profile',
    TRUST_PROFILE: 'trust_profile',
    MATCHES: 'matches',
    CONVERSATIONS: 'conversations',
    SUBSCRIPTION: 'subscription',
    PREFERENCES: 'preferences'
  }
};

// ================================
// LOCAL STORAGE KEYS
// ================================

export const STORAGE_KEYS = {
  // Authentication
  ACCESS_TOKEN: 'apexmatch_access_token',
  REFRESH_TOKEN: 'apexmatch_refresh_token',
  USER_ID: 'apexmatch_user_id',
  
  // User preferences
  THEME: 'apexmatch_theme',
  LANGUAGE: 'apexmatch_language',
  NOTIFICATION_PREFERENCES: 'apexmatch_notifications',
  
  // App state
  ONBOARDING_COMPLETED: 'apexmatch_onboarding',
  LAST_ACTIVE: 'apexmatch_last_active',
  APP_VERSION: 'apexmatch_app_version',
  
  // Cache
  CACHE_PREFIX: 'apexmatch_cache_',
  
  // Analytics
  SESSION_ID: 'apexmatch_session_id',
  VISIT_COUNT: 'apexmatch_visit_count'
};

// ================================
// DATE/TIME FORMATS
// ================================

export const DATE_FORMATS = {
  FULL: 'MMMM d, yyyy \'at\' h:mm a',
  DATE_ONLY: 'MMMM d, yyyy',
  TIME_ONLY: 'h:mm a',
  RELATIVE: 'relative', // "2 hours ago", "yesterday", etc.
  MESSAGE_TIME: 'h:mm a',
  MESSAGE_DATE: 'MMM d',
  PROFILE_AGE: 'yyyy-MM-dd'
};

// ================================
// REGEX PATTERNS
// ================================

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  URL: /^https?:\/\/.+/,
  HASHTAG: /#[\w]+/g,
  MENTION: /@[\w]+/g,
  EMOJI: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu
};

// ================================
// EXPORT DEFAULT CONSTANTS
// ================================

export default {
  APP_INFO,
  SUBSCRIPTION_TIERS,
  TRUST_SYSTEM,
  BGP_SYSTEM,
  REVEAL_SYSTEM,
  AI_WINGMAN,
  UI_CONSTANTS,
  VALIDATION_RULES,
  NOTIFICATION_TYPES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FEATURE_FLAGS,
  CACHE_CONFIG,
  STORAGE_KEYS,
  DATE_FORMATS,
  REGEX_PATTERNS
};