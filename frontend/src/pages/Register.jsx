import React, { useState } from 'react';
import { Brain, Eye, EyeOff, ArrowRight, Heart, Shield, AlertCircle, CheckCircle, User, MapPin, Calendar } from 'lucide-react';

const RegisterPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    age: '',
    location: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateStep1 = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.firstName || !formData.age || !formData.location) {
      setError('Please fill in all fields');
      return false;
    }
    const age = parseInt(formData.age);
    if (isNaN(age) || age < 18 || age > 99) {
      setError('Please enter a valid age (18-99)');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setError('');
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    setError('');
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    setError('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess('Account created successfully! Setting up your behavioral profile...');
      
      // Simulate profile setup
      setTimeout(() => {
        alert('Welcome to ApexMatch! Your behavioral profile is being built...');
      }, 1000);
      
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    alert('Redirecting to sign in...');
  };

  const handleGoogleSignUp = () => {
    alert('Google OAuth registration would be implemented here');
  };

  const getPasswordStrength = (password) => {
    if (password.length === 0) return { score: 0, text: '', color: '' };
    if (password.length < 6) return { score: 1, text: 'Weak', color: 'text-red-400' };
    if (password.length < 8) return { score: 2, text: 'Fair', color: 'text-yellow-400' };
    if (password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { score: 4, text: 'Strong', color: 'text-green-400' };
    }
    return { score: 3, text: 'Good', color: 'text-blue-400' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-purple-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-blue-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-pink-400 rounded-full blur-lg opacity-20 animate-bounce"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Brain className="w-10 h-10 text-purple-400" />
            <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              ApexMatch
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {currentStep === 1 ? 'Create Your Account' : 'Tell Us About Yourself'}
          </h1>
          <p className="text-purple-200">
            {currentStep === 1 
              ? 'Start your journey toward meaningful connections'
              : 'Help us build your behavioral profile'
            }
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-purple-300">Step {currentStep} of 2</span>
            <span className="text-sm text-purple-300">{currentStep === 1 ? 'Account Setup' : 'Profile Details'}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / 2) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          {currentStep === 1 ? (
            // Step 1: Account Setup
            <div className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className="w-full bg-black bg-opacity-30 border border-purple-400 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-300 focus:ring-opacity-20 transition-all"
                  disabled={loading}
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a strong password"
                    className="w-full bg-black bg-opacity-30 border border-purple-400 rounded-xl px-4 py-3 pr-12 text-white placeholder-purple-300 focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-300 focus:ring-opacity-20 transition-all"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-2 flex items-center space-x-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-1">
                      <div 
                        className={`h-1 rounded-full transition-all duration-300 ${
                          passwordStrength.score === 1 ? 'bg-red-400 w-1/4' :
                          passwordStrength.score === 2 ? 'bg-yellow-400 w-2/4' :
                          passwordStrength.score === 3 ? 'bg-blue-400 w-3/4' :
                          passwordStrength.score === 4 ? 'bg-green-400 w-full' : 'w-0'
                        }`}
                      ></div>
                    </div>
                    <span className={`text-xs ${passwordStrength.color}`}>
                      {passwordStrength.text}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    className="w-full bg-black bg-opacity-30 border border-purple-400 rounded-xl px-4 py-3 pr-12 text-white placeholder-purple-300 focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-300 focus:ring-opacity-20 transition-all"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {/* Password Match Indicator */}
                {formData.confirmPassword && (
                  <div className="mt-2">
                    {formData.password === formData.confirmPassword ? (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-green-400">Passwords match</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-xs text-red-400">Passwords don't match</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Step 2: Profile Details
            <div className="space-y-6">
              {/* First Name Field */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="What should we call you?"
                  className="w-full bg-black bg-opacity-30 border border-purple-400 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-300 focus:ring-opacity-20 transition-all"
                  disabled={loading}
                />
              </div>

              {/* Age Field */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Age
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="How old are you?"
                  min="18"
                  max="99"
                  className="w-full bg-black bg-opacity-30 border border-purple-400 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-300 focus:ring-opacity-20 transition-all"
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-purple-400">Must be 18 or older to join</p>
              </div>

              {/* Location Field */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="City, State/Country"
                  className="w-full bg-black bg-opacity-30 border border-purple-400 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-300 focus:ring-opacity-20 transition-all"
                  disabled={loading}
                />
              </div>

              {/* Privacy Notice */}
              <div className="bg-purple-900 bg-opacity-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-purple-200 mb-2">Your Privacy Matters</h4>
                <p className="text-xs text-purple-300 leading-relaxed">
                  Your information is used only for matching and profile building. 
                  Photos aren't required - we focus on behavioral compatibility first.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 flex items-center space-x-2 bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-6 flex items-center space-x-2 bg-green-900 bg-opacity-30 border border-green-500 rounded-lg p-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-green-300 text-sm">{success}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 space-y-4">
            {currentStep === 1 ? (
              <button
                onClick={handleNextStep}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 disabled:transform-none flex items-center justify-center space-x-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 disabled:transform-none flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <Heart className="w-5 h-5" />
                    </>
                  )}
                </button>
                
                <button
                  onClick={handlePrevStep}
                  disabled={loading}
                  className="w-full bg-gray-600 hover:bg-gray-700 disabled:opacity-50 py-3 rounded-xl font-semibold text-white transition-colors"
                >
                  Back
                </button>
              </div>
            )}
          </div>

          {/* Divider - Only show on step 1 */}
          {currentStep === 1 && (
            <>
              <div className="my-6 flex items-center">
                <div className="flex-1 border-t border-purple-400 opacity-30"></div>
                <span className="px-4 text-purple-300 text-sm">or</span>
                <div className="flex-1 border-t border-purple-400 opacity-30"></div>
              </div>

              {/* Google Sign Up */}
              <button
                onClick={handleGoogleSignUp}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-100 disabled:opacity-50 py-3 rounded-xl font-semibold text-gray-800 transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <span className="text-2xl">🔍</span>
                <span>Sign up with Google</span>
              </button>
            </>
          )}

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-purple-300 text-sm">
              Already have an account?{' '}
              <button
                onClick={handleSignIn}
                className="text-white font-semibold hover:text-purple-200 transition-colors"
                disabled={loading}
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-xs text-purple-300">Safe & Secure</span>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <div className="w-10 h-10 bg-purple-500 bg-opacity-20 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs text-purple-300">Behavioral Matching</span>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <div className="w-10 h-10 bg-pink-500 bg-opacity-20 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-pink-400" />
            </div>
            <span className="text-xs text-purple-300">Real Connections</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-purple-400 text-xs">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;