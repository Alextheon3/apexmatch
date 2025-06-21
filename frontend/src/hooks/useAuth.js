import { useState, useEffect, useCallback } from 'react';
import { useAuth as useAuthContext } from '../context/AuthContext';

// Enhanced authentication hook with additional utilities
export const useAuth = () => {
  const authContext = useAuthContext();
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [sessionExpiry, setSessionExpiry] = useState(null);

  // Check if user session is about to expire
  useEffect(() => {
    if (authContext.token) {
      try {
        // Decode JWT token to get expiry (simplified)
        const tokenParts = authContext.token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const expiry = new Date(payload.exp * 1000);
          setSessionExpiry(expiry);

          // Set up warning for session expiry
          const timeUntilExpiry = expiry.getTime() - Date.now();
          const warningTime = timeUntilExpiry - (15 * 60 * 1000); // 15 minutes before expiry

          if (warningTime > 0) {
            const warningTimer = setTimeout(() => {
              // Trigger session expiry warning
              window.dispatchEvent(new CustomEvent('sessionExpiring', {
                detail: { expiresAt: expiry }
              }));
            }, warningTime);

            return () => clearTimeout(warningTimer);
          }
        }
      } catch (error) {
        console.warn('Failed to decode token:', error);
      }
    }
  }, [authContext.token]);

  // Enhanced login with rate limiting
  const login = useCallback(async (email, password, rememberMe = false) => {
    if (isRateLimited) {
      return { 
        success: false, 
        error: 'Too many login attempts. Please wait before trying again.' 
      };
    }

    const result = await authContext.login(email, password);
    
    if (!result.success) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      // Rate limit after 5 failed attempts
      if (newAttempts >= 5) {
        setIsRateLimited(true);
        setTimeout(() => {
          setIsRateLimited(false);
          setLoginAttempts(0);
        }, 15 * 60 * 1000); // 15 minutes
      }
    } else {
      setLoginAttempts(0);
      
      if (rememberMe) {
        localStorage.setItem('apexmatch_remember', 'true');
      }
    }

    return result;
  }, [authContext.login, loginAttempts, isRateLimited]);

  // Enhanced register with validation
  const register = useCallback(async (userData) => {
    const result = await authContext.register(userData);
    
    if (result.success) {
      // Track registration for analytics
      window.dispatchEvent(new CustomEvent('userRegistered', {
        detail: { userId: result.user.id, source: 'direct' }
      }));
    }

    return result;
  }, [authContext.register]);

  // Logout with cleanup
  const logout = useCallback(async () => {
    // Clear remember me flag
    localStorage.removeItem('apexmatch_remember');
    localStorage.removeItem('apexmatch_last_activity');
    
    // Track logout event
    window.dispatchEvent(new CustomEvent('userLoggedOut'));
    
    await authContext.logout();
  }, [authContext.logout]);

  // Refresh token
  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authContext.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        authContext.updateUser({ token: data.token });
        return { success: true };
      } else {
        // Token refresh failed, force logout
        await logout();
        return { success: false, error: 'Session expired' };
      }
    } catch (error) {
      return { success: false, error: 'Network error refreshing session' };
    }
  }, [authContext.token, authContext.updateUser, logout]);

  // Check feature access with detailed reasons
  const checkFeatureAccess = useCallback((feature) => {
    const hasAccess = authContext.canAccessFeature(feature);
    
    if (hasAccess) {
      return { allowed: true };
    }

    // Provide specific upgrade reasons
    const upgradeReasons = {
      ai_wingman: {
        allowed: false,
        reason: 'AI Wingman is a Premium feature',
        upgrade: 'premium',
        benefit: 'Get personalized conversation starters with 89% higher response rates'
      },
      unlimited_matches: {
        allowed: false,
        reason: 'Unlimited matches requires Premium',
        upgrade: 'premium',
        benefit: 'Match with anyone, anytime - no daily limits'
      },
      elite_community: {
        allowed: false,
        reason: 'Elite community is exclusive to Elite members',
        upgrade: 'elite',
        benefit: 'Access exclusive events and premium relationship coaching'
      }
    };

    return upgradeReasons[feature] || {
      allowed: false,
      reason: 'Feature requires subscription upgrade',
      upgrade: 'premium'
    };
  }, [authContext.canAccessFeature]);

  // Get user's current plan details
  const getPlanDetails = useCallback(() => {
    const user = authContext.user;
    if (!user) return null;

    const planMap = {
      free: {
        name: 'Discovery',
        features: ['Basic matching', 'Limited conversations', '1 match per 3 days'],
        price: 0
      },
      premium: {
        name: 'Connection',
        features: ['Unlimited matches', 'AI Wingman', 'Advanced BGP insights', 'High-trust priority'],
        price: 19
      },
      elite: {
        name: 'Elite',
        features: ['Everything in Premium', 'Elite community', 'Relationship coaching', 'VIP events'],
        price: 39
      }
    };

    const currentPlan = user.subscription?.plan || 'free';
    return {
      current: currentPlan,
      details: planMap[currentPlan],
      isActive: user.subscription?.status === 'active',
      expiresAt: user.subscription?.expires_at,
      autoRenew: user.subscription?.auto_renew
    };
  }, [authContext.user]);

  // Track user activity for session management
  const updateActivity = useCallback(() => {
    if (authContext.isAuthenticated) {
      localStorage.setItem('apexmatch_last_activity', Date.now().toString());
    }
  }, [authContext.isAuthenticated]);

  // Check if user needs onboarding
  const needsOnboarding = useCallback(() => {
    const user = authContext.user;
    if (!user) return false;

    return !user.profile?.onboarding_completed ||
           !user.profile?.photos?.length ||
           !user.profile?.bio ||
           !user.bgp_profile?.is_ready;
  }, [authContext.user]);

  // Get onboarding progress
  const getOnboardingProgress = useCallback(() => {
    const user = authContext.user;
    if (!user) return { completed: 0, total: 0, steps: [] };

    const steps = [
      {
        id: 'profile_basic',
        name: 'Basic Information',
        completed: !!(user.profile?.name && user.profile?.age && user.profile?.location)
      },
      {
        id: 'profile_photos',
        name: 'Profile Photos',
        completed: !!(user.profile?.photos?.length >= 2)
      },
      {
        id: 'profile_bio',
        name: 'About You',
        completed: !!(user.profile?.bio && user.profile?.bio.length >= 50)
      },
      {
        id: 'preferences',
        name: 'Matching Preferences',
        completed: !!(user.profile?.preferences?.age_range && user.profile?.preferences?.distance)
      },
      {
        id: 'bgp_setup',
        name: 'Behavioral Profile Setup',
        completed: !!(user.bgp_profile?.initial_survey_completed)
      }
    ];

    const completed = steps.filter(step => step.completed).length;
    
    return {
      completed,
      total: steps.length,
      percentage: Math.round((completed / steps.length) * 100),
      steps,
      nextStep: steps.find(step => !step.completed)
    };
  }, [authContext.user]);

  // Handle social login
  const socialLogin = useCallback(async (provider, token) => {
    try {
      const response = await fetch(`/api/auth/social/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        const data = await response.json();
        authContext.updateUser(data.user);
        
        window.dispatchEvent(new CustomEvent('userRegistered', {
          detail: { userId: data.user.id, source: provider }
        }));

        return { success: true, user: data.user, isNewUser: data.is_new_user };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail };
      }
    } catch (error) {
      return { success: false, error: 'Social login failed' };
    }
  }, [authContext.updateUser]);

  return {
    // Original context methods and state
    ...authContext,
    
    // Enhanced methods
    login,
    register,
    logout,
    refreshToken,
    socialLogin,
    
    // Utility methods
    checkFeatureAccess,
    getPlanDetails,
    updateActivity,
    needsOnboarding,
    getOnboardingProgress,
    
    // Additional state
    loginAttempts,
    isRateLimited,
    sessionExpiry,
    timeUntilExpiry: sessionExpiry ? Math.max(0, sessionExpiry.getTime() - Date.now()) : null
  };
};

// Hook for protected actions that require authentication
export const useProtectedAction = () => {
  const { isAuthenticated, user } = useAuth();

  return useCallback((action, options = {}) => {
    const { requirePremium = false, requireVerified = false, feature = null } = options;

    if (!isAuthenticated) {
      window.dispatchEvent(new CustomEvent('authRequired', {
        detail: { action: 'login', reason: 'Authentication required' }
      }));
      return false;
    }

    if (requireVerified && !user?.email_verified) {
      window.dispatchEvent(new CustomEvent('verificationRequired', {
        detail: { reason: 'Email verification required' }
      }));
      return false;
    }

    if (requirePremium && !user?.is_premium) {
      window.dispatchEvent(new CustomEvent('upgradeRequired', {
        detail: { reason: 'Premium subscription required', feature }
      }));
      return false;
    }

    // Execute the protected action
    return action();
  }, [isAuthenticated, user]);
};

// Hook for session management
export const useSession = () => {
  const { isAuthenticated, token, refreshToken, logout } = useAuth();
  const [isSessionValid, setIsSessionValid] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Check session validity every 5 minutes
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/auth/validate', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          setIsSessionValid(false);
          // Try to refresh token
          const refreshResult = await refreshToken();
          if (refreshResult.success) {
            setIsSessionValid(true);
          } else {
            logout();
          }
        } else {
          setIsSessionValid(true);
        }
      } catch (error) {
        console.warn('Session validation failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, token, refreshToken, logout]);

  return {
    isSessionValid,
    refreshToken
  };
};

export default useAuth;