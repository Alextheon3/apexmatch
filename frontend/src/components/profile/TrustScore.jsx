import React, { useState, useEffect } from 'react';
import { Shield, TrendingUp, TrendingDown, Award, AlertTriangle, Star, Crown, Users, Heart } from 'lucide-react';

const TrustScore = ({ 
  user,
  showDetails = true,
  showHistory = false,
  size = 'normal' // compact, normal, detailed
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  const trustScore = user?.trust_score || 85;
  const previousScore = user?.previous_trust_score || 82;
  const trend = trustScore - previousScore;

  useEffect(() => {
    // Animate score counter
    const duration = 2000;
    const steps = 60;
    const increment = trustScore / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= trustScore) {
        setAnimatedScore(trustScore);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [trustScore]);

  const getTrustTier = (score) => {
    if (score >= 95) return { 
      name: 'Elite', 
      color: 'from-purple-500 to-indigo-600', 
      icon: Crown,
      description: 'Exceptional trustworthiness and relationship standards',
      perks: ['VIP matching queue', 'Premium features included', 'Priority support', 'Elite events access']
    };
    if (score >= 85) return { 
      name: 'Trusted', 
      color: 'from-green-500 to-emerald-600', 
      icon: Award,
      description: 'Consistently reliable and respectful behavior',
      perks: ['Higher quality matches', 'Extended chat limits', 'Verified badge', 'Trust-based rewards']
    };
    if (score >= 70) return { 
      name: 'Reliable', 
      color: 'from-blue-500 to-cyan-600', 
      icon: Shield,
      description: 'Good relationship habits with room for growth',
      perks: ['Standard matching', 'Regular features', 'Growth guidance', 'Improvement tracking']
    };
    if (score >= 50) return { 
      name: 'Building', 
      color: 'from-yellow-500 to-orange-500', 
      icon: TrendingUp,
      description: 'Developing better relationship patterns',
      perks: ['Reformation program', 'Behavioral coaching', 'Trust challenges', 'Weekly check-ins']
    };
    return { 
      name: 'Challenged', 
      color: 'from-red-500 to-pink-500', 
      icon: AlertTriangle,
      description: 'Needs significant improvement in relationship behavior',
      perks: ['Limited matching', 'Required coaching', 'Supervised interactions', 'Redemption path']
    };
  };

  const trustTier = getTrustTier(trustScore);
  const TierIcon = trustTier.icon;

  const trustFactors = [
    {
      name: 'Response Consistency',
      score: user?.response_consistency || 88,
      weight: 25,
      description: 'How reliably you respond to messages'
    },
    {
      name: 'Ghosting Behavior',
      score: user?.ghosting_score || 92,
      weight: 30,
      description: 'Respectful conversation endings vs disappearing'
    },
    {
      name: 'Profile Authenticity',
      score: user?.authenticity_score || 95,
      weight: 20,
      description: 'Honesty in profile information and photos'
    },
    {
      name: 'Conversation Quality',
      score: user?.conversation_quality || 82,
      weight: 15,
      description: 'Meaningful engagement vs superficial chat'
    },
    {
      name: 'Boundary Respect',
      score: user?.boundary_respect || 90,
      weight: 10,
      description: 'Respecting others\' comfort levels and limits'
    }
  ];

  const trustHistory = [
    { date: '2024-05', score: 78 },
    { date: '2024-06', score: 80 },
    { date: '2024-07', score: 82 },
    { date: '2024-08', score: 85 },
    { date: '2024-09', score: 85 },
  ];

  if (size === 'compact') {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${trustTier.color} flex items-center justify-center`}>
            <TierIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-white font-semibold">Trust Score: {animatedScore}%</div>
            <div className="text-gray-300 text-sm">{trustTier.name} Status</div>
          </div>
          {trend !== 0 && (
            <div className={`flex items-center space-x-1 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="text-sm font-medium">{Math.abs(trend)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
      
      {/* Header */}
      <div className={`bg-gradient-to-r ${trustTier.color.replace('to-', 'to-').replace('500', '500/20').replace('600', '600/20')} p-6 border-b border-white/10`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${trustTier.color} flex items-center justify-center relative`}>
              <TierIcon className="w-8 h-8 text-white" />
              {trustTier.name === 'Elite' && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Crown className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Trust Score</h2>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r ${trustTier.color}`}>
                  {trustTier.name}
                </span>
                {trend !== 0 && (
                  <div className={`flex items-center space-x-1 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="text-sm font-medium">{trend > 0 ? '+' : ''}{trend}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Animated Score Display */}
          <div className="text-center">
            <div className="text-5xl font-bold text-white">{animatedScore}</div>
            <div className="text-gray-300">/ 100</div>
          </div>
        </div>

        <p className="text-gray-300 mt-4">{trustTier.description}</p>
      </div>

      {/* Trust Level Benefits */}
      {showDetails && (
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Star className="w-5 h-5 text-yellow-400" />
            <span>Your Trust Benefits</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {trustTier.perks.map((perk, index) => (
              <div key={index} className="bg-white/5 rounded-xl p-3 flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-300">{perk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trust Factor Breakdown */}
      {showDetails && (
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Trust Factor Breakdown</h3>
          
          <div className="space-y-4">
            {trustFactors.map((factor, index) => (
              <div key={index} className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">{factor.name}</span>
                    <span className="text-gray-400 text-sm">({factor.weight}%)</span>
                  </div>
                  <span className="text-white font-bold">{factor.score}</span>
                </div>
                
                <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                  <div 
                    className={`bg-gradient-to-r ${
                      factor.score >= 90 ? 'from-green-500 to-emerald-500' :
                      factor.score >= 80 ? 'from-blue-500 to-cyan-500' :
                      factor.score >= 70 ? 'from-yellow-500 to-orange-500' :
                      'from-red-500 to-pink-500'
                    } h-2 rounded-full transition-all duration-1000`}
                    style={{ width: `${factor.score}%` }}
                  ></div>
                </div>
                
                <p className="text-gray-400 text-sm">{factor.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trust Score History */}
      {showHistory && (
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Trust Evolution</h3>
            
            <div className="flex space-x-2">
              {['7d', '30d', '90d', '1y'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 ${
                    selectedPeriod === period
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          
          {/* Simple Chart Representation */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-end space-x-2 h-32">
              {trustHistory.map((point, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="bg-gradient-to-t from-purple-500 to-pink-500 rounded-t w-full transition-all duration-1000"
                    style={{ height: `${(point.score / 100) * 100}%` }}
                  ></div>
                  <div className="text-gray-400 text-xs mt-2">{point.date}</div>
                  <div className="text-white text-sm font-medium">{point.score}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Improvement Suggestions */}
      {trustScore < 90 && showDetails && (
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span>Ways to Improve</span>
          </h3>
          
          <div className="space-y-3">
            {trustFactors
              .filter(factor => factor.score < 90)
              .sort((a, b) => a.score - b.score)
              .slice(0, 3)
              .map((factor, index) => (
                <div key={index} className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{factor.name}</span>
                    <span className="text-green-400">+{5 - index} points potential</span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    {factor.name === 'Response Consistency' && 'Reply to messages within 24 hours to show reliability'}
                    {factor.name === 'Ghosting Behavior' && 'Always let matches know if you\'re no longer interested instead of disappearing'}
                    {factor.name === 'Profile Authenticity' && 'Keep your profile photos and information current and honest'}
                    {factor.name === 'Conversation Quality' && 'Ask meaningful questions and share personal stories'}
                    {factor.name === 'Boundary Respect' && 'Pay attention to comfort levels and respect when someone says no'}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Community Standing */}
      <div className="p-6 border-t border-white/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-white/5 rounded-xl p-4">
            <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-white">Top {Math.max(5, 101 - trustScore)}%</div>
            <div className="text-gray-300 text-sm">Community Rank</div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4">
            <Heart className="w-6 h-6 text-pink-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-white">{user?.successful_matches || 12}</div>
            <div className="text-gray-300 text-sm">Successful Matches</div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4">
            <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-white">+{trend > 0 ? trend : 0}</div>
            <div className="text-gray-300 text-sm">This Month</div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4">
            <Award className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-white">{user?.trust_badges || 3}</div>
            <div className="text-gray-300 text-sm">Trust Badges</div>
          </div>
        </div>
      </div>

      {/* Trust Tier Progression */}
      {trustScore < 95 && showDetails && (
        <div className="p-6 border-t border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Next Trust Tier</h3>
          
          <div className="bg-white/5 rounded-xl p-4">
            {trustScore >= 85 ? (
              // Moving to Elite
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white">Progress to Elite Status</span>
                  <span className="text-purple-400 font-bold">{trustScore}/95</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 mb-3">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 h-3 rounded-full"
                    style={{ width: `${(trustScore / 95) * 100}%` }}
                  ></div>
                </div>
                <p className="text-gray-300 text-sm">
                  {95 - trustScore} more points needed for Elite status with VIP features and premium access!
                </p>
              </div>
            ) : trustScore >= 70 ? (
              // Moving to Trusted
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white">Progress to Trusted Status</span>
                  <span className="text-green-400 font-bold">{trustScore}/85</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 mb-3">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full"
                    style={{ width: `${(trustScore / 85) * 100}%` }}
                  ></div>
                </div>
                <p className="text-gray-300 text-sm">
                  {85 - trustScore} more points needed for Trusted status with verified badge and premium features!
                </p>
              </div>
            ) : (
              // Moving to Reliable
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white">Progress to Reliable Status</span>
                  <span className="text-blue-400 font-bold">{trustScore}/70</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 mb-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-cyan-600 h-3 rounded-full"
                    style={{ width: `${(trustScore / 70) * 100}%` }}
                  ></div>
                </div>
                <p className="text-gray-300 text-sm">
                  {70 - trustScore} more points needed for Reliable status with improved matching!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustScore;