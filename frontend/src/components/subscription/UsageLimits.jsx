import React, { useState, useEffect } from 'react';
import { Clock, Users, MessageCircle, Eye, Crown, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';

const UsageLimits = ({ 
  user,
  onUpgrade,
  showUpgradePrompt = true,
  compact = false 
}) => {
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const [pulseWarning, setPulseWarning] = useState(false);

  // Mock usage data - in real app, this comes from user object
  const usage = {
    daily_matches: {
      used: user?.usage?.daily_matches_used || 1,
      limit: user?.usage?.daily_matches_limit || 1,
      resets_in: user?.usage?.matches_reset_time || '2d 14h',
      next_available: user?.usage?.next_match_time || '2024-12-10T10:00:00Z'
    },
    active_conversations: {
      used: user?.usage?.active_conversations || 2,
      limit: user?.usage?.conversation_limit || 3,
      note: 'Maximum simultaneous conversations'
    },
    ai_wingman: {
      used: user?.usage?.ai_wingman_used || 0,
      limit: 0, // Free users get 0
      premium_only: true
    },
    reveal_reconnections: {
      used: user?.usage?.reconnections_used || 0,
      limit: 0, // Free users get 0
      premium_only: true
    }
  };

  useEffect(() => {
    // Update countdown timer
    const updateTimer = () => {
      if (usage.daily_matches.next_available) {
        const now = new Date();
        const nextMatch = new Date(usage.daily_matches.next_available);
        const diff = nextMatch - now;

        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          
          if (days > 0) {
            setTimeUntilReset(`${days}d ${hours}h`);
          } else if (hours > 0) {
            setTimeUntilReset(`${hours}h ${minutes}m`);
          } else {
            setTimeUntilReset(`${minutes}m`);
          }
        } else {
          setTimeUntilReset('Available now!');
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [usage.daily_matches.next_available]);

  useEffect(() => {
    // Pulse warning when limits are close
    const isCloseToLimit = usage.daily_matches.used >= usage.daily_matches.limit ||
                          usage.active_conversations.used >= usage.active_conversations.limit - 1;
    
    if (isCloseToLimit) {
      const interval = setInterval(() => {
        setPulseWarning(prev => !prev);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [usage]);

  const getUsageColor = (used, limit, premiumOnly = false) => {
    if (premiumOnly) return 'from-gray-500 to-gray-600';
    
    const percentage = (used / limit) * 100;
    if (percentage >= 100) return 'from-red-500 to-red-600';
    if (percentage >= 80) return 'from-orange-500 to-yellow-500';
    if (percentage >= 60) return 'from-yellow-500 to-green-500';
    return 'from-green-500 to-blue-500';
  };

  const getUsagePercentage = (used, limit) => {
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  if (compact) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              usage.daily_matches.used >= usage.daily_matches.limit ? 'bg-red-400 animate-pulse' : 'bg-green-400'
            }`}></div>
            <div>
              <div className="text-white font-medium">Daily Matches</div>
              <div className="text-gray-300 text-sm">
                {usage.daily_matches.used}/{usage.daily_matches.limit} used
              </div>
            </div>
          </div>
          
          {usage.daily_matches.used >= usage.daily_matches.limit && (
            <button
              onClick={onUpgrade}
              className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-300"
            >
              Upgrade
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Usage Limits</h3>
            <p className="text-gray-300">Free plan limitations and usage</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Free Plan</div>
            <div className="text-white font-semibold">Discovery</div>
          </div>
        </div>
      </div>

      {/* Usage Metrics */}
      <div className="p-6 space-y-6">
        
        {/* Daily Matches */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg bg-gradient-to-r ${getUsageColor(usage.daily_matches.used, usage.daily_matches.limit)}`}>
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-medium">Daily Matches</div>
                <div className="text-gray-400 text-sm">New matches you can explore</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${
                usage.daily_matches.used >= usage.daily_matches.limit ? 'text-red-400' : 'text-white'
              }`}>
                {usage.daily_matches.used}/{usage.daily_matches.limit}
              </div>
              <div className="text-gray-400 text-sm">used</div>
            </div>
          </div>
          
          <div className="w-full bg-white/20 rounded-full h-3 mb-3">
            <div 
              className={`bg-gradient-to-r ${getUsageColor(usage.daily_matches.used, usage.daily_matches.limit)} h-3 rounded-full transition-all duration-1000 ${
                pulseWarning && usage.daily_matches.used >= usage.daily_matches.limit ? 'animate-pulse' : ''
              }`}
              style={{ width: `${getUsagePercentage(usage.daily_matches.used, usage.daily_matches.limit)}%` }}
            ></div>
          </div>
          
          {usage.daily_matches.used >= usage.daily_matches.limit ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">Limit reached</span>
              </div>
              <div className="text-gray-300 text-sm">
                Next match in: {timeUntilReset}
              </div>
            </div>
          ) : (
            <div className="text-gray-300 text-sm">
              Next reset: {timeUntilReset}
            </div>
          )}
        </div>

        {/* Active Conversations */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg bg-gradient-to-r ${getUsageColor(usage.active_conversations.used, usage.active_conversations.limit)}`}>
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-medium">Active Conversations</div>
                <div className="text-gray-400 text-sm">Simultaneous chats allowed</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${
                usage.active_conversations.used >= usage.active_conversations.limit ? 'text-orange-400' : 'text-white'
              }`}>
                {usage.active_conversations.used}/{usage.active_conversations.limit}
              </div>
              <div className="text-gray-400 text-sm">active</div>
            </div>
          </div>
          
          <div className="w-full bg-white/20 rounded-full h-3 mb-3">
            <div 
              className={`bg-gradient-to-r ${getUsageColor(usage.active_conversations.used, usage.active_conversations.limit)} h-3 rounded-full transition-all duration-1000`}
              style={{ width: `${getUsagePercentage(usage.active_conversations.used, usage.active_conversations.limit)}%` }}
            ></div>
          </div>
          
          {usage.active_conversations.used >= usage.active_conversations.limit - 1 && (
            <div className="flex items-center space-x-2 text-orange-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Close to limit - end a conversation to start a new one</span>
            </div>
          )}
        </div>

        {/* Premium Features */}
        <div className="space-y-4">
          <h4 className="text-white font-semibold flex items-center space-x-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <span>Premium Features</span>
          </h4>
          
          {/* AI Wingman */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 opacity-60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-gray-500 to-gray-600">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white font-medium">AI Wingman</div>
                  <div className="text-gray-400 text-sm">Personalized conversation starters</div>
                </div>
              </div>
              <div className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium">
                Premium Only
              </div>
            </div>
            
            <div className="w-full bg-white/20 rounded-full h-3 mb-3">
              <div className="bg-gradient-to-r from-gray-500 to-gray-600 h-3 rounded-full w-0"></div>
            </div>
            
            <p className="text-gray-400 text-sm">
              Get AI-crafted introductions based on your behavioral compatibility with 89% higher response rates.
            </p>
          </div>

          {/* Reveal Reconnections */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 opacity-60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-gray-500 to-gray-600">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white font-medium">Reveal Reconnections</div>
                  <div className="text-gray-400 text-sm">Reconnect with declined reveals</div>
                </div>
              </div>
              <div className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium">
                Premium Only
              </div>
            </div>
            
            <div className="w-full bg-white/20 rounded-full h-3 mb-3">
              <div className="bg-gradient-to-r from-gray-500 to-gray-600 h-3 rounded-full w-0"></div>
            </div>
            
            <p className="text-gray-400 text-sm">
              Second chances for connections that didn't work out the first time. Give reveals another try.
            </p>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20">
          <h4 className="text-white font-semibold mb-3 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <span>This Week's Activity</span>
          </h4>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-400">{user?.weekly_stats?.matches_viewed || 3}</div>
              <div className="text-gray-300 text-sm">Matches Viewed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{user?.weekly_stats?.conversations_started || 2}</div>
              <div className="text-gray-300 text-sm">Chats Started</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">{user?.weekly_stats?.messages_sent || 47}</div>
              <div className="text-gray-300 text-sm">Messages Sent</div>
            </div>
          </div>
        </div>

        {/* Upgrade Prompt */}
        {showUpgradePrompt && (
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30">
            <div className="text-center">
              <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h4 className="text-xl font-bold text-white mb-2">Ready for Unlimited?</h4>
              <p className="text-gray-300 mb-6">
                Upgrade to Premium and unlock unlimited matches, AI Wingman, and priority access to high-trust users.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-400">∞</div>
                  <div className="text-gray-300 text-sm">Daily Matches</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-blue-400">∞</div>
                  <div className="text-gray-300 text-sm">Conversations</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-purple-400">✓</div>
                  <div className="text-gray-300 text-sm">All Features</div>
                </div>
              </div>
              
              <button
                onClick={onUpgrade}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-4 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Crown className="w-5 h-5" />
                <span>Upgrade to Premium</span>
              </button>
              
              <p className="text-gray-400 text-sm mt-3">
                💯 30-day money-back guarantee • Cancel anytime
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Mini usage widget for header/sidebar
const UsageWidget = ({ user, onUpgrade }) => {
  const matchesUsed = user?.usage?.daily_matches_used || 1;
  const matchesLimit = user?.usage?.daily_matches_limit || 1;
  const isLimitReached = matchesUsed >= matchesLimit;

  return (
    <div className="bg-white/10 rounded-xl p-3 border border-white/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isLimitReached ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`}></div>
          <span className="text-white text-sm font-medium">
            {matchesUsed}/{matchesLimit} matches
          </span>
        </div>
        
        {isLimitReached && (
          <button
            onClick={onUpgrade}
            className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-2 py-1 rounded text-xs font-medium hover:shadow-lg transition-all duration-300"
          >
            <Crown className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default UsageLimits;
export { UsageWidget };