import React, { useState, useEffect } from 'react';
import { Brain, Heart, MessageCircle, Sparkles, Eye, EyeOff, Star, Clock, Zap } from 'lucide-react';

const ApexMatchInterface = () => {
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchQueue, setMatchQueue] = useState([]);
  const [activeChats, setActiveChats] = useState([]);
  const [showAIWingman, setShowAIWingman] = useState(false);
  const [aiIntroduction, setAiIntroduction] = useState(null);
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    setCurrentMatch({
      id: 1,
      compatibility_score: 0.87,
      trust_compatibility: 0.91,
      overall_match_quality: 0.89,
      status: 'pending',
      expires_at: new Date(Date.now() + 18 * 60 * 60 * 1000), // 18 hours
      other_user_preview: {
        id: 2,
        first_name: 'Sarah',
        age: 28,
        location: 'San Francisco, CA',
        trust_tier: 'high'
      },
      match_explanation: {
        reasons: [
          'You both slow down before making decisions and reflect deeply',
          'Similar emotional openness and vulnerability comfort',
          'Complementary communication styles that balance each other'
        ],
        overall_quality: 'Very high compatibility',
        strongest_compatibility: 'emotional_expression'
      }
    });

    setActiveChats([
      {
        id: 3,
        other_user: { first_name: 'Emma', age: 26, is_online: true },
        last_message: 'That\'s such an interesting perspective!',
        last_activity: new Date(Date.now() - 30 * 60 * 1000),
        unread_count: 2,
        emotional_connection_score: 0.73,
        reveal_status: 'eligible'
      },
      {
        id: 4,
        other_user: { first_name: 'Alex', age: 30, is_online: false },
        last_message: 'I love how thoughtful you are',
        last_activity: new Date(Date.now() - 2 * 60 * 60 * 1000),
        unread_count: 0,
        emotional_connection_score: 0.68,
        reveal_status: 'not_ready'
      }
    ]);
  }, []);

  const handleAcceptMatch = async () => {
    setLoading(true);
    // API call would go here
    setTimeout(() => {
      setCurrentMatch(null);
      setLoading(false);
      // Add to active chats
      setActiveChats(prev => [{
        id: 1,
        other_user: { 
          first_name: currentMatch.other_user_preview.first_name, 
          age: currentMatch.other_user_preview.age,
          is_online: true 
        },
        last_message: 'Match accepted! Start your conversation...',
        last_activity: new Date(),
        unread_count: 0,
        emotional_connection_score: 0.0,
        reveal_status: 'not_ready'
      }, ...prev]);
    }, 1000);
  };

  const handleRejectMatch = () => {
    setCurrentMatch(null);
  };

  const handleUseAIWingman = async () => {
    setLoading(true);
    setShowAIWingman(true);
    
    // Simulate AI generation
    setTimeout(() => {
      setAiIntroduction({
        introduction: `You and ${currentMatch.other_user_preview.first_name} both take time to reflect before making decisions, and you both value deep emotional connections. You're both thoughtful communicators who appreciate authenticity. This connection has real potential—start by sharing what genuinely made you smile today.`,
        conversation_starters: [
          "What's something that made you genuinely smile today?",
          "If you could instantly become an expert at something, what would it be and why?",
          "What's a small thing that brings you unexpected joy?"
        ],
        compatibility_highlights: [
          "Both prefer deep, meaningful conversations",
          "Similar emotional processing styles",
          "Complementary decision-making approaches"
        ]
      });
      setLoading(false);
    }, 2000);
  };

  const getTimeUntilExpiry = (expiresAt) => {
    const now = new Date();
    const diff = new Date(expiresAt) - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getTrustTierColor = (tier) => {
    const colors = {
      elite: 'from-yellow-400 to-amber-500',
      high: 'from-green-400 to-emerald-500',
      standard: 'from-blue-400 to-indigo-500',
      low: 'from-gray-400 to-gray-500',
      toxic: 'from-red-400 to-red-600'
    };
    return colors[tier] || colors.standard;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Brain className="w-8 h-8 text-purple-400" />
            <h1 className="text-2xl font-bold">ApexMatch</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-purple-300">
              Trust Score: <span className="text-white font-semibold">8.7/10</span>
            </div>
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Match Area */}
          <div className="lg:col-span-2">
            {currentMatch ? (
              <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8">
                {/* Match Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">New Match Found</h2>
                  <div className="flex items-center space-x-2 text-purple-300">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Expires in {getTimeUntilExpiry(currentMatch.expires_at)}</span>
                  </div>
                </div>

                {/* Compatibility Score */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-semibold">Behavioral Compatibility</span>
                    <span className="text-2xl font-bold text-purple-400">{Math.round(currentMatch.overall_match_quality * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-1000"
                      style={{ width: `${currentMatch.overall_match_quality * 100}%` }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-purple-300">Emotional Rhythm:</span>
                      <span className="ml-2 font-semibold">{Math.round(currentMatch.compatibility_score * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-purple-300">Trust Level:</span>
                      <span className="ml-2 font-semibold">{Math.round(currentMatch.trust_compatibility * 100)}%</span>
                    </div>
                  </div>
                </div>

                {/* User Preview (Blind) */}
                <div className="bg-black bg-opacity-30 rounded-xl p-6 mb-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
                      <EyeOff className="w-6 h-6 text-gray-300" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{currentMatch.other_user_preview.first_name}</h3>
                      <p className="text-purple-300">{currentMatch.other_user_preview.age} • {currentMatch.other_user_preview.location}</p>
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getTrustTierColor(currentMatch.other_user_preview.trust_tier)} text-white mt-2`}>
                        {currentMatch.other_user_preview.trust_tier.toUpperCase()} TRUST
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-purple-200 bg-purple-900 bg-opacity-50 rounded-lg p-3">
                    Photos hidden until emotional connection is built. Start with conversation to truly get to know each other.
                  </p>
                </div>

                {/* Why You Matched */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold mb-4 flex items-center">
                    <Heart className="w-5 h-5 text-pink-400 mr-2" />
                    Why You Matched
                  </h4>
                  <div className="space-y-3">
                    {currentMatch.match_explanation.reasons.map((reason, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-purple-200">{reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Wingman Section */}
                {!showAIWingman ? (
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center">
                          <Sparkles className="w-5 h-5 text-yellow-400 mr-2" />
                          Want a Perfect Introduction?
                        </h4>
                        <p className="text-sm text-purple-100">
                          Let AI Wingman analyze your compatibility and craft the perfect conversation starter
                        </p>
                      </div>
                      <button 
                        onClick={handleUseAIWingman}
                        disabled={loading}
                        className="bg-white text-purple-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Generating...' : 'Use AI Wingman'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 mb-6">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p>AI Wingman is analyzing your compatibility...</p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center mb-4">
                          <Sparkles className="w-5 h-5 text-yellow-400 mr-2" />
                          <span className="font-semibold">AI Wingman Introduction</span>
                        </div>
                        <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-4">
                          <p className="text-sm leading-relaxed">{aiIntroduction.introduction}</p>
                        </div>
                        <div className="mb-4">
                          <h5 className="font-semibold mb-2">Suggested Conversation Starters:</h5>
                          <div className="space-y-2">
                            {aiIntroduction.conversation_starters.map((starter, index) => (
                              <div key={index} className="bg-white bg-opacity-10 rounded p-2 text-sm">
                                "{starter}"
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-xs text-purple-200 text-center">
                          ✨ AI Wingman will now disappear
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button 
                    onClick={handleRejectMatch}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 py-3 rounded-xl font-semibold transition-colors"
                  >
                    Pass
                  </button>
                  <button 
                    onClick={handleAcceptMatch}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                  >
                    {loading ? 'Connecting...' : 'Start Conversation'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-gray-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Brain className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No New Matches</h3>
                <p className="text-purple-300 mb-6">We're analyzing behavioral patterns to find your perfect match</p>
                <button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-3 rounded-xl font-semibold transition-all">
                  Find New Matches
                </button>
              </div>
            )}
          </div>

          {/* Active Chats Sidebar */}
          <div className="space-y-6">
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <MessageCircle className="w-5 h-5 text-purple-400 mr-2" />
                Active Connections
              </h3>
              
              <div className="space-y-4">
                {activeChats.map((chat) => (
                  <div key={chat.id} className="bg-black bg-opacity-30 rounded-xl p-4 hover:bg-opacity-40 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold">{chat.other_user.first_name[0]}</span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold">{chat.other_user.first_name}</span>
                            {chat.other_user.is_online && (
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-xs text-purple-300">Age {chat.other_user.age}</p>
                        </div>
                      </div>
                      {chat.unread_count > 0 && (
                        <div className="w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold">{chat.unread_count}</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-purple-200 mb-3 truncate">{chat.last_message}</p>
                    
                    {/* Emotional Connection Progress */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-purple-300">Emotional Connection</span>
                        <span className="text-xs font-semibold">{Math.round(chat.emotional_connection_score * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div 
                          className="bg-gradient-to-r from-purple-400 to-pink-400 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${chat.emotional_connection_score * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Reveal Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-purple-300">
                        {new Date(chat.last_activity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {chat.reveal_status === 'eligible' ? (
                        <div className="flex items-center space-x-1 text-xs bg-gradient-to-r from-yellow-500 to-amber-500 text-black px-2 py-1 rounded-full">
                          <Eye className="w-3 h-3" />
                          <span>Reveal Ready</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-xs text-purple-400">
                          <EyeOff className="w-3 h-3" />
                          <span>Building Connection</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {activeChats.length === 0 && (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-purple-300">No active conversations yet</p>
                  <p className="text-sm text-purple-400">Accept a match to start chatting</p>
                </div>
              )}
            </div>

            {/* Trust Score Display */}
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Star className="w-5 h-5 text-yellow-400 mr-2" />
                Your Trust Score
              </h3>
              
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-yellow-400 mb-2">8.7</div>
                <div className="text-sm text-purple-300">HIGH TRUST TIER</div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-300">Reliability</span>
                  <span className="font-semibold">95%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-300">Communication</span>
                  <span className="font-semibold">92%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-300">Respect</span>
                  <span className="font-semibold">88%</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-green-900 bg-opacity-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <Zap className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-semibold text-green-400">Trust Perks Active</span>
                </div>
                <ul className="text-xs text-green-200 space-y-1">
                  <li>• Priority matching queue</li>
                  <li>• Access to high-trust users</li>
                  <li>• Enhanced compatibility insights</li>
                </ul>
              </div>
            </div>

            {/* BGP Insights */}
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Brain className="w-5 h-5 text-purple-400 mr-2" />
                Your Behavioral Profile
              </h3>
              
              <div className="space-y-4 text-sm">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-purple-300">Communication Style</span>
                    <span className="font-semibold">Thoughtful</span>
                  </div>
                  <p className="text-xs text-purple-400">You take time to craft meaningful responses</p>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-purple-300">Emotional Openness</span>
                    <span className="font-semibold">Gradual</span>
                  </div>
                  <p className="text-xs text-purple-400">You open up as trust builds</p>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-purple-300">Decision Making</span>
                    <span className="font-semibold">Deliberate</span>
                  </div>
                  <p className="text-xs text-purple-400">You weigh options carefully</p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-purple-900 bg-opacity-50 rounded-lg">
                <p className="text-xs text-purple-200">
                  Your profile is <span className="font-semibold">92% complete</span>. 
                  Keep engaging to improve matching accuracy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApexMatchInterface;