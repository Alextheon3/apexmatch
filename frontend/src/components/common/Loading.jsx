import React from 'react';
import { Heart, Sparkles, Users, Brain } from 'lucide-react';

// Basic Loading Spinner
const BasicLoading = ({ size = 'md', color = 'purple' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    purple: 'border-purple-500',
    pink: 'border-pink-500',
    blue: 'border-blue-500',
    white: 'border-white'
  };

  return (
    <div className={`animate-spin rounded-full ${sizeClasses[size]} border-2 ${colorClasses[color]} border-t-transparent`}>
    </div>
  );
};

// ApexMatch Branded Loading
const ApexLoading = ({ message = "Loading...", size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        {/* Outer rotating ring */}
        <div className={`animate-spin rounded-full ${sizeClasses[size]} border-4 border-purple-500/30 border-t-purple-500`}>
        </div>
        
        {/* Inner heart */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Heart className="w-6 h-6 text-pink-500 animate-pulse" />
        </div>
      </div>
      
      <p className="text-white/80 text-sm animate-pulse">{message}</p>
    </div>
  );
};

// BGP Analysis Loading
const BGPLoading = ({ stage = "Analyzing behavioral patterns..." }) => {
  const stages = [
    "Analyzing behavioral patterns...",
    "Processing emotional data...",
    "Building compatibility profile...",
    "Finding your perfect match..."
  ];

  const [currentStage, setCurrentStage] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStage(prev => (prev + 1) % stages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center space-y-6 p-8">
      <div className="relative">
        {/* Brain animation */}
        <div className="relative">
          <Brain className="w-16 h-16 text-purple-400 animate-pulse" />
          
          {/* Floating sparkles */}
          <div className="absolute -top-2 -right-2">
            <Sparkles className="w-4 h-4 text-pink-400 animate-bounce" style={{ animationDelay: '0s' }} />
          </div>
          <div className="absolute -bottom-2 -left-2">
            <Sparkles className="w-4 h-4 text-blue-400 animate-bounce" style={{ animationDelay: '0.5s' }} />
          </div>
          <div className="absolute -top-2 -left-2">
            <Sparkles className="w-4 h-4 text-green-400 animate-bounce" style={{ animationDelay: '1s' }} />
          </div>
        </div>

        {/* Pulsing rings */}
        <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping"></div>
        <div className="absolute inset-0 rounded-full border-2 border-pink-500/30 animate-ping" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">AI at Work</h3>
        <p className="text-purple-300 animate-pulse">{stages[currentStage]}</p>
        
        {/* Progress dots */}
        <div className="flex space-x-2 mt-4 justify-center">
          {stages.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                index === currentStage ? 'bg-purple-500' : 'bg-white/30'
              }`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Matching Loading
const MatchingLoading = () => {
  return (
    <div className="flex flex-col items-center space-y-6 p-8">
      <div className="relative">
        {/* Two hearts connecting */}
        <div className="flex items-center space-x-8">
          <Heart className="w-12 h-12 text-pink-500 animate-pulse" />
          <Heart className="w-12 h-12 text-purple-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
        
        {/* Connection line */}
        <div className="absolute top-6 left-6 right-6 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500 animate-pulse"></div>
        
        {/* Sparkles between hearts */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
          <Sparkles className="w-6 h-6 text-yellow-400 animate-spin" />
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">Finding Your Match</h3>
        <p className="text-gray-300">
          Analyzing compatibility with thousands of potential partners...
        </p>
      </div>
    </div>
  );
};

// Conversation Loading
const ConversationLoading = () => {
  return (
    <div className="flex flex-col items-center space-y-4 p-6">
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1s'
            }}
          ></div>
        ))}
      </div>
      <p className="text-white/80 text-sm">Loading conversation...</p>
    </div>
  );
};

// Full Page Loading
const FullPageLoading = ({ 
  message = "Loading ApexMatch...", 
  submessage = "Creating authentic connections" 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/30 rounded-full blur-3xl"></div>
      </div>

      <div className="relative text-center">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4 rounded-2xl">
            <Heart className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Brand */}
        <h1 className="text-4xl font-bold text-white mb-2">ApexMatch</h1>
        <p className="text-purple-300 mb-8">{submessage}</p>

        {/* Loading Animation */}
        <ApexLoading message={message} size="lg" />

        {/* Tips */}
        <div className="mt-12 max-w-md mx-auto">
          <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-white/80 text-sm font-medium">Did you know?</span>
            </div>
            <p className="text-white/60 text-sm">
              ApexMatch users are 3x more likely to form lasting relationships than traditional dating apps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Loading Component
const Loading = ({ 
  type = 'basic', 
  size = 'md', 
  color = 'purple', 
  message = '',
  fullPage = false,
  ...props 
}) => {
  if (fullPage) {
    return <FullPageLoading message={message} {...props} />;
  }

  switch (type) {
    case 'apex':
      return <ApexLoading message={message} size={size} {...props} />;
    case 'bgp':
      return <BGPLoading {...props} />;
    case 'matching':
      return <MatchingLoading {...props} />;
    case 'conversation':
      return <ConversationLoading {...props} />;
    case 'basic':
    default:
      return <BasicLoading size={size} color={color} {...props} />;
  }
};

// Export individual components for specific use cases
export default Loading;
export { 
  BasicLoading, 
  ApexLoading, 
  BGPLoading, 
  MatchingLoading, 
  ConversationLoading, 
  FullPageLoading 
};