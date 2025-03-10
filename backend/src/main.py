# backend/src/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
import json
import traceback
import time
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
    try:
        # Extract geometry parameters
        points = data.get("points", {})
        cylinder_extension = data.get("cylinderExtension", 0)
        
        print(f"Processing request with extension: {cylinder_extension}")
        print(f"Initial points: {points.get('cylinderArm')}")
        
        # Calculate updated geometry if cylinder is moving
        if "simulationMode" in data and data["simulationMode"]:
            try:
                updated_points = calculate_geometry(points, cylinder_extension)
                points = updated_points  # Make sure we use the updated points
                print(f"Updated points after geometry calc: {points.get('cylinderArm')}")
            except Exception as e:
                print(f"Error in calculate_geometry: {e}")
                traceback.print_exc()
                return {
                    "error": True,
                    "message": f"Geometry calculation error: {str(e)}"
                }
        
        # Calculate forces based on the geometry
        try:
            force_results = calculate_forces(points, cylinder_extension)
            print(f"Force calculations complete. Changes applied: {force_results.get('cylinderExtension')}")
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
            "forceAnalysis": force_results,
            "requestId": str(time.time())
        }
    except Exception as e:
        # Catch-all error handler
        print(f"Unexpected error: {e}")
        traceback.print_exc()
        return {
            "error": True,
            "message": f"Server error: {str(e)}"
        }

# Run with: uvicorn src.main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)