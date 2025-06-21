import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, Eye, BarChart3, Sparkles, Clock, Heart, MessageCircle, Star, Target } from 'lucide-react';

const BehaviorInsights = ({ 
  userBehavior, 
  timeframe = '30d',
  showRecommendations = true 
}) => {
  const [selectedInsight, setSelectedInsight] = useState('communication');
  const [animationDelay, setAnimationDelay] = useState(0);

  useEffect(() => {
    setAnimationDelay(0);
    const timer = setTimeout(() => setAnimationDelay(100), 300);
    return () => clearTimeout(timer);
  }, [selectedInsight]);

  const insightCategories = {
    communication: {
      title: 'Communication Patterns',
      icon: MessageCircle,
      color: 'from-blue-500 to-cyan-500',
      insights: [
        {
          title: 'Response Rhythm',
          value: userBehavior?.response_rhythm || 'Thoughtful',
          description: 'You typically respond within 2-4 hours, showing consideration for your words',
          score: 85,
          trend: '+5% this month'
        },
        {
          title: 'Conversation Depth',
          value: userBehavior?.conversation_depth || 'Deep',
          description: 'You consistently steer conversations toward meaningful topics',
          score: 92,
          trend: '+8% this month'
        },
        {
          title: 'Question Asking',
          value: userBehavior?.question_frequency || 'High',
          description: 'You ask 3.2 meaningful questions per conversation on average',
          score: 88,
          trend: '+2% this month'
        }
      ]
    },
    emotional: {
      title: 'Emotional Intelligence',
      icon: Heart,
      color: 'from-pink-500 to-purple-500',
      insights: [
        {
          title: 'Vulnerability Sharing',
          value: userBehavior?.vulnerability_level || 'Authentic',
          description: 'You share personal stories and emotions at an appropriate pace',
          score: 87,
          trend: '+12% this month'
        },
        {
          title: 'Empathy Expression',
          value: userBehavior?.empathy_score || 'High',
          description: 'You consistently acknowledge and validate others\' feelings',
          score: 94,
          trend: '+3% this month'
        },
        {
          title: 'Emotional Support',
          value: userBehavior?.support_giving || 'Caring',
          description: 'You offer comfort and encouragement when matches share difficulties',
          score: 90,
          trend: '+6% this month'
        }
      ]
    },
    social: {
      title: 'Social Dynamics',
      icon: Eye,
      color: 'from-green-500 to-emerald-500',
      insights: [
        {
          title: 'Conflict Resolution',
          value: userBehavior?.conflict_style || 'Collaborative',
          description: 'You address disagreements with understanding and seek solutions',
          score: 81,
          trend: '+4% this month'
        },
        {
          title: 'Boundary Setting',
          value: userBehavior?.boundary_clarity || 'Clear',
          description: 'You communicate your needs and limits respectfully',
          score: 89,
          trend: '+7% this month'
        },
        {
          title: 'Social Energy',
          value: userBehavior?.energy_level || 'Balanced',
          description: 'You balance engaging conversation with giving space',
          score: 76,
          trend: '+1% this month'
        }
      ]
    },
    dating: {
      title: 'Dating Approach',
      icon: Target,
      color: 'from-purple-500 to-indigo-500',
      insights: [
        {
          title: 'Commitment Signals',
          value: userBehavior?.commitment_readiness || 'Intentional',
          description: 'You communicate genuine interest in meaningful relationships',
          score: 91,
          trend: '+9% this month'
        },
        {
          title: 'Date Planning',
          value: userBehavior?.planning_style || 'Thoughtful',
          description: 'You suggest creative, personalized date ideas based on shared interests',
          score: 84,
          trend: '+5% this month'
        },
        {
          title: 'Follow-through',
          value: userBehavior?.reliability_score || 'Consistent',
          description: 'You follow through on plans and commitments reliably',
          score: 93,
          trend: '+2% this month'
        }
      ]
    }
  };

  const behaviorPredictions = [
    {
      pattern: 'Deep Conversationalist',
      likelihood: 95,
      description: 'You create meaningful connections through thoughtful dialogue',
      impact: 'Attracts partners seeking emotional intimacy'
    },
    {
      pattern: 'Emotionally Intelligent',
      likelihood: 92,
      description: 'You understand and respond to emotional cues effectively',
      impact: 'Builds trust and psychological safety quickly'
    },
    {
      pattern: 'Relationship-Focused',
      likelihood: 88,
      description: 'Your behavior indicates genuine interest in long-term partnership',
      impact: 'Filters for serious relationship seekers'
    },
    {
      pattern: 'Growth-Oriented',
      likelihood: 85,
      description: 'You continuously improve your relationship skills',
      impact: 'Appeals to partners who value personal development'
    }
  ];

  const weeklyPatterns = [
    { day: 'Mon', activity: 65, quality: 78 },
    { day: 'Tue', activity: 72, quality: 82 },
    { day: 'Wed', activity: 68, quality: 85 },
    { day: 'Thu', activity: 78, quality: 88 },
    { day: 'Fri', activity: 85, quality: 79 },
    { day: 'Sat', activity: 92, quality: 90 },
    { day: 'Sun', activity: 58, quality: 95 }
  ];

  const currentCategory = insightCategories[selectedInsight];
  const CategoryIcon = currentCategory.icon;

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 p-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-3 rounded-xl">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Behavior Insights</h2>
            <p className="text-gray-300">AI analysis of your relationship patterns</p>
          </div>
        </div>
      </div>

      {/* Category Selector */}
      <div className="p-6 border-b border-white/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(insightCategories).map(([key, category]) => {
            const Icon = category.icon;
            return (
              <button
                key={key}
                onClick={() => setSelectedInsight(key)}
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  selectedInsight === key
                    ? `bg-gradient-to-r ${category.color} text-white border-transparent`
                    : 'bg-white/5 text-white/70 border-white/20 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-medium text-center">{category.title}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Category Insights */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center space-x-3 mb-6">
          <div className={`bg-gradient-to-r ${currentCategory.color} p-3 rounded-xl`}>
            <CategoryIcon className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">{currentCategory.title}</h3>
        </div>

        <div className="space-y-4">
          {currentCategory.insights.map((insight, index) => (
            <div
              key={index}
              className="bg-white/5 rounded-xl p-4 border border-white/10 transform transition-all duration-500"
              style={{ 
                transitionDelay: `${animationDelay + (index * 100)}ms`,
                opacity: animationDelay ? 1 : 0,
                transform: animationDelay ? 'translateY(0)' : 'translateY(20px)'
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-white font-medium">{insight.title}</div>
                  <div className={`text-sm font-semibold bg-gradient-to-r ${currentCategory.color} bg-clip-text text-transparent`}>
                    {insight.value}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-lg">{insight.score}</div>
                  <div className="text-green-400 text-sm">{insight.trend}</div>
                </div>
              </div>
              
              <div className="w-full bg-white/20 rounded-full h-2 mb-3">
                <div 
                  className={`bg-gradient-to-r ${currentCategory.color} h-2 rounded-full transition-all duration-1000`}
                  style={{ width: `${insight.score}%` }}
                ></div>
              </div>
              
              <p className="text-gray-300 text-sm leading-relaxed">{insight.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Activity Pattern */}
      <div className="p-6 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <span>Weekly Interaction Pattern</span>
        </h3>
        
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-end justify-between space-x-2 h-32 mb-4">
            {weeklyPatterns.map((day, index) => (
              <div key={day.day} className="flex-1 flex flex-col items-center">
                <div className="flex flex-col space-y-1 flex-1 justify-end">
                  <div 
                    className="bg-gradient-to-t from-blue-500 to-cyan-500 rounded-t w-full transition-all duration-1000"
                    style={{ height: `${(day.activity / 100) * 80}%` }}
                    title={`Activity: ${day.activity}%`}
                  ></div>
                  <div 
                    className="bg-gradient-to-t from-purple-500 to-pink-500 rounded-t w-full transition-all duration-1000"
                    style={{ height: `${(day.quality / 100) * 60}%` }}
                    title={`Quality: ${day.quality}%`}
                  ></div>
                </div>
                <div className="text-gray-300 text-xs mt-2">{day.day}</div>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded"></div>
              <span className="text-gray-300">Activity Level</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded"></div>
              <span className="text-gray-300">Conversation Quality</span>
            </div>
          </div>
        </div>
      </div>

      {/* Behavior Predictions */}
      <div className="p-6 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <span>Your Behavioral Patterns</span>
        </h3>
        
        <div className="space-y-3">
          {behaviorPredictions.map((prediction, index) => (
            <div key={index} className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-4 border border-yellow-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">{prediction.pattern}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-12 bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full"
                      style={{ width: `${prediction.likelihood}%` }}
                    ></div>
                  </div>
                  <span className="text-yellow-400 text-sm font-bold">{prediction.likelihood}%</span>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-2">{prediction.description}</p>
              <div className="flex items-center space-x-2">
                <Star className="w-3 h-3 text-yellow-400" />
                <span className="text-yellow-300 text-xs">{prediction.impact}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {showRecommendations && (
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span>Growth Opportunities</span>
          </h3>
          
          <div className="space-y-3">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-4 h-4 text-green-400" />
                <span className="text-white font-medium">Social Energy Balance</span>
              </div>
              <p className="text-gray-300 text-sm mb-2">
                Consider engaging more consistently on weekdays to show reliable interest.
              </p>
              <div className="text-green-400 text-xs">+3-5 points potential improvement</div>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-white font-medium">Response Timing</span>
              </div>
              <p className="text-gray-300 text-sm mb-2">
                Your thoughtful responses are great! Consider sending a quick acknowledgment if you need time to craft a detailed reply.
              </p>
              <div className="text-blue-400 text-xs">+2-4 points potential improvement</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BehaviorInsights;