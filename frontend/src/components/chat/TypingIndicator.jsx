import React, { useState, useEffect } from 'react';
import { MessageCircle, Heart, Sparkles } from 'lucide-react';

const TypingIndicator = ({ 
  isTyping = false, 
  userName = 'Someone', 
  typingType = 'normal', // normal, emotional, thoughtful
  showAvatar = true 
}) => {
  const [dots, setDots] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(isTyping);
  }, [isTyping]);

  useEffect(() => {
    if (!isTyping) return;

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isTyping]);

  const getTypingMessage = () => {
    switch (typingType) {
      case 'emotional':
        return `${userName} is sharing something meaningful${dots}`;
      case 'thoughtful':
        return `${userName} is thinking deeply${dots}`;
      case 'vulnerable':
        return `${userName} is opening up${dots}`;
      default:
        return `${userName} is typing${dots}`;
    }
  };

  const getTypingIcon = () => {
    switch (typingType) {
      case 'emotional':
        return <Heart className="w-4 h-4 text-pink-400" />;
      case 'thoughtful':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'vulnerable':
        return <Heart className="w-4 h-4 text-red-400" />;
      default:
        return <MessageCircle className="w-4 h-4 text-blue-400" />;
    }
  };

  const getTypingColor = () => {
    switch (typingType) {
      case 'emotional':
        return 'from-pink-500/20 to-rose-500/20 border-pink-500/30';
      case 'thoughtful':
        return 'from-purple-500/20 to-indigo-500/20 border-purple-500/30';
      case 'vulnerable':
        return 'from-red-500/20 to-pink-500/20 border-red-500/30';
      default:
        return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`flex justify-start mb-4 transform transition-all duration-500 ${
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
    }`}>
      <div className="flex items-end space-x-2 max-w-xs lg:max-w-md">
        
        {/* Avatar */}
        {showAvatar && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            {userName[0] || '?'}
          </div>
        )}

        {/* Typing Bubble */}
        <div className={`bg-gradient-to-r ${getTypingColor()} backdrop-blur-sm rounded-2xl rounded-bl-md px-4 py-3 border`}>
          <div className="flex items-center space-x-3">
            
            {/* Animated Dots */}
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '1s'
                  }}
                ></div>
              ))}
            </div>

            {/* Typing Icon */}
            <div className="animate-pulse">
              {getTypingIcon()}
            </div>
          </div>

          {/* Typing Message */}
          <div className="mt-2 text-white/80 text-sm">
            {getTypingMessage()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced version with emotional context
const EnhancedTypingIndicator = ({ 
  isTyping = false, 
  userName = 'Someone', 
  emotionalContext = null,
  messageLength = 0,
  showAvatar = true 
}) => {
  const [typingType, setTypingType] = useState('normal');
  const [typingDuration, setTypingDuration] = useState(0);

  useEffect(() => {
    if (!isTyping) {
      setTypingDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setTypingDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTyping]);

  useEffect(() => {
    // Determine typing type based on context and duration
    if (emotionalContext?.vulnerability > 0.7) {
      setTypingType('vulnerable');
    } else if (typingDuration > 10) {
      setTypingType('thoughtful');
    } else if (emotionalContext?.emotional_intensity > 0.6) {
      setTypingType('emotional');
    } else {
      setTypingType('normal');
    }
  }, [emotionalContext, typingDuration]);

  return (
    <div className="relative">
      <TypingIndicator
        isTyping={isTyping}
        userName={userName}
        typingType={typingType}
        showAvatar={showAvatar}
      />
      
      {/* Advanced Indicators */}
      {isTyping && (
        <div className="absolute -top-8 left-12 flex space-x-2">
          
          {/* Long Message Indicator */}
          {messageLength > 100 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-white/70 animate-pulse">
              📝 Long message
            </div>
          )}
          
          {/* Emotional Intensity Indicator */}
          {emotionalContext?.emotional_intensity > 0.7 && (
            <div className="bg-pink-500/20 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-pink-300 animate-pulse">
              💖 Heartfelt
            </div>
          )}
          
          {/* Deep Thought Indicator */}
          {typingDuration > 15 && (
            <div className="bg-purple-500/20 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-purple-300 animate-pulse">
              🤔 Deep thought
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TypingIndicator;
export { EnhancedTypingIndicator };