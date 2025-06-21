import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, Eye, BarChart3, Sparkles, Info, Star, Heart } from 'lucide-react';

const BGPDisplay = ({ 
  userBGP, 
  showComparison = false, 
  comparisonBGP = null,
  timeframe = '30d' // 7d, 30d, 90d, all
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hoveredTrait, setHoveredTrait] = useState(null);

  useEffect(() => {
    // Animate progress bars
    const timer = setTimeout(() => {
      setAnimationProgress(100);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const bgpCategories = {
    all: 'All Traits',
    emotional: 'Emotional Intelligence',
    communication: 'Communication Style',
    social: 'Social Patterns',
    decision: 'Decision Making',
    relationship: 'Relationship Approach'
  };

  const bgpTraits = [
    // Emotional Intelligence
    { 
      id: 'emotional_depth', 
      name: 'Emotional Depth', 
      category: 'emotional',
      value: userBGP?.emotional_depth || 78,
      description: 'How deeply you process emotions and experiences',
      insights: 'You engage with emotions thoughtfully, taking time to understand their deeper meanings.',
      comparison: comparisonBGP?.emotional_depth || null
    },
    { 
      id: 'vulnerability_comfort', 
      name: 'Vulnerability Comfort', 
      category: 'emotional',
      value: userBGP?.vulnerability_comfort || 85,
      description: 'Willingness to share personal thoughts and feelings',
      insights: 'You create safe spaces for deep sharing and authentic connection.',
      comparison: comparisonBGP?.vulnerability_comfort || null
    },
    { 
      id: 'emotional_stability', 
      name: 'Emotional Stability', 
      category: 'emotional',
      value: userBGP?.emotional_stability || 72,
      description: 'Consistency in emotional responses and mood',
      insights: 'You maintain emotional balance while still allowing yourself to feel deeply.',
      comparison: comparisonBGP?.emotional_stability || null
    },
    
    // Communication Style
    { 
      id: 'response_thoughtfulness', 
      name: 'Response Thoughtfulness', 
      category: 'communication',
      value: userBGP?.response_thoughtfulness || 89,
      description: 'How carefully you craft your responses',
      insights: 'You take time to consider your words, creating meaningful conversations.',
      comparison: comparisonBGP?.response_thoughtfulness || null
    },
    { 
      id: 'conversation_depth', 
      name: 'Conversation Depth', 
      category: 'communication',
      value: userBGP?.conversation_depth || 92,
      description: 'Preference for deep vs surface-level discussions',
      insights: 'You naturally steer conversations toward meaningful topics.',
      comparison: comparisonBGP?.conversation_depth || null
    },
    { 
      id: 'humor_style', 
      name: 'Humor Alignment', 
      category: 'communication',
      value: userBGP?.humor_style || 76,
      description: 'Your unique style of humor and wit',
      insights: 'You use humor to connect and lighten moments appropriately.',
      comparison: comparisonBGP?.humor_style || null
    },
    
    // Social Patterns
    { 
      id: 'social_energy', 
      name: 'Social Energy', 
      category: 'social',
      value: userBGP?.social_energy || 68,
      description: 'How you engage in social interactions',
      insights: 'You balance social engagement with meaningful one-on-one connections.',
      comparison: comparisonBGP?.social_energy || null
    },
    { 
      id: 'conflict_resolution', 
      name: 'Conflict Resolution', 
      category: 'social',
      value: userBGP?.conflict_resolution || 81,
      description: 'How you handle disagreements and tension',
      insights: 'You approach conflicts with empathy and seek understanding.',
      comparison: comparisonBGP?.conflict_resolution || null
    },
    
    // Decision Making
    { 
      id: 'decision_speed', 
      name: 'Decision Speed', 
      category: 'decision',
      value: userBGP?.decision_speed || 73,
      description: 'How quickly you make important decisions',
      insights: 'You balance careful consideration with timely decision-making.',
      comparison: comparisonBGP?.decision_speed || null
    },
    { 
      id: 'risk_tolerance', 
      name: 'Risk Tolerance', 
      category: 'decision',
      value: userBGP?.risk_tolerance || 67,
      description: 'Comfort level with uncertainty and new experiences',
      insights: 'You thoughtfully assess risks while remaining open to growth.',
      comparison: comparisonBGP?.risk_tolerance || null
    },
    
    // Relationship Approach
    { 
      id: 'commitment_readiness', 
      name: 'Commitment Readiness', 
      category: 'relationship',
      value: userBGP?.commitment_readiness || 88,
      description: 'Readiness for serious relationship development',
      insights: 'You approach relationships with intentionality and genuine commitment.',
      comparison: comparisonBGP?.commitment_readiness || null
    },
    { 
      id: 'intimacy_pace', 
      name: 'Intimacy Pace', 
      category: 'relationship',
      value: userBGP?.intimacy_pace || 79,
      description: 'How you prefer emotional intimacy to develop',
      insights: 'You build intimacy thoughtfully, allowing natural progression.',
      comparison: comparisonBGP?.intimacy_pace || null
    }
  ];

  const filteredTraits = selectedCategory === 'all' 
    ? bgpTraits 
    : bgpTraits.filter(trait => trait.category === selectedCategory);

  const getTraitColor = (value) => {
    if (value >= 85) return 'from-green-500 to-emerald-500';
    if (value >= 70) return 'from-blue-500 to-cyan-500';
    if (value >= 55) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getCompatibilityScore = (userValue, comparisonValue) => {
    if (!comparisonValue) return null;
    const difference = Math.abs(userValue - comparisonValue);
    return Math.max(0, 100 - (difference * 2)); // Higher compatibility = lower difference
  };

  const overallScore = Math.round(bgpTraits.reduce((sum, trait) => sum + trait.value, 0) / bgpTraits.length);

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-3 rounded-xl">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Behavioral Graph Profile</h2>
              <p className="text-gray-300">Your unique behavioral and emotional patterns</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{overallScore}</div>
            <div className="text-gray-300 text-sm">Overall Score</div>
          </div>
        </div>

        {/* Time Period Selector */}
        <div className="flex items-center space-x-2 mt-4">
          <span className="text-white text-sm">Timeframe:</span>
          {['7d', '30d', '90d', 'all'].map((period) => (
            <button
              key={period}
              className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 ${
                timeframe === period
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {period === 'all' ? 'All Time' : period.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filters */}
      <div className="p-6 border-b border-white/10">
        <div className="flex flex-wrap gap-2">
          {Object.entries(bgpCategories).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                selectedCategory === key
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* BGP Traits */}
      <div className="p-6">
        <div className="space-y-4">
          {filteredTraits.map((trait, index) => (
            <div
              key={trait.id}
              className="bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 transition-all duration-300 cursor-pointer"
              onMouseEnter={() => setHoveredTrait(trait.id)}
              onMouseLeave={() => setHoveredTrait(null)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-white font-medium">{trait.name}</span>
                  <div className="group relative">
                    <Info className="w-4 h-4 text-gray-400 hover:text-white cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-black/80 text-white text-xs rounded-lg p-2 whitespace-nowrap z-10">
                      {trait.description}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {showComparison && trait.comparison && (
                    <div className="text-right">
                      <div className="text-gray-300 text-sm">
                        Compatibility: {getCompatibilityScore(trait.value, trait.comparison)}%
                      </div>
                    </div>
                  )}
                  <div className="text-right">
                    <div className="text-white font-bold">{trait.value}</div>
                    <div className="text-gray-400 text-xs">/ 100</div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/20 rounded-full h-3 mb-3 overflow-hidden">
                <div 
                  className={`bg-gradient-to-r ${getTraitColor(trait.value)} h-3 rounded-full transition-all duration-1000 ease-out relative`}
                  style={{ 
                    width: animationProgress ? `${trait.value}%` : '0%',
                    transitionDelay: `${index * 100}ms`
                  }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>

              {/* Comparison Bar */}
              {showComparison && trait.comparison && (
                <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                  <div 
                    className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full opacity-60"
                    style={{ width: `${trait.comparison}%` }}
                  ></div>
                </div>
              )}

              {/* Insights */}
              {hoveredTrait === trait.id && (
                <div className="mt-3 p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20 animate-fade-in">
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-300 text-sm font-medium">AI Insight</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{trait.insights}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* BGP Evolution Chart */}
      <div className="p-6 border-t border-white/10">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">BGP Evolution</h3>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">+12</div>
              <div className="text-gray-300 text-sm">Points This Month</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">89%</div>
              <div className="text-gray-300 text-sm">Consistency Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">24</div>
              <div className="text-gray-300 text-sm">Traits Improved</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-pink-400">Top 15%</div>
              <div className="text-gray-300 text-sm">User Percentile</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="p-6 border-t border-white/10">
        <div className="flex items-center space-x-2 mb-4">
          <Star className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Growth Opportunities</h3>
        </div>
        
        <div className="space-y-3">
          {bgpTraits
            .filter(trait => trait.value < 75)
            .slice(0, 3)
            .map((trait, index) => (
              <div key={trait.id} className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">{trait.name}</div>
                    <div className="text-yellow-300 text-sm">Consider exploring deeper {trait.category} patterns</div>
                  </div>
                  <div className="text-yellow-400 font-bold">{trait.value}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default BGPDisplay;