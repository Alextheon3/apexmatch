import React, { useState, useEffect } from 'react';
import { Heart, Check, CheckCheck, Clock, Sparkles } from 'lucide-react';

const MessageBubble = ({ 
  message, 
  isOwn, 
  showAvatar = true, 
  showTimestamp = true,
  emotionalScore = null,
  onEmotionalReaction = null 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showEmotions, setShowEmotions] = useState(false);

  useEffect(() => {
    // Animate message appearance
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStatus = (status) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-400" />;
      default:
        return null;
    }
  };

  const getEmotionalColor = (score) => {
    if (!score) return '';
    if (score >= 0.8) return 'ring-2 ring-pink-400/50';
    if (score >= 0.6) return 'ring-2 ring-purple-400/50';
    if (score >= 0.4) return 'ring-2 ring-blue-400/50';
    return '';
  };

  const handleEmotionalReaction = (emotion) => {
    if (onEmotionalReaction) {
      onEmotionalReaction(message.id, emotion);
    }
    setShowEmotions(false);
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md transform transition-all duration-500 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}>
        
        {/* Avatar (for received messages) */}
        {!isOwn && showAvatar && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            {message.sender_name?.[0] || '?'}
          </div>
        )}

        <div className="relative">
          {/* Message Bubble */}
          <div 
            className={`px-4 py-3 rounded-2xl relative ${
              isOwn 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-md' 
                : 'bg-white/10 backdrop-blur-sm text-white rounded-bl-md'
            } ${getEmotionalColor(emotionalScore)}`}
            onDoubleClick={() => setShowEmotions(true)}
          >
            {/* Message Content */}
            <p className="leading-relaxed">{message.content}</p>
            
            {/* Emotional Intensity Indicator */}
            {emotionalScore && emotionalScore > 0.6 && (
              <div className="flex items-center space-x-1 mt-2 opacity-70">
                <Sparkles className="w-3 h-3" />
                <span className="text-xs">
                  {emotionalScore >= 0.8 ? 'Deep connection' : 'Emotional moment'}
                </span>
              </div>
            )}

            {/* Message Type Indicators */}
            {message.message_type === 'vulnerability' && (
              <div className="absolute -top-1 -right-1">
                <div className="w-3 h-3 bg-pink-400 rounded-full animate-pulse"></div>
              </div>
            )}
            
            {message.message_type === 'humor' && (
              <div className="absolute -top-1 -right-1">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>

          {/* Timestamp and Status */}
          {showTimestamp && (
            <div className={`flex items-center space-x-1 mt-1 ${
              isOwn ? 'justify-end' : 'justify-start'
            }`}>
              <span className="text-xs text-gray-400">
                {formatTime(message.timestamp)}
              </span>
              {isOwn && getMessageStatus(message.status)}
            </div>
          )}

          {/* Emotional Reactions Popup */}
          {showEmotions && (
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-lg rounded-2xl p-3 border border-white/20 animate-fade-in">
              <div className="flex space-x-2">
                {['💕', '😊', '😢', '😮', '💭', '🔥'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmotionalReaction(emoji)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white/10 rotate-45 border-r border-b border-white/20"></div>
            </div>
          )}

          {/* Emotional Reactions Display */}
          {message.reactions && message.reactions.length > 0 && (
            <div className={`flex space-x-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {message.reactions.map((reaction, index) => (
                <div
                  key={index}
                  className="bg-white/10 rounded-full px-2 py-1 text-xs flex items-center space-x-1"
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-gray-400">{reaction.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Avatar (for sent messages) */}
        {isOwn && showAvatar && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            You
          </div>
        )}
      </div>

      {/* Hidden interaction hint */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-2 flex items-center">
        <div className="bg-white/5 rounded-lg px-2 py-1 text-xs text-gray-400">
          Double tap for emotions
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;