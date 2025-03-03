# backend/src/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
import json
import traceback
from typing import Dict, Any

# Import analysis modules
from src.analysis.force_calculations import calculate_forces
from src.analysis.geometry import calculate_geometry

app = FastAPI(title="RLF Linkage Analysis Tool API")

# Configure CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Basic health check endpoint
@app.get("/")
async def root():
    return {"status": "online", "message": "RLF Linkage Analysis Tool API is running"}

# WebSocket endpoint for real-time data exchange
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Simple receive-process-send loop
            data = await websocket.receive_text()
            try:
                geometry_data = json.loads(data)
                results = process_linkage_data(geometry_data)
                await websocket.send_text(json.dumps(results))
            except Exception as e:
                print(f"Error: {str(e)}")
                traceback.print_exc()
                await websocket.send_text(json.dumps({
                    "error": True,
                    "message": str(e)
                }))
    except WebSocketDisconnect:
        print("Client disconnected")

# REST API endpoint for HTTP fallback
@app.post("/calculate")
async def calculate(request: Request):
    data = await request.json()
    results = process_linkage_data(data)
    return results

# Process incoming geometry data and return force analysis
def process_linkage_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Process incoming geometry data and return force analysis"""
    try:
        # Extract geometry parameters with error handling
        points = data.get("points", {})
        cylinder_extension = data.get("cylinderExtension", 0)
        generate_graph = data.get("generateGraph", False)
        
        # Store original points if they exist (for UI consistency)
        original_points = None
        if "originalPoints" in points:
            original_points = points["originalPoints"]
        
        # Handle ping/pong messages
        if "ping" in data and data["ping"] is True:
            return {"pong": True}
        
        # Handle pong responses - just acknowledge
        if "pong" in data and data["pong"] is True:
            return {"received": True}
        
        # Calculate updated geometry if cylinder is moving
        if "simulationMode" in data and data["simulationMode"]:
            try:
                updated_points = calculate_geometry(points, cylinder_extension)
                
                # Preserve original points in the result
                if original_points:
                    updated_points["originalPoints"] = original_points
                
                points = updated_points
            except Exception as e:
                print(f"Error in calculate_geometry: {e}")
                traceback.print_exc()
                return {
                    "error": True,
                    "message": f"Geometry calculation error: {str(e)}"
                }
        
        # Calculate forces based on the geometry
        try:
            # If generating graph, use more sample points for better resolution
            samples = 20 if generate_graph else 10
            force_results = calculate_forces(points, cylinder_extension, samples=samples)
            
            # Check for errors in force calculation
            if isinstance(force_results, dict) and "error" in force_results:
                return {
                    "error": True, 
                    "message": force_results["error"]
                }
                
        except Exception as e:
            print(f"Error in calculate_forces: {e}")
            traceback.print_exc()
            return {
                "error": True,
                "message": f"Force calculation error: {str(e)}"
            }
        
        # Return combined results
        return {
            "updatedPoints": points,
            "forceAnalysis": force_results
        }
    except Exception as e:
        # Catch-all for any other errors
        print(f"Unexpected error in process_linkage_data: {e}")
        traceback.print_exc()
        return {
            "error": True,
            "message": f"Server error: {str(e)}"
        }

# Run with: uvicorn src.main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)