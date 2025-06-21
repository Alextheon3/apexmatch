import React, { useState } from 'react';
import { Crown, Check, Sparkles, Heart, Brain, Eye, MessageCircle, Star, Zap, Users } from 'lucide-react';

const PricingCard = ({ 
  plan,
  isPopular = false,
  currentPlan = null,
  onSelectPlan,
  annual = false,
  showComparison = true 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const planDetails = {
    free: {
      name: 'Discovery',
      price: { monthly: 0, annual: 0 },
      color: 'from-gray-500 to-slate-600',
      icon: Heart,
      tagline: 'Start your journey',
      features: [
        { text: '1 match every 3 days', included: true, icon: Users },
        { text: '3 active conversations max', included: true, icon: MessageCircle },
        { text: 'Basic BGP insights', included: true, icon: Brain },
        { text: 'Standard trust matching', included: true, icon: Star },
        { text: 'AI Wingman', included: false, icon: Sparkles },
        { text: 'Unlimited matches', included: false, icon: Heart },
        { text: 'Advanced BGP analysis', included: false, icon: Brain },
        { text: 'Priority in high-trust queue', included: false, icon: Crown },
        { text: 'Reveal request reconnections', included: false, icon: Eye },
        { text: 'Custom reveal themes', included: false, icon: Star }
      ],
      limitations: [
        'Limited to 1 match every 3 days',
        'Cannot reconnect with declined reveals',
        'Basic personality insights only'
      ]
    },
    premium: {
      name: 'Connection',
      price: { monthly: 19, annual: 15 },
      color: 'from-purple-500 to-blue-600',
      icon: Sparkles,
      tagline: 'Unlock deeper connections',
      features: [
        { text: 'Unlimited daily matches', included: true, icon: Heart },
        { text: 'Unlimited conversations', included: true, icon: MessageCircle },
        { text: 'AI Wingman introductions', included: true, icon: Sparkles },
        { text: 'Advanced BGP insights', included: true, icon: Brain },
        { text: 'High-trust matching priority', included: true, icon: Crown },
        { text: 'Reveal request reconnections', included: true, icon: Eye },
        { text: 'Custom reveal themes', included: true, icon: Star },
        { text: 'Read receipts & typing indicators', included: true, icon: MessageCircle },
        { text: 'Premium support', included: true, icon: Zap },
        { text: 'Elite community access', included: false, icon: Users }
      ],
      benefits: [
        'See who liked your profile',
        'Advanced compatibility filters',
        'Priority customer support'
      ]
    },
    elite: {
      name: 'Elite',
      price: { monthly: 39, annual: 29 },
      color: 'from-yellow-500 to-orange-600',
      icon: Crown,
      tagline: 'The ultimate dating experience',
      features: [
        { text: 'Everything in Connection', included: true, icon: Check },
        { text: 'Elite community access', included: true, icon: Users },
        { text: 'Verified profile badge', included: true, icon: Star },
        { text: 'Relationship coaching sessions', included: true, icon: Brain },
        { text: 'Early access to new features', included: true, icon: Zap },
        { text: 'VIP events & meetups', included: true, icon: Heart },
        { text: 'Concierge matching service', included: true, icon: Crown },
        { text: 'Advanced analytics dashboard', included: true, icon: Brain },
        { text: 'Priority feature requests', included: true, icon: Star },
        { text: 'White-glove onboarding', included: true, icon: Sparkles }
      ],
      benefits: [
        'Personal relationship coach',
        'Exclusive elite member events',
        'Direct line to product team'
      ]
    }
  };

  const currentPlanData = planDetails[plan];
  const PlanIcon = currentPlanData.icon;
  const currentPrice = annual ? currentPlanData.price.annual : currentPlanData.price.monthly;
  const regularPrice = currentPlanData.price.monthly;
  const savings = annual && regularPrice > 0 ? Math.round(((regularPrice * 12 - currentPrice * 12) / (regularPrice * 12)) * 100) : 0;

  const isCurrentPlan = currentPlan === plan;

  return (
    <div 
      className={`relative rounded-3xl border-2 transition-all duration-500 transform ${
        isPopular 
          ? 'border-yellow-400 scale-105 shadow-2xl' 
          : isHovered 
          ? 'border-white/40 scale-102 shadow-xl' 
          : 'border-white/20'
      } ${
        isCurrentPlan ? 'ring-4 ring-green-400/50' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
          🔥 Most Popular
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute -top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
          Current Plan
        </div>
      )}

      <div className={`bg-gradient-to-br ${currentPlanData.color}/20 backdrop-blur-lg rounded-3xl p-8 h-full`}>
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${currentPlanData.color} flex items-center justify-center`}>
            <PlanIcon className="w-8 h-8 text-white" />
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-2">{currentPlanData.name}</h3>
          <p className="text-gray-300 text-sm mb-4">{currentPlanData.tagline}</p>
          
          {/* Pricing */}
          <div className="mb-4">
            {currentPrice === 0 ? (
              <div className="text-4xl font-bold text-white">Free</div>
            ) : (
              <div className="flex items-baseline justify-center space-x-1">
                <span className="text-4xl font-bold text-white">${currentPrice}</span>
                <span className="text-gray-300">/month</span>
              </div>
            )}
            
            {annual && regularPrice > 0 && (
              <div className="flex items-center justify-center space-x-2 mt-2">
                <span className="text-gray-400 line-through text-sm">${regularPrice * 12}/year</span>
                <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  Save {savings}%
                </span>
              </div>
            )}
          </div>

          {/* Annual Billing Note */}
          {annual && currentPrice > 0 && (
            <p className="text-gray-400 text-xs">Billed annually at ${currentPrice * 12}</p>
          )}
        </div>

        {/* Features */}
        <div className="space-y-3 mb-8">
          {currentPlanData.features.map((feature, index) => {
            const FeatureIcon = feature.icon;
            return (
              <div 
                key={index} 
                className={`flex items-center space-x-3 transition-all duration-300 ${
                  feature.included ? 'text-white' : 'text-gray-500'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  feature.included 
                    ? `bg-gradient-to-r ${currentPlanData.color}` 
                    : 'bg-gray-600'
                }`}>
                  {feature.included ? (
                    <Check className="w-3 h-3 text-white" />
                  ) : (
                    <span className="text-gray-400 text-xs">×</span>
                  )}
                </div>
                <FeatureIcon className="w-4 h-4" />
                <span className="text-sm">{feature.text}</span>
              </div>
            );
          })}
        </div>

        {/* Benefits Highlight */}
        {currentPlanData.benefits && (
          <div className={`bg-gradient-to-r ${currentPlanData.color}/10 rounded-xl p-4 mb-8 border border-white/10`}>
            <h4 className="text-white font-semibold mb-2 flex items-center space-x-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>Key Benefits</span>
            </h4>
            <ul className="space-y-1">
              {currentPlanData.benefits.map((benefit, index) => (
                <li key={index} className="text-gray-300 text-sm flex items-center space-x-2">
                  <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Limitations (for free plan) */}
        {currentPlanData.limitations && (
          <div className="bg-red-500/10 rounded-xl p-4 mb-8 border border-red-500/20">
            <h4 className="text-red-400 font-semibold mb-2 text-sm">Limitations</h4>
            <ul className="space-y-1">
              {currentPlanData.limitations.map((limitation, index) => (
                <li key={index} className="text-red-300 text-xs flex items-center space-x-2">
                  <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA Button */}
        <div className="mt-auto">
          {isCurrentPlan ? (
            <button 
              disabled
              className="w-full bg-green-500/20 text-green-400 border border-green-500/50 py-4 rounded-xl font-semibold cursor-not-allowed"
            >
              Current Plan
            </button>
          ) : (
            <button
              onClick={() => onSelectPlan && onSelectPlan(plan, annual)}
              className={`w-full bg-gradient-to-r ${currentPlanData.color} text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2`}
            >
              <span>
                {plan === 'free' ? 'Get Started Free' : `Upgrade to ${currentPlanData.name}`}
              </span>
              {plan !== 'free' && <Crown className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Money Back Guarantee */}
        {plan !== 'free' && (
          <div className="text-center mt-4">
            <p className="text-gray-400 text-xs">
              💯 30-day money-back guarantee
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Comparison Table Component
const PricingComparison = ({ currentPlan, onSelectPlan, annual = false }) => {
  const plans = ['free', 'premium', 'elite'];
  
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
      <h3 className="text-2xl font-bold text-white text-center mb-8">Compare All Plans</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/20">
              <th className="text-left py-4 px-4 text-white">Features</th>
              {plans.map((plan) => (
                <th key={plan} className="text-center py-4 px-4">
                  <div className="text-white font-semibold capitalize">{plan}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              'Daily matches',
              'Active conversations',
              'AI Wingman',
              'BGP insights',
              'Trust priority',
              'Reveal reconnections',
              'Custom themes',
              'Elite community'
            ].map((feature, index) => (
              <tr key={index} className="border-b border-white/10">
                <td className="py-3 px-4 text-gray-300">{feature}</td>
                <td className="py-3 px-4 text-center text-gray-400">Limited</td>
                <td className="py-3 px-4 text-center text-green-400">✓</td>
                <td className="py-3 px-4 text-center text-yellow-400">✓✓</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PricingCard;
export { PricingComparison };