import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Brain, Eye, EyeOff, ArrowRight, Heart, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { auth } from '../services/auth'; // Import the fixed auth service

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path from location state or default to dashboard
  const from = location.state?.from?.pathname || '/dashboard';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting login with:', { email: formData.email });
      
      // FIXED: Use the actual auth service with correct response handling
      const result = await auth.login({
        email: formData.email,
        password: formData.password,
        rememberMe: true
      });

      console.log('✅ Login response:', result);

      // FIXED: Check for access_token which is what the backend returns
      if (result.access_token) {
        setSuccess('Login successful! Redirecting...');
        
        // The auth service already stores the token and user data
        // Force page reload to update authentication state everywhere
        setTimeout(() => {
          window.location.href = from;
        }, 1000);
      } else {
        // This shouldn't happen with the fixed auth service
        setError('Login failed. Please check your credentials.');
      }
      
    } catch (err) {
      console.error('❌ Login error:', err);
      
      // FIXED: Handle different error types properly
      if (err.type === 'server_error') {
        if (err.status === 401) {
          setError('Invalid email or password. Please try again.');
        } else if (err.status === 422) {
          setError('Please check your email and password format.');
        } else {
          setError(err.message || 'Server error occurred. Please try again.');
        }
      } else if (err.type === 'network_error') {
        setError('Network error. Please check your connection and try again.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError('Please enter your email address first');
      return;
    }

    try {
      setLoading(true);
      // For now, just show a message since password reset isn't implemented yet
      setSuccess('Password reset feature coming soon! Please contact support.');
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    navigate('/register');
  };

  const handleGoogleLogin = () => {
    alert('Google OAuth integration coming soon!');
    // TODO: Implement Google OAuth when ready
  };

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
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-purple-200">
            Sign in to continue your journey toward authentic connection
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                required
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
                  placeholder="Enter your password"
                  className="w-full bg-black bg-opacity-30 border border-purple-400 rounded-xl px-4 py-3 pr-12 text-white placeholder-purple-300 focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-300 focus:ring-opacity-20 transition-all"
                  disabled={loading}
                  required
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
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-center space-x-2 bg-green-900 bg-opacity-30 border border-green-500 rounded-lg p-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-green-300 text-sm">{success}</span>
              </div>
            )}

            {/* Forgot Password */}
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-purple-300 hover:text-white text-sm transition-colors"
                disabled={loading}
              >
                Forgot your password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 disabled:transform-none flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-purple-400 opacity-30"></div>
            <span className="px-4 text-purple-300 text-sm">or</span>
            <div className="flex-1 border-t border-purple-400 opacity-30"></div>
          </div>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-100 disabled:opacity-50 py-3 rounded-xl font-semibold text-gray-800 transition-all duration-300 flex items-center justify-center space-x-2"
          >
            <span className="text-2xl">🔍</span>
            <span>Continue with Google</span>
          </button>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-purple-300 text-sm">
              Don't have an account?{' '}
              <button
                onClick={handleSignUp}
                className="text-white font-semibold hover:text-purple-200 transition-colors"
                disabled={loading}
              >
                Sign up for free
              </button>
            </p>
          </div>

          {/* Test Credentials Helper */}
          <div className="mt-4 p-3 bg-blue-900 bg-opacity-30 border border-blue-400 rounded-lg">
            <p className="text-blue-300 text-xs text-center">
              <strong>Test Credentials:</strong><br />
              Email: test@example.com<br />
              Password: password123
            </p>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-xs text-purple-300">Secure Login</span>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <div className="w-10 h-10 bg-purple-500 bg-opacity-20 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs text-purple-300">AI Matching</span>
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
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;