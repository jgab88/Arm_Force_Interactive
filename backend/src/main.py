# backend/src/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
from typing import List, Dict, Any

# Import analysis modules
from src.analysis.force_calculations import calculate_forces
from src.analysis.geometry import calculate_geometry

app = FastAPI(title="RLF Linkage Analysis Tool API")

# Configure CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

# Basic health check endpoint
@app.get("/")
async def root():
    return {"status": "online", "message": "RLF Linkage Analysis Tool API is running"}

# WebSocket endpoint for real-time data exchange
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Receive geometry data from frontend
            data = await websocket.receive_text()
            geometry_data = json.loads(data)
            
            # Process the data and calculate forces
            results = process_linkage_data(geometry_data)
            
            # Send results back to the client
            await manager.send_personal_message(json.dumps(results), websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# REST API endpoint for one-time force calculations
@app.post("/calculate")
async def calculate(data: Dict[str, Any]):
    results = process_linkage_data(data)
    return results

# Process incoming geometry data and return force analysis
def process_linkage_data(data: Dict[str, Any]) -> Dict[str, Any]:
    # Extract geometry parameters
    points = data.get("points", {})
    cylinder_extension = data.get("cylinderExtension", 0)
    
    # Calculate updated geometry if cylinder is moving
    if "simulationMode" in data and data["simulationMode"]:
        points = calculate_geometry(points, cylinder_extension)
    
    # Calculate forces based on the geometry
    force_results = calculate_forces(points, cylinder_extension)
    
    # Return combined results
    return {
        "updatedPoints": points,
        "forceAnalysis": force_results
    }

def process_linkage_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Process incoming geometry data and return force analysis"""
    # Debug log the received data
    print(f"Received data: {json.dumps(data, indent=2)}")
    
    # Extract geometry parameters with error handling
    points = data.get("points", {})
    cylinder_extension = data.get("cylinderExtension", 0)
    
    # Debug log the extracted points
    print(f"Extracted points: {json.dumps(points, indent=2)}")
    
    # Initialize results
    force_results = {}
    
    # Calculate updated geometry if cylinder is moving
    if "simulationMode" in data and data["simulationMode"]:
        try:
            points = calculate_geometry(points, cylinder_extension)
        except Exception as e:
            print(f"Error in calculate_geometry: {e}")
            import traceback
            traceback.print_exc()
            # Return error message instead of raising
            return {
                "error": True,
                "message": f"Geometry calculation error: {str(e)}"
            }
    
    # Calculate forces based on the geometry
    try:
        force_results = calculate_forces(points, cylinder_extension)
    except Exception as e:
        print(f"Error in calculate_forces: {e}")
        import traceback
        traceback.print_exc()
        # Return error message
        return {
            "error": True,
            "message": f"Force calculation error: {str(e)}"
        }
    
    # Return combined results
    return {
        "updatedPoints": points,
        "forceAnalysis": force_results
    }

# Run with: uvicorn main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)