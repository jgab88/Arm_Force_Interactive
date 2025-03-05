// frontend/src/App.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import LinkageVisualizer from './components/LinkageVisualizer';
import Controls from './components/Controls';
import ForceAnalysis from './components/ForceAnalysis';
import websocketService from './utils/websocket';
import { calculateForcesHttp } from './utils/api';
import './output.css';

// Map the points from the frontend format to backend format
const mapPointsForBackend = (points) => {
  // Create a deep copy to avoid reference issues
  const mappedPoints = {};
  
  // Copy all point properties
  for (const key in points) {
    if (typeof points[key] === 'object' && points[key] !== null) {
      mappedPoints[key] = { ...points[key] };
    } else {
      mappedPoints[key] = points[key];
    }
  }
  
  // Make sure cylinderMinLength is set
  if (!mappedPoints.cylinderMinLength) {
    mappedPoints.cylinderMinLength = 10; // Default minimum cylinder length
  }
  
  // Log the points we're sending to backend
  console.log("Mapped points for backend:", mappedPoints);
  
  return mappedPoints;
};

// Default initial position for the linkage system
const defaultGeometry = {
  pivotBase: { x: 0, y: 0 },
  pivotArm: { x: 100, y: 50 },
  cylinderBase: { x: -20, y: -50 },
  cylinderArm: { x: 100, y: 50 },
  cylinderMinLength: 100 // Increased minimum length so extensions are more noticeable
};

