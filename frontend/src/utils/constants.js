// src/utils/constants.js - Application constants and configuration

/**
 * ApexMatch Application Constants
 * Centralized configuration for the entire application
 */

// ========================================
// APPLICATION METADATA
// ========================================

export const APP_INFO = {
  name: 'ApexMatch',
  tagline: 'Where Hearts Connect Before Eyes Meet',
  version: '1.0.0',
  description: 'Revolutionary dating app that prioritizes emotional connection over physical appearance',
  website: 'https://apexmatch.app',
  supportEmail: 'support@apexmatch.app',
  company: 'ApexMatch Inc.',
  copyright: `© ${new Date().getFullYear()} ApexMatch Inc. All rights reserved.`
};

// ========================================
// ENVIRONMENT CONFIGURATION
// ========================================

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:8001',
  STRIPE_PUBLIC_KEY: process.env.REACT_APP_STRIPE_PUBLIC_KEY || '',
  GOOGLE_ANALYTICS_ID: process.env.REACT_APP_GA_ID || '',
  SENTRY_DSN: process.env.REACT_APP_SENTRY_DSN || '',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test'
};

// ========================================
// API CONFIGURATION
// ========================================

export const API_CONFIG = {
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  
  endpoints: {
    // Authentication
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      logout: '/auth/logout',
      refresh: '/auth/refresh',
      verify: '/auth/verify',
      resendVerification: '/auth/resend-verification',
      forgotPassword: '/auth/forgot-password',
      resetPassword: '/auth/reset-password',
      changePassword: '/auth/change-password',
      enable2FA: '/auth/2fa/enable',
      verify2FA: '/auth/2fa/verify',
      disable2FA: '/auth/2fa/disable'
    },
    
    // User management
    users: {
      profile: '/users/profile',
      updateProfile: '/users/profile',
      uploadPhoto: '/users/photos',
      deletePhoto: '/users/photos/:id',
      preferences: '/users/preferences',
      deactivate: '/users/deactivate'
    },
    
    // BGP (Behavioral Graph Profile)
    bgp: {
      get: '/bgp',
      update: '/bgp',
      events: '/bgp/events',
      insights: '/bgp/insights',
      compatibility: '/bgp/compatibility/:userId'
    },
    
    // Matching system
    matching: {
      discover: '/matches/discover',
      swipe: '/matches/:matchId/swipe',
      mutual: '/matches/mutual',
      passed: '/matches/passed',
      filters: '/matches/filters'
    },
    
    // Conversations and messaging
    conversations: {
      list: '/conversations',
      get: '/conversations/:id',
      messages: '/conversations/:id/messages',
      send: '/conversations/:id/messages',
      markRead: '/conversations/:id/read',
      archive: '/conversations/:id/archive'
    },
    
    // Reveal system
    reveals: {
      request: '/reveals/request',
      respond: '/reveals/:requestId/respond',
      pending: '/reveals/pending',
      history: '/reveals/history'
    },
    
    // Trust system
    trust: {
      score: '/trust/score',
      factors: '/trust/factors',
      history: '/trust/history',
      report: '/trust/report'
    },
    
    // AI Wingman
    ai: {
      suggestions: '/ai/suggestions',
      analyze: '/ai/analyze-message',
      insights: '/ai/conversation-insights'
    },
    
    // Subscription and payments
    subscription: {
      plans: '/subscription/plans',
      current: '/subscription/current',
      create: '/subscription/create',
      update: '/subscription/update',
      cancel: '/subscription/cancel',
      reactivate: '/subscription/reactivate',
      invoices: '/subscription/invoices'
    },
    
    // Admin and support
    admin: {
      users: '/admin/users',
      reports: '/admin/reports',
      moderation: '/admin/moderation',
      analytics: '/admin/analytics'
    }
  }
};

// ========================================
// TRUST TIER SYSTEM
// ========================================

export const TRUST_TIERS = {
  CHALLENGED: {
    id: 'challenged',
    name: 'Challenged',
    min: 0,
    max: 49,
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    icon: '⚠️',
    description: 'Building trust through consistent positive behavior',
    benefits: [
      'Basic matching features',
      'Limited conversation access',
      'Trust-building challenges'
    ],
    restrictions: [
      'Cannot request reveals',
      'Limited daily matches (1 per 3 days)',
      'No premium features'
    ]
  },
  
  BUILDING: {
    id: 'building',
    name: 'Building',
    min: 50,
    max: 69,
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
    icon: '🔨',
    description: 'Developing trust through positive interactions',
    benefits: [
      'Standard matching features',
      'Can request reveals (limited)',
      'Basic conversation insights',
      'Trust improvement guidance'
    ],
  BUILDING: {
    id: 'building',
    name: 'Building',
    min: 50,
    max: 69,
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
    icon: '🔨',
    description: 'Developing trust through positive interactions',
    benefits: [
      'Standard matching features',
      'Can request reveals (limited)',
      'Basic conversation insights',
      'Trust improvement guidance'
    ],
    restrictions: [
      'Limited AI Wingman access',
      'No high-trust queue access',
      'Limited premium features'
    ]
  },
  
  RELIABLE: {
    id: 'reliable',
    name: 'Reliable',
    min: 70,
    max: 84,
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
    icon: '⭐',
    description: 'Consistently reliable and trustworthy behavior',
    benefits: [
      'Full matching features',
      'Unlimited reveal requests',
      'High-trust queue access',
      'Advanced conversation insights',
      'Priority customer support'
    ],
    restrictions: [
      'Limited elite community access'
    ]
  },
  
  TRUSTED: {
    id: 'trusted',
    name: 'Trusted',
    min: 85,
    max: 94,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    icon: '💎',
    description: 'Highly trusted member of the ApexMatch community',
    benefits: [
      'All Reliable benefits',
      'Elite community access',
      'Mentorship opportunities',
      'Advanced BGP insights',
      'VIP customer support',
      'Beta feature access'
    ],
    restrictions: []
  },
  
  ELITE: {
    id: 'elite',
    name: 'Elite',
    min: 95,
    max: 100,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    icon: '👑',
    description: 'Exemplary member setting the standard for the community',
    benefits: [
      'All Trusted benefits',
      'Exclusive elite events',
      'Community leadership roles',
      'Advanced matching algorithms',
      'Personal relationship advisor',
      'Lifetime premium features',
      'Revenue sharing opportunities'
    ],
    restrictions: []
  }
};

// ========================================
// SUBSCRIPTION TIERS
// ========================================

export const SUBSCRIPTION_TIERS = {
  FREE: {
    id: 'free',
    name: 'Discovery',
    price: 0,
    priceMonthly: 0,
    priceYearly: 0,
    color: '#6b7280',
    popular: false,
    description: 'Start your ApexMatch journey',
    features: [
      '1 match every 3 days',
      'Basic profile features',
      '3 conversations maximum',
      'Basic compatibility scores',
      'Trust score tracking',
      'Community guidelines'
    ],
    limitations: [
      'No AI Wingman',
      'No reveal requests',
      'Limited customer support',
      'Ads included'
    ]
  },
  
  PREMIUM: {
    id: 'premium',
    name: 'Connection',
    price: 1999, // $19.99 in cents
    priceMonthly: 1999,
    priceYearly: 19999, // $199.99 (2 months free)
    color: '#9333ea',
    popular: true,
    description: 'Unlock meaningful connections',
    features: [
      'Unlimited daily matches',
      'AI Wingman (10 assists/day)',
      'Unlimited conversations',
      'Advanced compatibility insights',
      'Read receipts',
      'Message insights',
      'Reveal requests',
      'Priority matching queue',
      'Ad-free experience',
      'Premium customer support'
    ],
    limitations: [
      'No elite community access',
      'No concierge service'
    ]
  },
  
  ELITE: {
    id: 'elite',
    name: 'Elite',
    price: 3999, // $39.99 in cents
    priceMonthly: 3999,
    priceYearly: 39999, // $399.99 (2 months free)
    color: '#7c3aed',
    popular: false,
    description: 'The ultimate dating experience',
    features: [
      'All Connection features',
      'AI Wingman (25 assists/day)',
      'Elite community access',
      'Concierge matching service',
      'Profile optimization',
      'Relationship coaching sessions',
      'Custom matching criteria',
      'Priority reveal queue',
      'VIP customer support',
      'Exclusive events',
      'Personal relationship advisor'
    ],
    limitations: []
  }
};

// ========================================
// BGP (BEHAVIORAL GRAPH PROFILE) SYSTEM
// ========================================

export const BGP_CATEGORIES = {
  EMOTIONAL: {
    id: 'emotional',
    name: 'Emotional Intelligence',
    icon: '❤️',
    weight: 0.25,
    traits: [
      'empathy',
      'emotional_awareness',
      'emotional_regulation',
      'vulnerability',
      'emotional_support',
      'emotional_expression'
    ]
  },
  
  COMMUNICATION: {
    id: 'communication',
    name: 'Communication Style',
    icon: '💬',
    weight: 0.20,
    traits: [
      'active_listening',
      'conversation_depth',
      'humor_style',
      'conflict_resolution',
      'response_time',
      'message_quality'
    ]
  },
  
  SOCIAL: {
    id: 'social',
    name: 'Social Patterns',
    icon: '👥',
    weight: 0.15,
    traits: [
      'extroversion',
      'social_energy',
      'group_dynamics',
      'independence',
      'social_anxiety',
      'party_preference'
    ]
  },
  
  DECISION: {
    id: 'decision',
    name: 'Decision Making',
    icon: '🎯',
    weight: 0.20,
    traits: [
      'planning_style',
      'risk_tolerance',
      'decision_speed',
      'logical_thinking',
      'intuition_reliance',
      'commitment_style'
    ]
  },
  
  RELATIONSHIP: {
    id: 'relationship',
    name: 'Relationship Approach',
    icon: '💕',
    weight: 0.20,
    traits: [
      'attachment_style',
      'intimacy_comfort',
      'relationship_pace',
      'family_orientation',
      'loyalty',
      'trust_building'
    ]
  }
};

export const BGP_TRAITS = {
  // Emotional Intelligence traits
  empathy: { name: 'Empathy', category: 'emotional', complementary: false },
  emotional_awareness: { name: 'Emotional Awareness', category: 'emotional', complementary: false },
  emotional_regulation: { name: 'Emotional Regulation', category: 'emotional', complementary: false },
  vulnerability: { name: 'Vulnerability', category: 'emotional', complementary: false },
  emotional_support: { name: 'Emotional Support', category: 'emotional', complementary: false },
  emotional_expression: { name: 'Emotional Expression', category: 'emotional', complementary: true },
  
  // Communication traits
  active_listening: { name: 'Active Listening', category: 'communication', complementary: false },
  conversation_depth: { name: 'Conversation Depth', category: 'communication', complementary: false },
  humor_style: { name: 'Humor Style', category: 'communication', complementary: true },
  conflict_resolution: { name: 'Conflict Resolution', category: 'communication', complementary: false },
  response_time: { name: 'Response Speed', category: 'communication', complementary: true },
  message_quality: { name: 'Message Quality', category: 'communication', complementary: false },
  
  // Social traits
  extroversion: { name: 'Extroversion', category: 'social', complementary: true },
  social_energy: { name: 'Social Energy', category: 'social', complementary: true },
  group_dynamics: { name: 'Group Comfort', category: 'social', complementary: true },
  independence: { name: 'Independence', category: 'social', complementary: true },
  social_anxiety: { name: 'Social Confidence', category: 'social', complementary: false },
  party_preference: { name: 'Social Activity', category: 'social', complementary: true },
  
  // Decision making traits
  planning_style: { name: 'Planning Style', category: 'decision', complementary: true },
  risk_tolerance: { name: 'Risk Tolerance', category: 'decision', complementary: true },
  decision_speed: { name: 'Decision Speed', category: 'decision', complementary: true },
  logical_thinking: { name: 'Logical Thinking', category: 'decision', complementary: true },
  intuition_reliance: { name: 'Intuition', category: 'decision', complementary: true },
  commitment_style: { name: 'Commitment Style', category: 'decision', complementary: false },
  
  // Relationship traits
  attachment_style: { name: 'Attachment Style', category: 'relationship', complementary: false },
  intimacy_comfort: { name: 'Intimacy Comfort', category: 'relationship', complementary: false },
  relationship_pace: { name: 'Relationship Pace', category: 'relationship', complementary: false },
  family_orientation: { name: 'Family Orientation', category: 'relationship', complementary: false },
  loyalty: { name: 'Loyalty', category: 'relationship', complementary: false },
  trust_building: { name: 'Trust Building', category: 'relationship', complementary: false }
};

// ========================================
// MATCHING SYSTEM
// ========================================

export const MATCHING_CONFIG = {
  maxDistance: 50, // kilometers
  minAge: 18,
  maxAge: 100,
  compatibilityThresholds: {
    excellent: 85,
    good: 70,
    fair: 55,
    poor: 40
  },
  
  dailyLimits: {
    free: 1, // 1 match per 3 days
    premium: 10,
    elite: 25
  },
  
  conversationLimits: {
    free: 3,
    premium: Infinity,
    elite: Infinity
  },
  
  revealRequirements: {
    minEmotionalConnection: 70,
    minDaysConnected: 3,
    minMessages: 20,
    minTrustScore: 50
  }
};

// ========================================
// REVEAL SYSTEM
// ========================================

export const REVEAL_STAGES = {
  PREPARATION: {
    id: 'preparation',
    name: 'Heart-Centered Preparation',
    description: 'Take a moment to center yourself and reflect on your journey together',
    duration: 30000, // 30 seconds
    icon: '💗'
  },
  
  INTENTION: {
    id: 'intention',
    name: 'Setting Intention',
    description: 'Reflect on what drew you to this person and your hopes for this reveal',
    duration: 45000, // 45 seconds
    icon: '🌟'
  },
  
  READINESS: {
    id: 'readiness',
    name: 'Mutual Readiness',
    description: 'Both hearts must be ready to take this step together',
    duration: null, // User-controlled
    icon: '🤝'
  },
  
  COUNTDOWN: {
    id: 'countdown',
    name: 'The Moment Arrives',
    description: 'Prepare for this beautiful moment of connection',
    duration: 3000, // 3 seconds
    icon: '⏰'
  },
  
  REVEAL: {
    id: 'reveal',
    name: 'The Reveal',
    description: 'See each other for the first time',
    duration: null, // User-controlled
    icon: '✨'
  },
  
  INTEGRATION: {
    id: 'integration',
    name: 'Integration & Reflection',
    description: 'Process this moment and decide your next steps together',
    duration: 60000, // 60 seconds
    icon: '🌅'
  }
};

// ========================================
// AI WINGMAN SYSTEM
// ========================================

export const AI_WINGMAN = {
  usageLimits: {
    free: 0,
    premium: 10,
    elite: 25
  },
  
  suggestionTypes: {
    ICEBREAKER: {
      id: 'icebreaker',
      name: 'Conversation Starter',
      description: 'AI-generated opening message based on compatibility',
      icon: '🎯'
    },
    
    CONTINUATION: {
      id: 'continuation',
      name: 'Continue Conversation',
      description: 'Thoughtful ways to continue the current topic',
      icon: '💭'
    },
    
    DEEPENING: {
      id: 'deepening',
      name: 'Deepen Connection',
      description: 'Questions and topics to build emotional intimacy',
      icon: '💕'
    },
    
    HUMOR: {
      id: 'humor',
      name: 'Add Humor',
      description: 'Appropriate ways to lighten the mood',
      icon: '😄'
    },
    
    VULNERABILITY: {
      id: 'vulnerability',
      name: 'Share Vulnerability',
      description: 'Encourage authentic and meaningful sharing',
      icon: '🦋'
    },
    
    PLANNING: {
      id: 'planning',
      name: 'Plan Meeting',
      description: 'Suggestions for transitioning to in-person dates',
      icon: '📅'
    },
    
    CONFLICT: {
      id: 'conflict',
      name: 'Navigate Tension',
      description: 'Handle misunderstandings with grace',
      icon: '🕊️'
    },
    
    REVEAL: {
      id: 'reveal',
      name: 'Prepare for Reveal',
      description: 'Navigate the photo reveal conversation',
      icon: '✨'
    }
  }
};

// ========================================
// UI CONSTANTS
// ========================================

export const UI_CONFIG = {
  breakpoints: {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
  },
  
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    toast: 1080
  },
  
  animation: {
    duration: {
      instant: 100,
      fast: 200,
      normal: 300,
      slow: 500,
      slower: 800
    }
  },
  
  layout: {
    headerHeight: 64,
    sidebarWidth: 256,
    mobileHeaderHeight: 56
  }
};

