import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

// WebSocket connection states
const WS_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

// Message types for ApexMatch WebSocket protocol
const MESSAGE_TYPES = {
  // Authentication
  AUTH: 'auth',
  AUTH_SUCCESS: 'auth_success',
  AUTH_FAILED: 'auth_failed',
  
  // Chat messages
  MESSAGE: 'message',
  MESSAGE_DELIVERED: 'message_delivered',
  MESSAGE_READ: 'message_read',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  
  // Matching
  NEW_MATCH: 'new_match',
  MATCH_LIKED: 'match_liked',
  MATCH_MUTUAL: 'match_mutual',
  MATCH_PASSED: 'match_passed',
  
  // Reveal system
  REVEAL_REQUEST: 'reveal_request',
  REVEAL_ACCEPTED: 'reveal_accepted',
  REVEAL_DECLINED: 'reveal_declined',
  REVEAL_MUTUAL: 'reveal_mutual',
  
  // Presence
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  USER_TYPING: 'user_typing',
  USER_STOPPED_TYPING: 'user_stopped_typing',
  
  // Notifications
  NOTIFICATION: 'notification',
  TRUST_SCORE_UPDATE: 'trust_score_update',
  BGP_UPDATE: 'bgp_update',
  
  // System
  HEARTBEAT: 'heartbeat',
  HEARTBEAT_ACK: 'heartbeat_ack',
  ERROR: 'error',
  RECONNECT: 'reconnect'
};

