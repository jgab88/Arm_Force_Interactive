// frontend/src/utils/websocket.js
class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectTimer = null;
    this.reconnectInterval = 5000; // 5 seconds
    this.messageCallbacks = [];
    this.connectionCallbacks = {
      onConnect: [],
      onDisconnect: []
    };
    this.pendingMessages = [];
  }

  connect(url = 'ws://localhost:8000/ws') {
    // Clear any existing connection
    if (this.socket) {
      this.close();
    }

    console.log('Connecting to WebSocket:', url);
    
    this.socket = new WebSocket(url);
    
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
        this.messageCallbacks.forEach(callback => callback(data));
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  }

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

  send(data) {
    if (this.isConnected && this.socket) {
      try {
        const message = JSON.stringify(data);
        this.socket.send(message);
      } catch (error) {
        console.error('Error sending message:', error);
        this.pendingMessages.push(data);
      }
    } else {
      // Queue message to send when connection is established
      this.pendingMessages.push(data);
      
      // Try to connect if not already connecting
      if (!this.socket && !this.reconnectTimer) {
        this.connect();
      }
    }
  }

  onMessage(callback) {
    if (typeof callback === 'function') {
      this.messageCallbacks.push(callback);
    }
    
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
    };
  }

  on(event, callback) {
    if (typeof callback !== 'function') return;
    
    if (event === 'connect') {
      this.connectionCallbacks.onConnect.push(callback);
    } else if (event === 'disconnect') {
      this.connectionCallbacks.onDisconnect.push(callback);
    }
    
    return () => {
      if (event === 'connect') {
        this.connectionCallbacks.onConnect = this.connectionCallbacks.onConnect.filter(cb => cb !== callback);
      } else if (event === 'disconnect') {
        this.connectionCallbacks.onDisconnect = this.connectionCallbacks.onDisconnect.filter(cb => cb !== callback);
      }
    };
  }
}

const websocketService = new WebSocketService();
export default websocketService;