// ========================================
// VALIDATION RULES
// ========================================

export const VALIDATION_RULES = {
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbiddenPasswords: [
      'password', '12345678', 'qwerty123', 'abc123456',
      'password123', '123456789', 'qwertyuiop'
    ]
  },
  
  email: {
    maxLength: 254,
    allowedDomains: [], // Empty means all domains allowed
    blockedDomains: [
      'tempmail.org', '10minutemail.com', 'guerrillamail.com'
    ]
  },
  
  profile: {
    firstName: { minLength: 2, maxLength: 50 },
    lastName: { minLength: 2, maxLength: 50 },
    bio: { maxLength: 500 },
    interests: { max: 10, minLength: 2, maxLength: 30 },
    photos: { max: 6, minSize: 1024, maxSize: 10485760 } // 1KB to 10MB
  },
  
  age: {
    min: 18,
    max: 100
  },
  
  location: {
    maxDistance: 500 // kilometers
  }
};

// ========================================
// ERROR CODES
// ========================================

export const ERROR_CODES = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'auth/invalid-credentials',
  AUTH_USER_NOT_FOUND: 'auth/user-not-found',
  AUTH_EMAIL_ALREADY_EXISTS: 'auth/email-already-exists',
  AUTH_WEAK_PASSWORD: 'auth/weak-password',
  AUTH_TOKEN_EXPIRED: 'auth/token-expired',
  AUTH_INVALID_TOKEN: 'auth/invalid-token',
  AUTH_TOO_MANY_ATTEMPTS: 'auth/too-many-attempts',
  AUTH_EMAIL_NOT_VERIFIED: 'auth/email-not-verified',
  AUTH_2FA_REQUIRED: 'auth/2fa-required',
  AUTH_INVALID_2FA_CODE: 'auth/invalid-2fa-code',
  
  // Profile errors
  PROFILE_INCOMPLETE: 'profile/incomplete',
  PROFILE_PHOTO_REQUIRED: 'profile/photo-required',
  PROFILE_INVALID_AGE: 'profile/invalid-age',
  PROFILE_INAPPROPRIATE_CONTENT: 'profile/inappropriate-content',
  
  // Matching errors
  MATCH_DAILY_LIMIT_REACHED: 'match/daily-limit-reached',
  MATCH_INSUFFICIENT_TRUST: 'match/insufficient-trust',
  MATCH_ALREADY_PASSED: 'match/already-passed',
  MATCH_USER_BLOCKED: 'match/user-blocked',
  
  // Conversation errors
  CONVERSATION_LIMIT_REACHED: 'conversation/limit-reached',
  CONVERSATION_NOT_FOUND: 'conversation/not-found',
  CONVERSATION_UNAUTHORIZED: 'conversation/unauthorized',
  MESSAGE_TOO_LONG: 'message/too-long',
  MESSAGE_INAPPROPRIATE: 'message/inappropriate',
  
  // Reveal errors
  REVEAL_INSUFFICIENT_CONNECTION: 'reveal/insufficient-connection',
  REVEAL_TOO_EARLY: 'reveal/too-early',
  REVEAL_ALREADY_REQUESTED: 'reveal/already-requested',
  REVEAL_NOT_MUTUAL: 'reveal/not-mutual',
  
  // Subscription errors
  SUBSCRIPTION_PAYMENT_FAILED: 'subscription/payment-failed',
  SUBSCRIPTION_CANCELLED: 'subscription/cancelled',
  SUBSCRIPTION_DOWNGRADE_RESTRICTED: 'subscription/downgrade-restricted',
  
  // Network errors
  NETWORK_ERROR: 'network/error',
  NETWORK_TIMEOUT: 'network/timeout',
  SERVER_ERROR: 'server/error',
  SERVICE_UNAVAILABLE: 'service/unavailable'
};

