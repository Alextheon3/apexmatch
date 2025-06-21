import React, { useState, useEffect, useRef } from 'react';
import { Send, Heart, Brain, Eye, EyeOff, Sparkles, Clock, Star, MoreVertical, Smile, AlertCircle } from 'lucide-react';

const ChatBox = ({ 
  conversationId, 
  currentUser, 
  onSendMessage, 
  onRequestReveal,
  websocketConnection = null,
  apiBaseUrl = 'http://localhost:8000'
}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [emotionalInsights, setEmotionalInsights] = useState(null);
  const [showInsights, setShowInsights] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load conversation data on mount
  useEffect(() => {
    if (conversationId) {
      loadConversation();
      loadMessages();
    }
  }, [conversationId]);

  // WebSocket message handling
  useEffect(() => {
    if (websocketConnection) {
      websocketConnection.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
    }
  }, [websocketConnection]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBaseUrl}/api/v1/conversations/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConversation(data);
        await loadEmotionalInsights();
      } else {
        throw new Error('Failed to load conversation');
      }
    } catch (err) {
      setError(err.message);
      // Fallback to mock data for development
      setConversation({
        id: conversationId,
        other_user: {
          id: 2,
          first_name: 'Sarah',
          age: 28,
          is_online: true
        },
        is_blind: true,
        emotional_connection_score: 0.73,
        reveal_status: 'not_ready'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBaseUrl}/api/v1/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        throw new Error('Failed to load messages');
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      // Fallback to mock messages for development
      setMessages([
        {
          id: 1,
          sender_id: 2,
          content: "Hi! I'm excited to get to know you beyond the surface. What's something that genuinely made you smile today?",
          created_at: new Date(Date.now() - 3600000),
          emotional_tone: 'positive',
          depth_score: 0.7,
          vulnerability_level: 0.3
        },
        {
          id: 2,
          sender_id: currentUser.id,
          content: "Hey! I love that question. Honestly, I was reading this book about philosophy and there was this passage about how small moments of connection can be more meaningful than grand gestures. It made me think about how rare it is to have conversations that actually matter.",
          created_at: new Date(Date.now() - 3300000),
          emotional_tone: 'thoughtful',
          depth_score: 0.8,
          vulnerability_level: 0.6
        },
        {
          id: 3,
          sender_id: 2,
          content: "That's beautiful! I completely agree. I've been thinking lately about how we're all so afraid of being truly seen, but that's exactly what creates real intimacy. What's something you believe that most people might not understand?",
          created_at: new Date(Date.now() - 3000000),
          emotional_tone: 'vulnerable',
          depth_score: 0.9,
          vulnerability_level: 0.8
        }
      ]);
    }
  };

  const loadEmotionalInsights = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBaseUrl}/api/v1/conversations/${conversationId}/insights`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmotionalInsights(data);
      } else {
        throw new Error('Failed to load emotional insights');
      }
    } catch (err) {
      console.error('Error loading insights:', err);
      // Fallback to mock insights
      setEmotionalInsights({
        connection_strength: 0.73,
        conversation_depth: 0.78,
        mutual_vulnerability: 0.71,
        emotional_sync: 0.69,
        ready_for_reveal: false,
        insights: [
          "You both value deep, meaningful conversations",
          "High emotional vulnerability from both sides", 
          "Strong philosophical alignment",
          "Excellent question-asking dynamic"
        ],
        behavioral_observations: {
          your_style: "Reflective and emotionally intelligent communicator",
          their_style: "Thoughtful question-asker who creates safe space",
          compatibility: "Very high - you both prioritize emotional depth"
        }
      });
    }
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'new_message':
        setMessages(prev => [...prev, data.message]);
        updateEmotionalConnection(data.message);
        break;
      case 'typing_status':
        if (data.user_id !== currentUser.id) {
          setTyping(data.is_typing);
        }
        break;
      case 'emotional_milestone':
        // Handle emotional milestone notifications
        break;
      case 'reveal_eligible':
        setEmotionalInsights(prev => ({
          ...prev,
          ready_for_reveal: true
        }));
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const messageData = {
      content: message.trim(),
      conversation_id: conversationId
    };

    try {
      // Send via WebSocket if available
      if (websocketConnection && websocketConnection.readyState === WebSocket.OPEN) {
        websocketConnection.send(JSON.stringify({
          type: 'send_message',
          ...messageData
        }));
      } else {
        // Fallback to HTTP API
        const token = localStorage.getItem('token');
        const response = await fetch(`${apiBaseUrl}/api/v1/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messageData)
        });

        if (response.ok) {
          const newMessage = await response.json();
          setMessages(prev => [...prev, newMessage]);
          updateEmotionalConnection(newMessage);
        } else {
          throw new Error('Failed to send message');
        }
      }

      setMessage('');
      
      if (onSendMessage) {
        onSendMessage(messageData);
      }

    } catch (err) {
      console.error('Error sending message:', err);
      // For development, add message locally
      const newMessage = {
        id: Date.now(),
        sender_id: currentUser.id,
        content: message,
        created_at: new Date(),
        emotional_tone: analyzeEmotionalTone(message),
        depth_score: analyzeDepth(message),
        vulnerability_level: analyzeVulnerability(message)
      };

      setMessages(prev => [...prev, newMessage]);
      setMessage('');
      updateEmotionalConnection(newMessage);
    }
  };

  const handleTyping = (isTyping) => {
    if (websocketConnection && websocketConnection.readyState === WebSocket.OPEN) {
      websocketConnection.send(JSON.stringify({
        type: isTyping ? 'typing_start' : 'typing_stop',
        conversation_id: conversationId
      }));
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    
    // Handle typing indicators
    if (!typing) {
      handleTyping(true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false);
    }, 1000);
  };

  const updateEmotionalConnection = (newMessage) => {
    if (newMessage.depth_score > 0.7 || newMessage.vulnerability_level > 0.6) {
      setEmotionalInsights(prev => prev ? {
        ...prev,
        connection_strength: Math.min(1.0, prev.connection_strength + 0.02),
        conversation_depth: Math.min(1.0, prev.conversation_depth + 0.01),
        ready_for_reveal: prev.connection_strength > 0.75
      } : null);
    }
  };

  const analyzeEmotionalTone = (text) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('love') || lowerText.includes('amazing') || lowerText.includes('wonderful')) return 'positive';
    if (lowerText.includes('feel') || lowerText.includes('believe') || lowerText.includes('think')) return 'thoughtful';
    if (lowerText.includes('nervous') || lowerText.includes('scared') || lowerText.includes('vulnerable')) return 'vulnerable';
    return 'neutral';
  };

  const analyzeDepth = (text) => {
    const depthIndicators = ['because', 'believe', 'feel', 'think', 'experience', 'meaningful', 'important'];
    const matches = depthIndicators.filter(indicator => text.toLowerCase().includes(indicator));
    return Math.min(1.0, 0.3 + (matches.length * 0.15));
  };

  const analyzeVulnerability = (text) => {
    const vulnerabilityKeywords = ['afraid', 'nervous', 'vulnerable', 'personal', 'struggle', 'difficult', 'challenge'];
    const matches = vulnerabilityKeywords.filter(keyword => text.toLowerCase().includes(keyword));
    return Math.min(1.0, matches.length * 0.3);
  };

  const getEmotionalToneColor = (tone) => {
    const colors = {
      positive: 'text-green-400',
      negative: 'text-red-400',
      thoughtful: 'text-blue-400',
      vulnerable: 'text-purple-400',
      supportive: 'text-pink-400',
      neutral: 'text-gray-400'
    };
    return colors[tone] || colors.neutral;
  };

  const getEmotionalToneIcon = (tone) => {
    const icons = {
      positive: '😊',
      negative: '😔',
      thoughtful: '🤔',
      vulnerable: '💙',
      supportive: '🤗',
      neutral: '💬'
    };
    return icons[tone] || icons.neutral;
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl text-white h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error && !conversation) {
    return (
      <div className="bg-gradient-to-br from-red-900 to-purple-900 rounded-2xl text-white h-96 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-300">Failed to load conversation</p>
          <button 
            onClick={loadConversation}
            className="mt-4 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl text-white h-full flex flex-col max-h-[600px]">
      {/* Chat Header */}
      <div className="p-4 border-b border-purple-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              {conversation?.is_blind ? <EyeOff className="w-5 h-5" /> : <span className="text-sm font-bold">{conversation?.other_user?.first_name?.[0]}</span>}
            </div>
            <div>
              <h3 className="font-bold">{conversation?.other_user?.first_name || 'Unknown'}</h3>
              <div className="flex items-center space-x-2 text-sm text-purple-300">
                <span>{conversation?.other_user?.age || '?'} years old</span>
                {conversation?.other_user?.is_online && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Online</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setShowInsights(!showInsights)}
            className="p-2 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors"
          >
            <Brain className="w-4 h-4" />
          </button>
        </div>

        {/* Emotional Connection Progress */}
        {emotionalInsights && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-purple-300">Emotional Connection</span>
              <span className="text-xs font-semibold">{Math.round((emotionalInsights.connection_strength || 0) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-gradient-to-r from-purple-400 to-pink-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(emotionalInsights.connection_strength || 0) * 100}%` }}
              ></div>
            </div>
            
            {emotionalInsights.ready_for_reveal && (
              <div className="mt-2 flex items-center justify-between bg-yellow-500 bg-opacity-20 rounded-lg p-2">
                <div className="flex items-center space-x-2">
                  <Eye className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs font-semibold text-yellow-400">Ready for Reveal</span>
                </div>
                <button 
                  onClick={onRequestReveal}
                  className="bg-yellow-500 text-black px-3 py-1 rounded text-xs font-semibold hover:bg-yellow-400 transition-colors"
                >
                  Request
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Insights Panel */}
      {showInsights && emotionalInsights && (
        <div className="p-3 bg-black bg-opacity-30 border-b border-purple-700 text-sm flex-shrink-0">
          <h4 className="font-semibold mb-2 flex items-center">
            <Sparkles className="w-3 h-3 text-purple-400 mr-1" />
            Live Analysis
          </h4>
          
          <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
            <div>
              <span className="text-purple-300">Depth:</span>
              <span className="ml-1 font-semibold">{Math.round(emotionalInsights.conversation_depth * 100)}%</span>
            </div>
            <div>
              <span className="text-purple-300">Vulnerability:</span>
              <span className="ml-1 font-semibold">{Math.round(emotionalInsights.mutual_vulnerability * 100)}%</span>
            </div>
          </div>
          
          <div className="text-xs text-purple-200">
            <strong>Your style:</strong> {emotionalInsights.behavioral_observations?.your_style || 'Analyzing...'}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.map((msg) => {
          const isCurrentUser = msg.sender_id === currentUser.id;
          return (
            <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                <div className={`rounded-2xl px-3 py-2 text-sm ${
                  isCurrentUser 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                    : 'bg-black bg-opacity-30 text-white'
                }`}>
                  <p className="leading-relaxed">{msg.content}</p>
                </div>
                
                {/* Message Analytics */}
                <div className={`mt-1 flex items-center space-x-1 text-xs ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-purple-400">{formatTime(msg.created_at)}</span>
                  <span className={getEmotionalToneColor(msg.emotional_tone)}>
                    {getEmotionalToneIcon(msg.emotional_tone)}
                  </span>
                  {msg.depth_score > 0.7 && (
                    <div className="flex items-center space-x-1">
                      <Brain className="w-2 h-2 text-blue-400" />
                    </div>
                  )}
                  {msg.vulnerability_level > 0.6 && (
                    <div className="flex items-center space-x-1">
                      <Heart className="w-2 h-2 text-pink-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {typing && (
          <div className="flex justify-start">
            <div className="bg-black bg-opacity-30 rounded-2xl px-3 py-2 max-w-xs">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-3 border-t border-purple-700 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={handleInputChange}
              placeholder="Share something meaningful..."
              className="w-full bg-black bg-opacity-30 border border-purple-400 rounded-xl px-3 py-2 text-white placeholder-purple-300 focus:outline-none focus:border-purple-300 resize-none text-sm"
              rows={2}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            
            {/* Live message analysis */}
            {message.trim() && (
              <div className="absolute -top-12 left-0 right-0 bg-black bg-opacity-80 rounded-lg p-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-purple-300">
                      Depth: <span className="font-semibold">{Math.round(analyzeDepth(message) * 100)}%</span>
                    </span>
                    <span className="text-pink-300">
                      Vulnerability: <span className="font-semibold">{Math.round(analyzeVulnerability(message) * 100)}%</span>
                    </span>
                  </div>
                  <span className={`${getEmotionalToneColor(analyzeEmotionalTone(message))}`}>
                    {getEmotionalToneIcon(analyzeEmotionalTone(message))}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-xl transition-all transform hover:scale-105"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Character count and tips */}
        <div className="mt-2 flex items-center justify-between text-xs text-purple-400">
          <div className="flex items-center space-x-2">
            <span>{message.length}/500</span>
            {message.trim() && analyzeDepth(message) > 0.7 && (
              <div className="flex items-center space-x-1 text-blue-400">
                <Brain className="w-3 h-3" />
                <span>Building deeper connection</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Building your BGP</span>
          </div>
        </div>
      </div>

      {/* Connection Milestone Notifications */}
      {emotionalInsights?.connection_strength > 0.8 && (
        <div className="absolute top-4 left-4 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg p-3 shadow-lg animate-slide-down">
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4" />
            <span className="font-semibold text-sm">Milestone Reached!</span>
          </div>
          <p className="text-xs mt-1">You've built exceptional emotional connection. Consider requesting reveal!</p>
        </div>
      )}
    </div>
  );
};

export default ChatBox;