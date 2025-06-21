/**
 * ApexMatch API Endpoints Configuration
 * Centralized API endpoint management for the revolutionary dating platform
 */

// Base configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_VERSION = process.env.REACT_APP_API_VERSION || 'v1';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

// Helper function to build API URLs
const buildApiUrl = (path) => `${API_BASE_URL}/api/${API_VERSION}${path}`;
const buildWsUrl = (path) => `${WS_BASE_URL}${path}`;

// API Endpoints Object
export const API_ENDPOINTS = {
  // Base URLs
  BASE_URL: API_BASE_URL,
  WS_BASE_URL: WS_BASE_URL,
  
  // ================================
  // AUTHENTICATION ENDPOINTS
  // ================================
  AUTH: {
    // User authentication
    REGISTER: buildApiUrl('/auth/register'),
    LOGIN: buildApiUrl('/auth/login'),
    LOGOUT: buildApiUrl('/auth/logout'),
    REFRESH_TOKEN: buildApiUrl('/auth/refresh'),
    
    // Password management
    FORGOT_PASSWORD: buildApiUrl('/auth/forgot-password'),
    RESET_PASSWORD: buildApiUrl('/auth/reset-password'),
    CHANGE_PASSWORD: buildApiUrl('/auth/change-password'),
    
    // Account verification
    VERIFY_EMAIL: buildApiUrl('/auth/verify-email'),
    RESEND_VERIFICATION: buildApiUrl('/auth/resend-verification'),
    
    // Session management
    CHECK_SESSION: buildApiUrl('/auth/status'),
    REVOKE_ALL_SESSIONS: buildApiUrl('/auth/revoke-sessions')
  },

  // ================================
  // USER PROFILE ENDPOINTS
  // ================================
  USER: {
    // Profile management
    PROFILE: buildApiUrl('/user/profile'),
    UPDATE_PROFILE: buildApiUrl('/user/profile'),
    DELETE_ACCOUNT: buildApiUrl('/user/account'),
    
    // Photo management
    UPLOAD_PHOTO: buildApiUrl('/user/photos'),
    DELETE_PHOTO: (photoId) => buildApiUrl(`/user/photos/${photoId}`),
    REORDER_PHOTOS: buildApiUrl('/user/photos/reorder'),
    
    // Privacy settings
    PRIVACY_SETTINGS: buildApiUrl('/user/privacy'),
    BLOCK_USER: (userId) => buildApiUrl(`/user/block/${userId}`),
    UNBLOCK_USER: (userId) => buildApiUrl(`/user/unblock/${userId}`),
    BLOCKED_USERS: buildApiUrl('/user/blocked'),
    
    // Account settings
    NOTIFICATION_SETTINGS: buildApiUrl('/user/notifications'),
    PREFERENCES: buildApiUrl('/user/preferences'),
    DEACTIVATE_ACCOUNT: buildApiUrl('/user/deactivate'),
    
    // Activity tracking
    UPDATE_LAST_ACTIVE: buildApiUrl('/user/activity'),
    LOCATION_UPDATE: buildApiUrl('/user/location')
  },

  // ================================
  // BEHAVIORAL GRAPH PROFILING (BGP)
  // ================================
  BGP: {
    // Profile management
    PROFILE: buildApiUrl('/bgp/profile'),
    UPDATE_DIMENSIONS: buildApiUrl('/bgp/dimensions'),
    ANALYZE_CONVERSATION: buildApiUrl('/bgp/analyze-conversation'),
    
    // Behavioral tracking
    LOG_COMMUNICATION_EVENT: buildApiUrl('/bgp/events/communication'),
    LOG_EMOTIONAL_EVENT: buildApiUrl('/bgp/events/emotional'),
    LOG_DECISION_EVENT: buildApiUrl('/bgp/events/decision'),
    LOG_FOCUS_EVENT: buildApiUrl('/bgp/events/focus'),
    
    // Insights and analytics
    PERSONALITY_INSIGHTS: buildApiUrl('/bgp/insights'),
    COMPATIBILITY_EXPLANATION: (userId) => buildApiUrl(`/bgp/compatibility/${userId}`),
    BEHAVIORAL_VECTOR: buildApiUrl('/bgp/vector'),
    MATCHING_STRENGTHS: buildApiUrl('/bgp/strengths'),
    
    // BGP development
    PROGRESS: buildApiUrl('/bgp/progress'),
    RECOMMENDATIONS: buildApiUrl('/bgp/recommendations'),
    CALIBRATION: buildApiUrl('/bgp/calibration')
  },

  // ================================
  // TRUST SYSTEM ENDPOINTS
  // ================================
  TRUST: {
    // Trust profile
    PROFILE: buildApiUrl('/trust/profile'),
    SCORE_HISTORY: buildApiUrl('/trust/history'),
    TIER_PROGRESSION: buildApiUrl('/trust/progression'),
    
    // Violation reporting
    REPORT_VIOLATION: buildApiUrl('/trust/report'),
    MY_REPORTS: buildApiUrl('/trust/my-reports'),
    REPORTS_AGAINST_ME: buildApiUrl('/trust/reports-against-me'),
    
    // Trust feedback
    GIVE_FEEDBACK: buildApiUrl('/trust/feedback'),
    FEEDBACK_HISTORY: buildApiUrl('/trust/feedback-history'),
    
    // Reformation system
    REFORMATION_STATUS: buildApiUrl('/trust/reformation'),
    REFORMATION_PROGRESS: buildApiUrl('/trust/reformation/progress'),
    REFORMATION_TASKS: buildApiUrl('/trust/reformation/tasks'),
    COMPLETE_REFORMATION_TASK: (taskId) => buildApiUrl(`/trust/reformation/tasks/${taskId}/complete`),
    
    // Trust insights
    TRUST_PERKS: buildApiUrl('/trust/perks'),
    IMPROVEMENT_SUGGESTIONS: buildApiUrl('/trust/suggestions'),
    TRUST_STATISTICS: buildApiUrl('/trust/statistics')
  },

  // ================================
  // MATCHING SYSTEM ENDPOINTS
  // ================================
  MATCHES: {
    // Discovery and browsing
    DISCOVER: buildApiUrl('/matches/discover'),
    POTENTIAL_MATCHES: buildApiUrl('/matches/potential'),
    MATCH_QUEUE: buildApiUrl('/matches/queue'),
    
    // Match actions
    LIKE: (matchId) => buildApiUrl(`/matches/${matchId}/like`),
    PASS: (matchId) => buildApiUrl(`/matches/${matchId}/pass`),
    SUPER_LIKE: (matchId) => buildApiUrl(`/matches/${matchId}/super-like`),
    UNDO_ACTION: buildApiUrl('/matches/undo'),
    
    // Match management
    ACTIVE_MATCHES: buildApiUrl('/matches/active'),
    MATCH_DETAILS: (matchId) => buildApiUrl(`/matches/${matchId}`),
    DELETE_MATCH: (matchId) => buildApiUrl(`/matches/${matchId}`),
    
    // Compatibility analysis
    COMPATIBILITY_BREAKDOWN: (matchId) => buildApiUrl(`/matches/${matchId}/compatibility`),
    MATCH_EXPLANATION: (matchId) => buildApiUrl(`/matches/${matchId}/explanation`),
    
    // Advanced matching
    BOOST_PROFILE: buildApiUrl('/matches/boost'),
    REWIND_MATCHES: buildApiUrl('/matches/rewind'),
    CHANGE_LOCATION: buildApiUrl('/matches/location'),
    
    // Match preferences
    PREFERENCES: buildApiUrl('/matches/preferences'),
    FILTERS: buildApiUrl('/matches/filters'),
    DEALBREAKERS: buildApiUrl('/matches/dealbreakers')
  },

  // ================================
  // PHOTO REVEAL SYSTEM ENDPOINTS
  // ================================
  REVEAL: {
    // Reveal eligibility and status
    ELIGIBILITY: (matchId) => buildApiUrl(`/reveal/${matchId}/eligibility`),
    STATUS: (matchId) => buildApiUrl(`/reveal/${matchId}/status`),
    PROGRESS: (matchId) => buildApiUrl(`/reveal/${matchId}/progress`),
    
    // Reveal requests
    REQUEST_REVEAL: (matchId) => buildApiUrl(`/reveal/${matchId}/request`),
    RESPOND_TO_REVEAL: (matchId) => buildApiUrl(`/reveal/${matchId}/respond`),
    CANCEL_REVEAL: (matchId) => buildApiUrl(`/reveal/${matchId}/cancel`),
    
    // Stage management
    UNLOCK_STAGE: (matchId, stage) => buildApiUrl(`/reveal/${matchId}/stage/${stage}`),
    STAGE_HISTORY: (matchId) => buildApiUrl(`/reveal/${matchId}/stages`),
    
    // Reveal analytics
    SUCCESS_RATE: buildApiUrl('/reveal/success-rate'),
    EMOTIONAL_THRESHOLD: buildApiUrl('/reveal/threshold'),
    REVEAL_STATISTICS: buildApiUrl('/reveal/statistics')
  },

  // ================================
  // CONVERSATION & MESSAGING
  // ================================
  CONVERSATIONS: {
    // Conversation management
    LIST: buildApiUrl('/conversations'),
    CREATE: buildApiUrl('/conversations'),
    GET: (conversationId) => buildApiUrl(`/conversations/${conversationId}`),
    DELETE: (conversationId) => buildApiUrl(`/conversations/${conversationId}`),
    ARCHIVE: (conversationId) => buildApiUrl(`/conversations/${conversationId}/archive`),
    
    // Message management
    MESSAGES: (conversationId) => buildApiUrl(`/conversations/${conversationId}/messages`),
    SEND_MESSAGE: (conversationId) => buildApiUrl(`/conversations/${conversationId}/messages`),
    DELETE_MESSAGE: (conversationId, messageId) => buildApiUrl(`/conversations/${conversationId}/messages/${messageId}`),
    EDIT_MESSAGE: (conversationId, messageId) => buildApiUrl(`/conversations/${conversationId}/messages/${messageId}`),
    
    // Read receipts and status
    MARK_READ: (conversationId) => buildApiUrl(`/conversations/${conversationId}/read`),
    TYPING_INDICATOR: (conversationId) => buildApiUrl(`/conversations/${conversationId}/typing`),
    ONLINE_STATUS: buildApiUrl('/conversations/online-status'),
    
    // Conversation insights
    EMOTIONAL_ANALYSIS: (conversationId) => buildApiUrl(`/conversations/${conversationId}/analysis`),
    CONNECTION_SCORE: (conversationId) => buildApiUrl(`/conversations/${conversationId}/connection`),
    CONVERSATION_INSIGHTS: (conversationId) => buildApiUrl(`/conversations/${conversationId}/insights`),
    
    // Media and attachments
    UPLOAD_MEDIA: (conversationId) => buildApiUrl(`/conversations/${conversationId}/media`),
    DOWNLOAD_MEDIA: (conversationId, mediaId) => buildApiUrl(`/conversations/${conversationId}/media/${mediaId}`)
  },

  // ================================
  // AI WINGMAN ENDPOINTS
  // ================================
  WINGMAN: {
    // Conversation assistance
    SUGGEST_RESPONSE: buildApiUrl('/wingman/suggest'),
    ANALYZE_CONVERSATION: buildApiUrl('/wingman/analyze'),
    CONVERSATION_COACHING: buildApiUrl('/wingman/coaching'),
    
    // Icebreakers and openers
    GENERATE_ICEBREAKER: (matchId) => buildApiUrl(`/wingman/icebreaker/${matchId}`),
    SUGGEST_TOPICS: (conversationId) => buildApiUrl(`/wingman/topics/${conversationId}`),
    CONVERSATION_STARTERS: buildApiUrl('/wingman/starters'),
    
    // Profile optimization
    PROFILE_FEEDBACK: buildApiUrl('/wingman/profile-feedback'),
    PHOTO_RECOMMENDATIONS: buildApiUrl('/wingman/photo-recommendations'),
    BIO_SUGGESTIONS: buildApiUrl('/wingman/bio-suggestions'),
    
    // Dating insights
    DATING_TIPS: buildApiUrl('/wingman/tips'),
    RELATIONSHIP_ADVICE: buildApiUrl('/wingman/advice'),
    SUCCESS_PATTERNS: buildApiUrl('/wingman/success-patterns'),
    
    // AI preferences
    WINGMAN_SETTINGS: buildApiUrl('/wingman/settings'),
    PERSONALITY_STYLE: buildApiUrl('/wingman/personality'),
    COACHING_HISTORY: buildApiUrl('/wingman/history')
  },

  // ================================
  // SUBSCRIPTION & BILLING
  // ================================
  SUBSCRIPTION: {
    // Subscription management
    STATUS: buildApiUrl('/subscription/status'),
    PLANS: buildApiUrl('/subscription/plans'),
    UPGRADE: buildApiUrl('/subscription/upgrade'),
    DOWNGRADE: buildApiUrl('/subscription/downgrade'),
    CANCEL: buildApiUrl('/subscription/cancel'),
    
    // Payment methods
    PAYMENT_METHODS: buildApiUrl('/subscription/payment-methods'),
    ADD_PAYMENT_METHOD: buildApiUrl('/subscription/payment-methods'),
    DELETE_PAYMENT_METHOD: (methodId) => buildApiUrl(`/subscription/payment-methods/${methodId}`),
    SET_DEFAULT_PAYMENT: (methodId) => buildApiUrl(`/subscription/payment-methods/${methodId}/default`),
    
    // Billing history
    INVOICES: buildApiUrl('/subscription/invoices'),
    INVOICE_DETAILS: (invoiceId) => buildApiUrl(`/subscription/invoices/${invoiceId}`),
    DOWNLOAD_INVOICE: (invoiceId) => buildApiUrl(`/subscription/invoices/${invoiceId}/download`),
    
    // Usage tracking
    USAGE: buildApiUrl('/subscription/usage'),
    FEATURE_LIMITS: buildApiUrl('/subscription/limits'),
    USAGE_HISTORY: buildApiUrl('/subscription/usage-history'),
    
    // Promo codes and discounts
    APPLY_PROMO_CODE: buildApiUrl('/subscription/promo-code'),
    AVAILABLE_DISCOUNTS: buildApiUrl('/subscription/discounts'),
    
    // Stripe integration
    CREATE_PAYMENT_INTENT: buildApiUrl('/subscription/create-payment-intent'),
    CONFIRM_PAYMENT: buildApiUrl('/subscription/confirm-payment'),
    STRIPE_WEBHOOK: buildApiUrl('/subscription/stripe-webhook')
  },

  // ================================
  // ANALYTICS & INSIGHTS
  // ================================
  ANALYTICS: {
    // User analytics
    PROFILE_VIEWS: buildApiUrl('/analytics/profile-views'),
    MATCH_STATISTICS: buildApiUrl('/analytics/matches'),
    CONVERSATION_STATS: buildApiUrl('/analytics/conversations'),
    
    // Success metrics
    CONNECTION_SUCCESS_RATE: buildApiUrl('/analytics/success-rate'),
    REVEAL_SUCCESS_RATE: buildApiUrl('/analytics/reveal-success'),
    RELATIONSHIP_OUTCOMES: buildApiUrl('/analytics/relationships'),
    
    // Platform insights
    PLATFORM_STATISTICS: buildApiUrl('/analytics/platform'),
    DEMOGRAPHIC_INSIGHTS: buildApiUrl('/analytics/demographics'),
    BEHAVIORAL_TRENDS: buildApiUrl('/analytics/trends'),
    
    // Personal insights
    MY_STATISTICS: buildApiUrl('/analytics/my-stats'),
    COMPATIBILITY_HISTORY: buildApiUrl('/analytics/compatibility-history'),
    GROWTH_INSIGHTS: buildApiUrl('/analytics/growth')
  },

  // ================================
  // NOTIFICATIONS & ALERTS
  // ================================
  NOTIFICATIONS: {
    // Notification management
    LIST: buildApiUrl('/notifications'),
    MARK_READ: (notificationId) => buildApiUrl(`/notifications/${notificationId}/read`),
    MARK_ALL_READ: buildApiUrl('/notifications/mark-all-read'),
    DELETE: (notificationId) => buildApiUrl(`/notifications/${notificationId}`),
    
    // Push notifications
    REGISTER_DEVICE: buildApiUrl('/notifications/register-device'),
    UNREGISTER_DEVICE: buildApiUrl('/notifications/unregister-device'),
    TEST_NOTIFICATION: buildApiUrl('/notifications/test'),
    
    // Notification preferences
    PREFERENCES: buildApiUrl('/notifications/preferences'),
    EMAIL_PREFERENCES: buildApiUrl('/notifications/email-preferences'),
    PUSH_PREFERENCES: buildApiUrl('/notifications/push-preferences'),
    
    // Alert settings
    MATCH_ALERTS: buildApiUrl('/notifications/match-alerts'),
    MESSAGE_ALERTS: buildApiUrl('/notifications/message-alerts'),
    REVEAL_ALERTS: buildApiUrl('/notifications/reveal-alerts')
  },

  // ================================
  // CONTENT & MODERATION
  // ================================
  MODERATION: {
    // Content reporting
    REPORT_CONTENT: buildApiUrl('/moderation/report'),
    REPORT_USER: buildApiUrl('/moderation/report-user'),
    MY_REPORTS: buildApiUrl('/moderation/my-reports'),
    
    // Content guidelines
    GUIDELINES: buildApiUrl('/moderation/guidelines'),
    COMMUNITY_STANDARDS: buildApiUrl('/moderation/standards'),
    
    // Safety features
    SAFETY_TIPS: buildApiUrl('/moderation/safety-tips'),
    EMERGENCY_CONTACTS: buildApiUrl('/moderation/emergency-contacts'),
    
    // Appeal system
    APPEAL_DECISION: buildApiUrl('/moderation/appeal'),
    APPEAL_STATUS: (appealId) => buildApiUrl(`/moderation/appeals/${appealId}`)
  },

  // ================================
  // EVENTS & SOCIAL FEATURES
  // ================================
  EVENTS: {
    // Event discovery
    LOCAL_EVENTS: buildApiUrl('/events/local'),
    RECOMMENDED_EVENTS: buildApiUrl('/events/recommended'),
    EVENT_DETAILS: (eventId) => buildApiUrl(`/events/${eventId}`),
    
    // Event participation
    JOIN_EVENT: (eventId) => buildApiUrl(`/events/${eventId}/join`),
    LEAVE_EVENT: (eventId) => buildApiUrl(`/events/${eventId}/leave`),
    MY_EVENTS: buildApiUrl('/events/my-events'),
    
    // Event creation (premium feature)
    CREATE_EVENT: buildApiUrl('/events/create'),
    MANAGE_EVENT: (eventId) => buildApiUrl(`/events/${eventId}/manage`),
    
    // Social features
    EVENT_ATTENDEES: (eventId) => buildApiUrl(`/events/${eventId}/attendees`),
    EVENT_CHAT: (eventId) => buildApiUrl(`/events/${eventId}/chat`)
  },

  // ================================
  // WEBSOCKET ENDPOINTS
  // ================================
  WEBSOCKET: {
    // Real-time chat
    CHAT: (conversationId) => buildWsUrl(`/ws/chat/${conversationId}`),
    GLOBAL_CHAT: buildWsUrl('/ws/global-chat'),
    
    // Live updates
    MATCHES: buildWsUrl('/ws/matches'),
    NOTIFICATIONS: buildWsUrl('/ws/notifications'),
    ONLINE_STATUS: buildWsUrl('/ws/presence'),
    
    // Real-time features
    TYPING_INDICATORS: buildWsUrl('/ws/typing'),
    LIVE_REACTIONS: buildWsUrl('/ws/reactions'),
    ACTIVITY_STREAM: buildWsUrl('/ws/activity')
  },

  // ================================
  // ADMIN & SUPPORT (Limited Access)
  // ================================
  ADMIN: {
    // User management (admin only)
    USERS: buildApiUrl('/admin/users'),
    USER_DETAILS: (userId) => buildApiUrl(`/admin/users/${userId}`),
    MODERATE_USER: (userId) => buildApiUrl(`/admin/users/${userId}/moderate`),
    
    // Platform analytics (admin only)
    PLATFORM_METRICS: buildApiUrl('/admin/metrics'),
    TRUST_STATISTICS: buildApiUrl('/admin/trust-stats'),
    REVENUE_ANALYTICS: buildApiUrl('/admin/revenue'),
    
    // Content moderation (admin only)
    PENDING_REPORTS: buildApiUrl('/admin/reports/pending'),
    REVIEW_CONTENT: buildApiUrl('/admin/content/review'),
    MODERATION_ACTIONS: buildApiUrl('/admin/moderation/actions')
  },

  // ================================
  // SUPPORT & HELP
  // ================================
  SUPPORT: {
    // Help and support
    FAQ: buildApiUrl('/support/faq'),
    CONTACT_SUPPORT: buildApiUrl('/support/contact'),
    SUBMIT_TICKET: buildApiUrl('/support/ticket'),
    TICKET_STATUS: (ticketId) => buildApiUrl(`/support/tickets/${ticketId}`),
    
    // Knowledge base
    HELP_ARTICLES: buildApiUrl('/support/articles'),
    SEARCH_HELP: buildApiUrl('/support/search'),
    FEATURE_TUTORIALS: buildApiUrl('/support/tutorials'),
    
    // Feedback
    SUBMIT_FEEDBACK: buildApiUrl('/support/feedback'),
    FEATURE_REQUESTS: buildApiUrl('/support/feature-requests'),
    BUG_REPORTS: buildApiUrl('/support/bug-report')
  },

  // ================================
  // SYSTEM & HEALTH
  // ================================
  SYSTEM: {
    // Health checks
    HEALTH: buildApiUrl('/health'),
    STATUS: buildApiUrl('/status'),
    VERSION: buildApiUrl('/version'),
    
    // Configuration
    APP_CONFIG: buildApiUrl('/config/app'),
    FEATURE_FLAGS: buildApiUrl('/config/features'),
    MAINTENANCE_STATUS: buildApiUrl('/system/maintenance'),
    
    // Legal and compliance
    TERMS_OF_SERVICE: buildApiUrl('/legal/terms'),
    PRIVACY_POLICY: buildApiUrl('/legal/privacy'),
    COOKIE_POLICY: buildApiUrl('/legal/cookies'),
    GDPR_DATA_EXPORT: buildApiUrl('/legal/data-export')
  }
};

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Build URL with query parameters
 * @param {string} baseUrl - Base URL
 * @param {Object} params - Query parameters
 * @returns {string} URL with query parameters
 */
