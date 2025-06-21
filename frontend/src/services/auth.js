// frontend/services/auth.js - FINAL FIXED Frontend authentication service
import axios from 'axios';

// Simple EventEmitter for browser compatibility
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  once(event, callback) {
    const onceCallback = (...args) => {
      callback(...args);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }

  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error('Event callback error:', error);
      }
    });
  }

  removeAllListeners() {
    this.events = {};
  }
}

// Auth configuration - FIXED TO USE 127.0.0.1
const AUTH_CONFIG = {
  baseURL: 'http://127.0.0.1:8000', // HARDCODED for debugging
  tokenKey: 'apexmatch_token',
  refreshTokenKey: 'apexmatch_refresh_token',
  userKey: 'apexmatch_user',
  sessionKey: 'apexmatch_session_id',
  tokenRefreshThreshold: 300000, // 5 minutes before expiry
  maxLoginAttempts: 5,
  lockoutDuration: 900000, // 15 minutes
  passwordRequirements: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  }
};

// Log the configuration for debugging
console.log('🔧 Auth Config baseURL:', AUTH_CONFIG.baseURL);

// Authentication Service Class
class AuthService extends EventEmitter {
  constructor() {
    super();
    this.currentUser = null;
    this.isAuthenticated = false;
    this.loginAttempts = new Map();
    this.refreshTimer = null;
    this.sessionId = null;
    
    console.log('🚀 AuthService initializing with baseURL:', AUTH_CONFIG.baseURL);
    
    // Create axios instance
    this.api = axios.create({
      baseURL: AUTH_CONFIG.baseURL,
      timeout: 10000, // Reduced timeout for faster feedback
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Setup request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log('📤 Making request to:', config.baseURL + config.url);
        
        const token = this.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add session ID
        if (this.sessionId) {
          config.headers['X-Session-ID'] = this.sessionId;
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Setup response interceptor for debugging
    this.api.interceptors.response.use(
      (response) => {
        console.log('📥 Response received:', {
          status: response.status,
          url: response.config.url,
          data: response.data
        });
        return response;
      },
      (error) => {
        console.error('📥 Response error:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );
    
    // Initialize session
    this.initializeSession();
  }
  
  // Initialize authentication state from storage
  initializeSession() {
    try {
      const token = this.getStoredToken();
      const user = this.getStoredUser();
      const sessionId = this.getStoredSessionId();
      
      if (token && user) {
        this.currentUser = user;
        this.isAuthenticated = true;
        this.sessionId = sessionId || this.generateSessionId();
        this.emit('authStateChanged', { isAuthenticated: true, user });
      } else {
        this.sessionId = this.generateSessionId();
        this.storeSessionId(this.sessionId);
      }
    } catch (error) {
      console.error('Session initialization failed:', error);
      this.clearStoredAuth();
    }
  }
  
  // User login - FINAL FIXED VERSION
  async login(credentials) {
    try {
      const { email, password, rememberMe = false } = credentials;
      
      console.log('🔐 Starting login process...');
      console.log('📍 Target URL:', `${AUTH_CONFIG.baseURL}/api/v1/auth/login`);
      
      // Validate credentials
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      const loginData = {
        email: email.toLowerCase(),
        password,
        rememberMe,
        sessionId: this.sessionId
      };
      
      console.log('📤 Sending login request with data:', {
        ...loginData,
        password: '[REDACTED]'
      });
      
      const response = await this.api.post('/api/v1/auth/login', loginData);
      
      console.log('✅ Login response received:', response.data);
      
      // Handle the actual backend response format
      const { access_token, token_type, user } = response.data;
      
      if (access_token && user) {
        console.log('💾 Storing authentication data...');
        
        // Store authentication data with correct field names
        this.storeTokens(access_token, null);
        this.storeUser(user);
        
        // Update internal state
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Clear rate limiting
        this.clearLoginAttempts('login', email);
        
        // Emit events
        this.emit('authStateChanged', { isAuthenticated: true, user });
        this.emit('userLoggedIn', user);
        
        console.log('🎉 Login successful!');
        
        return {
          access_token,
          token_type,
          user,
          success: true,
          message: 'Login successful!'
        };
      } else {
        console.error('❌ Invalid response format:', response.data);
        throw new Error('Invalid response format from server');
      }
      
    } catch (error) {
      console.error('❌ Login error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data
      });
      
      this.trackLoginAttempt('login', false, credentials.email);
      throw this.normalizeError(error);
    }
  }
  
  // User registration - FIXED API PATH
  async register(userData) {
    try {
      console.log('📝 Making registration request to:', `${AUTH_CONFIG.baseURL}/api/v1/auth/register`);
      
      const response = await this.api.post('/api/v1/auth/register', {
        ...userData,
        sessionId: this.sessionId
      });
      
      console.log('✅ Registration response:', response.data);
      
      const { access_token, token_type, user } = response.data;
      
      if (access_token && user) {
        // Store authentication data
        this.storeTokens(access_token, null);
        this.storeUser(user);
        
        // Update internal state
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Emit events
        this.emit('authStateChanged', { isAuthenticated: true, user });
        this.emit('userRegistered', user);
        
        return {
          success: true,
          user,
          access_token,
          message: 'Registration successful!'
        };
      } else {
        throw new Error('Invalid response format from server');
      }
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw this.normalizeError(error);
    }
  }
  
  // Logout user - FIXED API PATH
  async logout() {
    try {
      // Notify server
      if (this.isAuthenticated) {
        await this.api.post('/api/v1/auth/logout').catch(() => {
          // Continue with logout even if server request fails
        });
      }
    } finally {
      // Clear local state
      this.clearStoredAuth();
      this.currentUser = null;
      this.isAuthenticated = false;
      
      // Clear timers
      this.clearTokenRefreshTimer();
      
      // Emit events
      this.emit('authStateChanged', { isAuthenticated: false, user: null });
      this.emit('userLoggedOut');
    }
  }
  
  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }
  
  // Check if user is authenticated
  isUserAuthenticated() {
    return this.isAuthenticated && this.currentUser && this.getStoredToken();
  }
  
  // Storage methods
  getStoredToken() {
    return localStorage.getItem(AUTH_CONFIG.tokenKey);
  }
  
  getStoredRefreshToken() {
    return localStorage.getItem(AUTH_CONFIG.refreshTokenKey);
  }
  
  getStoredUser() {
    try {
      const userData = localStorage.getItem(AUTH_CONFIG.userKey);
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }
  
  getStoredSessionId() {
    return sessionStorage.getItem(AUTH_CONFIG.sessionKey);
  }
  
  storeTokens(accessToken, refreshToken) {
    localStorage.setItem(AUTH_CONFIG.tokenKey, accessToken);
    if (refreshToken) {
      localStorage.setItem(AUTH_CONFIG.refreshTokenKey, refreshToken);
    }
  }
  
  storeUser(user) {
    localStorage.setItem(AUTH_CONFIG.userKey, JSON.stringify(user));
  }
  
  storeSessionId(sessionId) {
    this.sessionId = sessionId;
    sessionStorage.setItem(AUTH_CONFIG.sessionKey, sessionId);
  }
  
  clearStoredAuth() {
    localStorage.removeItem(AUTH_CONFIG.tokenKey);
    localStorage.removeItem(AUTH_CONFIG.refreshTokenKey);
    localStorage.removeItem(AUTH_CONFIG.userKey);
  }
  
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Rate limiting
  checkRateLimit(action, identifier = 'global') {
    const key = `${action}:${identifier}`;
    const attempts = this.loginAttempts.get(key) || { count: 0, firstAttempt: Date.now() };
    
    // Reset if outside window
    if (Date.now() - attempts.firstAttempt > AUTH_CONFIG.lockoutDuration) {
      this.loginAttempts.delete(key);
      return;
    }
    
    if (attempts.count >= AUTH_CONFIG.maxLoginAttempts) {
      const remainingTime = Math.ceil((AUTH_CONFIG.lockoutDuration - (Date.now() - attempts.firstAttempt)) / 60000);
      throw new Error(`Too many ${action} attempts. Try again in ${remainingTime} minutes.`);
    }
  }
  
  trackLoginAttempt(action, success, identifier = 'global') {
    const key = `${action}:${identifier}`;
    
    if (success) {
      this.loginAttempts.delete(key);
    } else {
      const attempts = this.loginAttempts.get(key) || { count: 0, firstAttempt: Date.now() };
      attempts.count++;
      this.loginAttempts.set(key, attempts);
    }
  }
  
  clearLoginAttempts(action, identifier = 'global') {
    const key = `${action}:${identifier}`;
    this.loginAttempts.delete(key);
  }
  
  clearTokenRefreshTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
  
  // Error handling
  normalizeError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      const message = data?.message || data?.error || data?.detail || 'Server error occurred';
      
      return {
        type: 'server_error',
        status,
        message,
        details: data?.details || null,
        code: data?.code || null
      };
    } else if (error.request) {
      // Network error
      return {
        type: 'network_error',
        message: 'Network connection failed. Please check your internet connection.',
        details: null
      };
    } else if (error.message) {
      // Client-side error
      return {
        type: 'client_error',
        message: error.message,
        details: null
      };
    } else {
      // Unknown error
      return {
        type: 'unknown_error',
        message: 'An unexpected error occurred',
        details: null
      };
    }
  }
  
  // Cleanup
  destroy() {
    this.clearTokenRefreshTimer();
    this.removeAllListeners();
    this.loginAttempts.clear();
    this.currentUser = null;
    this.isAuthenticated = false;
  }
}

// Create singleton instance
export const authService = new AuthService();

// Export convenience functions - SIMPLIFIED for current backend
export const auth = {
  // Authentication methods
  register: (userData) => authService.register(userData),
  login: (credentials) => authService.login(credentials),
  logout: () => authService.logout(),
  
  // State queries
  getCurrentUser: () => authService.getCurrentUser(),
  isAuthenticated: () => authService.isUserAuthenticated(),
  
  // Storage utilities
  getStoredToken: () => authService.getStoredToken(),
  getStoredUser: () => authService.getStoredUser(),
  
  // Event handling
  on: (event, callback) => authService.on(event, callback),
  off: (event, callback) => authService.off(event, callback),
  once: (event, callback) => authService.once(event, callback)
};

// Export auth service instance as default
export default auth;