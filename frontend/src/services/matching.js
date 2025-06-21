// frontend/services/matching.js - Matching service client
import axios from 'axios';

// Matching configuration
const MATCHING_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  endpoints: {
    matches: '/matches',
    swipe: '/matches/{matchId}/swipe',
    reveal: '/reveals',
    autoMatch: '/matches/auto',
    insights: '/matches/insights'
  },
  cacheTTL: 300000, // 5 minutes
  requestTimeout: 30000
};

// Trust tier definitions
const TRUST_TIERS = {
  CHALLENGED: { min: 0, max: 49, name: 'Challenged', color: '#ef4444' },
  BUILDING: { min: 50, max: 69, name: 'Building', color: '#f97316' },
  RELIABLE: { min: 70, max: 84, name: 'Reliable', color: '#eab308' },
  TRUSTED: { min: 85, max: 94, name: 'Trusted', color: '#22c55e' },
  ELITE: { min: 95, max: 100, name: 'Elite', color: '#8b5cf6' }
};

// Matching Service Class
class MatchingService {
  constructor() {
    this.cache = new Map();
    this.api = axios.create({
      baseURL: MATCHING_CONFIG.baseURL,
      timeout: MATCHING_CONFIG.requestTimeout,
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
          window.dispatchEvent(new CustomEvent('authError', { detail: error }));
        }
        return Promise.reject(this.normalizeError(error));
      }
    );
  }
  
  // Get matches for user
  async getMatches(filters = {}) {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey('matches', filters);
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      const response = await this.api.get(MATCHING_CONFIG.endpoints.matches, {
        params: {
          ...filters,
          timestamp: Date.now()
        }
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
  
  // Process swipe action
  async swipeMatch(matchId, action, context = {}) {
    try {
      if (!matchId || !action) {
        throw new Error('Match ID and action are required');
      }
      
      if (!['like', 'pass', 'super_like'].includes(action)) {
        throw new Error('Invalid swipe action');
      }
      
      const endpoint = MATCHING_CONFIG.endpoints.swipe.replace('{matchId}', matchId);
      
      const response = await this.api.post(endpoint, {
        action,
        context: {
          ...context,
          timestamp: Date.now(),
          clientId: this.generateClientId()
        }
      });
      
      const result = response.data;
      
      // Clear matches cache since user pool has changed
      this.clearMatchesCache();
      
      // Track swipe locally
      this.trackSwipe(action);
      
      return result;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Request photo reveal
  async requestReveal(matchId, message = '') {
    try {
      if (!matchId) {
        throw new Error('Match ID is required for reveal request');
      }
      
      const response = await this.api.post(`${MATCHING_CONFIG.endpoints.reveal}/request`, {
        matchId,
        message,
        requestTime: Date.now()
      });
      
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Respond to reveal request
  async respondToReveal(requestId, action, message = '') {
    try {
      if (!requestId || !action) {
        throw new Error('Request ID and action are required');
      }
      
      if (!['accept', 'decline'].includes(action)) {
        throw new Error('Invalid reveal response action');
      }
      
      const response = await this.api.post(`${MATCHING_CONFIG.endpoints.reveal}/${requestId}/respond`, {
        action,
        message,
        responseTime: Date.now()
      });
      
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Check reveal eligibility
  async checkRevealEligibility(matchId) {
    try {
      if (!matchId) {
        throw new Error('Match ID is required');
      }
      
      const response = await this.api.get(`${MATCHING_CONFIG.endpoints.reveal}/eligibility/${matchId}`);
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Get reveal requests
  async getRevealRequests() {
    try {
      const response = await this.api.get(`${MATCHING_CONFIG.endpoints.reveal}/requests`);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Run auto-matching for premium users
  async runAutoMatching(criteria = {}) {
    try {
      const response = await this.api.post(MATCHING_CONFIG.endpoints.autoMatch, {
        criteria,
        requestTime: Date.now()
      });
      
      // Clear cache since new matches may be available
      this.clearMatchesCache();
      
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Get matching insights and statistics
  async getMatchingInsights(timeframe = '30d') {
    try {
      const response = await this.api.get(MATCHING_CONFIG.endpoints.insights, {
        params: { timeframe }
      });
      
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Get compatibility score with specific user
  async getCompatibilityScore(otherUserId) {
    try {
      if (!otherUserId) {
        throw new Error('Other user ID is required');
      }
      
      const response = await this.api.get(`/matches/compatibility/${otherUserId}`);
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Get match recommendations
  async getRecommendations(preferences = {}) {
    try {
      const response = await this.api.get('/matches/recommendations', {
        params: preferences
      });
      
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Get mutual matches (conversations)
  async getMutualMatches() {
    try {
      const response = await this.api.get('/matches/mutual');
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Update matching preferences
  async updatePreferences(preferences) {
    try {
      const response = await this.api.put('/matches/preferences', preferences);
      
      // Clear cache since preferences affect matching
      this.clearMatchesCache();
      
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Get daily match count and limits
  async getMatchLimits() {
    try {
      const response = await this.api.get('/matches/limits');
      return response.data;
    } catch (error) {
      // Return default limits if API fails
      return {
        dailyMatches: 0,
        dailyLimit: 1,
        unlimited: false,
        resetsAt: Date.now() + 86400000 // 24 hours
      };
    }
  }
  
  // Helper methods
  getTrustTier(trustScore) {
    for (const [tierName, tier] of Object.entries(TRUST_TIERS)) {
      if (trustScore >= tier.min && trustScore <= tier.max) {
        return { ...tier, name: tierName, score: trustScore };
      }
    }
    return { ...TRUST_TIERS.BUILDING, name: 'BUILDING', score: trustScore };
  }
  
  getNextTrustTier(currentScore) {
    const currentTier = this.getTrustTier(currentScore);
    const tierNames = Object.keys(TRUST_TIERS);
    const currentIndex = tierNames.indexOf(currentTier.name);
    
    if (currentIndex < tierNames.length - 1) {
      const nextTierName = tierNames[currentIndex + 1];
      const nextTier = TRUST_TIERS[nextTierName];
      return {
        ...nextTier,
        name: nextTierName,
        pointsNeeded: nextTier.min - currentScore
      };
    }
    
    return null; // Already at highest tier
  }
  
  // Cache management
  generateCacheKey(type, data) {
    const keyData = {
      type,
      ...data,
      userId: this.getCurrentUserId()
    };
    
    const jsonString = JSON.stringify(keyData);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `matching_${Math.abs(hash)}`;
  }
  
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expires: Date.now() + MATCHING_CONFIG.cacheTTL
    });
    
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
  
  clearMatchesCache() {
    for (const key of this.cache.keys()) {
      if (key.includes('matches')) {
        this.cache.delete(key);
      }
    }
  }
  
  // Local tracking
  trackSwipe(action) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `swipe_history_${today}`;
      const history = JSON.parse(localStorage.getItem(key) || '{}');
      
      history[action] = (history[action] || 0) + 1;
      history.total = (history.total || 0) + 1;
      history.lastSwipe = Date.now();
      
      localStorage.setItem(key, JSON.stringify(history));
    } catch (error) {
      console.warn('Failed to track swipe:', error);
    }
  }
  
  getLocalSwipeHistory() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `swipe_history_${today}`;
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
  
  generateClientId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  normalizeError(error) {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || data?.error || 'Matching service error';
      
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
        message: 'Unable to connect to matching service',
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
  
  // Distance calculation (browser-compatible)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
             Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  // Health check
  async healthCheck() {
    try {
      const response = await this.api.get('/matches/health');
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
export const matchingService = new MatchingService();

// Export utility functions
export const matching = {
  // Core matching
  getMatches: (filters) => matchingService.getMatches(filters),
  swipeMatch: (matchId, action, context) => matchingService.swipeMatch(matchId, action, context),
  
  // Reveal system
  requestReveal: (matchId, message) => matchingService.requestReveal(matchId, message),
  respondToReveal: (requestId, action, message) => matchingService.respondToReveal(requestId, action, message),
  checkRevealEligibility: (matchId) => matchingService.checkRevealEligibility(matchId),
  getRevealRequests: () => matchingService.getRevealRequests(),
  
  // Advanced features
  runAutoMatching: (criteria) => matchingService.runAutoMatching(criteria),
  getMatchingInsights: (timeframe) => matchingService.getMatchingInsights(timeframe),
  getCompatibilityScore: (otherUserId) => matchingService.getCompatibilityScore(otherUserId),
  getRecommendations: (preferences) => matchingService.getRecommendations(preferences),
  
  // User management
  getMutualMatches: () => matchingService.getMutualMatches(),
  updatePreferences: (preferences) => matchingService.updatePreferences(preferences),
  getMatchLimits: () => matchingService.getMatchLimits(),
  
  // Utility methods
  getTrustTier: (trustScore) => matchingService.getTrustTier(trustScore),
  getNextTrustTier: (currentScore) => matchingService.getNextTrustTier(currentScore),
  calculateDistance: (lat1, lng1, lat2, lng2) => matchingService.calculateDistance(lat1, lng1, lat2, lng2),
  getLocalSwipeHistory: () => matchingService.getLocalSwipeHistory(),
  clearCache: () => matchingService.clearCache(),
  healthCheck: () => matchingService.healthCheck()
};

// Export trust tiers for UI components
export { TRUST_TIERS };

export default matching;