// ========================================
// FEATURE FLAGS
// ========================================

export const FEATURE_FLAGS = {
  // Core features
  ENABLE_REGISTRATION: true,
  ENABLE_2FA: true,
  ENABLE_SOCIAL_LOGIN: false,
  
  // Matching features
  ENABLE_AUTO_MATCHING: true,
  ENABLE_SUPER_LIKES: true,
  ENABLE_BOOST: false,
  
  // Communication features
  ENABLE_VIDEO_CHAT: false,
  ENABLE_VOICE_MESSAGES: false,
  ENABLE_GIF_MESSAGES: true,
  
  // AI features
  ENABLE_AI_WINGMAN: true,
  ENABLE_AI_MODERATION: true,
  ENABLE_AI_INSIGHTS: true,
  
  // Premium features
  ENABLE_PREMIUM_SUBSCRIPTIONS: true,
  ENABLE_GIFT_SUBSCRIPTIONS: false,
  
  // Experimental features
  ENABLE_GROUP_MATCHING: false,
  ENABLE_EVENT_MATCHING: false,
  ENABLE_COMPATIBILITY_GAMES: false,
  
  // Admin features
  ENABLE_ADMIN_PANEL: true,
  ENABLE_ANALYTICS: true,
  ENABLE_A_B_TESTING: false
};

// ========================================
// SOCIAL MEDIA LINKS
// ========================================

export const SOCIAL_LINKS = {
  instagram: 'https://instagram.com/apexmatch',
  twitter: 'https://twitter.com/apexmatch',
  facebook: 'https://facebook.com/apexmatch',
  linkedin: 'https://linkedin.com/company/apexmatch',
  youtube: 'https://youtube.com/@apexmatch',
  tiktok: 'https://tiktok.com/@apexmatch',
  blog: 'https://blog.apexmatch.app'
};

// ========================================
// LEGAL LINKS
// ========================================

export const LEGAL_LINKS = {
  privacy: '/privacy',
  terms: '/terms',
  cookies: '/cookies',
  safety: '/safety',
  community: '/community-guidelines',
  dmca: '/dmca',
  contact: '/contact'
};

// ========================================
// NOTIFICATION TYPES
// ========================================

export const NOTIFICATION_TYPES = {
  NEW_MATCH: 'new_match',
  MUTUAL_LIKE: 'mutual_like',
  NEW_MESSAGE: 'new_message',
  REVEAL_REQUEST: 'reveal_request',
  REVEAL_ACCEPTED: 'reveal_accepted',
  REVEAL_MUTUAL: 'reveal_mutual',
  TRUST_SCORE_CHANGE: 'trust_score_change',
  SUBSCRIPTION_EXPIRY: 'subscription_expiry',
  WEEKLY_INSIGHTS: 'weekly_insights',
  SAFETY_ALERT: 'safety_alert'
};

