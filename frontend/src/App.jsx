// frontend/src/App.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import LinkageVisualizer from './components/LinkageVisualizer';
import Controls from './components/Controls';
import ForceAnalysis from './components/ForceAnalysis';
import websocketService from './utils/websocket';
import { calculateForcesHttp } from './utils/api';
import './output.css';

// Default initial position for the linkage system
const defaultGeometry = {
  pivotBase: { x: 100, y: 200 },
  pivotArm: { x: 200, y: 100 },
  cylinderBase: { x: 100, y: 250 },
  cylinderArm: { x: 200, y: 100 },
  cylinderMinLength: 10, // Minimum length of the cylinder when fully retracted
};

function App() {
  // State for geometry points and calculation results
  const [points, setPoints] = useState(defaultGeometry);
  const [cylinderExtension, setCylinderExtension] = useState(0);
  const [forceData, setForceData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('http');
  const [calculating, setCalculating] = useState(false);
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
    
    const requestData = {
      points,
      cylinderExtension,
      simulationMode: true
    };
    
    console.log('Calculating forces', requestData);
    
    try {
      if (useWebSocket && connectionStatus === 'connected') {
        // Use WebSocket if enabled and connected
        console.log('Sending data via WebSocket');
        websocketService.send(requestData);
        // Note: setCalculating(false) will be called in the message handler
      } else {
        // Use HTTP API
        console.log('Using HTTP for force calculation');
        const results = await calculateForcesHttp(requestData);
        
        // Process the results
        if (results.error) {
          setErrorMessage(results.message || 'An error occurred');
        } else {
          if (results.forceAnalysis) {
            setForceData(results.forceAnalysis);
          }
          
          if (results.updatedPoints) {
            setPoints(results.updatedPoints);
          }
          
          // Clear any previous errors
          setErrorMessage('');
        }
        setCalculating(false);
      }
    } catch (error) {
      console.error('Error calculating forces:', error);
      setErrorMessage(`Error calculating forces: ${error.message}`);
      setCalculating(false);
    }
  }, [points, cylinderExtension, connectionStatus, useWebSocket, calculating]);

  // Calculate forces when geometry or cylinder extension changes
  useEffect(() => {
    // Skip if auto-update is disabled
    if (!autoUpdate) {
      return;
    }
    
    // Check if values have actually changed
    const pointsChanged = JSON.stringify(points) !== JSON.stringify(prevPointsRef.current);
    const extensionChanged = cylinderExtension !== prevExtensionRef.current;
    
    // Only calculate if something has changed
    if (!pointsChanged && !extensionChanged) {
      return;
    }
    
    // Update refs for next comparison
    prevPointsRef.current = JSON.parse(JSON.stringify(points));
    prevExtensionRef.current = cylinderExtension;
    
    // Set up debounce timer
    const debounceTimer = setTimeout(calculateForces, 500);
    
    // Clean up
    return () => clearTimeout(debounceTimer);
  }, [points, cylinderExtension, autoUpdate, calculateForces]);

  // Handle point dragging from the LinkageVisualizer
  const handlePointDrag = (pointId, newPosition) => {
    setPoints(prevPoints => ({
      ...prevPoints,
      [pointId]: newPosition
    }));
  };

  // Handle cylinder extension changes from the Controls component
  const handleCylinderExtensionChange = (extension) => {
    setCylinderExtension(extension);
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
            calculating={calculating}
          />
        </div>
        
        <div className="analysis-container">
          {calculating && (
            <div className="calculation-overlay">
              <div className="spinner"></div>
              <span>Calculating...</span>
            </div>
          )}
          <ForceAnalysis 
            forceData={forceData} 
            loading={calculating}
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