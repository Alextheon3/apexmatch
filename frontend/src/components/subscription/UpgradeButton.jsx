import React, { useState, useEffect } from 'react';
import { Crown, Sparkles, Zap, Star, ArrowRight, X, Eye, MessageCircle, Heart, Users } from 'lucide-react';

const UpgradeButton = ({ 
  context = 'general', // general, limit_reached, premium_feature, high_trust_match
  user,
  feature = null,
  onUpgrade,
  onDismiss,
  size = 'normal', // compact, normal, large
  inline = false
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [animationDelay, setAnimationDelay] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimationDelay(100), 300);
    return () => clearTimeout(timer);
  }, []);

  const upgradeContexts = {
    general: {
      title: 'Upgrade to Premium',
      subtitle: 'Unlock unlimited matches and AI-powered connections',
      icon: Crown,
      color: 'from-purple-500 to-blue-600',
      benefits: ['Unlimited daily matches', 'AI Wingman introductions', 'Advanced BGP insights'],
      urgency: 'low'
    },
    limit_reached: {
      title: 'Daily Limit Reached',
      subtitle: 'Upgrade to continue matching today',
      icon: Zap,
      color: 'from-orange-500 to-red-500',
      benefits: ['Remove all daily limits', 'Match with anyone, anytime', 'Never miss a connection'],
      urgency: 'high'
    },
    premium_feature: {
      title: 'Premium Feature',
      subtitle: `${feature} is available with Premium`,
      icon: Sparkles,
      color: 'from-pink-500 to-purple-500',
      benefits: ['Unlock this feature', 'Get all premium benefits', 'Enhanced matching experience'],
      urgency: 'medium'
    },
    high_trust_match: {
      title: 'Elite Match Available',
      subtitle: 'This high-trust user is in the premium queue',
      icon: Star,
      color: 'from-yellow-500 to-orange-500',
      benefits: ['Access elite matches', 'Priority in high-trust queue', 'Better match quality'],
      urgency: 'high'
    },
    ai_wingman: {
      title: 'AI Wingman Locked',
      subtitle: 'Get personalized conversation starters',
      icon: Sparkles,
      color: 'from-blue-500 to-cyan-500',
      benefits: ['AI-crafted introductions', 'Behavioral compatibility insights', 'Higher response rates'],
      urgency: 'medium'
    },
    reveal_premium: {
      title: 'Premium Reveal Features',
      subtitle: 'Unlock custom themes and reconnections',
      icon: Eye,
      color: 'from-purple-500 to-pink-500',
      benefits: ['Custom reveal themes', 'Reconnect with declined reveals', 'Enhanced reveal experience'],
      urgency: 'medium'
    }
  };

  const currentContext = upgradeContexts[context] || upgradeContexts.general;
  const ContextIcon = currentContext.icon;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleUpgrade = () => {
    onUpgrade?.(context);
  };

  if (!isVisible) return null;

  // Compact size for inline usage
  if (size === 'compact') {
    return (
      <button
        onClick={handleUpgrade}
        className={`inline-flex items-center space-x-2 bg-gradient-to-r ${currentContext.color} text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 transform hover:scale-105`}
      >
        <Crown className="w-4 h-4" />
        <span>Upgrade</span>
      </button>
    );
  }

  // Inline banner style
  if (inline) {
    return (
      <div className={`bg-gradient-to-r ${currentContext.color}/20 border border-white/20 rounded-xl p-4 backdrop-blur-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`bg-gradient-to-r ${currentContext.color} p-2 rounded-lg`}>
              <ContextIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-semibold">{currentContext.title}</div>
              <div className="text-gray-300 text-sm">{currentContext.subtitle}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUpgrade}
              className={`bg-gradient-to-r ${currentContext.color} text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300`}
            >
              Upgrade Now
            </button>
            {onDismiss && (
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-white p-2"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full modal/card style
  return (
    <div 
      className={`bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden transform transition-all duration-500 ${
        animationDelay ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      
      {/* Header */}
      <div className={`bg-gradient-to-r ${currentContext.color}/20 p-6 border-b border-white/10 relative`}>
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        <div className="flex items-center space-x-4">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${currentContext.color} flex items-center justify-center`}>
            <ContextIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">{currentContext.title}</h3>
            <p className="text-gray-300">{currentContext.subtitle}</p>
          </div>
        </div>

        {/* Urgency Indicator */}
        {currentContext.urgency === 'high' && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
            Limited Time
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        
        {/* Context-specific content */}
        {context === 'limit_reached' && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-5 h-5 text-orange-400" />
              <span className="text-white font-semibold">You've reached your daily limit</span>
            </div>
            <p className="text-gray-300 text-sm">
              Free users can access 1 match every 3 days. Upgrade to Premium for unlimited daily matches and never miss a connection!
            </p>
          </div>
        )}

        {context === 'high_trust_match' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <Star className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-semibold">Elite Match Detected</span>
            </div>
            <p className="text-gray-300 text-sm">
              This user has a 95%+ trust score and is highly compatible with you. Premium members get priority access to elite matches.
            </p>
          </div>
        )}

        {context === 'ai_wingman' && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span className="text-white font-semibold">AI Wingman Ready</span>
            </div>
            <p className="text-gray-300 text-sm">
              Get personalized conversation starters based on your behavioral compatibility. Premium feature with 89% higher response rates.
            </p>
          </div>
        )}

        {/* Benefits List */}
        <div className="mb-6">
          <h4 className="text-white font-semibold mb-4">What you'll get:</h4>
          <div className="space-y-3">
            {currentContext.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${currentContext.color} flex items-center justify-center`}>
                  <Star className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Social Proof */}
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between text-center">
            <div>
              <div className="text-2xl font-bold text-purple-400">3x</div>
              <div className="text-gray-300 text-sm">More Matches</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">89%</div>
              <div className="text-gray-300 text-sm">Success Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">24h</div>
              <div className="text-gray-300 text-sm">Avg Response</div>
            </div>
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-4 mb-6 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-semibold">Premium Plan</div>
              <div className="text-gray-300 text-sm">Cancel anytime • 30-day guarantee</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">$19</div>
              <div className="text-gray-300 text-sm">/month</div>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleUpgrade}
            className={`w-full bg-gradient-to-r ${currentContext.color} text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2`}
          >
            <Crown className="w-5 h-5" />
            <span>Upgrade to Premium</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          
          {context !== 'limit_reached' && (
            <button
              onClick={handleDismiss}
              className="w-full bg-white/10 text-white py-3 rounded-xl font-medium hover:bg-white/20 transition-all duration-300"
            >
              Maybe Later
            </button>
          )}
        </div>

        {/* Guarantee */}
        <div className="text-center mt-4">
          <p className="text-gray-400 text-sm">
            💯 30-day money-back guarantee
          </p>
        </div>
      </div>
    </div>
  );
};

// Floating Upgrade Prompt
const FloatingUpgradePrompt = ({ 
  show = false, 
  context = 'general',
  onUpgrade,
  onDismiss 
}) => {
  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce">
      <div className="bg-gradient-to-r from-purple-500 to-blue-600 text-white p-4 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-lg max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5" />
            <span className="font-semibold">Upgrade Available!</span>
          </div>
          <button onClick={onDismiss} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-sm mb-3 opacity-90">
          Unlock unlimited matches and premium features
        </p>
        
        <button
          onClick={onUpgrade}
          className="w-full bg-white/20 hover:bg-white/30 text-white py-2 rounded-lg font-medium transition-all duration-300"
        >
          Learn More
        </button>
      </div>
    </div>
  );
};

export default UpgradeButton;
export { FloatingUpgradePrompt };