// ========================================
// DATE FORMATS
// ========================================

export const DATE_FORMATS = {
  short: 'MMM dd',
  medium: 'MMM dd, yyyy',
  long: 'MMMM dd, yyyy',
  full: 'EEEE, MMMM dd, yyyy',
  time: 'h:mm a',
  dateTime: 'MMM dd, yyyy h:mm a',
  iso: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"
};

// ========================================
// ANALYTICS EVENTS
// ========================================

export const ANALYTICS_EVENTS = {
  // User actions
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  PROFILE_COMPLETED: 'profile_completed',
  PHOTO_UPLOADED: 'photo_uploaded',
  
  // Matching actions
  MATCH_SWIPED: 'match_swiped',
  MATCH_LIKED: 'match_liked',
  MATCH_PASSED: 'match_passed',
  MUTUAL_MATCH: 'mutual_match',
  
  // Conversation actions
  MESSAGE_SENT: 'message_sent',
  CONVERSATION_STARTED: 'conversation_started',
  AI_SUGGESTION_USED: 'ai_suggestion_used',
  
  // Reveal actions
  REVEAL_REQUESTED: 'reveal_requested',
  REVEAL_ACCEPTED: 'reveal_accepted',
  REVEAL_DECLINED: 'reveal_declined',
  MUTUAL_REVEAL: 'mutual_reveal',
  
  // Subscription actions
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  UPGRADE_COMPLETED: 'upgrade_completed',
  
  // Engagement
  SESSION_STARTED: 'session_started',
  PAGE_VIEWED: 'page_viewed',
  FEATURE_DISCOVERED: 'feature_discovered',
  HELP_ACCESSED: 'help_accessed'
};

// ========================================
// EXPORT DEFAULT
// ========================================

export default {
  APP_INFO,
  ENV,
  API_CONFIG,
  TRUST_TIERS,
  SUBSCRIPTION_TIERS,
  BGP_CATEGORIES,
  BGP_TRAITS,
  MATCHING_CONFIG,
  REVEAL_STAGES,
  AI_WINGMAN,
  UI_CONFIG,
  VALIDATION_RULES,
  ERROR_CODES,
  FEATURE_FLAGS,
  SOCIAL_LINKS,
  LEGAL_LINKS,
  NOTIFICATION_TYPES,
  DATE_FORMATS,
  ANALYTICS_EVENTS
};