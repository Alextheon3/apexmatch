// src/utils/helpers.js - Utility helper functions

/**
 * ApexMatch Helper Functions
 * Reusable utility functions for common operations
 */

import { TRUST_TIERS, SUBSCRIPTION_TIERS, BGP_CATEGORIES, DATE_FORMATS } from './constants';

// ========================================
// DATE AND TIME UTILITIES
// ========================================

export const dateHelpers = {
  
  // Format date according to different formats
  formatDate(date, format = 'medium') {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Return relative time for recent dates
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
    }
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    // Use standard formatting for older dates
    const options = {
      short: { month: 'short', day: 'numeric' },
      medium: { month: 'short', day: 'numeric', year: 'numeric' },
      long: { month: 'long', day: 'numeric', year: 'numeric' },
      full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
    };
    
    return d.toLocaleDateString('en-US', options[format] || options.medium);
  },
  
  // Get time ago string
  timeAgo(date) {
    if (!date) return '';
    
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    if (diffWeeks < 4) return `${diffWeeks}w`;
    if (diffMonths < 12) return `${diffMonths}mo`;
    return `${diffYears}y`;
  },
  
  // Calculate age from birth date
  calculateAge(birthDate) {
    if (!birthDate) return null;
    
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  },
  
  // Check if date is within range
  isWithinDays(date, days) {
    if (!date) return false;
    
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    return diffDays <= days;
  },
  
  // Format duration (for reveal stages, etc.)
  formatDuration(milliseconds) {
    if (!milliseconds) return '';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
};

// ========================================
// STRING UTILITIES
// ========================================

export const stringHelpers = {
  
  // Capitalize first letter
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },
  
  // Convert to title case
  toTitleCase(str) {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  },
  
  // Truncate string with ellipsis
  truncate(str, length = 100, suffix = '...') {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.substring(0, length) + suffix;
  },
  
  // Generate initials from name
  getInitials(firstName, lastName) {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last;
  },
  
  // Generate slug from string
  slugify(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },
  
  // Extract hashtags from text
  extractHashtags(text) {
    if (!text) return [];
    const hashtags = text.match(/#\w+/g) || [];
    return hashtags.map(tag => tag.toLowerCase());
  },
  
  // Check if string contains profanity (basic implementation)
  containsProfanity(text) {
    if (!text) return false;
    const profanityList = ['damn', 'shit', 'fuck']; // This would be more comprehensive
    const words = text.toLowerCase().split(/\s+/);
    return words.some(word => profanityList.includes(word));
  },
  
  // Generate random string
  generateRandomString(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
  
  // Format file size
  formatFileSize(bytes) {
    if (!bytes) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

// ========================================
// NUMBER UTILITIES
// ========================================

export const numberHelpers = {
  
  // Format number with commas
  formatNumber(num) {
    if (num == null) return '';
    return new Intl.NumberFormat().format(num);
  },
  
  // Format currency
  formatCurrency(amount, currency = 'USD') {
    if (amount == null) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount / 100); // Assuming amount is in cents
  },
  
  // Format percentage
  formatPercentage(value, decimals = 0) {
    if (value == null) return '';
    return (value / 100).toLocaleString('en-US', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },
  
  // Clamp number between min and max
  clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  },
  
  // Generate random number between min and max
  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  // Round to decimal places
  roundTo(num, decimals = 2) {
    return Math.round((num + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },
  
  // Check if number is in range
  inRange(num, min, max) {
    return num >= min && num <= max;
  }
};

// ========================================
// ARRAY UTILITIES
// ========================================

export const arrayHelpers = {
  
  // Shuffle array
  shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  },
  
  // Get random item from array
  randomItem(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
  },
  
  // Chunk array into smaller arrays
  chunk(array, size) {
    if (!array || size <= 0) return [];
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },
  
  // Remove duplicates from array
  unique(array, key = null) {
    if (!array) return [];
    
    if (key) {
      const seen = new Set();
      return array.filter(item => {
        const value = item[key];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      });
    }
    
    return [...new Set(array)];
  },
  
  // Group array by key
  groupBy(array, key) {
    if (!array) return {};
    
    return array.reduce((groups, item) => {
      const value = typeof key === 'function' ? key(item) : item[key];
      if (!groups[value]) groups[value] = [];
      groups[value].push(item);
      return groups;
    }, {});
  },
  
  // Sort array by multiple keys
  sortBy(array, ...keys) {
    if (!array) return [];
    
    return [...array].sort((a, b) => {
      for (const key of keys) {
        const aVal = typeof key === 'function' ? key(a) : a[key];
        const bVal = typeof key === 'function' ? key(b) : b[key];
        
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
      }
      return 0;
    });
  }
};

// ========================================
// APEXMATCH SPECIFIC HELPERS
// ========================================

export const apexHelpers = {
  
  // Get trust tier from score
  getTrustTier(trustScore) {
    if (trustScore == null) return null;
    
    for (const [tierKey, tier] of Object.entries(TRUST_TIERS)) {
      if (trustScore >= tier.min && trustScore <= tier.max) {
        return { ...tier, key: tierKey };
      }
    }
    
    return { ...TRUST_TIERS.BUILDING, key: 'BUILDING' }; // Default fallback
  },
  
  // Get subscription tier info
  getSubscriptionTier(tierId) {
    return SUBSCRIPTION_TIERS[tierId?.toUpperCase()] || SUBSCRIPTION_TIERS.FREE;
  },
  
  // Calculate compatibility level
  getCompatibilityLevel(score) {
    if (score >= 85) return { level: 'excellent', color: '#22c55e', icon: '💕' };
    if (score >= 70) return { level: 'good', color: '#eab308', icon: '💛' };
    if (score >= 55) return { level: 'fair', color: '#f97316', icon: '💙' };
    return { level: 'poor', color: '#ef4444', icon: '💔' };
  },
  
  // Calculate BGP category score
  calculateBGPCategoryScore(traits, categoryId) {
    const category = BGP_CATEGORIES[categoryId.toUpperCase()];
    if (!category || !traits) return 0;
    
    const categoryTraits = category.traits.filter(trait => traits[trait] != null);
    if (categoryTraits.length === 0) return 0;
    
    const total = categoryTraits.reduce((sum, trait) => sum + traits[trait], 0);
    return Math.round(total / categoryTraits.length);
  },
  
  // Calculate overall BGP score
  calculateOverallBGPScore(traits) {
    if (!traits) return 0;
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    for (const [categoryId, category] of Object.entries(BGP_CATEGORIES)) {
      const categoryScore = this.calculateBGPCategoryScore(traits, categoryId);
      totalWeightedScore += categoryScore * category.weight;
      totalWeight += category.weight;
    }
    
    return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
  },
  
  // Check if user can access feature
  canAccessFeature(user, feature) {
    if (!user) return { allowed: false, reason: 'User not authenticated' };
    
    const tier = this.getSubscriptionTier(user.subscriptionTier);
    const trustTier = this.getTrustTier(user.trustScore);
    
    switch (feature) {
      case 'unlimited_matches':
        return {
          allowed: tier.id !== 'free',
          reason: tier.id === 'free' ? 'Premium subscription required' : null,
          upgradeMessage: 'Upgrade to Connection or Elite for unlimited matches'
        };
        
      case 'ai_wingman':
        return {
          allowed: tier.id !== 'free',
          reason: tier.id === 'free' ? 'Premium subscription required' : null,
          upgradeMessage: 'Upgrade to Connection or Elite for AI assistance'
        };
        
      case 'reveal_requests':
        if (user.trustScore < 50) {
          return {
            allowed: false,
            reason: 'Trust score too low',
            requirement: 'Build your trust score to 50+ to request reveals'
          };
        }
        return { allowed: true };
        
      case 'high_trust_matching':
        return {
          allowed: user.trustScore >= 70,
          reason: user.trustScore < 70 ? 'Trust score insufficient' : null,
          requirement: 'Reach Reliable trust tier (70+) for high-quality matches'
        };
        
      case 'elite_community':
        if (tier.id !== 'elite') {
          return {
            allowed: false,
            reason: 'Elite subscription required',
            upgradeMessage: 'Upgrade to Elite for exclusive community access'
          };
        }
        if (user.trustScore < 85) {
          return {
            allowed: false,
            reason: 'Elite trust tier required',
            requirement: 'Reach Trusted tier (85+) for Elite community'
          };
        }
        return { allowed: true };
        
      default:
        return { allowed: true };
    }
  },
  
  // Generate match reason based on compatibility
  generateMatchReason(compatibilityData) {
    if (!compatibilityData) return 'Good overall compatibility';
    
    const { bgpScore, behaviorScore, interestScore, communicationScore } = compatibilityData;
    
    if (bgpScore >= 90) return 'Exceptional behavioral compatibility';
    if (communicationScore >= 85) return 'Excellent communication alignment';
    if (behaviorScore >= 85) return 'Strong behavioral harmony';
    if (interestScore >= 80) return 'Great shared interests';
    if (bgpScore >= 75) return 'Good personality match';
    
    return 'Promising overall compatibility';
  },
  
  // Calculate emotional connection level
  calculateEmotionalConnection(messages) {
    if (!messages || messages.length === 0) return 0;
    
    let emotionalScore = 0;
    let scoredMessages = 0;
    
    messages.forEach(message => {
      if (message.emotionalMetrics) {
        const messageScore = (
          (message.emotionalMetrics.vulnerability || 0) * 0.3 +
          (message.emotionalMetrics.empathy || 0) * 0.3 +
          (message.emotionalMetrics.authenticity || 0) * 0.2 +
          (message.emotionalMetrics.depth || 0) * 0.2
        );
        
        emotionalScore += messageScore;
        scoredMessages++;
      }
    });
    
    const averageScore = scoredMessages > 0 ? emotionalScore / scoredMessages : 0;
    
    // Add bonus for consistency and growth
    const consistencyBonus = this.calculateEmotionalConsistency(messages);
    const growthBonus = this.calculateEmotionalGrowth(messages);
    
    return Math.min(100, Math.round(averageScore + consistencyBonus + growthBonus));
  },
  
  // Check reveal eligibility
  checkRevealEligibility(conversation, user, match) {
    const requirements = {
      minEmotionalConnection: 70,
      minDaysConnected: 3,
      minMessages: 20,
      minTrustScore: 50
    };
    
    const issues = [];
    
    // Check emotional connection
    const emotionalConnection = this.calculateEmotionalConnection(conversation.messages);
    if (emotionalConnection < requirements.minEmotionalConnection) {
      issues.push({
        type: 'emotional_connection',
        current: emotionalConnection,
        required: requirements.minEmotionalConnection,
        message: `Build stronger emotional connection (${emotionalConnection}% of ${requirements.minEmotionalConnection}% required)`
      });
    }
    
    // Check days connected
    const daysConnected = Math.floor((Date.now() - new Date(conversation.createdAt)) / (1000 * 60 * 60 * 24));
    if (daysConnected < requirements.minDaysConnected) {
      issues.push({
        type: 'time_connected',
        current: daysConnected,
        required: requirements.minDaysConnected,
        message: `Connect for ${requirements.minDaysConnected - daysConnected} more days`
      });
    }
    
    // Check message count
    const messageCount = conversation.messages?.length || 0;
    if (messageCount < requirements.minMessages) {
      issues.push({
        type: 'message_count',
        current: messageCount,
        required: requirements.minMessages,
        message: `Exchange ${requirements.minMessages - messageCount} more messages`
      });
    }
    
    // Check trust score
    if (user.trustScore < requirements.minTrustScore) {
      issues.push({
        type: 'trust_score',
        current: user.trustScore,
        required: requirements.minTrustScore,
        message: `Build trust score to ${requirements.minTrustScore}+ (currently ${user.trustScore})`
      });
    }
    
    return {
      eligible: issues.length === 0,
      issues,
      progress: {
        emotionalConnection,
        daysConnected,
        messageCount,
        trustScore: user.trustScore
      }
    };
  }
};

// ========================================
// VALIDATION HELPERS
// ========================================

export const validationHelpers = {
  
  // Validate email format
  isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  // Validate phone number
  isValidPhone(phone) {
    if (!phone) return false;
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  },
  
  // Validate URL
  isValidURL(url) {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  // Check password strength
  checkPasswordStrength(password) {
    if (!password) return { score: 0, feedback: ['Password is required'] };
    
    let score = 0;
    const feedback = [];
    
    if (password.length >= 8) score += 1;
    else feedback.push('At least 8 characters');
    
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letters');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');
    
    if (/\d/.test(password)) score += 1;
    else feedback.push('Include numbers');
    
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    else feedback.push('Include special characters');
    
    // Bonus points
    if (password.length >= 12) score += 1;
    if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(password)) score += 1;
    
    const strength = ['very-weak', 'weak', 'fair', 'good', 'strong', 'very-strong'][Math.min(score, 5)];
    
    return { score, strength, feedback };
  },
  
  // Validate file type
  isValidFileType(file, allowedTypes) {
    if (!file || !allowedTypes) return false;
    return allowedTypes.includes(file.type);
  },
  
  // Validate file size
  isValidFileSize(file, maxSize) {
    if (!file) return false;
    return file.size <= maxSize;
  }
};

// ========================================
// LOCAL STORAGE HELPERS
// ========================================

export const storageHelpers = {
  
  // Get item from localStorage with JSON parsing
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  // Set item in localStorage with JSON stringifying
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  
  // Remove item from localStorage
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
  
  // Clear all localStorage
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  },
  
  // Session storage helpers
  session: {
    get(key, defaultValue = null) {
      try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch {
        return defaultValue;
      }
    },
    
    set(key, value) {
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    
    remove(key) {
      try {
        sessionStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    }
  }
};

// ========================================
// URL HELPERS
// ========================================

export const urlHelpers = {
  
  // Get query parameters
  getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  },
  
  // Set query parameters
  setQueryParams(params) {
    const url = new URL(window.location);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, value);
      } else {
        url.searchParams.delete(key);
      }
    });
    window.history.replaceState({}, '', url);
  },
  
  // Navigate to URL
  navigate(path, replace = false) {
    if (replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }
  },
  
  // Build URL with parameters
  buildURL(base, params) {
    const url = new URL(base);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }
};

