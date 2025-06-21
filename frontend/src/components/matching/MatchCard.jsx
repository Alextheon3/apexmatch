import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Sparkles, Brain, Clock, Star, Crown, Eye, EyeOff, X, Users } from 'lucide-react';

const MatchCard = ({ 
  match, 
  onStartChat, 
  onReveal, 
  onPass, 
  onLike,
  showActions = true,
  isPremium = false,
  apiBaseUrl = 'http://localhost:8000'
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [emotionalPulse, setEmotionalPulse] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [matchDetails, setMatchDetails] = useState(match);

  useEffect(() => {
    // Animate emotional connection pulse
    const interval = setInterval(() => {
      setEmotionalPulse(prev => (prev + 1) % 3);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Load additional match details when flipped
  useEffect(() => {
    if (isFlipped && !matchDetails.bgp_highlights) {
      loadMatchInsights();
    }
  }, [isFlipped]);

  const loadMatchInsights = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBaseUrl}/api/v1/match/${match.id}/insights`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const insights = await response.json();
        setMatchDetails(prev => ({ ...prev, ...insights }));
      } else {
        throw new Error('Failed to load insights');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error loading match insights:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBaseUrl}/api/v1/match/${match.id}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const chatData = await response.json();
        onStartChat?.(match.id, chatData);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start chat');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error starting chat:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReveal = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBaseUrl}/api/v1/reveal/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          match_id: match.id,
          message: "I feel ready to see you! Our connection has been amazing."
        })
      });

      if (response.ok) {
        const revealData = await response.json();
        onReveal?.(match.id, revealData);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to request reveal');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error requesting reveal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePass = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBaseUrl}/api/v1/match/${match.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        onPass?.(match.id);
      } else {
        throw new Error('Failed to pass on match');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error passing on match:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBaseUrl}/api/v1/match/${match.id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const likeData = await response.json();
        onLike?.(match.id, likeData);
      } else {
        throw new Error('Failed to like match');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error liking match:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getCompatibilityColor = (score) => {
    if (score >= 90) return 'from-green-500 to-emerald-500';
    if (score >= 80) return 'from-blue-500 to-cyan-500';
    if (score >= 70) return 'from-purple-500 to-indigo-500';
    if (score >= 60) return 'from-pink-500 to-rose-500';
    return 'from-gray-500 to-slate-500';
  };

  const getConnectionStatus = () => {
    if (matchDetails.reveal_status === 'revealed') return 'Revealed';
    if (matchDetails.emotional_connection >= 70) return 'Ready to Reveal';
    if (matchDetails.emotional_connection >= 50) return 'Strong Connection';
    if (matchDetails.emotional_connection >= 30) return 'Building Bond';
    return 'Getting to Know';
  };

  const getConnectionIcon = () => {
    if (matchDetails.reveal_status === 'revealed') return Eye;
    if (matchDetails.emotional_connection >= 70) return Sparkles;
    if (matchDetails.emotional_connection >= 50) return Heart;
    if (matchDetails.emotional_connection >= 30) return MessageCircle;
    return Clock;
  };

  const ConnectionIcon = getConnectionIcon();

  // Error Display
  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500/30 rounded-3xl p-6 text-center">
        <div className="text-red-400 mb-2">Failed to load match</div>
        <div className="text-gray-300 text-sm mb-4">{error}</div>
        <button 
          onClick={() => {
            setError(null);
            window.location.reload();
          }}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div 
        className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden transform transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-20 flex items-center justify-center">
            <div className="bg-white/10 rounded-2xl p-4">
              <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <div className="text-white text-sm">Processing...</div>
            </div>
          </div>
        )}
        
        {/* Premium Badge */}
        {matchDetails.is_premium_match && (
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 rounded-full flex items-center space-x-1">
              <Crown className="w-3 h-3 text-white" />
              <span className="text-white text-xs font-medium">Premium</span>
            </div>
          </div>
        )}

        {/* Emotional Connection Indicator */}
        <div className="absolute top-4 left-4 z-10">
          <div className={`w-3 h-3 rounded-full animate-pulse ${
            emotionalPulse === 0 ? 'bg-pink-400' : 
            emotionalPulse === 1 ? 'bg-purple-400' : 'bg-blue-400'
          }`}></div>
        </div>

        <div className={`relative h-96 transition-transform duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* Front Side - Blind Profile */}
          <div className={`absolute inset-0 backface-hidden ${isFlipped ? 'opacity-0' : 'opacity-100'}`}>
            
            {/* Blurred Avatar */}
            <div className="h-64 bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-xl"></div>
              
              {/* Anonymous Avatar */}
              <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {matchDetails.anonymous_initial || matchDetails.first_name?.[0] || '?'}
                </span>
              </div>

              {/* Reveal Status Overlay */}
              {matchDetails.reveal_status !== 'revealed' && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl px-4 py-2 flex items-center space-x-2">
                    <EyeOff className="w-5 h-5 text-white" />
                    <span className="text-white text-sm font-medium">Identity Hidden</span>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="p-6">
              
              {/* Basic Info */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white mb-1">
                  {matchDetails.reveal_status === 'revealed' ? matchDetails.first_name : matchDetails.anonymous_name}
                </h3>
                <div className="flex items-center space-x-4 text-gray-300 text-sm">
                  <span>{matchDetails.age} years old</span>
                  <span>•</span>
                  <span>{matchDetails.distance || 'Unknown'}km away</span>
                  {matchDetails.is_online && (
                    <>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span>Online</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Compatibility Score */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Behavioral Compatibility</span>
                  <span className="text-white font-bold">{matchDetails.compatibility_score || 0}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className={`bg-gradient-to-r ${getCompatibilityColor(matchDetails.compatibility_score || 0)} h-2 rounded-full transition-all duration-1000`}
                    style={{ width: `${matchDetails.compatibility_score || 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Connection Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ConnectionIcon className="w-5 h-5 text-pink-400" />
                  <span className="text-white text-sm font-medium">{getConnectionStatus()}</span>
                </div>
                <div className="text-gray-300 text-sm">
                  {matchDetails.emotional_connection || 0}% connected
                </div>
              </div>
            </div>
          </div>

          {/* Back Side - Detailed Info */}
          <div className={`absolute inset-0 backface-hidden rotate-y-180 ${isFlipped ? 'opacity-100' : 'opacity-0'}`}>
            <div className="h-full p-6 flex flex-col">
              
              {/* BGP Insights */}
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-3">
                  <Brain className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-semibold">Behavioral Match</span>
                </div>
                
                <div className="space-y-3">
                  {matchDetails.bgp_highlights?.map((highlight, index) => (
                    <div key={index} className="bg-white/5 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-medium">{highlight.trait}</span>
                        <span className="text-pink-400 text-sm">{highlight.compatibility}%</span>
                      </div>
                      <p className="text-gray-300 text-xs">{highlight.description}</p>
                    </div>
                  )) || (
                    <div className="text-gray-300 text-sm">
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                          <span>Loading compatibility insights...</span>
                        </div>
                      ) : (
                        'Share more conversations to unlock detailed compatibility insights!'
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Shared Interests */}
              <div className="mb-6">
                <h4 className="text-white font-semibold mb-3">Shared Interests</h4>
                <div className="flex flex-wrap gap-2">
                  {matchDetails.shared_interests?.map((interest, index) => (
                    <span 
                      key={index}
                      className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-white px-3 py-1 rounded-full text-sm border border-pink-500/30"
                    >
                      {interest}
                    </span>
                  )) || (
                    <span className="text-gray-300 text-sm">
                      Interests will appear as you chat more!
                    </span>
                  )}
                </div>
              </div>

              {/* Trust Score */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Trust Score</span>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-white font-bold">{matchDetails.trust_score || 0}%</span>
                  </div>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full"
                    style={{ width: `${matchDetails.trust_score || 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Conversation Preview */}
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-3">Why You Match</h4>
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {matchDetails.match_explanation || 
                     "Your behavioral patterns show remarkable harmony. You both value deep conversations, share similar life rhythms, and demonstrate high emotional intelligence."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="absolute bottom-4 left-4 right-4 flex justify-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            
            {/* Pass Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePass();
              }}
              disabled={isLoading}
              className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Chat Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStartChat();
              }}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white p-3 rounded-full transition-all duration-300 hover:scale-110 flex items-center space-x-2 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">Chat</span>
            </button>

            {/* Reveal Button */}
            {matchDetails.emotional_connection >= 70 && matchDetails.reveal_status !== 'revealed' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReveal();
                }}
                disabled={isLoading}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white p-3 rounded-full transition-all duration-300 hover:scale-110 flex items-center space-x-2 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-5 h-5" />
                <span className="font-medium">Reveal</span>
              </button>
            )}

            {/* Like Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              disabled={isLoading}
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white p-3 rounded-full transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Heart className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Flip Indicator */}
        <div className="absolute bottom-2 right-2 text-white/40 text-xs">
          Click to flip
        </div>
      </div>

      {/* Upgrade Prompt for Free Users */}
      {!isPremium && matchDetails.is_premium_match && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-3xl flex items-center justify-center">
          <div className="text-center p-6">
            <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Premium Match</h3>
            <p className="text-gray-300 mb-4">
              Upgrade to see this high-compatibility match
            </p>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                // Handle upgrade
              }}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-yellow-500 hover:to-orange-600 transition-all duration-300"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchCard;