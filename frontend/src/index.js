// src/index.js - Fixed ESLint location errors
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Get the root element
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console for debugging
    console.error('Application Error:', error);
    console.error('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">We're sorry, but something unexpected happened.</p>
            <button 
              onClick={() => window.location.reload()} // Fixed: use window.location instead of location
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">Error Details</summary>
                <pre className="mt-2 text-xs text-red-600 overflow-auto">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Service Worker Registration (Optional)
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
};

// Performance monitoring
const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

// App initialization
const initializeApp = () => {
  try {
    // Check for required environment variables
    if (!process.env.REACT_APP_API_URL) {
      console.warn('REACT_APP_API_URL not set, using default localhost');
    }

    // Initialize theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Handle online/offline status
    const handleOnline = () => {
      console.log('App is online');
      document.body.classList.remove('offline');
    };

    const handleOffline = () => {
      console.log('App is offline');
      document.body.classList.add('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial online status
    if (!navigator.onLine) {
      document.body.classList.add('offline');
    }

    // Render the app
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );

    // Register service worker
    registerServiceWorker();

    // Report web vitals
    reportWebVitals(console.log);

  } catch (error) {
    console.error('Failed to initialize app:', error);
    
    // Fallback error display
    root.render(
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Initialization Error</h1>
          <p className="text-red-500 mb-4">Failed to start the application</p>
          <button 
            onClick={() => window.location.reload()} // Fixed: use window.location instead of location
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
};

// Initialize the app
initializeApp();