// ========================================
// DEVICE HELPERS
// ========================================

export const deviceHelpers = {
  
  // Check if mobile device
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },
  
  // Check if iOS device
  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },
  
  // Check if Android device
  isAndroid() {
    return /Android/i.test(navigator.userAgent);
  },
  
  // Get device type
  getDeviceType() {
    if (this.isMobile()) return 'mobile';
    if (window.innerWidth <= 768) return 'tablet';
    return 'desktop';
  },
  
  // Check if touch device
  isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },
  
  // Get browser info
  getBrowserInfo() {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    
    return 'Unknown';
  }
};

// ========================================
// DEBOUNCE AND THROTTLE
// ========================================

export const performanceHelpers = {
  
  // Debounce function
  debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  },
  
  // Throttle function
  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  // Memoize function results
  memoize(func, keyGenerator = (...args) => JSON.stringify(args)) {
    const cache = new Map();
    return (...args) => {
      const key = keyGenerator(...args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func(...args);
      cache.set(key, result);
      return result;
    };
  }
};

// ========================================
// EXPORT ALL HELPERS
// ========================================

export default {
  dateHelpers,
  stringHelpers,
  numberHelpers,
  arrayHelpers,
  apexHelpers,
  validationHelpers,
  storageHelpers,
  urlHelpers,
  deviceHelpers,
  performanceHelpers
};