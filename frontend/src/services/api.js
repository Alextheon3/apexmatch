// backend/services/api.js - Core API service layer
import axios from 'axios';
import { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';

// Initialize Redis for caching and session management
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// API Configuration
const API_CONFIG = {
  baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  cacheExpiry: {
    user: 300,      // 5 minutes
    matches: 120,   // 2 minutes
    bgp: 1800,      // 30 minutes
    trust: 600      // 10 minutes
  }
};

// Rate limiting configurations
export const rateLimiters = {
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { error: 'Too many login attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
  }),
  
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { error: 'Too many requests, please slow down' }
  }),
  
  premium: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500, // Higher limit for premium users
    skip: (req) => !req.user?.isPremium
  })
};

// Core API Service Class
class APIService {
  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': '1.0'
      }
    });
    
    this.setupInterceptors();
    this.setupRetryLogic();
  }
  
  // Setup request/response interceptors
  setupInterceptors() {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add request timestamp for analytics
        config.metadata = { startTime: Date.now() };
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Response interceptor - handle errors and caching
    this.client.interceptors.response.use(
      (response) => {
        // Calculate request duration
        const duration = Date.now() - response.config.metadata.startTime;
        response.duration = duration;
        
        // Cache successful responses
        if (response.config.method === 'get') {
          this.cacheResponse(response);
        }
        
        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired - attempt refresh
          const refreshed = await this.refreshToken();
          if (refreshed) {
            // Retry original request with new token
            error.config.headers.Authorization = `Bearer ${this.getStoredToken()}`;
            return this.client.request(error.config);
          } else {
            // Refresh failed - redirect to login
            this.handleAuthFailure();
          }
        }
        
        return Promise.reject(this.normalizeError(error));
      }
    );
  }
  
  // Setup retry logic for failed requests
  setupRetryLogic() {
    this.client.defaults.retry = API_CONFIG.retryAttempts;
    this.client.defaults.retryDelay = API_CONFIG.retryDelay;
  }
  
  // Authentication methods
  async login(credentials) {
    try {
      const response = await this.client.post('/auth/login', credentials);
      const { token, refresh_token, user } = response.data;
      
      // Store tokens and user data
      this.storeTokens(token, refresh_token);
      await this.cacheUser(user);
      
      return { success: true, user, token };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  async register(userData) {
    try {
      const response = await this.client.post('/auth/register', userData);
      const { token, refresh_token, user } = response.data;
      
      this.storeTokens(token, refresh_token);
      await this.cacheUser(user);
      
      return { success: true, user, token };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  async refreshToken() {
    try {
      const refreshToken = this.getStoredRefreshToken();
      if (!refreshToken) return false;
      
      const response = await this.client.post('/auth/refresh', {
        refresh_token: refreshToken
      });
      
      const { token, refresh_token } = response.data;
      this.storeTokens(token, refresh_token);
      
      return true;
    } catch (error) {
      this.clearTokens();
      return false;
    }
  }
  
  async logout() {
    try {
      await this.client.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if server request fails
    } finally {
      this.clearTokens();
      await this.clearCache();
    }
  }
  
  // User profile methods
  async getProfile(userId = 'me') {
    const cached = await this.getCachedUser(userId);
    if (cached) return cached;
    
    try {
      const response = await this.client.get(`/users/${userId}/profile`);
      await this.cacheUser(response.data);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  async updateProfile(updates) {
    try {
      const response = await this.client.put('/users/me/profile', updates);
      await this.cacheUser(response.data);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // BGP (Behavioral Graph Profile) methods
  async getBGP(userId = 'me') {
    const cacheKey = `bgp:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    try {
      const response = await this.client.get(`/users/${userId}/bgp`);
      await redis.setex(cacheKey, API_CONFIG.cacheExpiry.bgp, JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  async logBehaviorEvent(event) {
    try {
      // Batch events for efficiency
      const events = await this.getBatchedEvents();
      events.push({
        ...event,
        timestamp: Date.now(),
        session_id: this.getSessionId()
      });
      
      if (events.length >= 5) {
        await this.flushBehaviorEvents(events);
      } else {
        await this.storeBatchedEvents(events);
      }
      
      return { success: true };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  async flushBehaviorEvents(events = null) {
    try {
      const eventsToSend = events || await this.getBatchedEvents();
      if (eventsToSend.length === 0) return;
      
      await this.client.post('/bgp/events', { events: eventsToSend });
      await this.clearBatchedEvents();
      
      return { success: true };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Matching methods
  async getMatches(filters = {}) {
    try {
      const response = await this.client.get('/matches', { params: filters });
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  async swipeMatch(matchId, action, context = {}) {
    try {
      const response = await this.client.post(`/matches/${matchId}/swipe`, {
        action, // 'like', 'pass', 'super_like'
        context: {
          ...context,
          timestamp: Date.now(),
          decision_time: context.decisionTime || 0
        }
      });
      
      // Log behavioral event
      await this.logBehaviorEvent({
        type: 'swipe_action',
        action,
        match_id: matchId,
        decision_time: context.decisionTime
      });
      
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Conversation methods
  async getConversations() {
    try {
      const response = await this.client.get('/conversations');
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  async sendMessage(conversationId, content, metadata = {}) {
    try {
      const response = await this.client.post(`/conversations/${conversationId}/messages`, {
        content,
        metadata: {
          ...metadata,
          timestamp: Date.now(),
          client_id: this.generateClientId()
        }
      });
      
      // Log behavioral event
      await this.logBehaviorEvent({
        type: 'message_sent',
        conversation_id: conversationId,
        message_length: content.length,
        has_emoji: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(content),
        has_question: content.includes('?')
      });
      
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Reveal system methods
  async requestReveal(matchId, message = '') {
    try {
      const response = await this.client.post(`/matches/${matchId}/reveal/request`, {
        message,
        timestamp: Date.now()
      });
      
      await this.logBehaviorEvent({
        type: 'reveal_requested',
        match_id: matchId,
        has_message: message.length > 0
      });
      
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  async respondToReveal(requestId, action, message = '') {
    try {
      const response = await this.client.post(`/reveals/${requestId}/respond`, {
        action, // 'accept', 'decline'
        message,
        timestamp: Date.now()
      });
      
      await this.logBehaviorEvent({
        type: 'reveal_response',
        request_id: requestId,
        action,
        response_time: Date.now() - response.data.request_time
      });
      
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Trust score methods
  async getTrustScore(userId = 'me') {
    const cacheKey = `trust:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    try {
      const response = await this.client.get(`/users/${userId}/trust`);
      await redis.setex(cacheKey, API_CONFIG.cacheExpiry.trust, JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Subscription methods
  async getSubscription() {
    try {
      const response = await this.client.get('/subscription');
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  async createSubscription(planId, paymentMethodId) {
    try {
      const response = await this.client.post('/subscription/create', {
        plan_id: planId,
        payment_method_id: paymentMethodId
      });
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // File upload methods
  async uploadFile(file, type = 'profile_image') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const response = await this.client.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          this.emitUploadProgress(progress);
        }
      });
      
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Utility methods
  getStoredToken() {
    return localStorage.getItem('apexmatch_token');
  }
  
  getStoredRefreshToken() {
    return localStorage.getItem('apexmatch_refresh_token');
  }
  
  storeTokens(token, refreshToken) {
    localStorage.setItem('apexmatch_token', token);
    localStorage.setItem('apexmatch_refresh_token', refreshToken);
  }
  
  clearTokens() {
    localStorage.removeItem('apexmatch_token');
    localStorage.removeItem('apexmatch_refresh_token');
    localStorage.removeItem('apexmatch_user');
  }
  
  async cacheUser(user) {
    const cacheKey = `user:${user.id}`;
    await redis.setex(cacheKey, API_CONFIG.cacheExpiry.user, JSON.stringify(user));
    localStorage.setItem('apexmatch_user', JSON.stringify(user));
  }
  
  async getCachedUser(userId) {
    const cacheKey = `user:${userId}`;
    const cached = await redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }
  
  async clearCache() {
    const pattern = 'apexmatch:*';
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
  
  cacheResponse(response) {
    // Cache GET responses based on URL and params
    const cacheKey = this.generateCacheKey(response.config);
    const expiry = this.getCacheExpiry(response.config.url);
    
    if (expiry > 0) {
      redis.setex(cacheKey, expiry, JSON.stringify(response.data));
    }
  }
  
  generateCacheKey(config) {
    const url = config.url;
    const params = JSON.stringify(config.params || {});
    return `apexmatch:cache:${url}:${btoa(params)}`;
  }
  
  getCacheExpiry(url) {
    if (url.includes('/matches')) return API_CONFIG.cacheExpiry.matches;
    if (url.includes('/bgp')) return API_CONFIG.cacheExpiry.bgp;
    if (url.includes('/trust')) return API_CONFIG.cacheExpiry.trust;
    if (url.includes('/users')) return API_CONFIG.cacheExpiry.user;
    return 0; // No caching for other endpoints
  }
  
  async getBatchedEvents() {
    const stored = localStorage.getItem('apexmatch_batched_events');
    return stored ? JSON.parse(stored) : [];
  }
  
  async storeBatchedEvents(events) {
    localStorage.setItem('apexmatch_batched_events', JSON.stringify(events));
  }
  
  async clearBatchedEvents() {
    localStorage.removeItem('apexmatch_batched_events');
  }
  
  getSessionId() {
    let sessionId = sessionStorage.getItem('apexmatch_session_id');
    if (!sessionId) {
      sessionId = this.generateClientId();
      sessionStorage.setItem('apexmatch_session_id', sessionId);
    }
    return sessionId;
  }
  
  generateClientId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  normalizeError(error) {
    if (error.response) {
      // Server responded with error status
      return {
        type: 'server_error',
        status: error.response.status,
        message: error.response.data?.message || 'Server error occurred',
        details: error.response.data?.details || null,
        timestamp: Date.now()
      };
    } else if (error.request) {
      // Network error
      return {
        type: 'network_error',
        message: 'Network connection failed',
        details: error.message,
        timestamp: Date.now()
      };
    } else {
      // Other error
      return {
        type: 'client_error',
        message: error.message || 'An unexpected error occurred',
        details: error.stack,
        timestamp: Date.now()
      };
    }
  }
  
  handleAuthFailure() {
    this.clearTokens();
    window.location.href = '/login';
  }
  
  emitUploadProgress(progress) {
    window.dispatchEvent(new CustomEvent('uploadProgress', { detail: progress }));
  }
  
  // Health check
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
}

// Create singleton instance
export const apiService = new APIService();

// Export utility functions
export const api = {
  // Auth
  login: (credentials) => apiService.login(credentials),
  register: (userData) => apiService.register(userData),
  logout: () => apiService.logout(),
  refreshToken: () => apiService.refreshToken(),
  
  // Profile
  getProfile: (userId) => apiService.getProfile(userId),
  updateProfile: (updates) => apiService.updateProfile(updates),
  
  // BGP
  getBGP: (userId) => apiService.getBGP(userId),
  logBehaviorEvent: (event) => apiService.logBehaviorEvent(event),
  flushBehaviorEvents: () => apiService.flushBehaviorEvents(),
  
  // Matching
  getMatches: (filters) => apiService.getMatches(filters),
  swipeMatch: (matchId, action, context) => apiService.swipeMatch(matchId, action, context),
  
  // Conversations
  getConversations: () => apiService.getConversations(),
  sendMessage: (conversationId, content, metadata) => apiService.sendMessage(conversationId, content, metadata),
  
  // Reveals
  requestReveal: (matchId, message) => apiService.requestReveal(matchId, message),
  respondToReveal: (requestId, action, message) => apiService.respondToReveal(requestId, action, message),
  
  // Trust
  getTrustScore: (userId) => apiService.getTrustScore(userId),
  
  // Subscription
  getSubscription: () => apiService.getSubscription(),
  createSubscription: (planId, paymentMethodId) => apiService.createSubscription(planId, paymentMethodId),
  
  // Upload
  uploadFile: (file, type) => apiService.uploadFile(file, type),
  
  // Utils
  healthCheck: () => apiService.healthCheck()
};

export default api;