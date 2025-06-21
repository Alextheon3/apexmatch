import React, { useState, useEffect } from 'react';
import { Brain, Heart, Star, Shield, Edit, Camera, Settings, Crown, Zap, TrendingUp, Calendar, MapPin, Mail, User, Eye, EyeOff } from 'lucide-react';

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Mock user data
    setUserData({
      id: 1,
      firstName: 'Alex',
      age: 28,
      location: 'San Francisco, CA',
      email: 'alex@example.com',
      bio: 'I believe in deep conversations over small talk, and that the best connections happen when we\'re genuinely ourselves. Looking for someone who values emotional authenticity and isn\'t afraid to be vulnerable.',
      subscription_tier: 'premium',
      trust_score: 8.7,
      trust_tier: 'high',
      profile_completion: 92,
      onboarding_status: 'ready_to_match',
      created_at: new Date('2024-10-15'),
      
      // BGP Data
      bgp: {
        confidence: 0.89,
        communication_style: 'Thoughtful and reflective',
        emotional_style: 'Gradually opens up',
        decision_style: 'Deliberate and careful',
        social_energy: 'Balanced introvert',
        dimensions: {
          response_speed_avg: 0.6,
          conversation_depth_pref: 0.85,
          vulnerability_comfort: 0.7,
          empathy_indicators: 0.9,
          attachment_security: 0.8,
          decision_making_speed: 0.4,
          emotional_volatility: 0.3,
          trust_building_pace: 0.6
        }
      },
      
      // Statistics
      stats: {
        total_matches: 23,
        successful_connections: 8,
        active_conversations: 3,
        trust_score_trend: 'increasing',
        days_on_platform: 45,
        reveal_success_rate: 0.75
      }
    });
  }, []);

  const handleSaveProfile = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setEditing(false);
      alert('Profile updated successfully!');
    }, 1000);
  };

  const handleInputChange = (field, value) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getSubscriptionBadge = (tier) => {
    if (tier === 'premium') {
      return (
        <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-3 py-1 rounded-full text-xs font-bold">
          <Crown className="w-3 h-3" />
          <span>PREMIUM</span>
        </div>
      );
    }
    return (
      <div className="bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
        FREE
      </div>
    );
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

  const formatDimension = (value) => {
    return Math.round(value * 100);
  };

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Brain className="w-8 h-8 text-purple-400" />
            <h1 className="text-2xl font-bold">Your ApexMatch Profile</h1>
          </div>
          <button className="p-2 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6 sticky top-8">
              {/* Profile Picture */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-32 h-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-4xl font-bold mb-4 mx-auto">
                    {userData.firstName[0]}
                  </div>
                  <button className="absolute bottom-2 right-2 bg-purple-600 hover:bg-purple-700 p-2 rounded-full transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                
                <h2 className="text-2xl font-bold mb-2">{userData.firstName}</h2>
                <p className="text-purple-300 mb-3">{userData.age} • {userData.location}</p>
                
                {getSubscriptionBadge(userData.subscription_tier)}
              </div>

              {/* Trust Score */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold">Trust Score</span>
                  <span className="text-2xl font-bold text-yellow-400">{userData.trust_score}</span>
                </div>
                <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r ${getTrustTierColor(userData.trust_tier)} text-white mb-3`}>
                  {userData.trust_tier.toUpperCase()} TRUST TIER
                </div>
                
                {userData.stats.trust_score_trend === 'increasing' && (
                  <div className="flex items-center space-x-1 text-green-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>Trending up!</span>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-300">Profile Completion</span>
                  <span className="font-semibold">{userData.profile_completion}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-300">Days on ApexMatch</span>
                  <span className="font-semibold">{userData.stats.days_on_platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-300">Successful Connections</span>
                  <span className="font-semibold">{userData.stats.successful_connections}</span>
                </div>
              </div>

              {/* BGP Confidence */}
              <div className="mt-6 p-4 bg-purple-900 bg-opacity-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold">BGP Confidence</span>
                </div>
                <div className="text-2xl font-bold text-purple-400 mb-1">
                  {Math.round(userData.bgp.confidence * 100)}%
                </div>
                <p className="text-xs text-purple-300">
                  Your behavioral profile is highly accurate and ready for premium matching.
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-black bg-opacity-30 rounded-xl p-1 mb-8">
              {[
                { id: 'overview', label: 'Overview', icon: User },
                { id: 'behavioral', label: 'Behavioral Profile', icon: Brain },
                { id: 'statistics', label: 'Statistics', icon: TrendingUp },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'text-purple-300 hover:text-white hover:bg-white hover:bg-opacity-10'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Profile Information */}
                <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Profile Information</h3>
                    <button
                      onClick={() => setEditing(!editing)}
                      className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span>{editing ? 'Cancel' : 'Edit'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-purple-300 mb-2">
                        <User className="w-4 h-4 inline mr-1" />
                        First Name
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={userData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className="w-full bg-black bg-opacity-30 border border-purple-400 rounded-lg px-3 py-2 text-white"
                        />
                      ) : (
                        <p className="text-white">{userData.firstName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-purple-300 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Age
                      </label>
                      {editing ? (
                        <input
                          type="number"
                          value={userData.age}
                          onChange={(e) => handleInputChange('age', parseInt(e.target.value))}
                          className="w-full bg-black bg-opacity-30 border border-purple-400 rounded-lg px-3 py-2 text-white"
                        />
                      ) : (
                        <p className="text-white">{userData.age}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-purple-300 mb-2">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Location
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={userData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          className="w-full bg-black bg-opacity-30 border border-purple-400 rounded-lg px-3 py-2 text-white"
                        />
                      ) : (
                        <p className="text-white">{userData.location}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-purple-300 mb-2">
                        <Mail className="w-4 h-4 inline mr-1" />
                        Email
                      </label>
                      <p className="text-white">{userData.email}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-purple-300 mb-2">
                      Bio
                    </label>
                    {editing ? (
                      <textarea
                        value={userData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        rows={4}
                        className="w-full bg-black bg-opacity-30 border border-purple-400 rounded-lg px-3 py-2 text-white resize-none"
                        placeholder="Tell others about yourself..."
                      />
                    ) : (
                      <p className="text-white leading-relaxed">{userData.bio}</p>
                    )}
                  </div>

                  {editing && (
                    <div className="mt-6 flex space-x-3">
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 px-6 py-2 rounded-lg font-semibold transition-all flex items-center space-x-2"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Premium Features */}
                {userData.subscription_tier === 'premium' && (
                  <div className="bg-gradient-to-r from-yellow-600 to-amber-600 rounded-2xl p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <Crown className="w-6 h-6" />
                      <h3 className="text-xl font-bold">Premium Member Benefits</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4" />
                        <span>Unlimited matches</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Brain className="w-4 h-4" />
                        <span>AI Wingman access</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4" />
                        <span>High trust tier access</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4" />
                        <span>Advanced insights</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'behavioral' && (
              <div className="space-y-6">
                {/* BGP Overview */}
                <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-6">Your Behavioral Graph Profile</h3>
                  
                  {/* Profile Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <h4 className="font-semibold mb-3 text-purple-300">Communication Style</h4>
                      <p className="text-white mb-2">{userData.bgp.communication_style}</p>
                      <p className="text-sm text-purple-200">You take time to craft thoughtful, meaningful responses</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 text-purple-300">Emotional Style</h4>
                      <p className="text-white mb-2">{userData.bgp.emotional_style}</p>
                      <p className="text-sm text-purple-200">You build trust before sharing deeply</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 text-purple-300">Decision Making</h4>
                      <p className="text-white mb-2">{userData.bgp.decision_style}</p>
                      <p className="text-sm text-purple-200">You weigh options carefully before choosing</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 text-purple-300">Social Energy</h4>
                      <p className="text-white mb-2">{userData.bgp.social_energy}</p>
                      <p className="text-sm text-purple-200">You enjoy both social time and solitude</p>
                    </div>
                  </div>

                  {/* Behavioral Dimensions */}
                  <h4 className="font-semibold mb-4 text-purple-300">Behavioral Dimensions</h4>
                  <div className="space-y-4">
                    {[
                      { key: 'response_speed_avg', label: 'Response Speed', description: 'How quickly you typically respond' },
                      { key: 'conversation_depth_pref', label: 'Conversation Depth', description: 'Preference for meaningful vs casual chat' },
                      { key: 'vulnerability_comfort', label: 'Emotional Openness', description: 'Comfort with sharing personal feelings' },
                      { key: 'empathy_indicators', label: 'Empathy Level', description: 'Ability to understand others\' emotions' },
                      { key: 'attachment_security', label: 'Attachment Security', description: 'Comfort with emotional intimacy' },
                      { key: 'decision_making_speed', label: 'Decision Speed', description: 'How quickly you make decisions' },
                      { key: 'emotional_volatility', label: 'Emotional Stability', description: 'Consistency of emotional state' },
                      { key: 'trust_building_pace', label: 'Trust Building', description: 'How quickly you develop trust' }
                    ].map((dimension) => (
                      <div key={dimension.key} className="bg-black bg-opacity-30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">{dimension.label}</span>
                          <span className="text-purple-400 font-bold">
                            {formatDimension(userData.bgp.dimensions[dimension.key])}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                          <div 
                            className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full"
                            style={{ width: `${formatDimension(userData.bgp.dimensions[dimension.key])}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-purple-300">{dimension.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Growth Insights */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6">
                  <h4 className="font-semibold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Growth Opportunities
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <p><strong>Faster Response Times:</strong> Consider responding a bit more quickly to show engagement</p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <p><strong>Emotional Expression:</strong> You're great at empathy - continue sharing your feelings openly</p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <p><strong>Trust Building:</strong> Your steady approach to trust creates strong foundations</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'statistics' && (
              <div className="space-y-6">
                {/* Connection Stats */}
                <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-6">Connection Statistics</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-400 mb-2">{userData.stats.total_matches}</div>
                      <div className="text-sm text-purple-300">Total Matches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400 mb-2">{userData.stats.successful_connections}</div>
                      <div className="text-sm text-purple-300">Connections Made</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-400 mb-2">{userData.stats.active_conversations}</div>
                      <div className="text-sm text-purple-300">Active Chats</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-pink-400 mb-2">{Math.round(userData.stats.reveal_success_rate * 100)}%</div>
                      <div className="text-sm text-purple-300">Reveal Success</div>
                    </div>
                  </div>

                  {/* Performance Insights */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black bg-opacity-30 rounded-lg p-4">
                      <h4 className="font-semibold mb-3 text-green-400">Strengths</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>High emotional intelligence</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>Excellent at deep conversations</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>Strong trust-building skills</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-black bg-opacity-30 rounded-lg p-4">
                      <h4 className="font-semibold mb-3 text-yellow-400">Areas to Develop</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <span>Response timing consistency</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <span>Initial conversation opening</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <span>Spontaneity in interactions</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Trust Evolution */}
                <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-6">Trust Score Evolution</h3>
                  <div className="bg-black bg-opacity-30 rounded-lg p-4">
                    <div className="flex items-center justify-center space-x-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-400">7.2</div>
                        <div className="text-xs text-purple-300">Starting Score</div>
                      </div>
                      <div className="text-purple-400">→</div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">{userData.trust_score}</div>
                        <div className="text-xs text-purple-300">Current Score</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="inline-flex items-center space-x-1 text-green-400 text-sm">
                        <TrendingUp className="w-4 h-4" />
                        <span>+{userData.trust_score - 7.2} improvement</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Account Settings */}
                <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-6">Account Settings</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-4">Privacy & Visibility</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">Profile Visibility</span>
                            <p className="text-sm text-purple-300">Who can see your profile</p>
                          </div>
                          <button className="bg-green-600 px-4 py-2 rounded-lg text-sm font-semibold">
                            Public
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">Show Online Status</span>
                            <p className="text-sm text-purple-300">Let others see when you're active</p>
                          </div>
                          <button className="bg-purple-600 px-4 py-2 rounded-lg text-sm font-semibold">
                            Enabled
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-4">Matching Preferences</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">Age Range</span>
                            <p className="text-sm text-purple-300">22 - 35 years old</p>
                          </div>
                          <button className="text-purple-400 hover:text-white transition-colors">
                            Edit
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">Distance</span>
                            <p className="text-sm text-purple-300">Within 50 miles</p>
                          </div>
                          <button className="text-purple-400 hover:text-white transition-colors">
                            Edit
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">Minimum Trust Score</span>
                            <p className="text-sm text-purple-300">6.0 or higher</p>
                          </div>
                          <button className="text-purple-400 hover:text-white transition-colors">
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-4">Notifications</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">New Matches</span>
                          <button className="bg-green-600 px-4 py-2 rounded-lg text-sm font-semibold">
                            On
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Messages</span>
                          <button className="bg-green-600 px-4 py-2 rounded-lg text-sm font-semibold">
                            On
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Reveal Requests</span>
                          <button className="bg-green-600 px-4 py-2 rounded-lg text-sm font-semibold">
                            On
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-4 text-red-300">Danger Zone</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Deactivate Account</span>
                        <p className="text-sm text-red-300">Temporarily hide your profile</p>
                      </div>
                      <button className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                        Deactivate
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Delete Account</span>
                        <p className="text-sm text-red-300">Permanently delete your account and data</p>
                      </div>
                      <button className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;