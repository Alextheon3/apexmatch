import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';

const BGPContext = createContext();

// BGP action types
const BGP_ACTIONS = {
  FETCH_BGP_START: 'FETCH_BGP_START',
  FETCH_BGP_SUCCESS: 'FETCH_BGP_SUCCESS',
  FETCH_BGP_FAILURE: 'FETCH_BGP_FAILURE',
  UPDATE_BGP_TRAIT: 'UPDATE_BGP_TRAIT',
  UPDATE_BEHAVIORAL_EVENT: 'UPDATE_BEHAVIORAL_EVENT',
  CALCULATE_COMPATIBILITY: 'CALCULATE_COMPATIBILITY',
  UPDATE_INSIGHTS: 'UPDATE_INSIGHTS',
  UPDATE_RECOMMENDATIONS: 'UPDATE_RECOMMENDATIONS',
  SET_COMPARISON_BGP: 'SET_COMPARISON_BGP',
  CLEAR_COMPARISON: 'CLEAR_COMPARISON',
  UPDATE_EVOLUTION: 'UPDATE_EVOLUTION'
};

// Initial BGP state
const initialState = {
  bgp: null,
  insights: null,
  recommendations: [],
  evolution: null,
  comparisonBGP: null,
  compatibility: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  isAnalyzing: false
};

// BGP reducer
const bgpReducer = (state, action) => {
  switch (action.type) {
    case BGP_ACTIONS.FETCH_BGP_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case BGP_ACTIONS.FETCH_BGP_SUCCESS:
      return {
        ...state,
        bgp: action.payload.bgp,
        insights: action.payload.insights,
        recommendations: action.payload.recommendations || [],
        evolution: action.payload.evolution,
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      };

    case BGP_ACTIONS.FETCH_BGP_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload
      };

    case BGP_ACTIONS.UPDATE_BGP_TRAIT:
      return {
        ...state,
        bgp: {
          ...state.bgp,
          traits: {
            ...state.bgp.traits,
            [action.payload.trait]: action.payload.value
          }
        },
        lastUpdated: new Date().toISOString()
      };

    case BGP_ACTIONS.UPDATE_BEHAVIORAL_EVENT:
      const newEvents = [...(state.bgp?.recent_events || []), action.payload];
      return {
        ...state,
        bgp: {
          ...state.bgp,
          recent_events: newEvents.slice(-50), // Keep last 50 events
          last_activity: new Date().toISOString()
        }
      };

    case BGP_ACTIONS.CALCULATE_COMPATIBILITY:
      return {
        ...state,
        compatibility: action.payload
      };

    case BGP_ACTIONS.UPDATE_INSIGHTS:
      return {
        ...state,
        insights: action.payload,
        lastUpdated: new Date().toISOString()
      };

    case BGP_ACTIONS.UPDATE_RECOMMENDATIONS:
      return {
        ...state,
        recommendations: action.payload
      };

    case BGP_ACTIONS.SET_COMPARISON_BGP:
      return {
        ...state,
        comparisonBGP: action.payload
      };

    case BGP_ACTIONS.CLEAR_COMPARISON:
      return {
        ...state,
        comparisonBGP: null,
        compatibility: null
      };

    case BGP_ACTIONS.UPDATE_EVOLUTION:
      return {
        ...state,
        evolution: action.payload
      };

    default:
      return state;
  }
};

// BGP provider component
export const BGPProvider = ({ children }) => {
  const [state, dispatch] = useReducer(bgpReducer, initialState);
  const { user, token, isAuthenticated } = useAuth();

  // Fetch BGP data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && token) {
      fetchBGP();
    }
  }, [isAuthenticated, user?.id, token]);

  // Auto-refresh BGP insights every 30 minutes
  useEffect(() => {
    if (isAuthenticated && user) {
      const interval = setInterval(() => {
        refreshInsights();
      }, 30 * 60 * 1000); // 30 minutes

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  // Fetch BGP data
  const fetchBGP = async () => {
    dispatch({ type: BGP_ACTIONS.FETCH_BGP_START });

    try {
      const response = await fetch('/api/bgp/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({
          type: BGP_ACTIONS.FETCH_BGP_SUCCESS,
          payload: data
        });
        return { success: true, data };
      } else {
        const errorData = await response.json();
        dispatch({
          type: BGP_ACTIONS.FETCH_BGP_FAILURE,
          payload: errorData.detail || 'Failed to fetch BGP data'
        });
        return { success: false, error: errorData.detail };
      }
    } catch (error) {
      const errorMessage = 'Network error fetching BGP data';
      dispatch({
        type: BGP_ACTIONS.FETCH_BGP_FAILURE,
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  };

  // Update behavioral event (called from app interactions)
  const updateBehavioralEvent = async (eventData) => {
    // Immediately update local state
    dispatch({
      type: BGP_ACTIONS.UPDATE_BEHAVIORAL_EVENT,
      payload: {
        ...eventData,
        timestamp: new Date().toISOString(),
        user_id: user.id
      }
    });

    // Send to backend for analysis
    try {
      await fetch('/api/bgp/event', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...eventData,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('Failed to sync behavioral event:', error);
      // Continue silently - events are cached locally
    }
  };

  // Calculate compatibility with another user's BGP
  const calculateCompatibility = async (otherUserBGP) => {
    if (!state.bgp || !otherUserBGP) return null;

    try {
      const response = await fetch('/api/bgp/compatibility', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_bgp: state.bgp,
          other_bgp: otherUserBGP
        })
      });

      if (response.ok) {
        const compatibility = await response.json();
        dispatch({
          type: BGP_ACTIONS.CALCULATE_COMPATIBILITY,
          payload: compatibility
        });
        
        dispatch({
          type: BGP_ACTIONS.SET_COMPARISON_BGP,
          payload: otherUserBGP
        });

        return compatibility;
      }
    } catch (error) {
      console.warn('Failed to calculate compatibility:', error);
    }

    return null;
  };

  // Refresh insights (AI analysis)
  const refreshInsights = async () => {
    if (!state.bgp) return;

    try {
      const response = await fetch('/api/bgp/insights', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bgp_id: state.bgp.id,
          timeframe: '30d'
        })
      });

      if (response.ok) {
        const insights = await response.json();
        dispatch({
          type: BGP_ACTIONS.UPDATE_INSIGHTS,
          payload: insights
        });
        return insights;
      }
    } catch (error) {
      console.warn('Failed to refresh insights:', error);
    }
  };

  // Get growth recommendations
  const getRecommendations = async () => {
    if (!state.bgp) return [];

    try {
      const response = await fetch('/api/bgp/recommendations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const recommendations = await response.json();
        dispatch({
          type: BGP_ACTIONS.UPDATE_RECOMMENDATIONS,
          payload: recommendations
        });
        return recommendations;
      }
    } catch (error) {
      console.warn('Failed to fetch recommendations:', error);
    }

    return [];
  };

  // Log conversation interaction
  const logConversationEvent = (eventType, data = {}) => {
    const eventMap = {
      'message_sent': {
        type: 'communication',
        category: 'response_pattern',
        metadata: {
          message_length: data.message_length,
          response_time: data.response_time,
          emotional_tone: data.emotional_tone
        }
      },
      'vulnerability_shared': {
        type: 'emotional',
        category: 'vulnerability_comfort',
        metadata: {
          vulnerability_level: data.level,
          context: data.context
        }
      },
      'question_asked': {
        type: 'communication',
        category: 'conversation_depth',
        metadata: {
          question_type: data.question_type,
          follow_up: data.is_follow_up
        }
      },
      'emotional_support': {
        type: 'emotional',
        category: 'empathy_expression',
        metadata: {
          support_type: data.support_type,
          situation: data.situation
        }
      },
      'conflict_resolution': {
        type: 'social',
        category: 'conflict_handling',
        metadata: {
          resolution_style: data.style,
          outcome: data.outcome
        }
      }
    };

    const event = eventMap[eventType];
    if (event) {
      updateBehavioralEvent({
        ...event,
        ...data,
        source: 'conversation'
      });
    }
  };

  // Log matching interaction
  const logMatchingEvent = (eventType, data = {}) => {
    const eventMap = {
      'profile_viewed': {
        type: 'social',
        category: 'engagement_pattern',
        metadata: {
          view_duration: data.duration,
          profile_completeness: data.completeness
        }
      },
      'match_liked': {
        type: 'decision',
        category: 'decision_speed',
        metadata: {
          decision_time: data.decision_time,
          factors_considered: data.factors
        }
      },
      'match_passed': {
        type: 'decision',
        category: 'selectivity',
        metadata: {
          pass_reason: data.reason,
          profile_quality: data.quality
        }
      },
      'reveal_requested': {
        type: 'relationship',
        category: 'intimacy_pace',
        metadata: {
          connection_level: data.connection_level,
          time_to_request: data.time_elapsed
        }
      }
    };

    const event = eventMap[eventType];
    if (event) {
      updateBehavioralEvent({
        ...event,
        ...data,
        source: 'matching'
      });
    }
  };

  // Get BGP trait value
  const getTraitValue = (traitName) => {
    return state.bgp?.traits?.[traitName] || 0;
  };

  // Get overall BGP score
  const getOverallScore = () => {
    if (!state.bgp?.traits) return 0;
    
    const traits = Object.values(state.bgp.traits);
    return Math.round(traits.reduce((sum, value) => sum + value, 0) / traits.length);
  };

  // Get compatibility score with another user
  const getCompatibilityScore = (otherBGP = null) => {
    const targetBGP = otherBGP || state.comparisonBGP;
    return state.compatibility?.overall_score || 0;
  };

  // Check if BGP is ready for matching
  const isReadyForMatching = () => {
    if (!state.bgp) return false;
    
    const requiredEvents = 10; // Minimum behavioral events needed
    const eventsCount = state.bgp.recent_events?.length || 0;
    
    return eventsCount >= requiredEvents && getOverallScore() > 30;
  };

  // Get behavioral category score
  const getCategoryScore = (category) => {
    if (!state.bgp?.traits) return 0;

    const categoryTraits = {
      emotional: ['emotional_depth', 'vulnerability_comfort', 'emotional_stability', 'empathy_expression'],
      communication: ['response_thoughtfulness', 'conversation_depth', 'humor_style', 'conflict_resolution'],
      social: ['social_energy', 'boundary_setting', 'trust_building', 'leadership_style'],
      decision: ['decision_speed', 'risk_tolerance', 'planning_approach', 'adaptability'],
      relationship: ['commitment_readiness', 'intimacy_pace', 'relationship_goals', 'growth_mindset']
    };

    const traits = categoryTraits[category] || [];
    if (traits.length === 0) return 0;

    const scores = traits.map(trait => state.bgp.traits[trait] || 0);
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  };

  // Clear comparison data
  const clearComparison = () => {
    dispatch({ type: BGP_ACTIONS.CLEAR_COMPARISON });
  };

  const value = {
    // State
    ...state,
    
    // Computed values
    overallScore: getOverallScore(),
    isReadyForMatching: isReadyForMatching(),
    
    // Actions
    fetchBGP,
    updateBehavioralEvent,
    calculateCompatibility,
    refreshInsights,
    getRecommendations,
    logConversationEvent,
    logMatchingEvent,
    getTraitValue,
    getCompatibilityScore,
    getCategoryScore,
    clearComparison
  };

  return (
    <BGPContext.Provider value={value}>
      {children}
    </BGPContext.Provider>
  );
};

// Custom hook to use BGP context
export const useBGP = () => {
  const context = useContext(BGPContext);
  if (!context) {
    throw new Error('useBGP must be used within a BGPProvider');
  }
  return context;
};

// HOC for BGP-dependent components
export const withBGP = (Component) => {
  return (props) => {
    const { bgp, isLoading, error } = useBGP();
    
    if (isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-white text-lg">Analyzing your behavioral patterns...</p>
          </div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Unable to Load BGP Data</h2>
            <p className="text-gray-300">{error}</p>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
};

export default BGPContext;