export const buildUrlWithParams = (baseUrl, params = {}) => {
  const url = new URL(baseUrl);
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined) {
      url.searchParams.append(key, params[key]);
    }
  });
  return url.toString();
};

/**
 * Get paginated endpoint URL
 * @param {string} baseUrl - Base endpoint URL
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Items per page
 * @param {Object} filters - Additional filters
 * @returns {string} Paginated URL
 */
export const getPaginatedUrl = (baseUrl, page = 1, limit = 20, filters = {}) => {
  return buildUrlWithParams(baseUrl, {
    page,
    limit,
    ...filters
  });
};

/**
 * WebSocket URL with authentication token
 * @param {string} wsUrl - WebSocket URL
 * @param {string} token - JWT token
 * @returns {string} WebSocket URL with token
 */
export const getAuthenticatedWsUrl = (wsUrl, token) => {
  return `${wsUrl}?token=${encodeURIComponent(token)}`;
};

/**
 * Check if endpoint requires authentication
 * @param {string} endpoint - API endpoint
 * @returns {boolean} Whether endpoint requires auth
 */
export const requiresAuth = (endpoint) => {
  const publicEndpoints = [
    API_ENDPOINTS.AUTH.LOGIN,
    API_ENDPOINTS.AUTH.REGISTER,
    API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
    API_ENDPOINTS.SYSTEM.HEALTH,
    API_ENDPOINTS.SYSTEM.STATUS,
    API_ENDPOINTS.SUPPORT.FAQ,
    API_ENDPOINTS.LEGAL.TERMS_OF_SERVICE,
    API_ENDPOINTS.LEGAL.PRIVACY_POLICY
  ];
  
  return !publicEndpoints.includes(endpoint);
};

/**
 * Get endpoint category
 * @param {string} endpoint - API endpoint
 * @returns {string} Endpoint category
 */
export const getEndpointCategory = (endpoint) => {
  for (const [category, endpoints] of Object.entries(API_ENDPOINTS)) {
    if (typeof endpoints === 'object') {
      for (const subEndpoint of Object.values(endpoints)) {
        if (typeof subEndpoint === 'string' && subEndpoint === endpoint) {
          return category.toLowerCase();
        }
      }
    }
  }
  return 'unknown';
};

// ================================
// RATE LIMITING CONFIGURATION
// ================================

export const RATE_LIMITS = {
  AUTH: { requests: 5, window: 60000 }, // 5 requests per minute
  MATCHING: { requests: 50, window: 3600000 }, // 50 requests per hour
  MESSAGING: { requests: 100, window: 3600000 }, // 100 requests per hour
  WINGMAN: { requests: 25, window: 3600000 }, // 25 requests per hour
  GENERAL: { requests: 1000, window: 3600000 } // 1000 requests per hour
};

// ================================
// ERROR CODES
// ================================

export const API_ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Trust system errors
  TRUST_SCORE_TOO_LOW: 'TRUST_SCORE_TOO_LOW',
  VIOLATION_REPORTED: 'VIOLATION_REPORTED',
  IN_REFORMATION: 'IN_REFORMATION',
  
  // Matching errors
  DAILY_LIMIT_EXCEEDED: 'DAILY_LIMIT_EXCEEDED',
  ALREADY_MATCHED: 'ALREADY_MATCHED',
  INCOMPATIBLE_TRUST_TIERS: 'INCOMPATIBLE_TRUST_TIERS',
  
  // Reveal system errors
  EMOTIONAL_THRESHOLD_NOT_MET: 'EMOTIONAL_THRESHOLD_NOT_MET',
  REVEAL_NOT_MUTUAL: 'REVEAL_NOT_MUTUAL',
  REVEAL_STAGE_LOCKED: 'REVEAL_STAGE_LOCKED',
  
  // Subscription errors
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',
  
  // General errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

// Export default
export default API_ENDPOINTS;