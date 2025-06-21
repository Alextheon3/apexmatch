import React, { useState, useEffect } from 'react';
import { Sparkles, X, MessageSquare, Heart, Zap } from 'lucide-react';

const AIWingman = ({ match, onClose, onUseStarter }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [conversationStarters, setConversationStarters] = useState([]);
  const [selectedStarter, setSelectedStarter] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    generateConversationStarters();
  }, [match]);

  const generateConversationStarters = async () => {
    setIsLoading(true);
    
    // Simulate AI generation with realistic data
    setTimeout(() => {
      const starters = [
        {
          id: 1,
          text: `I noticed you both love ${match?.shared_interests?.[0] || 'adventure'}! What's the most spontaneous thing you've done recently?`,
          reason: "Shared interest connection",
          type: "interest",
          confidence: 94
        },
        {
          id: 2,
          text: `Your conversation patterns show you're both deep thinkers. What's a question that's been on your mind lately?`,
          reason: "Behavioral compatibility match",
          type: "behavioral",
          confidence: 89
        },
        {
          id: 3,
          text: `Based on your emotional rhythm, you might enjoy exploring: What's something that always makes you smile, even on tough days?`,
          reason: "Emotional resonance analysis",
          type: "emotional",
          confidence: 91
        }
      ];
      
      setConversationStarters(starters);
      setIsLoading(false);
    }, 2000);
  };

  const handleUseStarter = (starter) => {
    setSelectedStarter(starter);
    setIsAnimating(true);
    
    setTimeout(() => {
      onUseStarter(starter.text);
      setIsAnimating(false);
      setTimeout(() => {
        onClose();
      }, 500);
    }, 1000);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'interest': return <Heart className="w-4 h-4" />;
      case 'behavioral': return <Zap className="w-4 h-4" />;
      case 'emotional': return <Sparkles className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'interest': return 'from-pink-500 to-rose-500';
      case 'behavioral': return 'from-blue-500 to-cyan-500';
      case 'emotional': return 'from-purple-500 to-indigo-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 w-full max-w-2xl transform transition-all duration-500 ${
        isAnimating ? 'scale-110 opacity-0' : 'scale-100 opacity-100'
      }`}>
        
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-2xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">AI Wingman</h2>
                <p className="text-gray-300 text-sm">Personalized conversation starters</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500/30 border-t-purple-500 mx-auto mb-4"></div>
                <Sparkles className="w-6 h-6 text-purple-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Analyzing your connection...</h3>
              <p className="text-gray-300">
                AI is studying your behavioral compatibility and shared interests to craft the perfect ice breaker.
              </p>
            </div>
          ) : (
            <>
              {/* Match Insights */}
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Connection Analysis</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{match?.compatibility_score || 89}%</div>
                    <div className="text-gray-300 text-sm">Behavioral Match</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-pink-400">{match?.shared_interests?.length || 3}</div>
                    <div className="text-gray-300 text-sm">Shared Interests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{match?.emotional_connection_score || 72}%</div>
                    <div className="text-gray-300 text-sm">Emotional Sync</div>
                  </div>
                </div>
              </div>

              {/* Conversation Starters */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">✨ Recommended Conversation Starters</h3>
                
                {conversationStarters.map((starter, index) => (
                  <div
                    key={starter.id}
                    className={`bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${
                      selectedStarter?.id === starter.id ? 'ring-2 ring-purple-500' : ''
                    }`}
                    onClick={() => handleUseStarter(starter)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`bg-gradient-to-r ${getTypeColor(starter.type)} p-2 rounded-lg flex-shrink-0`}>
                        {getTypeIcon(starter.type)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm font-medium">{starter.reason}</span>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-green-400 text-sm">{starter.confidence}% match</span>
                          </div>
                        </div>
                        
                        <p className="text-white leading-relaxed">{starter.text}</p>
                        
                        <button className="mt-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300">
                          Use This Starter
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Note */}
              <div className="mt-6 bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                <div className="flex items-center space-x-2 text-blue-400 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-medium text-sm">Premium Feature</span>
                </div>
                <p className="text-gray-300 text-sm">
                  AI Wingman disappears after you choose a starter, letting you build authentic connection naturally.
                  The AI has analyzed {match?.messages_exchanged || 247} messages to understand your unique compatibility.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIWingman;