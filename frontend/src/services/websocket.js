// frontend/services/websocket.js - Real-time WebSocket client service

// Simple EventEmitter for browser compatibility
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  once(event, callback) {
    const onceCallback = (...args) => {
      callback(...args);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }

  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error('Event callback error:', error);
      }
    });
  }

  removeAllListeners() {
    this.events = {};
  }
}

// WebSocket configuration
const WS_CONFIG = {
  url: process.env.REACT_APP_WS_URL || 'ws://localhost:8001/ws',
  reconnectInterval: 1000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000, // 30 seconds
  messageTimeout: 10000, // 10 seconds
  connectionTimeout: 5000, // 5 seconds
  protocols: ['apexmatch-v1']
};

// Message types
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
  
  // Matching events
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
  
  // System messages
  NOTIFICATION: 'notification',
  TRUST_SCORE_UPDATE: 'trust_score_update',
  BGP_UPDATE: 'bgp_update',
  HEARTBEAT: 'heartbeat',
  
  // Errors
  ERROR: 'error',
  RATE_LIMIT: 'rate_limit'
};

// Connection states
const CONNECTION_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed'
};

// WebSocket Service Class
class WebSocketService extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.pendingMessages = new Map(); // For delivery confirmation
    this.heartbeatInterval = null;
    this.connectionTimeout = null;
    this.lastHeartbeat = null;
    this.subscriptions = new Map();
    this.isAuthenticated = false;
    this.userId = null;
    this.reconnectTimer = null;
    
    // Bind methods to preserve 'this' context
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
    this.sendHeartbeat = this.sendHeartbeat.bind(this);
  }
  
  // Connect to WebSocket server
  connect(token, userId) {
    if (this.connectionState === CONNECTION_STATES.CONNECTING || 
        this.connectionState === CONNECTION_STATES.CONNECTED) {
      return;
    }
    
    this.userId = userId;
    this.connectionState = CONNECTION_STATES.CONNECTING;
    this.emit('connectionStateChange', this.connectionState);
    
    try {
      // Close existing connection if any
      if (this.ws) {
        this.ws.close();
      }
      
      // Create new WebSocket connection
      const wsUrl = `${WS_CONFIG.url}?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(wsUrl, WS_CONFIG.protocols);
      
      // Set up event listeners
      this.ws.addEventListener('open', this.handleOpen);
      this.ws.addEventListener('message', this.handleMessage);
      this.ws.addEventListener('close', this.handleClose);
      this.ws.addEventListener('error', this.handleError);
      
      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.connectionState === CONNECTION_STATES.CONNECTING) {
          this.ws.close();
          this.handleConnectionTimeout();
        }
      }, WS_CONFIG.connectionTimeout);
      
    } catch (error) {
      this.handleError(error);
    }
  }
  
  // Disconnect from WebSocket server
  disconnect() {
    this.clearReconnectTimer();
    this.clearHeartbeat();
    this.clearConnectionTimeout();
    this.isAuthenticated = false;
    this.userId = null;
    
    if (this.ws) {
      this.ws.removeEventListener('open', this.handleOpen);
      this.ws.removeEventListener('message', this.handleMessage);
      this.ws.removeEventListener('close', this.handleClose);
      this.ws.removeEventListener('error', this.handleError);
      
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'User disconnected');
      }
      this.ws = null;
    }
    
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.emit('connectionStateChange', this.connectionState);
  }
  
  // Send message to server
  send(type, payload = {}, options = {}) {
    const message = {
      id: this.generateMessageId(),
      type,
      payload,
      timestamp: Date.now(),
      userId: this.userId
    };
    
    // Add to pending messages for delivery confirmation if requested
    if (options.requireDelivery) {
      this.pendingMessages.set(message.id, {
        message,
        timestamp: Date.now(),
        timeout: setTimeout(() => {
          this.pendingMessages.delete(message.id);
          this.emit('messageTimeout', message);
        }, WS_CONFIG.messageTimeout)
      });
    }
    
    if (this.connectionState === CONNECTION_STATES.CONNECTED && this.isAuthenticated) {
      try {
        this.ws.send(JSON.stringify(message));
        this.emit('messageSent', message);
        return message.id;
      } catch (error) {
        this.emit('sendError', { message, error });
        this.queueMessage(message);
      }
    } else {
      this.queueMessage(message);
    }
    
    return message.id;
  }
  
  // Send chat message
  sendChatMessage(conversationId, content, metadata = {}) {
    return this.send(MESSAGE_TYPES.MESSAGE, {
      conversationId,
      content,
      metadata: {
        ...metadata,
        type: 'text',
        timestamp: Date.now()
      }
    }, { requireDelivery: true });
  }
  
  // Send typing indicator
  sendTypingStart(conversationId) {
    return this.send(MESSAGE_TYPES.TYPING_START, { conversationId });
  }
  
  sendTypingStop(conversationId) {
    return this.send(MESSAGE_TYPES.TYPING_STOP, { conversationId });
  }
  
  // Mark message as read
  markMessageAsRead(messageId, conversationId) {
    return this.send(MESSAGE_TYPES.MESSAGE_READ, {
      messageId,
      conversationId,
      readAt: Date.now()
    });
  }
  
  // Send match action
  sendMatchAction(matchId, action, context = {}) {
    const actionType = action === 'like' ? MESSAGE_TYPES.MATCH_LIKED : MESSAGE_TYPES.MATCH_PASSED;
    return this.send(actionType, {
      matchId,
      action,
      context: {
        ...context,
        timestamp: Date.now()
      }
    });
  }
  
  // Send reveal request
  sendRevealRequest(matchId, message = '') {
    return this.send(MESSAGE_TYPES.REVEAL_REQUEST, {
      matchId,
      message,
      requestTime: Date.now()
    });
  }
  
  // Respond to reveal request
  respondToReveal(requestId, action, message = '') {
    const responseType = action === 'accept' ? MESSAGE_TYPES.REVEAL_ACCEPTED : MESSAGE_TYPES.REVEAL_DECLINED;
    return this.send(responseType, {
      requestId,
      action,
      message,
      responseTime: Date.now()
    });
  }
  
  // Subscribe to specific events
  subscribe(eventType, callback) {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set());
    }
    this.subscriptions.get(eventType).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(eventType);
        }
      }
    };
  }
  
  // Unsubscribe from events
  unsubscribe(eventType, callback) {
    const callbacks = this.subscriptions.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscriptions.delete(eventType);
      }
    }
  }
  
  // Get connection info
  getConnectionInfo() {
    return {
      state: this.connectionState,
      isConnected: this.connectionState === CONNECTION_STATES.CONNECTED,
      isAuthenticated: this.isAuthenticated,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      pendingMessages: this.pendingMessages.size,
      lastHeartbeat: this.lastHeartbeat,
      userId: this.userId
    };
  }
  
  // Event handlers
  handleOpen() {
    this.clearConnectionTimeout();
    this.connectionState = CONNECTION_STATES.CONNECTED;
    this.reconnectAttempts = 0;
    this.emit('connectionStateChange', this.connectionState);
    this.emit('connected');
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Authentication will be handled by the server using the token in URL
    // We'll wait for AUTH_SUCCESS message
  }
  
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      this.processMessage(data);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.emit('parseError', { data: event.data, error });
    }
  }
  
  handleClose(event) {
    this.clearHeartbeat();
    this.clearConnectionTimeout();
    this.isAuthenticated = false;
    
    const wasConnected = this.connectionState === CONNECTION_STATES.CONNECTED;
    
    if (event.code === 1000) {
      // Normal closure
      this.connectionState = CONNECTION_STATES.DISCONNECTED;
      this.emit('connectionStateChange', this.connectionState);
      this.emit('disconnected', { reason: 'normal', code: event.code });
    } else {
      // Abnormal closure - attempt reconnect
      this.connectionState = CONNECTION_STATES.DISCONNECTED;
      this.emit('connectionStateChange', this.connectionState);
      this.emit('disconnected', { reason: 'abnormal', code: event.code });
      
      if (wasConnected && this.reconnectAttempts < WS_CONFIG.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        this.connectionState = CONNECTION_STATES.FAILED;
        this.emit('connectionStateChange', this.connectionState);
        this.emit('connectionFailed');
      }
    }
  }
  
  handleError(error) {
    console.error('WebSocket error:', error);
    this.emit('error', error);
  }
  
  handleConnectionTimeout() {
    this.emit('connectionTimeout');
    this.handleClose({ code: 1006, reason: 'Connection timeout' });
  }
  
  // Message processing
  processMessage(data) {
    const { id, type, payload, timestamp } = data;
    
    // Handle delivery confirmations
    if (id && this.pendingMessages.has(id)) {
      const pending = this.pendingMessages.get(id);
      clearTimeout(pending.timeout);
      this.pendingMessages.delete(id);
      this.emit('messageDelivered', { messageId: id, deliveryTime: Date.now() - pending.timestamp });
    }
    
    // Process message by type
    switch (type) {
      case MESSAGE_TYPES.AUTH_SUCCESS:
        this.handleAuthSuccess(payload);
        break;
        
      case MESSAGE_TYPES.AUTH_FAILED:
        this.handleAuthFailed(payload);
        break;
        
      case MESSAGE_TYPES.MESSAGE:
        this.handleChatMessage(payload);
        break;
        
      case MESSAGE_TYPES.MESSAGE_DELIVERED:
        this.handleMessageDelivered(payload);
        break;
        
      case MESSAGE_TYPES.MESSAGE_READ:
        this.handleMessageRead(payload);
        break;
        
      case MESSAGE_TYPES.TYPING_START:
        this.handleTypingStart(payload);
        break;
        
      case MESSAGE_TYPES.TYPING_STOP:
        this.handleTypingStop(payload);
        break;
        
      case MESSAGE_TYPES.NEW_MATCH:
        this.handleNewMatch(payload);
        break;
        
      case MESSAGE_TYPES.MATCH_MUTUAL:
        this.handleMutualMatch(payload);
        break;
        
      case MESSAGE_TYPES.REVEAL_REQUEST:
        this.handleRevealRequest(payload);
        break;
        
      case MESSAGE_TYPES.REVEAL_ACCEPTED:
        this.handleRevealAccepted(payload);
        break;
        
      case MESSAGE_TYPES.REVEAL_DECLINED:
        this.handleRevealDeclined(payload);
        break;
        
      case MESSAGE_TYPES.REVEAL_MUTUAL:
        this.handleMutualReveal(payload);
        break;
        
      case MESSAGE_TYPES.USER_ONLINE:
        this.handleUserOnline(payload);
        break;
        
      case MESSAGE_TYPES.USER_OFFLINE:
        this.handleUserOffline(payload);
        break;
        
      case MESSAGE_TYPES.NOTIFICATION:
        this.handleNotification(payload);
        break;
        
      case MESSAGE_TYPES.TRUST_SCORE_UPDATE:
        this.handleTrustScoreUpdate(payload);
        break;
        
      case MESSAGE_TYPES.BGP_UPDATE:
        this.handleBGPUpdate(payload);
        break;
        
      case MESSAGE_TYPES.HEARTBEAT:
        this.handleHeartbeat(payload);
        break;
        
      case MESSAGE_TYPES.ERROR:
        this.handleServerError(payload);
        break;
        
      case MESSAGE_TYPES.RATE_LIMIT:
        this.handleRateLimit(payload);
        break;
        
      default:
        console.warn('Unknown message type:', type);
        this.emit('unknownMessage', { type, payload });
    }
    
    // Emit to subscribers
    this.notifySubscribers(type, payload);
  }
  
  // Specific message handlers
  handleAuthSuccess(payload) {
    this.isAuthenticated = true;
    this.emit('authenticated', payload);
    
    // Send queued messages
    this.flushMessageQueue();
  }
  
  handleAuthFailed(payload) {
    this.isAuthenticated = false;
    this.emit('authenticationFailed', payload);
    this.disconnect();
  }
  
  handleChatMessage(payload) {
    this.emit('chatMessage', payload);
    
    // Auto-acknowledge message delivery
    if (payload.messageId) {
      this.send(MESSAGE_TYPES.MESSAGE_DELIVERED, {
        messageId: payload.messageId,
        conversationId: payload.conversationId,
        deliveredAt: Date.now()
      });
    }
  }
  
  handleMessageDelivered(payload) {
    this.emit('messageDelivered', payload);
  }
  
  handleMessageRead(payload) {
    this.emit('messageRead', payload);
  }
  
  handleTypingStart(payload) {
    this.emit('typingStart', payload);
  }
  
  handleTypingStop(payload) {
    this.emit('typingStop', payload);
  }
  
  handleNewMatch(payload) {
    this.emit('newMatch', payload);
    this.showNotification('New Match!', 'You have a new potential connection');
  }
  
  handleMutualMatch(payload) {
    this.emit('mutualMatch', payload);
    this.showNotification('It\'s a Match!', 'You both liked each other');
  }
  
  handleRevealRequest(payload) {
    this.emit('revealRequest', payload);
    this.showNotification('Reveal Request', 'Someone wants to reveal their photo');
  }
  
  handleRevealAccepted(payload) {
    this.emit('revealAccepted', payload);
    this.showNotification('Reveal Accepted', 'Your reveal request was accepted');
  }
  
  handleRevealDeclined(payload) {
    this.emit('revealDeclined', payload);
  }
  
  handleMutualReveal(payload) {
    this.emit('mutualReveal', payload);
    this.showNotification('Mutual Reveal!', 'You can now see each other\'s photos');
  }
  
  handleUserOnline(payload) {
    this.emit('userOnline', payload);
  }
  
  handleUserOffline(payload) {
    this.emit('userOffline', payload);
  }
  
  handleNotification(payload) {
    this.emit('notification', payload);
    if (payload.showBrowserNotification) {
      this.showNotification(payload.title, payload.message);
    }
  }
  
  handleTrustScoreUpdate(payload) {
    this.emit('trustScoreUpdate', payload);
  }
  
  handleBGPUpdate(payload) {
    this.emit('bgpUpdate', payload);
  }
  
  handleHeartbeat(payload) {
    this.lastHeartbeat = Date.now();
    this.emit('heartbeat', payload);
  }
  
  handleServerError(payload) {
    this.emit('serverError', payload);
  }
  
  handleRateLimit(payload) {
    this.emit('rateLimit', payload);
  }
  
  // Utility methods
  queueMessage(message) {
    this.messageQueue.push(message);
    this.emit('messageQueued', message);
    
    // Limit queue size
    if (this.messageQueue.length > 100) {
      const dropped = this.messageQueue.shift();
      this.emit('messageDropped', dropped);
    }
  }
  
  flushMessageQueue() {
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    messages.forEach(message => {
      try {
        this.ws.send(JSON.stringify(message));
        this.emit('queuedMessageSent', message);
      } catch (error) {
        this.emit('queuedMessageError', { message, error });
        this.queueMessage(message); // Re-queue if failed
      }
    });
  }
  
  scheduleReconnect() {
    this.clearReconnectTimer();
    this.reconnectAttempts++;
    this.connectionState = CONNECTION_STATES.RECONNECTING;
    this.emit('connectionStateChange', this.connectionState);
    
    const delay = Math.min(
      WS_CONFIG.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );
    
    this.emit('reconnectScheduled', { attempt: this.reconnectAttempts, delay });
    
    this.reconnectTimer = setTimeout(() => {
      if (this.userId) {
        const token = this.getStoredToken();
        if (token) {
          this.connect(token, this.userId);
        }
      }
    }, delay);
  }
  
  startHeartbeat() {
    this.clearHeartbeat();
    this.heartbeatInterval = setInterval(this.sendHeartbeat, WS_CONFIG.heartbeatInterval);
  }
  
  sendHeartbeat() {
    if (this.connectionState === CONNECTION_STATES.CONNECTED) {
      this.send(MESSAGE_TYPES.HEARTBEAT, { timestamp: Date.now() });
    }
  }
  
  clearHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  clearConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }
  
  generateMessageId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getStoredToken() {
    return localStorage.getItem('apexmatch_token');
  }
  
  notifySubscribers(eventType, payload) {
    const callbacks = this.subscriptions.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error('Subscriber callback error:', error);
        }
      });
    }
  }
  
  showNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'apexmatch-notification'
      });
    }
  }
  
  // Request notification permission
  async requestNotificationPermission() {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }
  
  // Cleanup
  destroy() {
    this.clearReconnectTimer();
    this.clearHeartbeat();
    this.clearConnectionTimeout();
    this.removeAllListeners();
    this.subscriptions.clear();
    this.messageQueue = [];
    this.pendingMessages.clear();
    this.currentUser = null;
    this.isAuthenticated = false;
    this.disconnect();
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();

// Export convenience functions
export const websocket = {
  connect: (token, userId) => webSocketService.connect(token, userId),
  disconnect: () => webSocketService.disconnect(),
  send: (type, payload, options) => webSocketService.send(type, payload, options),
  sendChatMessage: (conversationId, content, metadata) => 
    webSocketService.sendChatMessage(conversationId, content, metadata),
  sendTypingStart: (conversationId) => webSocketService.sendTypingStart(conversationId),
  sendTypingStop: (conversationId) => webSocketService.sendTypingStop(conversationId),
  markMessageAsRead: (messageId, conversationId) => 
    webSocketService.markMessageAsRead(messageId, conversationId),
  sendMatchAction: (matchId, action, context) => 
    webSocketService.sendMatchAction(matchId, action, context),
  sendRevealRequest: (matchId, message) => webSocketService.sendRevealRequest(matchId, message),
  respondToReveal: (requestId, action, message) => 
    webSocketService.respondToReveal(requestId, action, message),
  subscribe: (eventType, callback) => webSocketService.subscribe(eventType, callback),
  unsubscribe: (eventType, callback) => webSocketService.unsubscribe(eventType, callback),
  getConnectionInfo: () => webSocketService.getConnectionInfo(),
  requestNotificationPermission: () => webSocketService.requestNotificationPermission()
};

// Export message types for consumers
export { MESSAGE_TYPES, CONNECTION_STATES };

export default websocket;