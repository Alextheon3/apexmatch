import { useState, useEffect, useCallback, useRef } from 'react';
import { useMatch as useMatchContext } from '../context/MatchContext';
import { useAuth } from './useAuth';
import { useBGP } from './useBGP';

// Enhanced matching hook with utilities
export const useMatching = () => {
  const matchContext = useMatchContext();
  const { isPremium, canAccessFeature } = useAuth();
  const { trackEvent } = useBGP();
  const [swipeQueue, setSwipeQueue] = useState([]);
  const [autoMatchEnabled, setAutoMatchEnabled] = useState(false);
  const autoMatchInterval = useRef(null);

  // Track match interactions for BGP
  const trackMatchInteraction = useCallback((action, matchData = {}) => {
    const eventMap = {
      'view': () => trackEvent('profile_viewed', {
        profile_completeness: matchData.profile_score || 0,
        view_duration: matchData.duration || 0
      }),
      'like': () => trackEvent('match_liked', {
        decision_time: matchData.decision_time || 0,
        compatibility_score: matchData.compatibility || 0
      }),
      'pass': () => trackEvent('match_passed', {
        pass_reason: matchData.reason || 'not_interested',
        compatibility_score: matchData.compatibility || 0
      }),
      'super_like': () => trackEvent('super_like_used', {
        decision_time: matchData.decision_time || 0,
        confidence: matchData.confidence || 'high'
      })
    };

    const trackingFunction = eventMap[action];
    if (trackingFunction) {
      trackingFunction();
    }
  }, [trackEvent]);

  // Enhanced match finding with preferences
  const findMatches = useCallback(async (preferences = {}) => {
    const defaultPreferences = {
      age_range: [22, 35],
      distance: 50,
      trust_score_min: 60,
      compatibility_min: 70,
      count: isPremium ? 10 : 1
    };

    const searchPreferences = { ...defaultPreferences, ...preferences };

    // Check if user can find new matches
    if (!matchContext.canFindNewMatch) {
      return {
        success: false,
        error: 'Daily match limit reached. Upgrade to Premium for unlimited matches.',
        nextAvailable: matchContext.usageLimits.next_match_available
      };
    }

    const result = await matchContext.findNewMatch();
    
    if (result.success) {
      trackMatchInteraction('new_match_found', {
        compatibility: result.match.compatibility_score,
        trust_level: result.match.trust_score
      });
    }

    return result;
  }, [matchContext.canFindNewMatch, matchContext.findNewMatch, isPremium, trackMatchInteraction]);

  // Smart swiping with decision analytics
  const swipeMatch = useCallback(async (matchId, direction, analytics = {}) => {
    const startTime = Date.now();
    
    try {
      let result;
      
      if (direction === 'right' || direction === 'like') {
        result = await matchContext.likeMatch(matchId, analytics.decision_time);
        trackMatchInteraction('like', {
          decision_time: analytics.decision_time || Date.now() - startTime,
          compatibility: analytics.compatibility,
          factors_considered: analytics.factors || []
        });
      } else if (direction === 'left' || direction === 'pass') {
        result = await matchContext.passMatch(matchId, analytics.reason);
        trackMatchInteraction('pass', {
          pass_reason: analytics.reason || 'not_interested',
          compatibility: analytics.compatibility
        });
      }

      // Add to swipe queue for batch analysis
      setSwipeQueue(prev => [...prev, {
        matchId,
        direction,
        timestamp: Date.now(),
        analytics
      }]);

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [matchContext.likeMatch, matchContext.passMatch, trackMatchInteraction]);

  // Batch analyze swipe patterns
  useEffect(() => {
    if (swipeQueue.length >= 5) {
      analyzeSwipePatterns();
    }
  }, [swipeQueue]);

  const analyzeSwipePatterns = useCallback(() => {
    if (swipeQueue.length === 0) return;

    const recentSwipes = swipeQueue.slice(-10);
    const likeRate = recentSwipes.filter(s => s.direction === 'right' || s.direction === 'like').length / recentSwipes.length;
    const avgDecisionTime = recentSwipes.reduce((sum, s) => sum + (s.analytics.decision_time || 0), 0) / recentSwipes.length;

    // Track overall swiping behavior
    trackEvent('swipe_pattern_analyzed', {
      like_rate: Math.round(likeRate * 100),
      avg_decision_time: Math.round(avgDecisionTime),
      selectivity: likeRate < 0.3 ? 'high' : likeRate > 0.7 ? 'low' : 'medium'
    });

    // Clear processed swipes
    setSwipeQueue([]);
  }, [swipeQueue, trackEvent]);

  // Auto-matching for premium users
  const enableAutoMatch = useCallback((criteria = {}) => {
    if (!isPremium) {
      return { success: false, error: 'Auto-match is a Premium feature' };
    }

    setAutoMatchEnabled(true);
    
    autoMatchInterval.current = setInterval(async () => {
      const result = await findMatches(criteria);
      if (result.success && criteria.auto_like_threshold) {
        const match = result.match;
        if (match.compatibility_score >= criteria.auto_like_threshold) {
          await swipeMatch(match.id, 'like', {
            decision_time: 0,
            auto_matched: true,
            compatibility: match.compatibility_score
          });
        }
      }
    }, criteria.interval || 30000); // Every 30 seconds

    return { success: true };
  }, [isPremium, findMatches, swipeMatch]);

  const disableAutoMatch = useCallback(() => {
    setAutoMatchEnabled(false);
    if (autoMatchInterval.current) {
      clearInterval(autoMatchInterval.current);
      autoMatchInterval.current = null;
    }
  }, []);

  // Conversation utilities
  const startSmartConversation = useCallback(async (matchId, options = {}) => {
    const { useAIWingman = false, customMessage = null } = options;

    // Check conversation limits
    if (!matchContext.canStartConversation) {
      return {
        success: false,
        error: 'Active conversation limit reached. Upgrade to Premium for unlimited conversations.'
      };
    }

    // Start the conversation
    const result = await matchContext.startConversation(matchId);
    
    if (result.success && useAIWingman && isPremium) {
      // Get AI Wingman suggestion
      const wingmanResult = await matchContext.getAIWingman(matchId);
      if (wingmanResult.success) {
        return {
          ...result,
          aiSuggestions: wingmanResult.data.suggestions
        };
      }
    }

    if (result.success && customMessage) {
      // Send initial message
      const messageResult = await matchContext.sendMessage(
        result.conversation.id,
        customMessage,
        'introduction'
      );
      
      return {
        ...result,
        initialMessage: messageResult
      };
    }

    return result;
  }, [matchContext.canStartConversation, matchContext.startConversation, matchContext.getAIWingman, matchContext.sendMessage, isPremium]);

  // Enhanced message sending with analytics
  const sendSmartMessage = useCallback(async (conversationId, content, options = {}) => {
    const { 
      messageType = 'text',
      emotionalTone = 'neutral',
      includeAnalytics = true 
    } = options;

    const startTime = Date.now();
    
    const result = await matchContext.sendMessage(conversationId, content, messageType);
    
    if (result.success && includeAnalytics) {
      // Track message analytics for BGP
      trackEvent('message_sent', {
        message_length: content.length,
        response_time: Date.now() - startTime,
        emotional_tone: emotionalTone,
        message_type: messageType,
        conversation_id: conversationId
      });

      // Analyze message content for behavioral patterns
      const isQuestion = content.includes('?');
      const isVulnerable = /\b(feel|felt|emotion|scared|worried|excited|happy|sad)\b/i.test(content);
      const isHumorous = /\b(haha|lol|funny|joke|😂|😄|😊)\b/i.test(content);

      if (isQuestion) {
        trackEvent('question_asked', {
          question_type: isVulnerable ? 'emotional' : 'general',
          conversation_id: conversationId
        });
      }

      if (isVulnerable) {
        trackEvent('vulnerability_shared', {
          level: content.length > 100 ? 'high' : 'medium',
          conversation_id: conversationId
        });
      }

      if (isHumorous) {
        trackEvent('humor_used', {
          type: 'playful',
          conversation_id: conversationId
        });
      }
    }

    return result;
  }, [matchContext.sendMessage, trackEvent]);

  // Conversation health monitoring
  const getConversationHealth = useCallback((conversationId) => {
    const messages = matchContext.getConversationMessages(conversationId);
    if (!messages || messages.length === 0) return null;

    const myMessages = messages.filter(m => m.sender_id === matchContext.currentUser?.id);
    const theirMessages = messages.filter(m => m.sender_id !== matchContext.currentUser?.id);

    // Calculate engagement metrics
    const messageBalance = Math.abs(myMessages.length - theirMessages.length) / messages.length;
    const avgMyLength = myMessages.reduce((sum, m) => sum + m.content.length, 0) / myMessages.length;
    const avgTheirLength = theirMessages.reduce((sum, m) => sum + m.content.length, 0) / theirMessages.length;
    
    const lengthBalance = avgMyLength > 0 && avgTheirLength > 0 
      ? Math.abs(avgMyLength - avgTheirLength) / Math.max(avgMyLength, avgTheirLength)
      : 1;

    // Response time analysis
    const responseTimes = [];
    for (let i = 1; i < messages.length; i++) {
      const prevTime = new Date(messages[i-1].timestamp);
      const currTime = new Date(messages[i].timestamp);
      responseTimes.push(currTime - prevTime);
    }
    
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    // Calculate health score
    const balanceScore = (1 - messageBalance) * 40; // 40 points max
    const lengthScore = (1 - lengthBalance) * 30; // 30 points max
    const responseScore = avgResponseTime < 3600000 ? 30 : 15; // 30 points if < 1 hour

    const healthScore = Math.round(balanceScore + lengthScore + responseScore);

    return {
      score: healthScore,
      messageCount: messages.length,
      messageBalance: Math.round((1 - messageBalance) * 100),
      lengthBalance: Math.round((1 - lengthBalance) * 100),
      avgResponseTime: Math.round(avgResponseTime / 60000), // in minutes
      status: healthScore > 80 ? 'excellent' : healthScore > 60 ? 'good' : healthScore > 40 ? 'fair' : 'needs_attention',
      suggestions: getConversationSuggestions(healthScore, messageBalance, lengthBalance)
    };
  }, [matchContext.getConversationMessages, matchContext.currentUser]);

  const getConversationSuggestions = useCallback((score, messageBalance, lengthBalance) => {
    const suggestions = [];

    if (messageBalance > 0.3) {
      suggestions.push({
        type: 'balance',
        message: 'Try to match their message frequency for better engagement'
      });
    }

    if (lengthBalance > 0.5) {
      suggestions.push({
        type: 'length',
        message: 'Consider adjusting your message length to match theirs'
      });
    }

    if (score < 60) {
      suggestions.push({
        type: 'engagement',
        message: 'Ask more questions to increase engagement'
      });
    }

    return suggestions;
  }, []);

  // Reveal timing optimization
  const getOptimalRevealTiming = useCallback((matchId) => {
    const match = matchContext.getMatchById(matchId);
    if (!match) return null;

    const emotionalConnection = match.emotional_connection_score || 0;
    const daysConnected = match.conversation_days || 0;
    const messageCount = match.messages_exchanged || 0;

    // Calculate readiness factors
    const emotionalReadiness = emotionalConnection >= 70;
    const timeReadiness = daysConnected >= 3;
    const conversationReadiness = messageCount >= 20;

    const readinessScore = [emotionalReadiness, timeReadiness, conversationReadiness]
      .filter(Boolean).length / 3;

    return {
      isReady: readinessScore >= 0.67, // At least 2 out of 3 criteria
      readinessScore: Math.round(readinessScore * 100),
      factors: {
        emotional: emotionalReadiness,
        time: timeReadiness,
        conversation: conversationReadiness
      },
      recommendation: readinessScore >= 0.67 
        ? 'Great timing for a reveal request!'
        : 'Continue building connection before requesting reveal',
      nextMilestone: getNextRevealMilestone(emotionalConnection, daysConnected, messageCount)
    };
  }, [matchContext.getMatchById]);

  const getNextRevealMilestone = useCallback((emotional, days, messages) => {
    if (emotional < 70) return `Reach ${70 - emotional}% more emotional connection`;
    if (days < 3) return `Chat for ${3 - days} more days`;
    if (messages < 20) return `Exchange ${20 - messages} more messages`;
    return 'Ready for reveal!';
  }, []);

  // Match quality scoring
  const calculateMatchQuality = useCallback((match) => {
    if (!match) return 0;

    const factors = {
      compatibility: (match.compatibility_score || 0) * 0.3,
      trustScore: (match.trust_score || 0) * 0.25,
      profileCompleteness: (match.profile_completeness || 0) * 0.15,
      mutualInterests: (match.shared_interests?.length || 0) * 5 * 0.15,
      behavioralAlignment: (match.behavioral_match || 0) * 0.15
    };

    const qualityScore = Object.values(factors).reduce((sum, score) => sum + score, 0);
    
    return {
      score: Math.min(100, Math.round(qualityScore)),
      factors,
      tier: qualityScore > 85 ? 'elite' : qualityScore > 70 ? 'high' : qualityScore > 50 ? 'medium' : 'low'
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoMatchInterval.current) {
        clearInterval(autoMatchInterval.current);
      }
    };
  }, []);

  return {
    // Original context methods and state
    ...matchContext,
    
    // Enhanced methods
    findMatches,
    swipeMatch,
    startSmartConversation,
    sendSmartMessage,
    
    // Auto-matching
    enableAutoMatch,
    disableAutoMatch,
    autoMatchEnabled,
    
    // Analytics and insights
    getConversationHealth,
    getOptimalRevealTiming,
    calculateMatchQuality,
    
    // Utilities
    trackMatchInteraction,
    swipeQueueLength: swipeQueue.length
  };
};

// Hook for conversation-specific utilities
export const useConversation = (conversationId) => {
  const { sendSmartMessage, getConversationMessages, getConversationHealth } = useMatching();
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  const messages = getConversationMessages(conversationId);
  const health = getConversationHealth(conversationId);

  // Smart typing indicator
  const handleTyping = useCallback((typing) => {
    setIsTyping(typing);
    
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    if (typing) {
      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, 3000); // Stop typing indicator after 3 seconds
      
      setTypingTimeout(timeout);
    }
  }, [typingTimeout]);

  // Send message with typing simulation
  const sendMessage = useCallback(async (content, options = {}) => {
    setIsTyping(false);
    return await sendSmartMessage(conversationId, content, options);
  }, [conversationId, sendSmartMessage]);

  // Get message suggestions based on conversation context
  const getMessageSuggestions = useCallback(() => {
    if (!messages || messages.length === 0) {
      return [
        "Hi! I'm excited to get to know you better 😊",
        "Your profile caught my eye - what's your favorite way to spend weekends?",
        "I noticed we both love [shared interest] - what got you into that?"
      ];
    }

    const lastMessage = messages[messages.length - 1];
    const isQuestion = lastMessage.content.includes('?');
    const isMyMessage = lastMessage.sender_id === 'current_user'; // Replace with actual user ID

    if (!isMyMessage && isQuestion) {
      return [
        "That's a great question! Let me think...",
        "I love that you asked - here's my take:",
        "Interesting perspective! I feel like..."
      ];
    }

    return [
      "I'd love to hear more about that",
      "That's really interesting - tell me more!",
      "What's your favorite part about that?"
    ];
  }, [messages]);

  return {
    conversationId,
    messages,
    health,
    isTyping,
    sendMessage,
    handleTyping,
    getMessageSuggestions
  };
};

