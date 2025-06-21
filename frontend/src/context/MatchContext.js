import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useBGP } from './BGPContext';

const MatchContext = createContext();

// Match action types
const MATCH_ACTIONS = {
  FETCH_MATCHES_START: 'FETCH_MATCHES_START',
  FETCH_MATCHES_SUCCESS: 'FETCH_MATCHES_SUCCESS',
  FETCH_MATCHES_FAILURE: 'FETCH_MATCHES_FAILURE',
  ADD_NEW_MATCH: 'ADD_NEW_MATCH',
  UPDATE_MATCH: 'UPDATE_MATCH',
  REMOVE_MATCH: 'REMOVE_MATCH',
  SET_CURRENT_CONVERSATION: 'SET_CURRENT_CONVERSATION',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE_STATUS: 'UPDATE_MESSAGE_STATUS',
  UPDATE_EMOTIONAL_CONNECTION: 'UPDATE_EMOTIONAL_CONNECTION',
  UPDATE_REVEAL_STATUS: 'UPDATE_REVEAL_STATUS',
  SET_TYPING_STATUS: 'SET_TYPING_STATUS',
  UPDATE_USAGE_LIMITS: 'UPDATE_USAGE_LIMITS',
  SET_AI_WINGMAN_DATA: 'SET_AI_WINGMAN_DATA',
  CLEAR_AI_WINGMAN: 'CLEAR_AI_WINGMAN',
  UPDATE_CONVERSATION_INSIGHTS: 'UPDATE_CONVERSATION_INSIGHTS'
};

// Initial match state
const initialState = {
  matches: [],
  currentConversation: null,
  conversations: {},
  messages: {},
  typingUsers: {},
  revealRequests: [],
  usageLimits: {
    daily_matches_used: 0,
    daily_matches_limit: 1,
    active_conversations: 0,
    conversation_limit: 3,
    next_match_available: null
  },
  aiWingmanData: null,
  conversationInsights: {},
  isLoading: false,
  error: null,
  lastUpdated: null
};

// Match reducer
const matchReducer = (state, action) => {
  switch (action.type) {
    case MATCH_ACTIONS.FETCH_MATCHES_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case MATCH_ACTIONS.FETCH_MATCHES_SUCCESS:
      return {
        ...state,
        matches: action.payload.matches,
        conversations: action.payload.conversations || {},
        revealRequests: action.payload.reveal_requests || [],
        usageLimits: action.payload.usage_limits || state.usageLimits,
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      };

    case MATCH_ACTIONS.FETCH_MATCHES_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload
      };

    case MATCH_ACTIONS.ADD_NEW_MATCH:
      return {
        ...state,
        matches: [action.payload, ...state.matches],
        usageLimits: {
          ...state.usageLimits,
          daily_matches_used: state.usageLimits.daily_matches_used + 1
        }
      };

    case MATCH_ACTIONS.UPDATE_MATCH:
      return {
        ...state,
        matches: state.matches.map(match =>
          match.id === action.payload.id
            ? { ...match, ...action.payload.updates }
            : match
        )
      };

    case MATCH_ACTIONS.REMOVE_MATCH:
      return {
        ...state,
        matches: state.matches.filter(match => match.id !== action.payload),
        conversations: Object.fromEntries(
          Object.entries(state.conversations).filter(([id]) => id !== action.payload)
        ),
        messages: Object.fromEntries(
          Object.entries(state.messages).filter(([id]) => id !== action.payload)
        )
      };

    case MATCH_ACTIONS.SET_CURRENT_CONVERSATION:
      return {
        ...state,
        currentConversation: action.payload
      };

    case MATCH_ACTIONS.ADD_MESSAGE:
      const { conversationId, message } = action.payload;
      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: [
            ...(state.messages[conversationId] || []),
            message
          ]
        },
        conversations: {
          ...state.conversations,
          [conversationId]: {
            ...state.conversations[conversationId],
            last_message: message,
            updated_at: message.timestamp
          }
        }
      };

    case MATCH_ACTIONS.UPDATE_MESSAGE_STATUS:
      const { conversationId: convId, messageId, status } = action.payload;
      return {
        ...state,
        messages: {
          ...state.messages,
          [convId]: (state.messages[convId] || []).map(msg =>
            msg.id === messageId ? { ...msg, status } : msg
          )
        }
      };

    case MATCH_ACTIONS.UPDATE_EMOTIONAL_CONNECTION:
      const { matchId, score } = action.payload;
      return {
        ...state,
        matches: state.matches.map(match =>
          match.id === matchId
            ? { ...match, emotional_connection_score: score }
            : match
        )
      };

    case MATCH_ACTIONS.UPDATE_REVEAL_STATUS:
      const { matchId: revealMatchId, revealStatus } = action.payload;
      return {
        ...state,
        matches: state.matches.map(match =>
          match.id === revealMatchId
            ? { ...match, reveal_status: revealStatus }
            : match
        )
      };

    case MATCH_ACTIONS.SET_TYPING_STATUS:
      const { userId, conversationId: typingConvId, isTyping } = action.payload;
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [`${typingConvId}_${userId}`]: isTyping
        }
      };

    case MATCH_ACTIONS.UPDATE_USAGE_LIMITS:
      return {
        ...state,
        usageLimits: {
          ...state.usageLimits,
          ...action.payload
        }
      };

    case MATCH_ACTIONS.SET_AI_WINGMAN_DATA:
      return {
        ...state,
        aiWingmanData: action.payload
      };

    case MATCH_ACTIONS.CLEAR_AI_WINGMAN:
      return {
        ...state,
        aiWingmanData: null
      };

    case MATCH_ACTIONS.UPDATE_CONVERSATION_INSIGHTS:
      return {
        ...state,
        conversationInsights: {
          ...state.conversationInsights,
          [action.payload.conversationId]: action.payload.insights
        }
      };

    default:
      return state;
  }
};

