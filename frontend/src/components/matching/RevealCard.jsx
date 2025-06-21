import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Heart, Sparkles, Clock, CheckCircle, X, Star } from 'lucide-react';

const RevealCard = ({ 
  match, 
  revealRequest, 
  onAccept, 
  onDecline, 
  onCancel,
  currentUser,
  type = 'received' // received, sent, mutual
}) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpiring, setIsExpiring] = useState(false);

  useEffect(() => {
    if (revealRequest?.expires_at) {
      const updateTimer = () => {
        const now = new Date();
        const expiry = new Date(revealRequest.expires_at);
        const diff = expiry - now;

        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setTimeRemaining({ hours, minutes });
          setIsExpiring(diff < 60 * 60 * 1000); // Less than 1 hour
        } else {
          setTimeRemaining(null);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [revealRequest?.expires_at]);

  const getCardStyle = () => {
    switch (type) {
      case 'received':
        return {
          gradient: 'from-pink-500/20 to-purple-500/20',
          border: 'border-pink-500/30',
          icon: Eye,
          iconColor: 'text-pink-400',
          title: `${match.anonymous_name} wants to reveal!`,
          subtitle: 'They\'re ready to show you who they are'
        };
      case 'sent':
        return {
          gradient: 'from-blue-500/20 to-cyan-500/20',
          border: 'border-blue-500/30',
          icon: Clock,
          iconColor: 'text-blue-400',
          title: 'Reveal request sent',
          subtitle: `Waiting for ${match.anonymous_name} to respond`
        };
      case 'mutual':
        return {
          gradient: 'from-green-500/20 to-emerald-500/20',
          border: 'border-green-500/30',
          icon: CheckCircle,
          iconColor: 'text-green-400',
          title: 'Mutual reveal ready!',
          subtitle: 'You\'re both ready to see each other'
        };
      default:
        return {
          gradient: 'from-gray-500/20 to-slate-500/20',
          border: 'border-gray-500/30',
          icon: EyeOff,
          iconColor: 'text-gray-400',
          title: 'Reveal status unknown',
          subtitle: 'Processing request...'
        };
    }
  };

  const cardStyle = getCardStyle();
  const Icon = cardStyle.icon;

  return (
    <div className={`bg-gradient-to-r ${cardStyle.gradient} backdrop-blur-lg rounded-2xl border ${cardStyle.border} p-6 shadow-xl`}>
      
      {/* Header */}
      <div className="flex items-center space-x-4 mb-4">
        <div className={`p-3 rounded-xl bg-white/10 ${cardStyle.iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{cardStyle.title}</h3>
          <p className="text-gray-300 text-sm">{cardStyle.subtitle}</p>
        </div>

        {/* Timer */}
        {timeRemaining && (
          <div className={`text-center ${isExpiring ? 'animate-pulse' : ''}`}>
            <div className={`text-lg font-bold ${isExpiring ? 'text-red-400' : 'text-white'}`}>
              {timeRemaining.hours}h {timeRemaining.minutes}m
            </div>
            <div className="text-xs text-gray-400">remaining</div>
          </div>
        )}
      </div>

      {/* Connection Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white text-sm font-medium">Emotional Connection</span>
          <span className="text-white font-bold">{match.emotional_connection_score || 0}%</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(match.emotional_connection_score || 0, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Journey Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-pink-400">{match.conversation_days || 0}</div>
          <div className="text-xs text-gray-300">Days</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-purple-400">{match.messages_exchanged || 0}</div>
          <div className="text-xs text-gray-300">Messages</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-blue-400">{match.compatibility_score || 0}%</div>
          <div className="text-xs text-gray-300">Compatible</div>
        </div>
      </div>

      {/* Reveal Highlights */}
      <div className="bg-white/5 rounded-xl p-4 mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span className="text-white text-sm font-medium">Why this reveal feels right</span>
        </div>
        <div className="space-y-2">
          {match.reveal_reasons?.map((reason, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Star className="w-3 h-3 text-yellow-400" />
              <span className="text-gray-300 text-sm">{reason}</span>
            </div>
          )) || (
            <>
              <div className="flex items-center space-x-2">
                <Star className="w-3 h-3 text-yellow-400" />
                <span className="text-gray-300 text-sm">Deep emotional connection established</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-3 h-3 text-yellow-400" />
                <span className="text-gray-300 text-sm">Consistent vulnerable sharing</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-3 h-3 text-yellow-400" />
                <span className="text-gray-300 text-sm">High behavioral compatibility</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {type === 'received' && (
          <div className="flex space-x-3">
            <button
              onClick={() => onAccept(revealRequest.id)}
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <Eye className="w-5 h-5" />
              <span>Accept Reveal</span>
            </button>
            
            <button
              onClick={() => onDecline(revealRequest.id)}
              className="px-6 bg-white/10 text-white py-3 rounded-xl font-medium hover:bg-white/20 transition-all duration-300"
            >
              Not Yet
            </button>
          </div>
        )}

        {type === 'sent' && (
          <div className="flex space-x-3">
            <button
              onClick={() => onCancel(revealRequest.id)}
              className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 py-3 rounded-xl font-medium hover:bg-red-500/30 transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <X className="w-5 h-5" />
              <span>Cancel Request</span>
            </button>
          </div>
        )}

        {type === 'mutual' && (
          <button
            onClick={() => onAccept(revealRequest.id)}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>Begin Reveal Ritual</span>
          </button>
        )}
      </div>

      {/* Helper Text */}
      <div className="mt-4 text-center">
        {type === 'received' && (
          <p className="text-gray-400 text-xs">
            Take your time. You can reveal when it feels right for you.
          </p>
        )}
        {type === 'sent' && (
          <p className="text-gray-400 text-xs">
            {timeRemaining 
              ? `Request expires in ${timeRemaining.hours}h ${timeRemaining.minutes}m`
              : 'Waiting for response...'
            }
          </p>
        )}
        {type === 'mutual' && (
          <p className="text-gray-400 text-xs">
            You're both ready! The reveal ritual will guide you through this special moment.
          </p>
        )}
      </div>

      {/* Expiry Warning */}
      {isExpiring && type === 'received' && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="text-red-300 text-sm">This reveal request expires soon!</span>
        </div>
      )}
    </div>
  );
};

export default RevealCard;