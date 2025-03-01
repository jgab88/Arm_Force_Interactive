# backend/src/api/websocket.py
from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import json
import asyncio
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    WebSocket connection manager to handle multiple client connections
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.client_data: Dict[WebSocket, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket):
        """
        Accept a new WebSocket connection
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        self.client_data[websocket] = {}
        logger.info(f"Client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """
        Remove a disconnected WebSocket
        """
        self.active_connections.remove(websocket)
        if websocket in self.client_data:
            del self.client_data[websocket]
        logger.info(f"Client disconnected. Remaining connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """
        Send a message to a specific client
        """
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")
            # In case of error, try to disconnect the client
            try:
                self.disconnect(websocket)
            except:
                pass

    async def broadcast(self, message: Dict[str, Any], exclude: WebSocket = None):
        """
        Broadcast a message to all connected clients
        
        Args:
            message: The message to broadcast
            exclude: Optional WebSocket to exclude from broadcast
        """
        disconnected = []
        for connection in self.active_connections:
            if exclude and connection == exclude:
                continue
                
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {str(e)}")
                disconnected.append(connection)
        
        # Clean up any disconnected clients
        for connection in disconnected:
            try:
                self.disconnect(connection)
            except:
                pass

    def store_client_data(self, websocket: WebSocket, data: Dict[str, Any]):
        """
        Store data associated with a client connection
        """
        if websocket in self.client_data:
            self.client_data[websocket] = data
            
    def get_client_data(self, websocket: WebSocket) -> Dict[str, Any]:
        """
        Get data associated with a client connection
        """
        return self.client_data.get(websocket, {})

# Helper functions for WebSocket message handling
async def handle_client_message(
    websocket: WebSocket, 
    data: Dict[str, Any], 
    connection_manager: ConnectionManager,
    process_function
):
    """
    Process a message from a client and send back results
    
    Args:
        websocket: The client WebSocket
        data: The received data
        connection_manager: The WebSocket connection manager
        process_function: Function to process the data
    """
    # Store the client's latest data
    connection_manager.store_client_data(websocket, data)
    
    # Process the data
    try:
        # Log incoming request (limited to prevent large data logs)
        msg_preview = {k: v for k, v in data.items() if k != 'points'}
        logger.info(f"Processing request: {msg_preview}")
        
        # Call the processing function
        results = process_function(data)
        
        # Send results back to the client
        await connection_manager.send_personal_message(results, websocket)
        
        # Log success (without large data)
        logger.info(f"Sent results to client")
    except Exception as e:
        # Log error and send error message
        logger.error(f"Error processing request: {str(e)}")
        error_message = {
            "error": True,
            "message": f"Error processing request: {str(e)}"
        }
        await connection_manager.send_personal_message(error_message, websocket)