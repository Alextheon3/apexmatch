import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Heart, Brain, Sparkles, MessageCircle, Clock, Lock, Star } from 'lucide-react';

const BlindProfile = ({ 
  profile, 
  emotionalConnection = 0, 
  canReveal = false, 
  onRevealRequest, 
  onStartChat,
  showEmotionalInsights = true 
}) => {
  const [hoveredTrait, setHoveredTrait] = useState(null);
  const [emotionalPulse, setEmotionalPulse] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setEmotionalPulse(prev => (prev + 1) % 4);
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const getRevealProgress = () => {
    return Math.min(emotionalConnection, 100);
  };

  const getConnectionLevel = () => {
    if (emotionalConnection >= 90) return { level: 'Soul Deep', color: 'text-purple-300', icon: Sparkles };
    if (emotionalConnection >= 70) return { level: 'Heart Connected', color: 'text-pink-300', icon: Heart };
    if (emotionalConnection >= 50) return { level: 'Mind Sync', color: 'text-blue-300', icon: Brain };
    if (emotionalConnection >= 30) return { level: 'Building Bond', color: 'text-green-300', icon: MessageCircle };
    return { level: 'Getting to Know', color: 'text-gray-300', icon: Clock };
  };

  const connectionLevel = getConnectionLevel();
  const ConnectionIcon = connectionLevel.icon;

  const behavioralTraits = [
    { 
      name: 'Emotional Depth', 
      compatibility: profile.emotional_depth_match || 0,
      description: 'How deeply you both process emotions and experiences'
    },
    { 
      name: 'Communication Style', 
      compatibility: profile.communication_match || 0,
      description: 'Your conversation rhythms and expression patterns'
    },
    { 
      name: 'Life Pace', 
      compatibility: profile.life_pace_match || 0,
      description: 'How you both approach time and life decisions'
    },
    { 
      name: 'Vulnerability Comfort', 
      compatibility: profile.vulnerability_match || 0,
      description: 'Openness to sharing personal thoughts and feelings'
    },
    { 
      name: 'Humor Alignment', 
      compatibility: profile.humor_match || 0,
      description: 'What makes you both laugh and feel joy'
    }
  ];

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
      
      {/* Header with Connection Status */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${
              emotionalPulse === 0 ? 'bg-pink-400' : 
              emotionalPulse === 1 ? 'bg-purple-400' : 
              emotionalPulse === 2 ? 'bg-blue-400' : 'bg-green-400'
            }`}></div>
            <ConnectionIcon className={`w-5 h-5 ${connectionLevel.color}`} />
            <span className={`font-medium ${connectionLevel.color}`}>
              {connectionLevel.level}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {canReveal ? <Eye className="w-5 h-5 text-green-400" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
            <span className="text-white text-sm font-medium">
              {canReveal ? 'Ready to Reveal' : 'Building Connection'}
            </span>
          </div>
        </div>

        {/* Emotional Connection Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm">Emotional Connection</span>
            <span className="text-white font-bold">{Math.round(emotionalConnection)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div 
              className="h-3 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-full transition-all duration-1000 relative"
              style={{ width: `${getRevealProgress()}%` }}
            >
              <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-300">
            {canReveal 
              ? "🎉 You've unlocked the reveal ritual!" 
              : `${70 - Math.round(emotionalConnection)}% more connection needed to reveal`
            }
          </div>
        </div>
      </div>

      {/* Anonymous Avatar Section */}
      <div className="relative h-48 bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center overflow-hidden">
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 w-8 h-8 border border-white rounded-full animate-pulse"></div>
          <div className="absolute top-12 right-8 w-6 h-6 border border-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute bottom-8 left-12 w-4 h-4 border border-white rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-4 right-4 w-10 h-10 border border-white rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>

        {/* Anonymous Avatar */}
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 mx-auto animate-pulse">
            <span className="text-3xl font-bold text-white">
              {profile.anonymous_initial || '?'}
            </span>
          </div>
          
          <h3 className="text-xl font-bold text-white mb-1">
            {profile.anonymous_name || 'Someone Special'}
          </h3>
          
          <div className="flex items-center justify-center space-x-3 text-gray-300 text-sm">
            <span>{profile.age} years old</span>
            <span>•</span>
            <span>{profile.distance}km away</span>
          </div>

          {/* Blur overlay if not revealed */}
          {!canReveal && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl px-4 py-2 flex items-center space-x-2">
                <Lock className="w-4 h-4 text-white" />
                <span className="text-white text-sm">Identity Protected</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Behavioral Compatibility Section */}
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="w-5 h-5 text-purple-400" />
          <h4 className="text-lg font-semibold text-white">Behavioral Harmony</h4>
          <div className="flex items-center space-x-1 ml-auto">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-white font-bold">{profile.overall_compatibility || 0}%</span>
          </div>
        </div>

        <div className="space-y-3">
          {behavioralTraits.map((trait, index) => (
            <div
              key={index}
              className="bg-white/5 hover:bg-white/10 rounded-xl p-3 transition-all duration-300 cursor-pointer"
              onMouseEnter={() => setHoveredTrait(index)}
              onMouseLeave={() => setHoveredTrait(null)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-medium">{trait.name}</span>
                <span className={`text-sm font-bold ${
                  trait.compatibility >= 80 ? 'text-green-400' :
                  trait.compatibility >= 60 ? 'text-blue-400' :
                  trait.compatibility >= 40 ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  {trait.compatibility}%
                </span>
              </div>
              
              <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    trait.compatibility >= 80 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                    trait.compatibility >= 60 ? 'bg-gradient-to-r from-blue-400 to-cyan-500' :
                    trait.compatibility >= 40 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                    'bg-gradient-to-r from-gray-400 to-gray-500'
                  }`}
                  style={{ width: `${trait.compatibility}%` }}
                ></div>
              </div>
              
              {hoveredTrait === index && (
                <p className="text-gray-300 text-xs leading-relaxed animate-fade-in">
                  {trait.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Emotional Insights */}
      {showEmotionalInsights && (
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-xl p-4 border border-pink-500/20">
            <div className="flex items-center space-x-2 mb-3">
              <Heart className="w-5 h-5 text-pink-400" />
              <span className="text-white font-medium">Connection Insights</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-lg font-bold text-pink-400">
                  {profile.conversation_count || 0}
                </div>
                <div className="text-xs text-gray-300">Conversations</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-lg font-bold text-purple-400">
                  {profile.vulnerability_moments || 0}
                </div>
                <div className="text-xs text-gray-300">Vulnerable Shares</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-lg font-bold text-blue-400">
                  {profile.laugh_moments || 0}
                </div>
                <div className="text-xs text-gray-300">Laugh Moments</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-lg font-bold text-green-400">
                  {profile.deep_questions || 0}
                </div>
                <div className="text-xs text-gray-300">Deep Questions</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-6 border-t border-white/10 flex space-x-3">
        <button
          onClick={onStartChat}
          className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Continue Chatting</span>
        </button>
        
        {canReveal ? (
          <button
            onClick={onRevealRequest}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>Request Reveal</span>
          </button>
        ) : (
          <button
            disabled
            className="flex-1 bg-gray-500/20 text-gray-400 py-3 rounded-xl font-medium cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Lock className="w-5 h-5" />
            <span>Keep Building</span>
          </button>
        )}
      </div>

      {/* Reveal Readiness Indicator */}
      {emotionalConnection >= 65 && emotionalConnection < 70 && (
        <div className="px-6 pb-6">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center space-x-3">
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            <div>
              <div className="text-white text-sm font-medium">Almost ready to reveal!</div>
              <div className="text-yellow-300 text-xs">Share a few more meaningful moments together</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlindProfile;