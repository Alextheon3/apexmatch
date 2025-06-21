import React, { useState } from 'react';
import { Crown, Heart, Zap, Star, Check, X, ArrowLeft } from 'lucide-react';

const Upgrade = () => {
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [billingCycle, setBillingCycle] = useState('monthly'); // monthly or yearly
  const [showPayment, setShowPayment] = useState(false);

  const plans = {
    basic: {
      name: 'Basic',
      price: { monthly: 0, yearly: 0 },
      color: 'gray',
      features: [
        'Limited swipes per day',
        'Basic matching algorithm',
        'Standard profile visibility',
        'Limited message history'
      ],
      limitations: [
        'Only 10 swipes per day',
        'No premium filters',
        'No read receipts',
        'Limited profile customization'
      ]
    },
    premium: {
      name: 'Premium',
      price: { monthly: 19.99, yearly: 15.99 },
      color: 'purple',
      popular: true,
      features: [
        'Unlimited swipes',
        'Advanced AI matching',
        'Priority profile visibility',
        'Read receipts',
        'Advanced filters',
        'Unlimited rewinds',
        'See who liked you',
        'Message before matching'
      ],
      bonuses: [
        '5 Super Likes per week',
        'Monthly profile boost',
        'Travel mode',
        'Enhanced privacy controls'
      ]
    },
    elite: {
      name: 'Elite',
      price: { monthly: 39.99, yearly: 29.99 },
      color: 'gold',
      features: [
        'Everything in Premium',
        'AI conversation assistant',
        'Personal dating coach',
        'Advanced analytics',
        'VIP customer support',
        'Profile verification',
        'Exclusive matching pool',
        'Custom pickup lines'
      ],
      bonuses: [
        'Unlimited Super Likes',
        'Weekly profile boosts',
        'Priority matching',
        'Concierge service'
      ]
    }
  };

  const getCurrentPlan = () => {
    // This would normally come from user data
    return 'basic';
  };

  const formatPrice = (price) => {
    return price === 0 ? 'Free' : `$${price}`;
  };

  const getDiscountPercentage = (monthly, yearly) => {
    if (monthly === 0) return 0;
    return Math.round(((monthly - yearly) / monthly) * 100);
  };

  const handleUpgrade = () => {
    setShowPayment(true);
  };

  const PlanCard = ({ planKey, plan, isCurrentPlan }) => {
    const isSelected = selectedPlan === planKey;
    const colorClasses = {
      gray: 'border-gray-200 bg-white',
      purple: 'border-purple-300 bg-purple-50',
      gold: 'border-yellow-300 bg-yellow-50'
    };

    return (
      <div
        className={`relative rounded-2xl border-2 p-6 cursor-pointer transition-all hover:shadow-lg ${
          isSelected ? `ring-2 ring-${plan.color}-500` : ''
        } ${colorClasses[plan.color]}`}
        onClick={() => setSelectedPlan(planKey)}
      >
        {plan.popular && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
              Most Popular
            </span>
          </div>
        )}

        {isCurrentPlan && (
          <div className="absolute -top-3 right-4">
            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              Current Plan
            </span>
          </div>
        )}

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mb-4">
            {planKey === 'basic' && <Heart className="w-8 h-8 text-white" />}
            {planKey === 'premium' && <Crown className="w-8 h-8 text-white" />}
            {planKey === 'elite' && <Star className="w-8 h-8 text-white" />}
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
          
          <div className="text-4xl font-bold text-gray-900 mb-2">
            {formatPrice(plan.price[billingCycle])}
            {plan.price[billingCycle] > 0 && (
              <span className="text-lg font-normal text-gray-500">
                /{billingCycle === 'monthly' ? 'month' : 'year'}
              </span>
            )}
          </div>

          {billingCycle === 'yearly' && plan.price.monthly > 0 && (
            <div className="text-sm text-green-600 font-semibold">
              Save {getDiscountPercentage(plan.price.monthly, plan.price.yearly)}%
            </div>
          )}
        </div>

        <div className="space-y-3 mb-6">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-gray-700">{feature}</span>
            </div>
          ))}
          
          {plan.bonuses && (
            <>
              <div className="border-t border-gray-200 pt-3 mt-4">
                <p className="text-sm font-semibold text-purple-600 mb-2">Bonus Features:</p>
                {plan.bonuses.map((bonus, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{bonus}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {plan.limitations && (
            <div className="border-t border-gray-200 pt-3 mt-4">
              <p className="text-sm font-semibold text-gray-500 mb-2">Limitations:</p>
              {plan.limitations.map((limitation, index) => (
                <div key={index} className="flex items-center gap-3">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-sm text-gray-500">{limitation}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isSelected && (
          <div className="absolute inset-0 border-2 border-purple-500 rounded-2xl pointer-events-none" />
        )}
      </div>
    );
  };

  const PaymentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Complete Purchase</h3>
          <button
            onClick={() => setShowPayment(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-900">{plans[selectedPlan].name} Plan</h4>
            <p className="text-2xl font-bold text-purple-600">
              {formatPrice(plans[selectedPlan].price[billingCycle])}
              {plans[selectedPlan].price[billingCycle] > 0 && (
                <span className="text-sm font-normal text-gray-500">
                  /{billingCycle === 'monthly' ? 'month' : 'year'}
                </span>
              )}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Number
              </label>
              <input
                type="text"
                placeholder="1234 5678 9012 3456"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date
                </label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CVV
                </label>
                <input
                  type="text"
                  placeholder="123"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cardholder Name
              </label>
              <input
                type="text"
                placeholder="John Doe"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all">
          Complete Purchase
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Your payment is secure and encrypted. You can cancel anytime.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Upgrade Your Experience</h1>
          </div>
          <p className="text-gray-600 max-w-2xl">
            Unlock premium features and find meaningful connections faster with our advanced AI-powered matching system.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-full p-1 border border-gray-200">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Yearly
              <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                Save up to 40%
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {Object.entries(plans).map(([planKey, plan]) => (
            <PlanCard
              key={planKey}
              planKey={planKey}
              plan={plan}
              isCurrentPlan={getCurrentPlan() === planKey}
            />
          ))}
        </div>

        {/* Action Button */}
        {selectedPlan !== getCurrentPlan() && (
          <div className="text-center">
            <button
              onClick={handleUpgrade}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-12 py-4 rounded-xl font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
            >
              Upgrade to {plans[selectedPlan].name}
            </button>
            <p className="text-gray-500 text-sm mt-4">
              Cancel anytime. No hidden fees. 7-day money-back guarantee.
            </p>
          </div>
        )}

        {/* Feature Comparison */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Feature Comparison
          </h2>
          
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="grid grid-cols-4 bg-gray-50 p-4 font-semibold text-gray-900">
              <div>Features</div>
              <div className="text-center">Basic</div>
              <div className="text-center">Premium</div>
              <div className="text-center">Elite</div>
            </div>
            
            {[
              { feature: 'Daily Swipes', basic: '10', premium: 'Unlimited', elite: 'Unlimited' },
              { feature: 'Super Likes', basic: '1/day', premium: '5/week', elite: 'Unlimited' },
              { feature: 'Profile Boosts', basic: '0', premium: '1/month', elite: '1/week' },
              { feature: 'See Who Liked You', basic: '✗', premium: '✓', elite: '✓' },
              { feature: 'Read Receipts', basic: '✗', premium: '✓', elite: '✓' },
              { feature: 'AI Assistant', basic: '✗', premium: '✗', elite: '✓' },
              { feature: 'Personal Coach', basic: '✗', premium: '✗', elite: '✓' },
              { feature: 'Priority Support', basic: '✗', premium: '✗', elite: '✓' }
            ].map((row, index) => (
              <div key={index} className="grid grid-cols-4 p-4 border-t border-gray-100">
                <div className="font-medium text-gray-900">{row.feature}</div>
                <div className="text-center text-gray-600">{row.basic}</div>
                <div className="text-center text-purple-600 font-semibold">{row.premium}</div>
                <div className="text-center text-yellow-600 font-semibold">{row.elite}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                question: "Can I cancel my subscription anytime?",
                answer: "Yes, you can cancel your subscription at any time from your account settings. Your premium features will remain active until the end of your billing period."
              },
              {
                question: "What happens to my matches if I downgrade?",
                answer: "All your existing matches and conversations will remain intact. You'll just lose access to premium features like seeing who liked you and unlimited swipes."
              },
              {
                question: "Is there a free trial?",
                answer: "We offer a 7-day money-back guarantee for all premium plans. If you're not satisfied, contact our support team for a full refund."
              },
              {
                question: "How does the AI matching work?",
                answer: "Our AI analyzes your preferences, conversation patterns, and successful matches to recommend highly compatible profiles, increasing your chances of meaningful connections."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && <PaymentModal />}
    </div>
  );
};

export default Upgrade;