// Match provider component
export const MatchProvider = ({ children }) => {
  const [state, dispatch] = useReducer(matchReducer, initialState);
  const { user, token, isAuthenticated, isPremium } = useAuth();
  const { logMatchingEvent, logConversationEvent } = useBGP();

  // Fetch matches when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && token) {
      fetchMatches();
    }
  }, [isAuthenticated, user?.id, token]);

  // Auto-refresh matches every 5 minutes
  useEffect(() => {
    if (isAuthenticated && user) {
      const interval = setInterval(() => {
        fetchMatches(true); // Silent refresh
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  // Fetch matches and conversations
  const fetchMatches = async (silent = false) => {
    if (!silent) {
      dispatch({ type: MATCH_ACTIONS.FETCH_MATCHES_START });
    }

    try {
      const response = await fetch('/api/matches', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({
          type: MATCH_ACTIONS.FETCH_MATCHES_SUCCESS,
          payload: data
        });
        return { success: true, data };
      } else {
        const errorData = await response.json();
        if (!silent) {
          dispatch({
            type: MATCH_ACTIONS.FETCH_MATCHES_FAILURE,
            payload: errorData.detail || 'Failed to fetch matches'
          });
        }
        return { success: false, error: errorData.detail };
      }
    } catch (error) {
      const errorMessage = 'Network error fetching matches';
      if (!silent) {
        dispatch({
          type: MATCH_ACTIONS.FETCH_MATCHES_FAILURE,
          payload: errorMessage
        });
      }
      return { success: false, error: errorMessage };
    }
  };

  // Find new matches
  const findNewMatch = async () => {
    // Check usage limits for free users
    if (!isPremium && state.usageLimits.daily_matches_used >= state.usageLimits.daily_matches_limit) {
      return { success: false, error: 'Daily match limit reached. Upgrade to Premium for unlimited matches.' };
    }

    try {
      const response = await fetch('/api/matches/find', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const newMatch = await response.json();
        dispatch({
          type: MATCH_ACTIONS.ADD_NEW_MATCH,
          payload: newMatch
        });

        // Log matching event for BGP
        logMatchingEvent('new_match_found', {
          match_quality: newMatch.compatibility_score,
          trust_level: newMatch.trust_score
        });

        return { success: true, match: newMatch };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail };
      }
    } catch (error) {
      return { success: false, error: 'Network error finding matches' };
    }
  };

  // Like a match
  const likeMatch = async (matchId, decision_time = null) => {
    try {
      const response = await fetch(`/api/matches/${matchId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ decision_time })
      });

      if (response.ok) {
        const result = await response.json();
        
        dispatch({
          type: MATCH_ACTIONS.UPDATE_MATCH,
          payload: {
            id: matchId,
            updates: { status: 'liked', mutual_match: result.mutual_match }
          }
        });

        // Log BGP event
        logMatchingEvent('match_liked', {
          decision_time,
          mutual_match: result.mutual_match
        });

        return { success: true, mutual_match: result.mutual_match };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail };
      }
    } catch (error) {
      return { success: false, error: 'Network error liking match' };
    }
  };

  // Pass on a match
  const passMatch = async (matchId, reason = null) => {
    try {
      const response = await fetch(`/api/matches/${matchId}/pass`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        dispatch({
          type: MATCH_ACTIONS.REMOVE_MATCH,
          payload: matchId
        });

        // Log BGP event
        logMatchingEvent('match_passed', {
          pass_reason: reason
        });

        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail };
      }
    } catch (error) {
      return { success: false, error: 'Network error passing match' };
    }
  };

  // Start conversation
  const startConversation = async (matchId) => {
    // Check conversation limits for free users
    if (!isPremium && state.usageLimits.active_conversations >= state.usageLimits.conversation_limit) {
      return { success: false, error: 'Active conversation limit reached. Upgrade to Premium for unlimited conversations.' };
    }

    try {
      const response = await fetch(`/api/conversations/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ match_id: matchId })
      });

      if (response.ok) {
        const conversation = await response.json();
        
        dispatch({
          type: MATCH_ACTIONS.UPDATE_MATCH,
          payload: {
            id: matchId,
            updates: { conversation_id: conversation.id, status: 'chatting' }
          }
        });

        dispatch({
          type: MATCH_ACTIONS.UPDATE_USAGE_LIMITS,
          payload: {
            active_conversations: state.usageLimits.active_conversations + 1
          }
        });

        return { success: true, conversation };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail };
      }
    } catch (error) {
      return { success: false, error: 'Network error starting conversation' };
    }
  };

  // Send message
  const sendMessage = async (conversationId, content, messageType = 'text') => {
    const tempId = `temp_${Date.now()}`;
    const message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      message_type: messageType,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };

    // Immediately add to local state
    dispatch({
      type: MATCH_ACTIONS.ADD_MESSAGE,
      payload: { conversationId, message }
    });

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, message_type: messageType })
      });

      if (response.ok) {
        const sentMessage = await response.json();
        
        // Update with real message data
        dispatch({
          type: MATCH_ACTIONS.UPDATE_MESSAGE_STATUS,
          payload: {
            conversationId,
            messageId: tempId,
            status: 'sent'
          }
        });

        // Log conversation event for BGP
        logConversationEvent('message_sent', {
          message_length: content.length,
          message_type: messageType,
          conversation_id: conversationId
        });

        return { success: true, message: sentMessage };
      } else {
        // Mark message as failed
        dispatch({
          type: MATCH_ACTIONS.UPDATE_MESSAGE_STATUS,
          payload: {
            conversationId,
            messageId: tempId,
            status: 'failed'
          }
        });
        
        const errorData = await response.json();
        return { success: false, error: errorData.detail };
      }
    } catch (error) {
      dispatch({
        type: MATCH_ACTIONS.UPDATE_MESSAGE_STATUS,
        payload: {
          conversationId,
          messageId: tempId,
          status: 'failed'
        }
      });
      
      return { success: false, error: 'Network error sending message' };
    }
  };

  // Request reveal
  const requestReveal = async (matchId) => {
    try {
      const response = await fetch(`/api/matches/${matchId}/reveal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        dispatch({
          type: MATCH_ACTIONS.UPDATE_REVEAL_STATUS,
          payload: {
            matchId,
            revealStatus: result.reveal_status
          }
        });

        // Log BGP event
        logMatchingEvent('reveal_requested', {
          emotional_connection: result.emotional_connection_score
        });

        return { success: true, result };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail };
      }
    } catch (error) {
      return { success: false, error: 'Network error requesting reveal' };
    }
  };

  // Get AI Wingman introduction
  const getAIWingman = async (matchId) => {
    if (!isPremium) {
      return { success: false, error: 'AI Wingman is a Premium feature. Upgrade to access personalized conversation starters.' };
    }

    try {
      const response = await fetch(`/api/ai-wingman/${matchId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const wingmanData = await response.json();
        
        dispatch({
          type: MATCH_ACTIONS.SET_AI_WINGMAN_DATA,
          payload: wingmanData
        });

        return { success: true, data: wingmanData };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail };
      }
    } catch (error) {
      return { success: false, error: 'Network error getting AI Wingman' };
    }
  };

  // Use AI Wingman suggestion
  const useAIWingmanSuggestion = async (matchId, suggestionId) => {
    try {
      const response = await fetch(`/api/ai-wingman/${matchId}/use`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ suggestion_id: suggestionId })
      });

      if (response.ok) {
        // Clear wingman data after use
        dispatch({ type: MATCH_ACTIONS.CLEAR_AI_WINGMAN });
        
        const result = await response.json();
        return { success: true, message: result.message };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail };
      }
    } catch (error) {
      return { success: false, error: 'Network error using AI Wingman' };
    }
  };

  // Set typing status
  const setTypingStatus = (conversationId, isTyping) => {
    dispatch({
      type: MATCH_ACTIONS.SET_TYPING_STATUS,
      payload: {
        userId: user.id,
        conversationId,
        isTyping
      }
    });

    // Send typing status to WebSocket (if connected)
    // This would integrate with your WebSocket service
  };

  // Get conversation insights
  const getConversationInsights = async (conversationId) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/insights`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const insights = await response.json();
        
        dispatch({
          type: MATCH_ACTIONS.UPDATE_CONVERSATION_INSIGHTS,
          payload: { conversationId, insights }
        });

        return { success: true, insights };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail };
      }
    } catch (error) {
      return { success: false, error: 'Network error getting insights' };
    }
  };

  // Helper functions
  const getMatchById = (matchId) => {
    return state.matches.find(match => match.id === matchId);
  };

  const getConversationMessages = (conversationId) => {
    return state.messages[conversationId] || [];
  };

  const getActiveConversations = () => {
    return Object.values(state.conversations).filter(conv => conv.status === 'active');
  };

  const canFindNewMatch = () => {
    return isPremium || state.usageLimits.daily_matches_used < state.usageLimits.daily_matches_limit;
  };

  const canStartConversation = () => {
    return isPremium || state.usageLimits.active_conversations < state.usageLimits.conversation_limit;
  };

  const value = {
    // State
    ...state,
    
    // Computed values
    activeConversations: getActiveConversations(),
    canFindNewMatch: canFindNewMatch(),
    canStartConversation: canStartConversation(),
    
    // Actions
    fetchMatches,
    findNewMatch,
    likeMatch,
    passMatch,
    startConversation,
    sendMessage,
    requestReveal,
    getAIWingman,
    useAIWingmanSuggestion,
    setTypingStatus,
    getConversationInsights,
    
    // Helpers
    getMatchById,
    getConversationMessages
  };

  return (
    <MatchContext.Provider value={value}>
      {children}
    </MatchContext.Provider>
  );
};

// Custom hook to use match context
export const useMatch = () => {
  const context = useContext(MatchContext);
  if (!context) {
    throw new Error('useMatch must be used within a MatchProvider');
  }
  return context;
};

export default MatchContext;