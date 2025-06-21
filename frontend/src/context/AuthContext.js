import React, { createContext, useContext, useReducer, useEffect } from 'react';

const AuthContext = createContext();

// Auth action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  UPDATE_USER: 'UPDATE_USER',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  VERIFY_TOKEN_START: 'VERIFY_TOKEN_START',
  VERIFY_TOKEN_SUCCESS: 'VERIFY_TOKEN_SUCCESS',
  VERIFY_TOKEN_FAILURE: 'VERIFY_TOKEN_FAILURE',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Initial auth state
const initialState = {
  user: null,
  token: localStorage.getItem('apexmatch_token'),
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isRegistering: false,
  isVerifying: false
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      localStorage.setItem('apexmatch_token', action.payload.token);
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      localStorage.removeItem('apexmatch_token');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };

    case AUTH_ACTIONS.REGISTER_START:
      return {
        ...state,
        isRegistering: true,
        error: null
      };

    case AUTH_ACTIONS.REGISTER_SUCCESS:
      localStorage.setItem('apexmatch_token', action.payload.token);
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isRegistering: false,
        error: null
      };

    case AUTH_ACTIONS.REGISTER_FAILURE:
      return {
        ...state,
        isRegistering: false,
        error: action.payload
      };

    case AUTH_ACTIONS.LOGOUT:
      localStorage.removeItem('apexmatch_token');
      localStorage.removeItem('apexmatch_user');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        error: null
      };

    case AUTH_ACTIONS.UPDATE_USER:
      const updatedUser = { ...state.user, ...action.payload };
      localStorage.setItem('apexmatch_user', JSON.stringify(updatedUser));
      return {
        ...state,
        user: updatedUser
      };

    case AUTH_ACTIONS.UPDATE_PROFILE:
      const profileUpdatedUser = {
        ...state.user,
        profile: { ...state.user.profile, ...action.payload }
      };
      localStorage.setItem('apexmatch_user', JSON.stringify(profileUpdatedUser));
      return {
        ...state,
        user: profileUpdatedUser
      };

    case AUTH_ACTIONS.VERIFY_TOKEN_START:
      return {
        ...state,
        isVerifying: true
      };

    case AUTH_ACTIONS.VERIFY_TOKEN_SUCCESS:
      localStorage.setItem('apexmatch_user', JSON.stringify(action.payload.user));
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isVerifying: false,
        error: null
      };

    case AUTH_ACTIONS.VERIFY_TOKEN_FAILURE:
      localStorage.removeItem('apexmatch_token');
      localStorage.removeItem('apexmatch_user');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isVerifying: false,
        error: action.payload
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Verify token on app start
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('apexmatch_token');
      const cachedUser = localStorage.getItem('apexmatch_user');

      if (token) {
        dispatch({ type: AUTH_ACTIONS.VERIFY_TOKEN_START });

        try {
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            dispatch({
              type: AUTH_ACTIONS.VERIFY_TOKEN_SUCCESS,
              payload: { user: data.user }
            });
          } else {
            // Token invalid, but use cached user data if available
            if (cachedUser) {
              try {
                const user = JSON.parse(cachedUser);
                dispatch({
                  type: AUTH_ACTIONS.VERIFY_TOKEN_SUCCESS,
                  payload: { user }
                });
              } catch (e) {
                dispatch({
                  type: AUTH_ACTIONS.VERIFY_TOKEN_FAILURE,
                  payload: 'Invalid cached user data'
                });
              }
            } else {
              dispatch({
                type: AUTH_ACTIONS.VERIFY_TOKEN_FAILURE,
                payload: 'Token verification failed'
              });
            }
          }
        } catch (error) {
          // Network error, use cached data if available
          if (cachedUser) {
            try {
              const user = JSON.parse(cachedUser);
              dispatch({
                type: AUTH_ACTIONS.VERIFY_TOKEN_SUCCESS,
                payload: { user }
              });
            } catch (e) {
              dispatch({
                type: AUTH_ACTIONS.VERIFY_TOKEN_FAILURE,
                payload: 'Network error and invalid cache'
              });
            }
          } else {
            dispatch({
              type: AUTH_ACTIONS.VERIFY_TOKEN_FAILURE,
              payload: 'Network error during verification'
            });
          }
        }
      }
    };

    verifyToken();
  }, []);

  // Login function
  const login = async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: data.user,
            token: data.token
          }
        });
        return { success: true, user: data.user };
      } else {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: data.detail || 'Login failed'
        });
        return { success: false, error: data.detail || 'Login failed' };
      }
    } catch (error) {
      const errorMessage = 'Network error. Please check your connection.';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  };

  // Register function
  const register = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.REGISTER_START });

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        dispatch({
          type: AUTH_ACTIONS.REGISTER_SUCCESS,
          payload: {
            user: data.user,
            token: data.token
          }
        });
        return { success: true, user: data.user };
      } else {
        dispatch({
          type: AUTH_ACTIONS.REGISTER_FAILURE,
          payload: data.detail || 'Registration failed'
        });
        return { success: false, error: data.detail || 'Registration failed' };
      }
    } catch (error) {
      const errorMessage = 'Network error. Please check your connection.';
      dispatch({
        type: AUTH_ACTIONS.REGISTER_FAILURE,
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint to invalidate token server-side
      if (state.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${state.token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      // Ignore network errors during logout
      console.warn('Logout request failed:', error);
    }

    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  // Update user function
  const updateUser = (userData) => {
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: userData
    });
  };

  // Update profile function
  const updateProfile = async (profileData) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({
          type: AUTH_ACTIONS.UPDATE_PROFILE,
          payload: data.profile
        });
        return { success: true, profile: data.profile };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail };
      }
    } catch (error) {
      return { success: false, error: 'Network error updating profile' };
    }
  };

  // Upgrade subscription
  const upgradeSubscription = async (planData) => {
    try {
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(planData)
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({
          type: AUTH_ACTIONS.UPDATE_USER,
          payload: {
            subscription: data.subscription,
            is_premium: data.subscription.plan !== 'free'
          }
        });
        return { success: true, subscription: data.subscription };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail };
      }
    } catch (error) {
      return { success: false, error: 'Network error upgrading subscription' };
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Check if user has premium subscription
  const isPremium = () => {
    return state.user?.subscription?.plan === 'premium' || 
           state.user?.subscription?.plan === 'elite' ||
           state.user?.is_premium === true;
  };

  // Check if user has elite subscription
  const isElite = () => {
    return state.user?.subscription?.plan === 'elite';
  };

  // Get user's trust tier
  const getTrustTier = () => {
    const trustScore = state.user?.trust_score || 0;
    if (trustScore >= 95) return 'elite';
    if (trustScore >= 85) return 'trusted';
    if (trustScore >= 70) return 'reliable';
    if (trustScore >= 50) return 'building';
    return 'challenged';
  };

  // Check if user can access feature
  const canAccessFeature = (feature) => {
    switch (feature) {
      case 'ai_wingman':
        return isPremium();
      case 'unlimited_matches':
        return isPremium();
      case 'advanced_bgp':
        return isPremium();
      case 'high_trust_queue':
        return isPremium();
      case 'reveal_reconnections':
        return isPremium();
      case 'custom_themes':
        return isPremium();
      case 'elite_community':
        return isElite();
      case 'relationship_coaching':
        return isElite();
      default:
        return true;
    }
  };

  const value = {
    // State
    ...state,
    
    // Computed values
    isPremium: isPremium(),
    isElite: isElite(),
    trustTier: getTrustTier(),
    
    // Actions
    login,
    register,
    logout,
    updateUser,
    updateProfile,
    upgradeSubscription,
    clearError,
    canAccessFeature
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// HOC for protected routes
export const withAuth = (Component) => {
  return (props) => {
    const { isAuthenticated, isVerifying } = useAuth();
    
    if (isVerifying) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mx-auto mb-4"></div>
            <p className="text-white text-lg">Verifying authentication...</p>
          </div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      // Redirect to login or show login component
      window.location.href = '/login';
      return null;
    }
    
    return <Component {...props} />;
  };
};

export default AuthContext;