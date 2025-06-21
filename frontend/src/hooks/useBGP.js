import { useState, useEffect, useCallback, useRef } from 'react';
import { useBGP as useBGPContext } from '../context/BGPContext';

// Enhanced BGP hook with additional utilities
export const useBGP = () => {
  const bgpContext = useBGPContext();
  const [eventQueue, setEventQueue] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const eventTimer = useRef(null);

  // Queue behavioral events for batch processing
  const queueEvent = useCallback((eventData) => {
    setEventQueue(prev => [...prev, {
      ...eventData,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      queued_at: Date.now()
    }]);
  }, []);

  // Process queued events in batches
  useEffect(() => {
    if (eventQueue.length > 0) {
      // Clear existing timer
      if (eventTimer.current) {
        clearTimeout(eventTimer.current);
      }

      // Process events after 2 seconds of inactivity or when queue reaches 5 events
      const delay = eventQueue.length >= 5 ? 0 : 2000;
      
      eventTimer.current = setTimeout(() => {
        processEventQueue();
      }, delay);
    }

    return () => {
      if (eventTimer.current) {
        clearTimeout(eventTimer.current);
      }
    };
  }, [eventQueue]);

  const processEventQueue = useCallback(async () => {
    if (eventQueue.length === 0) return;

    const eventsToProcess = [...eventQueue];
    setEventQueue([]);

    // Process each event
    for (const event of eventsToProcess) {
      await bgpContext.updateBehavioralEvent(event);
    }
  }, [eventQueue, bgpContext.updateBehavioralEvent]);

  // Enhanced trait analysis with trend detection
  const analyzeTraitTrend = useCallback((traitName, timeframe = '30d') => {
    const evolution = bgpContext.evolution;
    if (!evolution || !evolution.trait_history) return null;

    const traitHistory = evolution.trait_history[traitName];
    if (!traitHistory || traitHistory.length < 2) return null;

    const recent = traitHistory.slice(-7); // Last 7 data points
    const older = traitHistory.slice(-14, -7); // Previous 7 data points

    const recentAvg = recent.reduce((sum, val) => sum + val.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val.value, 0) / older.length;

    const trend = recentAvg - olderAvg;
    const trendPercentage = (trend / olderAvg) * 100;

    return {
      trait: traitName,
      current: bgpContext.getTraitValue(traitName),
      trend: trend > 1 ? 'improving' : trend < -1 ? 'declining' : 'stable',
      change: Math.round(trend * 10) / 10,
      changePercentage: Math.round(trendPercentage * 10) / 10,
      dataPoints: recent.length
    };
  }, [bgpContext.evolution, bgpContext.getTraitValue]);

  // Get behavioral insights with AI analysis
  const getInsights = useCallback(async (forceRefresh = false) => {
    if (!bgpContext.bgp && !forceRefresh) return bgpContext.insights;

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      // Simulate analysis progress
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const insights = await bgpContext.refreshInsights();
      
      clearInterval(progressInterval);
      setAnalysisProgress(100);
      
      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisProgress(0);
      }, 500);

      return insights;
    } catch (error) {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      throw error;
    }
  }, [bgpContext.bgp, bgpContext.insights, bgpContext.refreshInsights]);

  // Calculate behavioral patterns
  const getBehavioralPatterns = useCallback(() => {
    if (!bgpContext.bgp) return [];

    const patterns = [];
    const traits = bgpContext.bgp.traits;

    // Analyze communication patterns
    if (traits.conversation_depth > 80 && traits.response_thoughtfulness > 75) {
      patterns.push({
        type: 'deep_communicator',
        confidence: 0.9,
        description: 'You excel at meaningful, thoughtful conversations',
        impact: 'Attracts partners seeking emotional depth'
      });
    }

    // Analyze emotional patterns
    if (traits.vulnerability_comfort > 85 && traits.empathy_expression > 80) {
      patterns.push({
        type: 'emotionally_intelligent',
        confidence: 0.85,
        description: 'You create safe spaces for emotional connection',
        impact: 'Builds trust quickly in relationships'
      });
    }

    // Analyze relationship patterns
    if (traits.commitment_readiness > 80 && traits.relationship_goals > 75) {
      patterns.push({
        type: 'relationship_focused',
        confidence: 0.8,
        description: 'You approach dating with serious relationship intent',
        impact: 'Attracts other commitment-minded individuals'
      });
    }

    // Analyze decision patterns
    if (traits.decision_speed < 40 && traits.planning_approach > 70) {
      patterns.push({
        type: 'thoughtful_decider',
        confidence: 0.75,
        description: 'You make careful, well-considered decisions',
        impact: 'Reduces relationship conflicts and regrets'
      });
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }, [bgpContext.bgp]);

  // Predict compatibility with given traits
  const predictCompatibility = useCallback((otherTraits) => {
    if (!bgpContext.bgp) return null;

    const myTraits = bgpContext.bgp.traits;
    let totalCompatibility = 0;
    let traitCount = 0;

    // Compatibility weights for different traits
    const traitWeights = {
      emotional_depth: 0.15,
      vulnerability_comfort: 0.12,
      conversation_depth: 0.10,
      conflict_resolution: 0.10,
      commitment_readiness: 0.15,
      humor_style: 0.08,
      social_energy: 0.08,
      intimacy_pace: 0.12,
      decision_speed: 0.05,
      empathy_expression: 0.05
    };

    Object.entries(traitWeights).forEach(([trait, weight]) => {
      if (myTraits[trait] !== undefined && otherTraits[trait] !== undefined) {
        const myValue = myTraits[trait];
        const otherValue = otherTraits[trait];
        
        // Calculate similarity (higher is better, max 100)
        const difference = Math.abs(myValue - otherValue);
        const similarity = Math.max(0, 100 - difference);
        
        totalCompatibility += similarity * weight;
        traitCount += weight;
      }
    });

    const compatibilityScore = traitCount > 0 ? totalCompatibility / traitCount : 0;

    return {
      overall_score: Math.round(compatibilityScore),
      confidence: traitCount / Object.values(traitWeights).reduce((a, b) => a + b, 0),
      strongest_matches: Object.entries(traitWeights)
        .filter(([trait]) => myTraits[trait] !== undefined && otherTraits[trait] !== undefined)
        .map(([trait, weight]) => ({
          trait,
          similarity: Math.max(0, 100 - Math.abs(myTraits[trait] - otherTraits[trait])),
          weight
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3)
    };
  }, [bgpContext.bgp]);

  // Track specific behavioral events with smart categorization
  const trackEvent = useCallback((eventType, context = {}) => {
    const eventMappings = {
      // Conversation events
      'deep_question_asked': {
        type: 'communication',
        category: 'conversation_depth',
        impact: 2,
        metadata: { question_depth: context.depth || 'medium' }
      },
      'vulnerability_shared': {
        type: 'emotional',
        category: 'vulnerability_comfort',
        impact: 3,
        metadata: { vulnerability_level: context.level || 'medium' }
      },
      'empathy_shown': {
        type: 'emotional',
        category: 'empathy_expression',
        impact: 2,
        metadata: { situation: context.situation }
      },
      'humor_used': {
        type: 'communication',
        category: 'humor_style',
        impact: 1,
        metadata: { humor_type: context.type || 'playful' }
      },
      
      // Matching events
      'quick_decision': {
        type: 'decision',
        category: 'decision_speed',
        impact: 1,
        metadata: { decision_time: context.time || 0 }
      },
      'thoughtful_consideration': {
        type: 'decision',
        category: 'planning_approach',
        impact: 2,
        metadata: { consideration_time: context.time || 0 }
      },
      
      // Relationship events
      'commitment_signal': {
        type: 'relationship',
        category: 'commitment_readiness',
        impact: 3,
        metadata: { signal_type: context.signal || 'interest' }
      },
      'boundary_set': {
        type: 'social',
        category: 'boundary_setting',
        impact: 2,
        metadata: { boundary_type: context.type || 'general' }
      }
    };

    const eventConfig = eventMappings[eventType];
    if (eventConfig) {
      queueEvent({
        ...eventConfig,
        source: context.source || 'manual_tracking',
        ...context
      });
    }
  }, [queueEvent]);

  // Get growth recommendations based on current BGP
  const getGrowthRecommendations = useCallback(() => {
    if (!bgpContext.bgp) return [];

    const traits = bgpContext.bgp.traits;
    const recommendations = [];

    // Find traits below 70 (improvement opportunities)
    Object.entries(traits).forEach(([trait, value]) => {
      if (value < 70) {
        const traitRecommendations = {
          emotional_depth: {
            title: 'Deepen Emotional Expression',
            actions: ['Share more personal stories', 'Explore feelings in conversations', 'Practice emotional vocabulary'],
            impact: 'Attracts emotionally mature partners'
          },
          vulnerability_comfort: {
            title: 'Practice Authentic Sharing',
            actions: ['Start with small vulnerabilities', 'Share past challenges', 'Express current concerns'],
            impact: 'Builds deeper connections faster'
          },
          conversation_depth: {
            title: 'Enhance Conversation Skills',
            actions: ['Ask follow-up questions', 'Share thoughtful responses', 'Discuss meaningful topics'],
            impact: 'Creates more engaging interactions'
          },
          conflict_resolution: {
            title: 'Improve Conflict Handling',
            actions: ['Practice active listening', 'Seek understanding first', 'Find win-win solutions'],
            impact: 'Reduces relationship tension'
          }
        };

        const recommendation = traitRecommendations[trait];
        if (recommendation) {
          recommendations.push({
            trait,
            currentScore: value,
            priority: value < 50 ? 'high' : 'medium',
            potentialGain: Math.min(25, 85 - value),
            ...recommendation
          });
        }
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] - priorityOrder[a.priority]) || (b.potentialGain - a.potentialGain);
    });
  }, [bgpContext.bgp]);

  // Check if BGP needs updating
  const needsUpdate = useCallback(() => {
    if (!bgpContext.lastUpdated) return true;
    
    const lastUpdate = new Date(bgpContext.lastUpdated);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceUpdate > 7; // Update weekly
  }, [bgpContext.lastUpdated]);

  // Get BGP summary for display
  const getSummary = useCallback(() => {
    if (!bgpContext.bgp) return null;

    const overallScore = bgpContext.overallScore;
    const categoryScores = {
      emotional: bgpContext.getCategoryScore('emotional'),
      communication: bgpContext.getCategoryScore('communication'),
      social: bgpContext.getCategoryScore('social'),
      decision: bgpContext.getCategoryScore('decision'),
      relationship: bgpContext.getCategoryScore('relationship')
    };

    const strongestCategory = Object.entries(categoryScores)
      .sort(([,a], [,b]) => b - a)[0];

    const weakestCategory = Object.entries(categoryScores)
      .sort(([,a], [,b]) => a - b)[0];

    return {
      overallScore,
      categoryScores,
      strongestCategory: {
        name: strongestCategory[0],
        score: strongestCategory[1]
      },
      weakestCategory: {
        name: weakestCategory[0],
        score: weakestCategory[1]
      },
      readinessLevel: bgpContext.isReadyForMatching ? 'ready' : 'building',
      lastAnalyzed: bgpContext.lastUpdated
    };
  }, [bgpContext.bgp, bgpContext.overallScore, bgpContext.getCategoryScore, bgpContext.isReadyForMatching, bgpContext.lastUpdated]);

  return {
    // Original context methods and state
    ...bgpContext,
    
    // Enhanced methods
    trackEvent,
    queueEvent,
    getInsights,
    predictCompatibility,
    
    // Analysis methods
    analyzeTraitTrend,
    getBehavioralPatterns,
    getGrowthRecommendations,
    getSummary,
    
    // Utility methods
    needsUpdate,
    
    // Additional state
    isAnalyzing,
    analysisProgress,
    eventQueueLength: eventQueue.length
  };
};

// Hook for behavioral event tracking in components
export const useBehaviorTracker = () => {
  const { trackEvent } = useBGP();

  // Track page/component interactions
  const trackInteraction = useCallback((component, action, context = {}) => {
    const eventMap = {
      'profile_view': 'profile_viewed',
      'message_send': 'message_sent',
      'question_ask': 'deep_question_asked',
      'vulnerability_share': 'vulnerability_shared',
      'match_like': 'quick_decision',
      'match_consider': 'thoughtful_consideration'
    };

    const eventType = eventMap[`${component}_${action}`];
    if (eventType) {
      trackEvent(eventType, {
        ...context,
        source: component,
        action
      });
    }
  }, [trackEvent]);

  return { trackInteraction };
};

// Hook for BGP comparison utilities
export const useBGPComparison = () => {
  const { calculateCompatibility, clearComparison, compatibility } = useBGP();

  const compareWithUser = useCallback(async (otherUserBGP) => {
    const result = await calculateCompatibility(otherUserBGP);
    return result;
  }, [calculateCompatibility]);

  const getCompatibilityInsights = useCallback(() => {
    if (!compatibility) return null;

    return {
      overallMatch: compatibility.overall_score,
      strongAreas: compatibility.category_scores
        ? Object.entries(compatibility.category_scores)
            .filter(([, score]) => score > 80)
            .map(([category, score]) => ({ category, score }))
        : [],
      improvementAreas: compatibility.category_scores
        ? Object.entries(compatibility.category_scores)
            .filter(([, score]) => score < 60)
            .map(([category, score]) => ({ category, score }))
        : []
    };
  }, [compatibility]);

  return {
    compareWithUser,
    getCompatibilityInsights,
    clearComparison,
    currentCompatibility: compatibility
  };
};

export default useBGP;