function App() {
  // State for geometry points and calculation results
  const [points, setPoints] = useState(defaultGeometry);
  const [cylinderExtension, setCylinderExtension] = useState(0);
  const [forceData, setForceData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('http');
  const [calculating, setCalculating] = useState(false);
  const [generatingGraph, setGeneratingGraph] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // By default, use HTTP requests (more reliable)
  const [useWebSocket, setUseWebSocket] = useState(false);

  // Auto-update settings
  const [autoUpdate, setAutoUpdate] = useState(true);

  // References to track changes
  const prevPointsRef = useRef(JSON.parse(JSON.stringify(defaultGeometry)));
  const prevExtensionRef = useRef(0);

  // Connect to WebSocket server only if real-time mode is enabled
  useEffect(() => {
    if (useWebSocket) {
      // Connect to the WebSocket server
      websocketService.connect('ws://localhost:8000/ws');

      // Set up connection status listeners
      const connectHandler = () => {
        setConnectionStatus('connected');
        setErrorMessage(''); // Clear any previous errors on successful connection
      };

      const disconnectHandler = () => {
        setConnectionStatus('disconnected');
      };

      websocketService.on('connect', connectHandler);
      websocketService.on('disconnect', disconnectHandler);

      // Clean up on unmount or when disabling WebSocket
      return () => {
        websocketService.close();
      };
    } else {
      // Close any existing WebSocket connections
      websocketService.close();
      setConnectionStatus('http');
    }
  }, [useWebSocket]);

  // WebSocket message handler
  const messageHandler = useCallback((data) => {
    console.log('Received WebSocket message:', data);
    setCalculating(false);
    setGeneratingGraph(false);

    // Check for errors
    if (data.error) {
      console.error('Server reported error:', data.message);
      setErrorMessage(data.message || 'An error occurred');
      return;
    }

    // Clear any previous errors
    setErrorMessage('');

    // Update force data
    if (data.forceAnalysis) {
      console.log('Received force analysis data');
      setForceData(data.forceAnalysis);
    }

    // Update points if they were changed by the backend
    if (data.updatedPoints) {
      console.log('Received updated points');
      setPoints(data.updatedPoints);
    }
  }, []);

  // Set up WebSocket message listener
  useEffect(() => {
    if (useWebSocket) {
      const unsubscribe = websocketService.onMessage(messageHandler);
      return unsubscribe;
    }
  }, [messageHandler, useWebSocket]);

  // Function to perform force calculations
  const calculateForces = useCallback(async () => {
    if (calculating) {
      return; // Skip if already calculating
    }

    setCalculating(true);
    console.log("Starting force calculation with cylinder extension:", cylinderExtension);

    try {
      // Map points for backend
      const mappedPoints = mapPointsForBackend(points);
      
      const requestData = {
        points: mappedPoints,
        cylinderExtension,  // Make sure this is correctly passed
        simulationMode: true,
        generateGraph: false
      };

      console.log('Sending data for force calculation:', JSON.stringify(requestData).substring(0, 200) + "...");

      if (useWebSocket && connectionStatus === 'connected') {
        // Use WebSocket if enabled and connected
        console.log('Sending data via WebSocket');
        websocketService.send(requestData);
        // Note: setCalculating(false) will be called in the message handler
      } else {
        // Use HTTP API
        console.log('Using HTTP for force calculation');
        const results = await calculateForcesHttp(requestData);
        console.log('Received HTTP response:', JSON.stringify(results).substring(0, 200) + "...");

        // Process the results
        if (results.error) {
          console.error('Error in force calculation response:', results.message);
          setErrorMessage(results.message || 'An error occurred');
        } else {
          console.log('Force analysis data available:', !!results.forceAnalysis);
          if (results.forceAnalysis) {
            setForceData(results.forceAnalysis);
            console.log('Force data set successfully:', results.forceAnalysis);
          } else {
            console.warn('No force analysis data in response');
          }

          if (results.updatedPoints) {
            console.log('Updated points received');
            if (results.updatedPoints.originalPoints) {
              // Extract the original points format
              setPoints(results.updatedPoints.originalPoints);
              console.log('Points updated from originalPoints');
            } else {
              // Use the points directly
              setPoints(results.updatedPoints);
              console.log('Points updated directly');
            }
          } else {
            console.warn('No updated points in response');
          }

          // Clear any previous errors
          setErrorMessage('');
        }
        setCalculating(false);
      }
    } catch (error) {
      console.error('Exception during force calculation:', error);
      setErrorMessage(`Error calculating forces: ${error.message}`);
      setCalculating(false);
    }
  }, [points, cylinderExtension, connectionStatus, useWebSocket, calculating]);

  // Function to generate detailed 3D graph
  const generateGraph = useCallback(async () => {
    if (generatingGraph) {
      return; // Skip if already generating
    }
    
    setGeneratingGraph(true);
    console.log("Starting graph generation with cylinder extension:", cylinderExtension);
    
    try {
      // Convert points to backend format
      const mappedPoints = mapPointsForBackend(points);
      
      const requestData = {
        points: mappedPoints,
        cylinderExtension,  // Make sure this is correctly passed
        simulationMode: true,
        generateGraph: true  // This tells the backend to generate detailed graph data
      };
      
      console.log('Generating graph data:', JSON.stringify(requestData).substring(0, 200) + "...");
      
      // Always use HTTP for graph generation to avoid WebSocket disconnects
      console.log('Using HTTP for graph generation');
      const results = await calculateForcesHttp(requestData);
      console.log('Received graph generation response:', JSON.stringify(results).substring(0, 200) + "...");
      
      // Process the results
      if (results.error) {
        console.error('Error in graph generation response:', results.message);
        setErrorMessage(results.message || 'An error occurred generating graph');
      } else {
        console.log('Force analysis data available for graph:', !!results.forceAnalysis);
        if (results.forceAnalysis) {
          setForceData(results.forceAnalysis);
          console.log('Force data for graph set successfully:', results.forceAnalysis);
        } else {
          console.warn('No force analysis data in graph response');
        }
        
        if (results.updatedPoints) {
          console.log('Updated points received from graph generation');
          if (results.updatedPoints.originalPoints) {
            // Extract the original points format
            setPoints(results.updatedPoints.originalPoints);
            console.log('Points updated from originalPoints in graph response');
          } else {
            // Use the points directly
            setPoints(results.updatedPoints);
            console.log('Points updated directly from graph response');
          }
        } else {
          console.warn('No updated points in graph response');
        }
        
        // Clear any previous errors
        setErrorMessage('');
      }
      setGeneratingGraph(false);
    } catch (error) {
      console.error('Exception during graph generation:', error);
      setErrorMessage(`Error generating graph: ${error.message}`);
      setGeneratingGraph(false);
    }
  }, [points, cylinderExtension, generatingGraph]);

  // Effect to handle cylinder extension changes
  useEffect(() => {
    if (autoUpdate && cylinderExtension !== prevExtensionRef.current) {
      console.log(`Auto-updating for cylinder extension change: ${prevExtensionRef.current} -> ${cylinderExtension}`);
      
      // Update the previous value
      prevExtensionRef.current = cylinderExtension;
      
      // Trigger a force calculation with a slight delay
      const timer = setTimeout(() => {
        calculateForces();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [cylinderExtension, autoUpdate, calculateForces]);

  // Calculate forces when geometry points change
  useEffect(() => {
    // Skip if auto-update is disabled
    if (!autoUpdate) {
      return;
    }

    // Check if points have actually changed
    const pointsChanged = JSON.stringify(points) !== JSON.stringify(prevPointsRef.current);

    // Only calculate if points have changed
    if (!pointsChanged) {
      return;
    }

    // Update refs for next comparison
    prevPointsRef.current = JSON.parse(JSON.stringify(points));

    // Set up debounce timer
    const debounceTimer = setTimeout(calculateForces, 500);

    // Clean up
    return () => clearTimeout(debounceTimer);
  }, [points, autoUpdate, calculateForces]);

  // Handle point dragging from the LinkageVisualizer
  const handlePointDrag = (pointId, newPosition) => {
    console.log(`Dragging point ${pointId} to:`, newPosition);
    
    // Make sure we're not modifying a non-point property
    if (typeof points[pointId] !== 'object' || 
        !('x' in points[pointId]) || 
        !('y' in points[pointId])) {
      console.error(`Cannot drag ${pointId} - not a valid point`);
      return;
    }
    
    // Update the points state with the new position
    setPoints(prevPoints => {
      const newPoints = { ...prevPoints };
      newPoints[pointId] = { 
        ...newPoints[pointId],
        x: newPosition.x, 
        y: newPosition.y 
      };
      
      console.log(`Updated points:`, newPoints);
      return newPoints;
    });
  };

  // Handle cylinder extension changes from the Controls component
  const handleCylinderExtensionChange = (extension) => {
    console.log(`Cylinder extension changed to: ${extension}`);
    setCylinderExtension(extension);
    
    // If auto-update is enabled, a useEffect will trigger the calculation
    // If not, we'll wait for the user to click "Update Analysis"
    if (!autoUpdate) {
      // Update the UI immediately but don't trigger a calculation
      prevExtensionRef.current = extension;
    }
  };

  // Handle reset to default geometry
  const handleReset = () => {
    setPoints(defaultGeometry);
    setCylinderExtension(0);
    setForceData(null);
    setErrorMessage('');

    // Reset refs
    prevPointsRef.current = JSON.parse(JSON.stringify(defaultGeometry));
    prevExtensionRef.current = 0;

    // Trigger calculation to update the force analysis display
    if (autoUpdate) {
      setTimeout(calculateForces, 100);
    }
  };

  // Toggle WebSocket real-time updates
  const toggleRealTimeUpdates = () => {
    setUseWebSocket(prev => !prev);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>RLF Linkage Analysis Tool</h1>
        <div className="connection-controls">
          <div className={`connection-status ${connectionStatus}`}>
            {connectionStatus === 'connected' ? 'WebSocket Connected' :
              connectionStatus === 'http' ? 'Using HTTP' : 'WebSocket Disconnected'}
          </div>
          <label className="real-time-toggle">
            <input
              type="checkbox"
              checked={useWebSocket}
              onChange={toggleRealTimeUpdates}
            />
            Real-time Updates
          </label>
        </div>
      </header>

      {errorMessage && (
        <div className="error-message">
          <p>{errorMessage}</p>
          <button onClick={() => setErrorMessage('')}>Dismiss</button>
        </div>
      )}

      <div className="main-content">
        <div className="visualization-container">
          <LinkageVisualizer
            points={points}
            onPointDrag={handlePointDrag}
            cylinderExtension={cylinderExtension}
          />

          <Controls
            cylinderExtension={cylinderExtension}
            onCylinderExtensionChange={handleCylinderExtensionChange}
            onReset={handleReset}
            autoUpdate={autoUpdate}
            setAutoUpdate={setAutoUpdate}
            onCalculate={calculateForces}
            onGenerateGraph={generateGraph}
            calculating={calculating}
            generatingGraph={generatingGraph}
          />
        </div>

        <div className="analysis-container">
          {(calculating || generatingGraph) && (
            <div className="calculation-overlay">
              <div className="spinner"></div>
              <span>{generatingGraph ? 'Generating Graph...' : 'Calculating...'}</span>
            </div>
          )}
          <ForceAnalysis
            forceData={forceData}
            loading={calculating || generatingGraph}
          />
        </div>
      </div>

      <footer className="app-footer">
        <p>RLF Linkage Analysis Tool &copy; 2025</p>
      </footer>
    </div>
  );
}

export default App;