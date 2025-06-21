// frontend/services/payment.js - Payment processing client service
import axios from 'axios';

// Payment configuration
const PAYMENT_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  stripePublishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY,
  endpoints: {
    subscription: '/subscription',
    paymentMethods: '/payment-methods',
    billing: '/billing',
    promos: '/promo-codes'
  },
  plans: {
    premium_monthly: {
      id: 'premium_monthly',
      name: 'ApexMatch Connection',
      price: 1999, // $19.99 in cents
      interval: 'month',
      features: [
        'Unlimited daily matches',
        'Advanced compatibility insights',
        'AI Wingman (10 assists/day)',
        'Priority matching queue',
        'Read receipts',
        'Message insights',
        'Premium customer support'
      ]
    },
    premium_yearly: {
      id: 'premium_yearly',
      name: 'ApexMatch Connection (Annual)',
      price: 19999, // $199.99 in cents (2 months free)
      interval: 'year',
      features: [
        'All Connection features',
        '2 months free (save 16%)',
        'Annual relationship report',
        'Exclusive events access'
      ]
    },
    elite_monthly: {
      id: 'elite_monthly',
      name: 'ApexMatch Elite',
      price: 3999, // $39.99 in cents
      interval: 'month',
      features: [
        'All Connection features',
        'AI Wingman (25 assists/day)',
        'Elite community access',
        'Concierge matching service',
        'Profile optimization service',
        'Relationship coaching sessions',
        'VIP customer support'
      ]
    },
    elite_yearly: {
      id: 'elite_yearly',
      name: 'ApexMatch Elite (Annual)',
      price: 39999, // $399.99 in cents (2 months free)
      interval: 'year',
      features: [
        'All Elite features',
        '2 months free (save 16%)',
        'Personal relationship advisor',
        'Custom matching criteria',
        'Priority reveal queue'
      ]
    }
  },
  cacheTTL: 300000, // 5 minutes
  requestTimeout: 30000
};

// Payment Service Class
class PaymentService {
  constructor() {
    this.cache = new Map();
    this.stripe = null;
    this.api = axios.create({
      baseURL: PAYMENT_CONFIG.baseURL,
      timeout: PAYMENT_CONFIG.requestTimeout,
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
    
    // Initialize Stripe if available
    this.initializeStripe();
  }
  
  // Initialize Stripe
  async initializeStripe() {
    try {
      if (window.Stripe && PAYMENT_CONFIG.stripePublishableKey) {
        this.stripe = window.Stripe(PAYMENT_CONFIG.stripePublishableKey);
      }
    } catch (error) {
      console.warn('Failed to initialize Stripe:', error);
    }
  }
  
  // Create subscription
  async createSubscription(planId, paymentMethodId, promoCode = null) {
    try {
      if (!planId || !paymentMethodId) {
        throw new Error('Plan ID and payment method are required');
      }
      
      const plan = PAYMENT_CONFIG.plans[planId];
      if (!plan) {
        throw new Error('Invalid subscription plan');
      }
      
      const response = await this.api.post(`${PAYMENT_CONFIG.endpoints.subscription}/create`, {
        planId,
        paymentMethodId,
        promoCode,
        metadata: {
          planName: plan.name,
          planPrice: plan.price,
          clientTimestamp: Date.now()
        }
      });
      
      const result = response.data;
      
      // Clear subscription cache
      this.clearSubscriptionCache();
      
      return result;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Update subscription
  async updateSubscription(newPlanId) {
    try {
      if (!newPlanId) {
        throw new Error('New plan ID is required');
      }
      
      const newPlan = PAYMENT_CONFIG.plans[newPlanId];
      if (!newPlan) {
        throw new Error('Invalid subscription plan');
      }
      
      const response = await this.api.put(`${PAYMENT_CONFIG.endpoints.subscription}/update`, {
        newPlanId,
        metadata: {
          newPlanName: newPlan.name,
          clientTimestamp: Date.now()
        }
      });
      
      // Clear subscription cache
      this.clearSubscriptionCache();
      
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Cancel subscription
  async cancelSubscription(immediate = false) {
    try {
      const response = await this.api.post(`${PAYMENT_CONFIG.endpoints.subscription}/cancel`, {
        immediate,
        cancelReason: 'user_requested',
        clientTimestamp: Date.now()
      });
      
      // Clear subscription cache
      this.clearSubscriptionCache();
      
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Reactivate subscription
  async reactivateSubscription() {
    try {
      const response = await this.api.post(`${PAYMENT_CONFIG.endpoints.subscription}/reactivate`, {
        clientTimestamp: Date.now()
      });
      
      // Clear subscription cache
      this.clearSubscriptionCache();
      
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Get current subscription
  async getSubscription() {
    try {
      // Check cache first
      const cacheKey = 'current_subscription';
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      const response = await this.api.get(PAYMENT_CONFIG.endpoints.subscription);
      const result = response.data;
      
      // Cache the result
      this.setCache(cacheKey, result);
      
      return {
        ...result,
        cached: false
      };
      
    } catch (error) {
      // Return default subscription info if API fails
      return {
        tier: 'free',
        status: 'active',
        features: ['Basic matching', '1 match per 3 days', '3 conversations max'],
        limits: {
          dailyMatches: 1,
          aiAssists: 0,
          conversations: 3
        }
      };
    }
  }
  
  // Get payment methods
  async getPaymentMethods() {
    try {
      const response = await this.api.get(PAYMENT_CONFIG.endpoints.paymentMethods);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Add payment method
  async addPaymentMethod(paymentMethodId) {
    try {
      if (!paymentMethodId) {
        throw new Error('Payment method ID is required');
      }
      
      const response = await this.api.post(PAYMENT_CONFIG.endpoints.paymentMethods, {
        paymentMethodId,
        clientTimestamp: Date.now()
      });
      
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Remove payment method
  async removePaymentMethod(paymentMethodId) {
    try {
      if (!paymentMethodId) {
        throw new Error('Payment method ID is required');
      }
      
      const response = await this.api.delete(`${PAYMENT_CONFIG.endpoints.paymentMethods}/${paymentMethodId}`);
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Set default payment method
  async setDefaultPaymentMethod(paymentMethodId) {
    try {
      if (!paymentMethodId) {
        throw new Error('Payment method ID is required');
      }
      
      const response = await this.api.put(`${PAYMENT_CONFIG.endpoints.paymentMethods}/default`, {
        paymentMethodId
      });
      
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Validate promo code
  async validatePromoCode(code, planId) {
    try {
      if (!code || !planId) {
        throw new Error('Promo code and plan ID are required');
      }
      
      const response = await this.api.post(`${PAYMENT_CONFIG.endpoints.promos}/validate`, {
        code: code.toUpperCase(),
        planId
      });
      
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Calculate pricing with discounts
  async calculatePricing(planId, promoCode = null) {
    try {
      const plan = PAYMENT_CONFIG.plans[planId];
      if (!plan) {
        throw new Error('Invalid plan ID');
      }
      
      let pricing = {
        originalPrice: plan.price,
        finalPrice: plan.price,
        discount: null,
        savings: 0,
        savingsPercentage: 0
      };
      
      if (promoCode) {
        try {
          const validation = await this.validatePromoCode(promoCode, planId);
          if (validation.valid) {
            pricing.discount = validation.discount;
            
            if (validation.discount.type === 'percentage') {
              pricing.finalPrice = Math.round(plan.price * (1 - validation.discount.value / 100));
            } else if (validation.discount.type === 'amount') {
              pricing.finalPrice = Math.max(0, plan.price - validation.discount.value);
            }
            
            pricing.savings = plan.price - pricing.finalPrice;
            pricing.savingsPercentage = Math.round((pricing.savings / plan.price) * 100);
          }
        } catch (error) {
          console.warn('Promo code validation failed:', error);
        }
      }
      
      return pricing;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Get billing history
  async getBillingHistory() {
    try {
      const response = await this.api.get(`${PAYMENT_CONFIG.endpoints.billing}/history`);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Download invoice
  async downloadInvoice(invoiceId) {
    try {
      if (!invoiceId) {
        throw new Error('Invoice ID is required');
      }
      
      const response = await this.api.get(`${PAYMENT_CONFIG.endpoints.billing}/invoice/${invoiceId}/download`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Process one-time payment
  async processOneTimePayment(amount, description, metadata = {}) {
    try {
      if (!amount || amount <= 0) {
        throw new Error('Valid amount is required');
      }
      
      const response = await this.api.post(`${PAYMENT_CONFIG.endpoints.billing}/one-time`, {
        amount,
        description,
        metadata: {
          ...metadata,
          clientTimestamp: Date.now()
        }
      });
      
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Create Stripe payment intent (for client-side payment)
  async createPaymentIntent(planId, promoCode = null) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe is not initialized');
      }
      
      const pricing = await this.calculatePricing(planId, promoCode);
      
      const response = await this.api.post('/stripe/payment-intent', {
        amount: pricing.finalPrice,
        planId,
        promoCode,
        metadata: {
          planName: PAYMENT_CONFIG.plans[planId].name,
          originalPrice: pricing.originalPrice,
          finalPrice: pricing.finalPrice
        }
      });
      
      return response.data;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Confirm payment with Stripe
  async confirmPayment(clientSecret, paymentMethod) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe is not initialized');
      }
      
      const result = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethod
      });
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      return result.paymentIntent;
      
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  // Helper methods
  getPlanInfo(planId) {
    return PAYMENT_CONFIG.plans[planId] || null;
  }
  
  getAllPlans() {
    return PAYMENT_CONFIG.plans;
  }
  
  formatPrice(priceInCents) {
    return (priceInCents / 100).toFixed(2);
  }
  
  // Cache management
  generateCacheKey(type, data = {}) {
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
    return `payment_${Math.abs(hash)}`;
  }
  
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expires: Date.now() + PAYMENT_CONFIG.cacheTTL
    });
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
  
  clearCache() {
    this.cache.clear();
  }
  
  clearSubscriptionCache() {
    for (const key of this.cache.keys()) {
      if (key.includes('subscription')) {
        this.cache.delete(key);
      }
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
      const message = data?.message || data?.error || 'Payment service error';
      
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
        message: 'Unable to connect to payment service',
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
  
  // Health check
  async healthCheck() {
    try {
      const response = await this.api.get('/payment/health');
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
export const paymentService = new PaymentService();

// Export utility functions
export const payment = {
  // Subscription management
  createSubscription: (planId, paymentMethodId, promoCode) => 
    paymentService.createSubscription(planId, paymentMethodId, promoCode),
  updateSubscription: (newPlanId) => paymentService.updateSubscription(newPlanId),
  cancelSubscription: (immediate) => paymentService.cancelSubscription(immediate),
  reactivateSubscription: () => paymentService.reactivateSubscription(),
  getSubscription: () => paymentService.getSubscription(),
  
  // Payment methods
  getPaymentMethods: () => paymentService.getPaymentMethods(),
  addPaymentMethod: (paymentMethodId) => paymentService.addPaymentMethod(paymentMethodId),
  removePaymentMethod: (paymentMethodId) => paymentService.removePaymentMethod(paymentMethodId),
  setDefaultPaymentMethod: (paymentMethodId) => paymentService.setDefaultPaymentMethod(paymentMethodId),
  
  // Pricing and promos
  validatePromoCode: (code, planId) => paymentService.validatePromoCode(code, planId),
  calculatePricing: (planId, promoCode) => paymentService.calculatePricing(planId, promoCode),
  
  // Billing
  getBillingHistory: () => paymentService.getBillingHistory(),
  downloadInvoice: (invoiceId) => paymentService.downloadInvoice(invoiceId),
  processOneTimePayment: (amount, description, metadata) => 
    paymentService.processOneTimePayment(amount, description, metadata),
  
  // Stripe integration
  createPaymentIntent: (planId, promoCode) => paymentService.createPaymentIntent(planId, promoCode),
  confirmPayment: (clientSecret, paymentMethod) => paymentService.confirmPayment(clientSecret, paymentMethod),
  
  // Utility methods
  getPlanInfo: (planId) => paymentService.getPlanInfo(planId),
  getAllPlans: () => paymentService.getAllPlans(),
  formatPrice: (priceInCents) => paymentService.formatPrice(priceInCents),
  clearCache: () => paymentService.clearCache(),
  healthCheck: () => paymentService.healthCheck()
};

export default payment;