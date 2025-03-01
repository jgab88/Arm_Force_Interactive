// frontend/src/utils/websocket.js
class WebSocketService {
    constructor() {
      this.socket = null;
      this.isConnected = false;
      this.reconnectTimer = null;
      this.reconnectInterval = 3000; // 3 seconds
      this.messageCallbacks = [];
      this.connectionCallbacks = {
        onConnect: [],
        onDisconnect: []
      };
      this.pendingMessages = [];
    }
  
    /**
     * Connect to the WebSocket server
     * @param {string} url - WebSocket server URL
     */
    connect(url = 'ws://localhost:8000/ws') {
      // Clear any existing connection
      if (this.socket) {
        this.close();
      }
  
      console.log('Connecting to WebSocket:', url);
      
      this.socket = new WebSocket(url);
      
      // Set up event handlers
      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectTimer = null;
        
        // Send any pending messages
        while (this.pendingMessages.length > 0) {
          const pendingMessage = this.pendingMessages.shift();
          this.send(pendingMessage);
        }
        
        // Notify all connection listeners
        this.connectionCallbacks.onConnect.forEach(callback => callback());
      };
      
      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        
        // Notify all disconnection listeners
        this.connectionCallbacks.onDisconnect.forEach(callback => callback());
        
        // Set up reconnection
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            console.log('Attempting to reconnect...');
            this.connect(url);
          }, this.reconnectInterval);
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Notify all message callbacks
          this.messageCallbacks.forEach(callback => callback(data));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    }
  
    /**
     * Close the WebSocket connection
     */
    close() {
      if (this.socket) {
        this.socket.close();
        this.socket = null;
        this.isConnected = false;
      }
      
      // Clear reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    }
  
    /**
     * Send data to the WebSocket server
     * @param {Object} data - Data to send
     */
    send(data) {
      if (this.isConnected && this.socket) {
        const message = JSON.stringify(data);
        this.socket.send(message);
      } else {
        // Queue message to send when connection is established
        this.pendingMessages.push(data);
        
        // Try to connect if not already connecting
        if (!this.socket && !this.reconnectTimer) {
          this.connect();
        }
      }
    }
  
    /**
     * Register a callback for WebSocket messages
     * @param {Function} callback - Function to call with received data
     */
    onMessage(callback) {
      if (typeof callback === 'function') {
        this.messageCallbacks.push(callback);
      }
      
      // Return unsubscribe function
      return () => {
        this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
      };
    }
  
    /**
     * Register callback for connection events
     * @param {string} event - Event type ('connect' or 'disconnect')
     * @param {Function} callback - Function to call on event
     */
    on(event, callback) {
      if (typeof callback !== 'function') return;
      
      if (event === 'connect') {
        this.connectionCallbacks.onConnect.push(callback);
      } else if (event === 'disconnect') {
        this.connectionCallbacks.onDisconnect.push(callback);
      }
      
      // Return unsubscribe function
      return () => {
        if (event === 'connect') {
          this.connectionCallbacks.onConnect = this.connectionCallbacks.onConnect.filter(cb => cb !== callback);
        } else if (event === 'disconnect') {
          this.connectionCallbacks.onDisconnect = this.connectionCallbacks.onDisconnect.filter(cb => cb !== callback);
        }
      };
    }
  }
  
  // Create a singleton instance
  const websocketService = new WebSocketService();
  
  export default websocketService;