// src/App.js - Main application component
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';

// Pages - Update these imports to match your actual file names
import Login from './pages/Login'; // or './Login' if in same directory
import Register from './pages/Register'; // or './Register'
import Landing from './pages/Landing'; // or './Landing'
import Match from './pages/Match'; // or './Match'
import Profile from './pages/Profile'; // or './Profile'
import Upgrade from './pages/Upgrade'; // or './Upgrade'
import Reveal from './pages/Reveal'; // or './Reveal'
import Settings from './pages/Settings'; // or './Settings'

// You'll need to create these components or import them if they exist
// import { AuthProvider } from './context/AuthContext';
// import { BGPProvider } from './context/BGPContext';
// import { MatchProvider } from './context/MatchContext';
// import { useAuth } from './hooks/useAuth';
// import { useWebSocket } from './hooks/useWebSocket';
// import Header from './components/common/Header';
// import Footer from './components/common/Footer';

// Services - Update these imports to match your actual service files
import { auth } from './services/auth';
// import { webSocketService } from './services/websocket';

// Simple context providers (you can replace these with your actual implementations)
const AuthContext = React.createContext();
const BGPContext = React.createContext();
const MatchContext = React.createContext();

// Simple AuthProvider implementation
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const token = auth.getStoredToken();
    const storedUser = auth.getStoredUser();
    
    if (token && storedUser) {
      setUser(storedUser);
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const value = {
    user,
    isAuthenticated,
    loading,
    setUser,
    setIsAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Simple BGP Provider
const BGPProvider = ({ children }) => {
  const [bgpData, setBgpData] = useState(null);
  
  const value = {
    bgpData,
    setBgpData
  };

  return (
    <BGPContext.Provider value={value}>
      {children}
    </BGPContext.Provider>
  );
};

// Simple Match Provider
const MatchProvider = ({ children }) => {
  const [matches, setMatches] = useState([]);
  const [activeMatch, setActiveMatch] = useState(null);
  
  const value = {
    matches,
    setMatches,
    activeMatch,
    setActiveMatch
  };

  return (
    <MatchContext.Provider value={value}>
      {children}
    </MatchContext.Provider>
  );
};

// Custom hooks
const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const useWebSocket = () => {
  const [connectionState, setConnectionState] = useState('disconnected');
  
  const connect = (token, userId) => {
    console.log('WebSocket connect:', { token: token?.substring(0, 10) + '...', userId });
    setConnectionState('connected');
  };
  
  const disconnect = () => {
    console.log('WebSocket disconnect');
    setConnectionState('disconnected');
  };
  
  return {
    connectionState,
    connect,
    disconnect
  };
};

// Simple Header component
const Header = ({ connectionState }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      await auth.logout();
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white shadow-lg border-b border-purple-200 fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate('/dashboard')}
          >
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-xl font-bold text-gray-900">ApexMatch</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <button 
              onClick={() => navigate('/matching')}
              className="text-gray-700 hover:text-purple-600 transition-colors"
            >
              Discover
            </button>
            <button 
              onClick={() => navigate('/chat')}
              className="text-gray-700 hover:text-purple-600 transition-colors"
            >
              Conversations
            </button>
            <button 
              onClick={() => navigate('/profile')}
              className="text-gray-700 hover:text-purple-600 transition-colors"
            >
              Profile
            </button>
          </nav>
          
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${
              connectionState === 'connected' ? 'bg-green-500' : 'bg-gray-400'
            }`} title={`Connection: ${connectionState}`}></div>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {user?.firstName?.[0] || 'U'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

// Simple Footer component
const Footer = () => (
  <footer className="bg-gray-900 text-white py-8">
    <div className="container mx-auto px-4 text-center">
      <p className="text-sm text-gray-400">
        © 2025 ApexMatch. Built for authentic human connection.
      </p>
    </div>
  </footer>
);

// Loading component
const FullPageLoading = () => (
  <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading ApexMatch...</p>
    </div>
  </div>
);

// Global app configuration
const APP_CONFIG = {
  version: '1.0.0',
  environment: process.env.NODE_ENV,
  apiUrl: process.env.REACT_APP_API_URL,
  wsUrl: process.env.REACT_APP_WS_URL,
  enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  enablePWA: process.env.REACT_APP_ENABLE_PWA === 'true'
};

// Protected Route Component
const ProtectedRoute = ({ children, requireAuth = true, requireVerification = false, requirePremium = false }) => {
  const { isAuthenticated, user, loading } = useAuth();
  
  if (loading) {
    return <FullPageLoading />;
  }
  
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requireVerification && user && !user.isVerified) {
    return <Navigate to="/verify-email" replace />;
  }
  
  if (requirePremium && user && user.subscriptionTier === 'free') {
    return <Navigate to="/subscription" replace />;
  }
  
  return children;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <FullPageLoading />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Simple Chat component placeholder
const Chat = () => {
  const { conversationId } = useParams();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Chat Interface</h1>
        <p className="text-gray-600">
          {conversationId ? `Conversation: ${conversationId}` : 'Select a conversation to start chatting'}
        </p>
      </div>
    </div>
  );
};

// Email Verification Component
const EmailVerification = () => {
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  
  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await auth.resendVerificationEmail();
      alert('Verification email sent!');
    } catch (error) {
      alert(error.message);
    } finally {
      setIsResending(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="text-6xl mb-4">📧</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Verify Your Email</h1>
        <p className="text-gray-600 mb-6">
          We've sent a verification email to <strong>{user?.email}</strong>. 
          Please check your inbox and click the verification link.
        </p>
        <button
          onClick={handleResendVerification}
          disabled={isResending}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50"
        >
          {isResending ? 'Sending...' : 'Resend Verification Email'}
        </button>
      </div>
    </div>
  );
};

// Email Verification Handler
const EmailVerificationHandler = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying');
  const navigate = useNavigate();
  
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        await auth.verifyEmail(token);
        setStatus('success');
        setTimeout(() => navigate('/dashboard'), 3000);
      } catch (error) {
        setStatus('error');
      }
    };
    
    verifyEmail();
  }, [token, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h1 className="text-xl font-bold text-gray-900">Verifying your email...</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Email Verified!</h1>
            <p className="text-gray-600">Redirecting to your dashboard...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Verification Failed</h1>
            <p className="text-gray-600 mb-6">The verification link is invalid or has expired.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Password Reset Handler
const PasswordResetHandler = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('form');
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    try {
      setStatus('resetting');
      await auth.resetPassword(token, password);
      setStatus('success');
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      setStatus('form');
      alert(error.message);
    }
  };
  
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Password Reset!</h1>
          <p className="text-gray-600">Redirecting to login page...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Reset Password</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>
          <button
            type="submit"
            disabled={status === 'resetting'}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50"
          >
            {status === 'resetting' ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Not Found Page
const NotFoundPage = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="text-6xl mb-4">🤔</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h1>
        <p className="text-gray-600 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

// PWA Install Prompt
const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);
  
  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setShowInstall(false);
    }
  };
  
  if (!showInstall || !APP_CONFIG.enablePWA) return null;
  
  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white rounded-xl shadow-lg p-4 border border-purple-200 md:left-auto md:w-80">
      <div className="flex items-center space-x-3">
        <div className="text-2xl">📱</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Install ApexMatch</h3>
          <p className="text-sm text-gray-600">Get the app for better experience</p>
        </div>
        <button
          onClick={handleInstall}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
        >
          Install
        </button>
        <button
          onClick={() => setShowInstall(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Cookie Consent
const CookieConsent = () => {
  const [showConsent, setShowConsent] = useState(false);
  
  useEffect(() => {
    const consent = localStorage.getItem('apexmatch_cookie_consent');
    if (!consent) {
      setShowConsent(true);
    }
  }, []);
  
  const handleAccept = () => {
    localStorage.setItem('apexmatch_cookie_consent', 'accepted');
    setShowConsent(false);
  };
  
  if (!showConsent) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
        <div className="flex-1 text-sm">
          <p>
            We use cookies to enhance your experience and analyze app usage. 
            By continuing, you agree to our use of cookies.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleAccept}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

// Main App Component with Context Providers
const AppWithProviders = () => {
  return (
    <AuthProvider>
      <BGPProvider>
        <MatchProvider>
          <AppContent />
        </MatchProvider>
      </BGPProvider>
    </AuthProvider>
  );
};

// App Content Component
const AppContent = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const { connect, disconnect, connectionState } = useWebSocket();
  
  // App-level state
  const [isInitialized, setIsInitialized] = useState(false);
  const [showOfflineNotice, setShowOfflineNotice] = useState(false);
  const [appError, setAppError] = useState(null);
  
  // Initialize app on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        
        // Initialize service worker for PWA
        if (APP_CONFIG.enablePWA && 'serviceWorker' in navigator) {
          await navigator.serviceWorker.register('/sw.js');
        }
        
        // Set up global error handlers
        window.addEventListener('error', handleGlobalError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        
        // Track app initialization
        if (APP_CONFIG.enableAnalytics) {
          console.log('Analytics initialized');
        }
        
        setIsInitialized(true);
        
      } catch (error) {
        console.error('App initialization failed:', error);
        setAppError(error);
      }
    };
    
    initializeApp();
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  // WebSocket connection management
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = auth.getStoredToken();
      if (token) {
        connect(token, user.id);
      }
    } else {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [isAuthenticated, user, connect, disconnect]);
  
  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setShowOfflineNotice(false);
      if (isAuthenticated) {
        const token = auth.getStoredToken();
        if (token) {
          connect(token, user.id);
        }
      }
    };
    
    const handleOffline = () => {
      setShowOfflineNotice(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    if (!navigator.onLine) {
      setShowOfflineNotice(true);
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isAuthenticated, user, connect]);
  
  // Activity tracking for session management
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const trackActivity = () => {
      auth.trackActivity();
    };
    
    // Track various user activities
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    let activityTimer;
    
    const debouncedTrack = () => {
      clearTimeout(activityTimer);
      activityTimer = setTimeout(trackActivity, 30000); // Track every 30 seconds
    };
    
    events.forEach(event => {
      document.addEventListener(event, debouncedTrack, true);
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, debouncedTrack, true);
      });
      clearTimeout(activityTimer);
    };
  }, [isAuthenticated]);
  
  // Error handlers
  const handleGlobalError = (event) => {
    console.error('Global error:', event.error);
    setAppError(event.error);
  };
  
  const handleUnhandledRejection = (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    setAppError(event.reason);
  };
  
  // Show loading screen during initialization
  if (!isInitialized || loading) {
    return <FullPageLoading />;
  }
  
  // Show error screen if app failed to initialize
  if (appError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">😞</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Oops! Something went wrong</h1>
          <p className="text-gray-600 mb-6">
            We're having trouble loading ApexMatch. Please refresh the page or try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <Router>
      <div className="App min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        {/* Offline Notice */}
        {showOfflineNotice && (
          <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium">
            <span className="inline-flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              You're offline. Some features may not work properly.
            </span>
          </div>
        )}
        
        {/* Header - Show on authenticated routes */}
        {isAuthenticated && (
          <Header connectionState={connectionState} />
        )}
        
        {/* Main Content */}
        <main className={`${isAuthenticated ? 'pt-16' : ''} min-h-screen`}>
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/register" 
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Landing />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/matching" 
              element={
                <ProtectedRoute requireVerification>
                  <Match />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/chat/:conversationId?" 
              element={
                <ProtectedRoute requireVerification>
                  <Chat />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile/:section?" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/subscription" 
              element={
                <ProtectedRoute>
                  <Upgrade />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reveal/:matchId?" 
              element={
                <ProtectedRoute requireVerification>
                  <Reveal />
                </ProtectedRoute>
              } 
            />
            
            {/* Email verification routes */}
            <Route 
              path="/verify-email" 
              element={
                <ProtectedRoute>
                  <EmailVerification />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/verify-email/:token" 
              element={<EmailVerificationHandler />} 
            />
            
            {/* Password reset routes */}
            <Route 
              path="/reset-password/:token" 
              element={<PasswordResetHandler />} 
            />
            
            {/* Default redirects */}
            <Route 
              path="/" 
              element={
                isAuthenticated ? 
                  <Navigate to="/dashboard" replace /> : 
                  <Navigate to="/login" replace />
              } 
            />
            
            {/* 404 Page */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        
        {/* Footer - Show on public routes */}
        {!isAuthenticated && <Footer />}
        
        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
        
        {/* Cookie Consent */}
        <CookieConsent />
      </div>
    </Router>
  );
};

// Export the main App component
export default AppWithProviders;