// Enhanced WebSocket hook for ApexMatch
export const useWebSocket = (options = {}) => {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 3000,
    heartbeatInterval = 30000,
    messageTimeout = 10000
  } = options;

  const { user, token, isAuthenticated } = useAuth();
  const [connectionState, setConnectionState] = useState(WS_STATES.DISCONNECTED);
  const [lastMessage, setLastMessage] = useState(null);
  const [messageHistory, setMessageHistory] = useState([]);
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(null);

  const ws = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const heartbeatTimeoutRef = useRef(null);
  const reconnectCount = useRef(0);
  const messageHandlers = useRef(new Map());
  const messageQueue = useRef([]);
  const pendingMessages = useRef(new Map());
  const lastHeartbeat = useRef(null);

  // Get WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.REACT_APP_WS_URL || window.location.host;
    return `${protocol}//${host}/ws`;
  }, []);

  // Send message through WebSocket
  const sendMessage = useCallback((type, payload = {}, options = {}) => {
    const { 
      expectResponse = false, 
      timeout = messageTimeout,
      retries = 3 
    } = options;

    const message = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify(message));
        
        // Track pending message if expecting response
        if (expectResponse) {
          const timeoutId = setTimeout(() => {
            pendingMessages.current.delete(message.id);
            console.warn(`Message timeout: ${message.id}`);
          }, timeout);
          
          pendingMessages.current.set(message.id, {
            message,
            timeout: timeoutId,
            retries: retries - 1
          });
        }
        
        return { success: true, messageId: message.id };
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Queue message for when connection is restored
      messageQueue.current.push({ message, options });
      return { success: false, error: 'Not connected', queued: true };
    }
  }, [messageTimeout]);

  // Process queued messages
  const processMessageQueue = useCallback(() => {
    while (messageQueue.current.length > 0 && ws.current?.readyState === WebSocket.OPEN) {
      const { message, options } = messageQueue.current.shift();
      sendMessage(message.type, message.payload, options);
    }
  }, [sendMessage]);

  // Start heartbeat mechanism
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        lastHeartbeat.current = Date.now();
        sendMessage(MESSAGE_TYPES.HEARTBEAT, { 
          timestamp: lastHeartbeat.current,
          client_id: user?.id 
        });

        // Set timeout for heartbeat response
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn('Heartbeat timeout - connection may be lost');
          setLatency(null);
        }, 5000);
      }
    }, heartbeatInterval);
  }, [heartbeatInterval, sendMessage, user?.id]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.data);
      setLastMessage(message);
      setMessageHistory(prev => [...prev.slice(-99), message]); // Keep last 100 messages

      // Handle heartbeat response
      if (message.type === MESSAGE_TYPES.HEARTBEAT_ACK) {
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }
        if (lastHeartbeat.current) {
          const latencyMs = Date.now() - lastHeartbeat.current;
          setLatency(latencyMs);
        }
        return;
      }

      // Handle pending message responses
      if (message.response_to && pendingMessages.current.has(message.response_to)) {
        const pending = pendingMessages.current.get(message.response_to);
        clearTimeout(pending.timeout);
        pendingMessages.current.delete(message.response_to);
      }

      // Route message to specific handlers
      const handler = messageHandlers.current.get(message.type);
      if (handler) {
        try {
          handler(message.payload, message);
        } catch (error) {
          console.error(`Error in message handler for ${message.type}:`, error);
        }
      }

      // Handle system messages
      switch (message.type) {
        case MESSAGE_TYPES.AUTH_SUCCESS:
          setConnectionState(WS_STATES.CONNECTED);
          setError(null);
          processMessageQueue();
          startHeartbeat();
          console.log('WebSocket authenticated successfully');
          break;

        case MESSAGE_TYPES.AUTH_FAILED:
          setError('Authentication failed');
          setConnectionState(WS_STATES.ERROR);
          console.error('WebSocket authentication failed');
          break;

        case MESSAGE_TYPES.ERROR:
          setError(message.payload.error || 'Unknown WebSocket error');
          console.error('WebSocket error:', message.payload);
          break;

        case MESSAGE_TYPES.RECONNECT:
          console.log('Server requested reconnection');
          setTimeout(() => connect(), 1000);
          break;

        default:
          // Forward to global event system for other components
          window.dispatchEvent(new CustomEvent('websocket-message', {
            detail: { type: message.type, payload: message.payload, message }
          }));
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error, event.data);
      setError('Invalid message received');
    }
  }, [processMessageQueue, startHeartbeat]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!isAuthenticated || !token) {
      console.warn('Cannot connect WebSocket without authentication');
      return;
    }

    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return; // Already connected
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionState(WS_STATES.CONNECTING);
    setError(null);

    try {
      const wsUrl = getWebSocketUrl();
      console.log('Connecting to WebSocket:', wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connection opened');
        reconnectCount.current = 0;
        
        // Authenticate immediately after connection
        sendMessage(MESSAGE_TYPES.AUTH, {
          token,
          user_id: user?.id,
          timestamp: Date.now(),
          client_info: {
            user_agent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
          }
        });
      };

      ws.current.onmessage = handleMessage;

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setConnectionState(WS_STATES.DISCONNECTED);
        stopHeartbeat();
        setLatency(null);

        // Clear pending messages
        pendingMessages.current.forEach(pending => {
          clearTimeout(pending.timeout);
        });
        pendingMessages.current.clear();

        // Attempt reconnection if not a clean close and within retry limit
        if (event.code !== 1000 && reconnectCount.current < reconnectAttempts) {
          setConnectionState(WS_STATES.RECONNECTING);
          reconnectCount.current++;
          
          const backoffDelay = reconnectDelay * Math.pow(2, reconnectCount.current - 1);
          console.log(`Attempting reconnection ${reconnectCount.current}/${reconnectAttempts} in ${backoffDelay}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, backoffDelay);
        } else if (reconnectCount.current >= reconnectAttempts) {
          setError('Connection failed after maximum retry attempts');
          setConnectionState(WS_STATES.ERROR);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error occurred');
        if (connectionState !== WS_STATES.RECONNECTING) {
          setConnectionState(WS_STATES.ERROR);
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError('Failed to establish connection');
      setConnectionState(WS_STATES.ERROR);
    }
  }, [isAuthenticated, token, user?.id, getWebSocketUrl, handleMessage, sendMessage, reconnectAttempts, reconnectDelay, stopHeartbeat, connectionState]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    console.log('Disconnecting WebSocket');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    // Clear pending messages
    pendingMessages.current.forEach(pending => {
      clearTimeout(pending.timeout);
    });
    pendingMessages.current.clear();

    if (ws.current) {
      ws.current.close(1000, 'Client disconnect');
      ws.current = null;
    }

    setConnectionState(WS_STATES.DISCONNECTED);
    setLatency(null);
    reconnectCount.current = 0;
    messageQueue.current = [];
  }, [stopHeartbeat]);

  // Subscribe to message type
  const subscribe = useCallback((messageType, handler) => {
    messageHandlers.current.set(messageType, handler);
    
    // Return unsubscribe function
    return () => {
      messageHandlers.current.delete(messageType);
    };
  }, []);

  // Auto-connect when authenticated
  useEffect(() => {
    if (autoConnect && isAuthenticated && token && user) {
      connect();
    }

    return () => {
      if (!autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, isAuthenticated, token, user, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Monitor connection health
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionState === WS_STATES.CONNECTED && latency === null) {
        console.warn('Connection health check: No recent heartbeat response');
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [connectionState, latency]);

  return {
    // Connection state
    connectionState,
    isConnected: connectionState === WS_STATES.CONNECTED,
    isConnecting: connectionState === WS_STATES.CONNECTING,
    isReconnecting: connectionState === WS_STATES.RECONNECTING,
    isDisconnected: connectionState === WS_STATES.DISCONNECTED,
    error,
    latency,
    
    // Message data
    lastMessage,
    messageHistory,
    
    // Actions
    connect,
    disconnect,
    sendMessage,
    subscribe,
    
    // Utilities
    reconnectAttempts: reconnectCount.current,
    maxReconnectAttempts: reconnectAttempts,
    queuedMessages: messageQueue.current.length,
    pendingMessages: pendingMessages.current.size
  };
};

// Hook for chat-specific WebSocket functionality
export const useChatWebSocket = (conversationId) => {
  const {
    connectionState,
    isConnected,
    sendMessage,
    subscribe
  } = useWebSocket();

  const [typingUsers, setTypingUsers] = useState(new Set());
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [messageStatus, setMessageStatus] = useState(new Map());
  const [conversationEvents, setConversationEvents] = useState([]);

  const typingTimeouts = useRef(new Map());

  // Send chat message
  const sendChatMessage = useCallback((content, messageType = 'text', metadata = {}) => {
    if (!isConnected) return { success: false, error: 'Not connected' };

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return sendMessage(MESSAGE_TYPES.MESSAGE, {
      conversation_id: conversationId,
      content,
      message_type: messageType,
      message_id: messageId,
      metadata
    }, { expectResponse: true });
  }, [isConnected, sendMessage, conversationId]);

  // Send typing indicator
  const sendTyping = useCallback((isTyping) => {
    if (!isConnected) return false;

    return sendMessage(
      isTyping ? MESSAGE_TYPES.TYPING_START : MESSAGE_TYPES.TYPING_STOP,
      { 
        conversation_id: conversationId,
        timestamp: Date.now()
      }
    );
  }, [isConnected, sendMessage, conversationId]);

  // Mark message as read
  const markAsRead = useCallback((messageId) => {
    if (!isConnected) return false;

    return sendMessage(MESSAGE_TYPES.MESSAGE_READ, {
      conversation_id: conversationId,
      message_id: messageId,
      timestamp: Date.now()
    });
  }, [isConnected, sendMessage, conversationId]);

  // Handle typing indicators
  useEffect(() => {
    const unsubscribeTypingStart = subscribe(MESSAGE_TYPES.TYPING_START, (payload) => {
      if (payload.conversation_id === conversationId) {
        setTypingUsers(prev => new Set([...prev, payload.user_id]));
        
        // Clear existing timeout for this user
        if (typingTimeouts.current.has(payload.user_id)) {
          clearTimeout(typingTimeouts.current.get(payload.user_id));
        }
        
        // Set timeout to remove typing indicator
        const timeout = setTimeout(() => {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(payload.user_id);
            return newSet;
          });
          typingTimeouts.current.delete(payload.user_id);
        }, 5000); // Remove after 5 seconds
        
        typingTimeouts.current.set(payload.user_id, timeout);
      }
    });

    const unsubscribeTypingStop = subscribe(MESSAGE_TYPES.TYPING_STOP, (payload) => {
      if (payload.conversation_id === conversationId) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(payload.user_id);
          return newSet;
        });
        
        // Clear timeout
        if (typingTimeouts.current.has(payload.user_id)) {
          clearTimeout(typingTimeouts.current.get(payload.user_id));
          typingTimeouts.current.delete(payload.user_id);
        }
      }
    });

    return () => {
      unsubscribeTypingStart();
      unsubscribeTypingStop();
      
      // Clear all timeouts
      typingTimeouts.current.forEach(timeout => clearTimeout(timeout));
      typingTimeouts.current.clear();
    };
  }, [subscribe, conversationId]);

  // Handle message status updates
  useEffect(() => {
    const unsubscribeDelivered = subscribe(MESSAGE_TYPES.MESSAGE_DELIVERED, (payload) => {
      if (payload.conversation_id === conversationId) {
        setMessageStatus(prev => new Map([...prev, [payload.message_id, 'delivered']]));
      }
    });

    const unsubscribeRead = subscribe(MESSAGE_TYPES.MESSAGE_READ, (payload) => {
      if (payload.conversation_id === conversationId) {
        setMessageStatus(prev => new Map([...prev, [payload.message_id, 'read']]));
      }
    });

    const unsubscribeMessage = subscribe(MESSAGE_TYPES.MESSAGE, (payload) => {
      if (payload.conversation_id === conversationId) {
        setConversationEvents(prev => [...prev.slice(-49), {
          type: 'message_received',
          timestamp: Date.now(),
          data: payload
        }]);
      }
    });

    return () => {
      unsubscribeDelivered();
      unsubscribeRead();
      unsubscribeMessage();
    };
  }, [subscribe, conversationId]);

  // Handle presence updates
  useEffect(() => {
    const unsubscribeOnline = subscribe(MESSAGE_TYPES.USER_ONLINE, (payload) => {
      setOnlineUsers(prev => new Set([...prev, payload.user_id]));
    });

    const unsubscribeOffline = subscribe(MESSAGE_TYPES.USER_OFFLINE, (payload) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(payload.user_id);
        return newSet;
      });
    });

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
    };
  }, [subscribe]);

  return {
    // Chat-specific state
    typingUsers: Array.from(typingUsers),
    onlineUsers: Array.from(onlineUsers),
    messageStatus,
    conversationEvents,
    
    // Chat actions
    sendChatMessage,
    sendTyping,
    markAsRead,
    
    // Connection state
    isConnected,
    connectionState
  };
};

// Hook for matching-specific WebSocket functionality
export const useMatchingWebSocket = () => {
  const {
    connectionState,
    isConnected,
    sendMessage,
    subscribe
  } = useWebSocket();

  const [newMatches, setNewMatches] = useState([]);
  const [mutualMatches, setMutualMatches] = useState([]);
  const [revealRequests, setRevealRequests] = useState([]);
  const [matchingEvents, setMatchingEvents] = useState([]);

  // Handle new matches
  useEffect(() => {
    const unsubscribe = subscribe(MESSAGE_TYPES.NEW_MATCH, (payload) => {
      setNewMatches(prev => [payload, ...prev.slice(0, 9)]); // Keep last 10
      setMatchingEvents(prev => [...prev.slice(-19), {
        type: 'new_match',
        timestamp: Date.now(),
        data: payload
      }]);
      
      // Trigger notification
      window.dispatchEvent(new CustomEvent('newMatch', {
        detail: payload
      }));
    });

    return unsubscribe;
  }, [subscribe]);

  // Handle mutual matches
  useEffect(() => {
    const unsubscribe = subscribe(MESSAGE_TYPES.MATCH_MUTUAL, (payload) => {
      setMutualMatches(prev => [payload, ...prev.slice(0, 9)]); // Keep last 10
      setMatchingEvents(prev => [...prev.slice(-19), {
        type: 'mutual_match',
        timestamp: Date.now(),
        data: payload
      }]);
      
      // Trigger celebration notification
      window.dispatchEvent(new CustomEvent('mutualMatch', {
        detail: payload
      }));
    });

    return unsubscribe;
  }, [subscribe]);

  // Handle reveal requests
  useEffect(() => {
    const unsubscribeRequest = subscribe(MESSAGE_TYPES.REVEAL_REQUEST, (payload) => {
      setRevealRequests(prev => [payload, ...prev]);
      setMatchingEvents(prev => [...prev.slice(-19), {
        type: 'reveal_request',
        timestamp: Date.now(),
        data: payload
      }]);
      
      window.dispatchEvent(new CustomEvent('revealRequest', {
        detail: payload
      }));
    });

    const unsubscribeAccepted = subscribe(MESSAGE_TYPES.REVEAL_ACCEPTED, (payload) => {
      setRevealRequests(prev => prev.filter(req => req.id !== payload.request_id));
      setMatchingEvents(prev => [...prev.slice(-19), {
        type: 'reveal_accepted',
        timestamp: Date.now(),
        data: payload
      }]);
      
      window.dispatchEvent(new CustomEvent('revealAccepted', {
        detail: payload
      }));
    });

    const unsubscribeMutual = subscribe(MESSAGE_TYPES.REVEAL_MUTUAL, (payload) => {
      setMatchingEvents(prev => [...prev.slice(-19), {
        type: 'reveal_mutual',
        timestamp: Date.now(),
        data: payload
      }]);
      
      window.dispatchEvent(new CustomEvent('revealMutual', {
        detail: payload
      }));
    });

    return () => {
      unsubscribeRequest();
      unsubscribeAccepted();
      unsubscribeMutual();
    };
  }, [subscribe]);

  // Send like action
  const sendLike = useCallback((matchId, metadata = {}) => {
    return sendMessage(MESSAGE_TYPES.MATCH_LIKED, {
      match_id: matchId,
      timestamp: Date.now(),
      ...metadata
    });
  }, [sendMessage]);

  // Send reveal request
  const sendRevealRequest = useCallback((matchId, message = null) => {
    return sendMessage(MESSAGE_TYPES.REVEAL_REQUEST, {
      match_id: matchId,
      timestamp: Date.now(),
      message
    });
  }, [sendMessage]);

  // Respond to reveal request
  const respondToReveal = useCallback((requestId, accepted, message = null) => {
    return sendMessage(
      accepted ? MESSAGE_TYPES.REVEAL_ACCEPTED : MESSAGE_TYPES.REVEAL_DECLINED,
      {
        request_id: requestId,
        timestamp: Date.now(),
        message
      }
    );
  }, [sendMessage]);

  return {
    // Matching state
    newMatches,
    mutualMatches,
    revealRequests,
    matchingEvents,
    
    // Matching actions
    sendLike,
    sendRevealRequest,
    respondToReveal,
    
    // Connection state
    isConnected,
    connectionState
  };
};

// Hook for notifications
export const useNotificationWebSocket = () => {
  const { subscribe } = useWebSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [systemUpdates, setSystemUpdates] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribe(MESSAGE_TYPES.NOTIFICATION, (payload) => {
      const notification = {
        id: payload.id || `notif_${Date.now()}`,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        timestamp: payload.timestamp || new Date().toISOString(),
        read: false,
        data: payload.data || {},
        priority: payload.priority || 'normal'
      };

      setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
      setUnreadCount(prev => prev + 1);

      // Trigger browser notification if permission granted
      if (Notification.permission === 'granted' && notification.priority !== 'low') {
        const browserNotif = new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192.png',
          tag: notification.type,
          badge: '/badge-72.png'
        });

        // Auto-close after 5 seconds for non-critical notifications
        if (notification.priority === 'normal') {
          setTimeout(() => browserNotif.close(), 5000);
        }
      }

      // Trigger custom event
      window.dispatchEvent(new CustomEvent('apexmatchNotification', {
        detail: notification
      }));
    });

    return unsubscribe;
  }, [subscribe]);

  // Handle system updates (BGP, trust score, etc.)
  useEffect(() => {
    const unsubscribeTrust = subscribe(MESSAGE_TYPES.TRUST_SCORE_UPDATE, (payload) => {
      setSystemUpdates(prev => [...prev.slice(-9), {
        type: 'trust_update',
        timestamp: Date.now(),
        data: payload
      }]);
      
      window.dispatchEvent(new CustomEvent('trustScoreUpdate', {
        detail: payload
      }));
    });

    const unsubscribeBGP = subscribe(MESSAGE_TYPES.BGP_UPDATE, (payload) => {
      setSystemUpdates(prev => [...prev.slice(-9), {
        type: 'bgp_update',
        timestamp: Date.now(),
        data: payload
      }]);
      
      window.dispatchEvent(new CustomEvent('bgpUpdate', {
        detail: payload
      }));
    });

    return () => {
      unsubscribeTrust();
      unsubscribeBGP();
    };
  }, [subscribe]);

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, read: true }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const getNotificationsByType = useCallback((type) => {
    return notifications.filter(notif => notif.type === type);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    systemUpdates,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    getNotificationsByType
  };
};

// Hook for presence management
export const usePresence = () => {
  const { isConnected, sendMessage, subscribe } = useWebSocket();
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [userActivity, setUserActivity] = useState(new Map());

  // Update user activity status
  const updateActivity = useCallback((status = 'active') => {
    if (isConnected) {
      sendMessage(MESSAGE_TYPES.USER_ONLINE, {
        status,
        timestamp: Date.now()
      });
    }
  }, [isConnected, sendMessage]);

  // Set user as away
  const setAway = useCallback(() => {
    updateActivity('away');
  }, [updateActivity]);

  // Set user as active
  const setActive = useCallback(() => {
    updateActivity('active');
  }, [updateActivity]);

  useEffect(() => {
    const unsubscribeOnline = subscribe(MESSAGE_TYPES.USER_ONLINE, (payload) => {
      setOnlineUsers(prev => new Set([...prev, payload.user_id]));
      setUserActivity(prev => new Map([...prev, [payload.user_id, {
        status: payload.status || 'active',
        timestamp: payload.timestamp
      }]]));
    });

    const unsubscribeOffline = subscribe(MESSAGE_TYPES.USER_OFFLINE, (payload) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(payload.user_id);
        return newSet;
      });
      setUserActivity(prev => {
        const newMap = new Map(prev);
        newMap.delete(payload.user_id);
        return newMap;
      });
    });

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
    };
  }, [subscribe]);

  // Auto-update activity on user interactions
  useEffect(() => {
    const handleUserActivity = () => {
      setActive();
    };

    const handleUserIdle = () => {
      setAway();
    };

    // Listen for user activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Set user as away after 5 minutes of inactivity
    let idleTimer = setTimeout(handleUserIdle, 5 * 60 * 1000);

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(handleUserIdle, 5 * 60 * 1000);
    };

    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
        document.removeEventListener(event, resetIdleTimer, true);
      });
      clearTimeout(idleTimer);
    };
  }, [setActive, setAway]);

  return {
    onlineUsers: Array.from(onlineUsers),
    userActivity,
    updateActivity,
    setActive,
    setAway,
    isUserOnline: (userId) => onlineUsers.has(userId),
    getUserActivity: (userId) => userActivity.get(userId)
  };
};

// Hook for WebSocket connection health monitoring
export const useConnectionHealth = () => {
  const { 
    connectionState, 
    latency, 
    error, 
    reconnectAttempts, 
    maxReconnectAttempts,
    queuedMessages,
    pendingMessages
  } = useWebSocket();

  const [connectionHistory, setConnectionHistory] = useState([]);
  const [averageLatency, setAverageLatency] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState('unknown');

  // Track connection state changes
  useEffect(() => {
    setConnectionHistory(prev => [...prev.slice(-19), {
      state: connectionState,
      timestamp: Date.now(),
      latency,
      error
    }]);
  }, [connectionState, latency, error]);

  // Calculate average latency
  useEffect(() => {
    if (latency !== null) {
      setAverageLatency(prev => {
        if (prev === null) return latency;
        return Math.round((prev * 0.8) + (latency * 0.2)); // Exponential moving average
      });
    }
  }, [latency]);

  // Determine connection quality
  useEffect(() => {
    if (connectionState !== 'connected') {
      setConnectionQuality('poor');
    } else if (averageLatency === null) {
      setConnectionQuality('unknown');
    } else if (averageLatency < 100) {
      setConnectionQuality('excellent');
    } else if (averageLatency < 300) {
      setConnectionQuality('good');
    } else if (averageLatency < 1000) {
      setConnectionQuality('fair');
    } else {
      setConnectionQuality('poor');
    }
  }, [connectionState, averageLatency]);

  const getHealthScore = useCallback(() => {
    let score = 0;
    
    // Connection state (40 points)
    if (connectionState === 'connected') score += 40;
    else if (connectionState === 'connecting') score += 20;
    
    // Latency (30 points)
    if (averageLatency !== null) {
      if (averageLatency < 100) score += 30;
      else if (averageLatency < 300) score += 20;
      else if (averageLatency < 1000) score += 10;
    }
    
    // Reliability (20 points)
    const recentHistory = connectionHistory.slice(-10);
    const connectedCount = recentHistory.filter(h => h.state === 'connected').length;
    score += (connectedCount / Math.max(1, recentHistory.length)) * 20;
    
    // Queue health (10 points)
    if (queuedMessages === 0 && pendingMessages === 0) score += 10;
    else if (queuedMessages < 5 && pendingMessages < 5) score += 5;
    
    return Math.round(score);
  }, [connectionState, averageLatency, connectionHistory, queuedMessages, pendingMessages]);

  return {
    connectionQuality,
    healthScore: getHealthScore(),
    averageLatency,
    connectionHistory,
    reconnectProgress: reconnectAttempts / maxReconnectAttempts,
    hasQueuedMessages: queuedMessages > 0,
    hasPendingMessages: pendingMessages > 0,
    isHealthy: connectionState === 'connected' && (averageLatency === null || averageLatency < 1000)
  };
};

// Constants export
export { MESSAGE_TYPES, WS_STATES };

export default useWebSocket;