// Hook for match filtering and sorting
export const useMatchFilters = () => {
  const [filters, setFilters] = useState({
    ageRange: [22, 35],
    distance: 50,
    trustScoreMin: 60,
    compatibilityMin: 70,
    hasPhotos: true,
    isOnline: false
  });

  const [sortBy, setSortBy] = useState('compatibility'); // compatibility, trust_score, distance, last_active

  const applyFilters = useCallback((matches) => {
    return matches.filter(match => {
      if (match.age < filters.ageRange[0] || match.age > filters.ageRange[1]) return false;
      if (match.distance > filters.distance) return false;
      if (match.trust_score < filters.trustScoreMin) return false;
      if (match.compatibility_score < filters.compatibilityMin) return false;
      if (filters.hasPhotos && (!match.photos || match.photos.length === 0)) return false;
      if (filters.isOnline && !match.is_online) return false;
      
      return true;
    });
  }, [filters]);

  const sortMatches = useCallback((matches) => {
    return [...matches].sort((a, b) => {
      switch (sortBy) {
        case 'compatibility':
          return (b.compatibility_score || 0) - (a.compatibility_score || 0);
        case 'trust_score':
          return (b.trust_score || 0) - (a.trust_score || 0);
        case 'distance':
          return (a.distance || 0) - (b.distance || 0);
        case 'last_active':
          return new Date(b.last_active || 0) - new Date(a.last_active || 0);
        default:
          return 0;
      }
    });
  }, [sortBy]);

  const processMatches = useCallback((matches) => {
    const filtered = applyFilters(matches);
    const sorted = sortMatches(filtered);
    return sorted;
  }, [applyFilters, sortMatches]);

  return {
    filters,
    setFilters,
    sortBy,
    setSortBy,
    processMatches
  };
};

export default useMatching;