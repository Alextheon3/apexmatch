import React, { useState, useEffect } from 'react';
import { CreditCard, Lock, Check, AlertTriangle, Crown, Gift, Sparkles } from 'lucide-react';

const PaymentForm = ({ 
  selectedPlan,
  annual = false,
  onPaymentSuccess,
  onPaymentError,
  user 
}) => {
  const [paymentStep, setPaymentStep] = useState(1); // 1: details, 2: processing, 3: success
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    }
  });
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(null);

  const planPricing = {
    premium: { monthly: 19, annual: 15 },
    elite: { monthly: 39, annual: 29 }
  };

  const currentPrice = planPricing[selectedPlan]?.[annual ? 'annual' : 'monthly'] || 0;
  const originalPrice = planPricing[selectedPlan]?.monthly || 0;
  const billingAmount = annual ? currentPrice * 12 : currentPrice;
  const savings = annual ? Math.round(((originalPrice * 12 - billingAmount) / (originalPrice * 12)) * 100) : 0;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.cardNumber || formData.cardNumber.length < 16) {
      newErrors.cardNumber = 'Valid card number required';
    }
    if (!formData.expiryDate || !/^\d{2}\/\d{2}$/.test(formData.expiryDate)) {
      newErrors.expiryDate = 'Valid expiry date required (MM/YY)';
    }
    if (!formData.cvv || formData.cvv.length < 3) {
      newErrors.cvv = 'Valid CVV required';
    }
    if (!formData.cardholderName.trim()) {
      newErrors.cardholderName = 'Cardholder name required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleInputChange = (field, value) => {
    let formattedValue = value;
    
    if (field === 'cardNumber') {
      formattedValue = formatCardNumber(value);
    } else if (field === 'expiryDate') {
      formattedValue = formatExpiryDate(value);
    } else if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '').substring(0, 4);
    }

    setFormData(prev => ({
      ...prev,
      [field]: formattedValue
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      billingAddress: {
        ...prev.billingAddress,
        [field]: value
      }
    }));
  };

  const applyPromoCode = () => {
    // Mock promo code validation
    const validPromos = {
      'FIRST30': { discount: 30, type: 'percentage', description: '30% off first month' },
      'LOVE20': { discount: 20, type: 'percentage', description: '20% off' },
      'SAVE10': { discount: 10, type: 'fixed', description: '$10 off' }
    };

    if (validPromos[promoCode.toUpperCase()]) {
      setPromoApplied(validPromos[promoCode.toUpperCase()]);
    } else {
      setErrors(prev => ({ ...prev, promoCode: 'Invalid promo code' }));
    }
  };

  const calculateFinalAmount = () => {
    let amount = billingAmount;
    if (promoApplied) {
      if (promoApplied.type === 'percentage') {
        amount = amount * (1 - promoApplied.discount / 100);
      } else {
        amount = Math.max(0, amount - promoApplied.discount);
      }
    }
    return amount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsProcessing(true);
    setPaymentStep(2);

    try {
      // Mock payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate successful payment
      setPaymentStep(3);
      onPaymentSuccess?.({
        plan: selectedPlan,
        annual,
        amount: calculateFinalAmount(),
        promoCode: promoApplied ? promoCode : null
      });

    } catch (error) {
      setIsProcessing(false);
      setPaymentStep(1);
      onPaymentError?.(error.message);
      setErrors({ general: 'Payment failed. Please try again.' });
    }
  };

  if (paymentStep === 2) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500/30 border-t-purple-500 mx-auto mb-6"></div>
        <h3 className="text-xl font-semibold text-white mb-2">Processing Payment...</h3>
        <p className="text-gray-300">Please don't close this window. This may take a few moments.</p>
        
        <div className="bg-white/5 rounded-xl p-4 mt-6">
          <div className="flex items-center justify-center space-x-2 text-green-400 mb-2">
            <Lock className="w-4 h-4" />
            <span className="text-sm">Secure SSL Encrypted Payment</span>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStep === 3) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-4">Payment Successful! 🎉</h3>
        <p className="text-gray-300 mb-6">
          Welcome to ApexMatch {selectedPlan === 'premium' ? 'Connection' : 'Elite'}! 
          Your premium features are now active.
        </p>

        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-6 border border-green-500/20 mb-6">
          <h4 className="text-white font-semibold mb-3">What's Next?</h4>
          <div className="space-y-2 text-left">
            <div className="flex items-center space-x-2 text-gray-300">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>AI Wingman is now available for your matches</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-300">
              <Crown className="w-4 h-4 text-purple-400" />
              <span>Priority placement in high-trust matching queue</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-300">
              <Gift className="w-4 h-4 text-pink-400" />
              <span>Unlimited daily matches and conversations</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => window.location.href = '/match'}
          className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-700 transition-all duration-300"
        >
          Start Exploring Premium Features
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 overflow-hidden">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Complete Your Upgrade</h3>
            <p className="text-gray-300">
              Upgrading to {selectedPlan === 'premium' ? 'Connection' : 'Elite'} Plan
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              ${calculateFinalAmount().toFixed(2)}
            </div>
            <div className="text-gray-300 text-sm">
              {annual ? 'per year' : 'per month'}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        
        {/* Order Summary */}
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <h4 className="text-white font-semibold mb-3">Order Summary</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between text-gray-300">
              <span>ApexMatch {selectedPlan === 'premium' ? 'Connection' : 'Elite'}</span>
              <span>${billingAmount}</span>
            </div>
            
            {annual && (
              <div className="flex justify-between text-green-400 text-sm">
                <span>Annual billing discount</span>
                <span>-${(originalPrice * 12) - billingAmount} ({savings}% off)</span>
              </div>
            )}
            
            {promoApplied && (
              <div className="flex justify-between text-green-400 text-sm">
                <span>Promo: {promoCode.toUpperCase()}</span>
                <span>
                  -{promoApplied.type === 'percentage' 
                    ? `${promoApplied.discount}%` 
                    : `$${promoApplied.discount}`
                  }
                </span>
              </div>
            )}
            
            <div className="border-t border-white/20 pt-2 flex justify-between text-white font-semibold">
              <span>Total</span>
              <span>${calculateFinalAmount().toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Promo Code */}
        <div className="mb-6">
          <label className="block text-white font-medium mb-2">Promo Code (Optional)</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Enter promo code"
              className="flex-1 bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="button"
              onClick={applyPromoCode}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-300"
            >
              Apply
            </button>
          </div>
          {errors.promoCode && (
            <p className="text-red-400 text-sm mt-1">{errors.promoCode}</p>
          )}
          {promoApplied && (
            <p className="text-green-400 text-sm mt-1">✓ {promoApplied.description} applied!</p>
          )}
        </div>

        {/* Payment Method Selection */}
        <div className="mb-6">
          <label className="block text-white font-medium mb-3">Payment Method</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'card', name: 'Credit Card', icon: CreditCard },
              { id: 'paypal', name: 'PayPal', icon: '💳' },
              { id: 'apple', name: 'Apple Pay', icon: '🍎' }
            ].map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelectedPaymentMethod(method.id)}
                className={`p-3 rounded-xl border transition-all duration-300 ${
                  selectedPaymentMethod === method.id
                    ? 'bg-purple-500/20 border-purple-500/50 text-white'
                    : 'bg-white/5 border-white/20 text-gray-400 hover:text-white'
                }`}
              >
                <div className="text-center">
                  {typeof method.icon === 'string' ? (
                    <div className="text-2xl mb-1">{method.icon}</div>
                  ) : (
                    <method.icon className="w-6 h-6 mx-auto mb-1" />
                  )}
                  <div className="text-sm">{method.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Card Details */}
        {selectedPaymentMethod === 'card' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-white font-medium mb-2">Card Number</label>
                <input
                  type="text"
                  value={formData.cardNumber}
                  onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                  placeholder="1234 5678 9012 3456"
                  maxLength="19"
                  className="w-full bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {errors.cardNumber && (
                  <p className="text-red-400 text-sm mt-1">{errors.cardNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Cardholder Name</label>
                <input
                  type="text"
                  value={formData.cardholderName}
                  onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {errors.cardholderName && (
                  <p className="text-red-400 text-sm mt-1">{errors.cardholderName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-white font-medium mb-2">Expiry Date</label>
                <input
                  type="text"
                  value={formData.expiryDate}
                  onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                  placeholder="MM/YY"
                  maxLength="5"
                  className="w-full bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {errors.expiryDate && (
                  <p className="text-red-400 text-sm mt-1">{errors.expiryDate}</p>
                )}
              </div>

              <div>
                <label className="block text-white font-medium mb-2">CVV</label>
                <input
                  type="text"
                  value={formData.cvv}
                  onChange={(e) => handleInputChange('cvv', e.target.value)}
                  placeholder="123"
                  maxLength="4"
                  className="w-full bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {errors.cvv && (
                  <p className="text-red-400 text-sm mt-1">{errors.cvv}</p>
                )}
              </div>
            </div>

            {/* Billing Address */}
            <div className="mb-6">
              <h4 className="text-white font-medium mb-3">Billing Address</h4>
              
              <div className="space-y-4">
                <input
                  type="text"
                  value={formData.billingAddress.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  placeholder="Street Address"
                  className="w-full bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={formData.billingAddress.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    placeholder="City"
                    className="w-full bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    value={formData.billingAddress.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    placeholder="State"
                    className="w-full bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={formData.billingAddress.zipCode}
                    onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                    placeholder="ZIP Code"
                    className="w-full bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <select
                    value={formData.billingAddress.country}
                    onChange={(e) => handleAddressChange('country', e.target.value)}
                    className="w-full bg-white/10 text-white border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="UK">United Kingdom</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Alternative Payment Methods */}
        {selectedPaymentMethod !== 'card' && (
          <div className="mb-6 p-6 bg-white/5 rounded-xl border border-white/10 text-center">
            <div className="text-4xl mb-4">
              {selectedPaymentMethod === 'paypal' ? '💳' : '🍎'}
            </div>
            <p className="text-gray-300 mb-4">
              You'll be redirected to {selectedPaymentMethod === 'paypal' ? 'PayPal' : 'Apple Pay'} to complete your payment securely.
            </p>
          </div>
        )}

        {/* Security Notice */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center space-x-3">
            <Lock className="w-5 h-5 text-green-400" />
            <div>
              <div className="text-white font-medium">Secure Payment</div>
              <div className="text-gray-300 text-sm">
                Your payment information is encrypted and secure. We never store your card details.
              </div>
            </div>
          </div>
        </div>

        {/* Terms Agreement */}
        <div className="mb-6">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              required
              className="mt-1 w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
            />
            <div className="text-gray-300 text-sm leading-relaxed">
              I agree to the{' '}
              <a href="/terms" className="text-purple-400 hover:text-purple-300 underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-purple-400 hover:text-purple-300 underline">
                Privacy Policy
              </a>
              . I understand that my subscription will automatically renew unless cancelled.
            </div>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white py-4 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              <span>Complete Secure Payment</span>
            </>
          )}
        </button>

        {/* Error Message */}
        {errors.general && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{errors.general}</p>
          </div>
        )}

        {/* Money Back Guarantee */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            💯 30-day money-back guarantee • Cancel anytime • No hidden fees
          </p>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;