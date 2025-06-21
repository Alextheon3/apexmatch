// frontend/services/aiWingman.js - AI conversation assistant client service
import axios from 'axios';

// AI Wingman configuration
const WINGMAN_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  endpoints: {
    assistance: '/ai-wingman/assistance',
    icebreaker: '/ai-wingman/icebreaker',
    analysis: '/ai-wingman/analysis',
    usage: '/ai-wingman/usage'
  },
  conversationTypes: {
    icebreaker: 'Generate an engaging conversation starter',
    continuation: 'Suggest how to continue this conversation',
    deepening: 'Help deepen the emotional connection',
    humor: 'Add appropriate humor to lighten the mood',
    vulnerability: 'Encourage authentic vulnerability sharing',
    planning: 'Suggest meeting or date planning',
    conflict: 'Navigate potential misunderstandings',
    reveal: 'Prepare for photo reveal conversation'
  },
  cacheTTL: 300000, // 5 minutes
  requestTimeout: 30000 // 30 seconds
};

// AI Wingman Service Class
class AIWingmanService {
  constructor() {
    this.cache = new Map();
    this.api = axios.create({
      baseURL: WINGMAN_CONFIG.baseURL,
      timeout: WINGMAN_CONFIG.requestTimeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Setup request interceptor for auth
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Setup response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired - emit event for auth service to handle
          window.dispatchEvent(new CustomEvent('authError', { detail: error }));
        }
        return Promise.reject(this.normalizeError(error));
      }
    );
  }
  
  // Main conversation assistance function
  async getConversationAssistance(context) {
    try {
      const { conversationId, type, userMessage, matchProfile, conversationHistory } = context;
      
      // Validate required fields
      if (!conversationId || !type) {
        throw new Error('Conversation ID and assistance type are required');
      }
      
      // Check cache first
      const cacheKey = this.generateCacheKey('assistance', context);
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      const response = await this.api.post(WINGMAN_CONFIG.endpoints.assistance, {
        conversationId,
        type,
        userMessage,
        matchProfile,
        conversationHistory: conversationHistory?.slice(-10) || [], // Limit history size
        requestTime: Date.now()
      });
      
      const result = response.data;
      
      // Cache the result
      this.setCache(cacheKey, result);
      
      // Track usage locally
      this.trackUsage(type);
      
      return {
        ...result,
        cached: false,
        timestamp: Date.now()
      };
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Generate conversation starters (icebreakers)
  async generateIcebreaker(matchProfile, userPreferences = {}) {
    try {
      if (!matchProfile) {
        throw new Error('Match profile is required for icebreaker generation');
      }
      
      // Check cache
      const cacheKey = this.generateCacheKey('icebreaker', { matchProfile, userPreferences });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      const response = await this.api.post(WINGMAN_CONFIG.endpoints.icebreaker, {
        matchProfile,
        userPreferences,
        requestTime: Date.now()
      });
      
      const result = response.data;
      
      // Cache the result
      this.setCache(cacheKey, result);
      
      // Track usage
      this.trackUsage('icebreaker');
      
      return {
        ...result,
        cached: false,
        timestamp: Date.now()
      };
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Analyze conversation for insights
  async analyzeConversation(conversationId, options = {}) {
    try {
      if (!conversationId) {
        throw new Error('Conversation ID is required for analysis');
      }
      
      // Check cache
      const cacheKey = this.generateCacheKey('analysis', { conversationId, options });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      const response = await this.api.post(WINGMAN_CONFIG.endpoints.analysis, {
        conversationId,
        analysisType: options.type || 'full',
        includeEmotionalTone: options.includeEmotionalTone !== false,
        includeCompatibility: options.includeCompatibility !== false,
        includeRecommendations: options.includeRecommendations !== false,
        requestTime: Date.now()
      });
      
      const result = response.data;
      
      // Cache the result
      this.setCache(cacheKey, result);
      
      return {
        ...result,
        cached: false,
        timestamp: Date.now()
      };
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Get usage statistics and limits
  async getUsageInfo() {
    try {
      const response = await this.api.get(WINGMAN_CONFIG.endpoints.usage);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Suggest conversation continuation
  async suggestContinuation(conversationId, currentMessage, context = {}) {
    try {
      return await this.getConversationAssistance({
        conversationId,
        type: 'continuation',
        userMessage: currentMessage,
        ...context
      });
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Suggest ways to deepen emotional connection
  async suggestDeepening(conversationId, context = {}) {
    try {
      return await this.getConversationAssistance({
        conversationId,
        type: 'deepening',
        ...context
      });
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Suggest appropriate humor
  async suggestHumor(conversationId, context = {}) {
    try {
      return await this.getConversationAssistance({
        conversationId,
        type: 'humor',
        ...context
      });
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Encourage authentic vulnerability
  async encourageVulnerability(conversationId, context = {}) {
    try {
      return await this.getConversationAssistance({
        conversationId,
        type: 'vulnerability',
        ...context
      });
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Suggest meeting/date planning
  async suggestPlanning(conversationId, context = {}) {
    try {
      return await this.getConversationAssistance({
        conversationId,
        type: 'planning',
        ...context
      });
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Navigate potential conflicts or misunderstandings
  async navigateConflict(conversationId, context = {}) {
    try {
      return await this.getConversationAssistance({
        conversationId,
        type: 'conflict',
        ...context
      });
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Prepare for photo reveal conversation
  async prepareRevealConversation(conversationId, context = {}) {
    try {
      return await this.getConversationAssistance({
        conversationId,
        type: 'reveal',
        ...context
      });
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Analyze message emotions (lightweight analysis)
  async analyzeMessageEmotions(message, context = {}) {
    try {
      if (!message || typeof message !== 'string') {
        throw new Error('Valid message text is required');
      }
      
      // For short analysis, we can cache more aggressively
      const cacheKey = this.generateCacheKey('emotion', { message: message.slice(0, 100), context });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      const response = await this.api.post('/ai-wingman/analyze-emotions', {
        message,
        context,
        requestTime: Date.now()
      });
      
      const result = response.data;
      
      // Cache the result
      this.setCache(cacheKey, result);
      
      return {
        ...result,
        cached: false,
        timestamp: Date.now()
      };
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Get conversation insights summary
  async getConversationInsights(conversationId) {
    try {
      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }
      
      const response = await this.api.get(`/ai-wingman/insights/${conversationId}`);
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Check if user can access AI Wingman features
  async checkAccess() {
    try {
      const response = await this.api.get('/ai-wingman/access');
      return response.data;
    } catch (error) {
      // Return default access info if API fails
      return {
        hasAccess: false,
        reason: 'Unable to verify access',
        remainingUses: 0,
        subscriptionRequired: true
      };
    }
  }
  
  // Cache management
  generateCacheKey(type, data) {
    const keyData = {
      type,
      ...data,
      userId: this.getCurrentUserId()
    };
    
    // Create a simple hash of the key data
    const jsonString = JSON.stringify(keyData);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `wingman_${Math.abs(hash)}`;
  }
  
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expires: Date.now() + WINGMAN_CONFIG.cacheTTL
    });
    
    // Clean old cache entries
    this.cleanCache();
  }
  
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return {
      ...cached.data,
      cached: true,
      cacheAge: Date.now() - cached.timestamp
    };
  }
  
  cleanCache() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expires) {
        this.cache.delete(key);
      }
    }
  }
  
  clearCache() {
    this.cache.clear();
  }
  
  // Usage tracking (local)
  trackUsage(type) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `wingman_usage_${today}`;
      const usage = JSON.parse(localStorage.getItem(key) || '{}');
      
      usage[type] = (usage[type] || 0) + 1;
      usage.total = (usage.total || 0) + 1;
      usage.lastUsed = Date.now();
      
      localStorage.setItem(key, JSON.stringify(usage));
    } catch (error) {
      console.warn('Failed to track AI Wingman usage:', error);
    }
  }
  
  getLocalUsage() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `wingman_usage_${today}`;
      return JSON.parse(localStorage.getItem(key) || '{}');
    } catch (error) {
      return {};
    }
  }
  
  // Utility methods
  getStoredToken() {
    return localStorage.getItem('apexmatch_token');
  }
  
  getCurrentUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('apexmatch_user') || '{}');
      return user.id || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }
  
  normalizeError(error) {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || data?.error || 'AI Wingman service error';
      
      return {
        type: 'api_error',
        status,
        message,
        code: data?.code || 'UNKNOWN_ERROR',
        details: data?.details || null,
        retryable: status >= 500 || status === 429
      };
    } else if (error.request) {
      return {
        type: 'network_error',
        message: 'Unable to connect to AI Wingman service',
        retryable: true
      };
    } else if (error.message) {
      return {
        type: 'client_error',
        message: error.message,
        retryable: false
      };
    } else {
      return {
        type: 'unknown_error',
        message: 'An unexpected error occurred',
        retryable: false
      };
    }
  }
  
  // Feature availability check
  isFeatureAvailable(feature) {
    const localUsage = this.getLocalUsage();
    
    switch (feature) {
      case 'icebreaker':
        return localUsage.icebreaker < 10; // Example limit
      case 'analysis':
        return localUsage.analysis < 5;
      default:
        return true;
    }
  }
  
  // Get conversation type info
  getConversationTypes() {
    return WINGMAN_CONFIG.conversationTypes;
  }
  
  // Health check
  async healthCheck() {
    try {
      const response = await this.api.get('/ai-wingman/health');
      return {
        healthy: true,
        ...response.data
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
export const aiWingmanService = new AIWingmanService();

// Export utility functions
export const aiWingman = {
  getConversationAssistance: (context) => aiWingmanService.getConversationAssistance(context),
  generateIcebreaker: (matchProfile, userPreferences) => aiWingmanService.generateIcebreaker(matchProfile, userPreferences),
  analyzeConversation: (conversationId, options) => aiWingmanService.analyzeConversation(conversationId, options),
  getUsageInfo: () => aiWingmanService.getUsageInfo(),
  
  // Specific assistance types
  suggestContinuation: (conversationId, message, context) => aiWingmanService.suggestContinuation(conversationId, message, context),
  suggestDeepening: (conversationId, context) => aiWingmanService.suggestDeepening(conversationId, context),
  suggestHumor: (conversationId, context) => aiWingmanService.suggestHumor(conversationId, context),
  encourageVulnerability: (conversationId, context) => aiWingmanService.encourageVulnerability(conversationId, context),
  suggestPlanning: (conversationId, context) => aiWingmanService.suggestPlanning(conversationId, context),
  navigateConflict: (conversationId, context) => aiWingmanService.navigateConflict(conversationId, context),
  prepareRevealConversation: (conversationId, context) => aiWingmanService.prepareRevealConversation(conversationId, context),
  
  // Analysis and insights
  analyzeMessageEmotions: (message, context) => aiWingmanService.analyzeMessageEmotions(message, context),
  getConversationInsights: (conversationId) => aiWingmanService.getConversationInsights(conversationId),
  
  // Utility methods
  checkAccess: () => aiWingmanService.checkAccess(),
  getLocalUsage: () => aiWingmanService.getLocalUsage(),
  isFeatureAvailable: (feature) => aiWingmanService.isFeatureAvailable(feature),
  getConversationTypes: () => aiWingmanService.getConversationTypes(),
  clearCache: () => aiWingmanService.clearCache(),
  healthCheck: () => aiWingmanService.healthCheck()
};

export default aiWingman;