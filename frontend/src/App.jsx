// frontend/src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import LinkageVisualizer from './components/LinkageVisualizer';
import Controls from './components/Controls';
import ForceAnalysis from './components/ForceAnalysis';
import websocketService from './utils/websocket';
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
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [calculating, setCalculating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Connect to WebSocket server on component mount
  useEffect(() => {
    // Connect to the WebSocket server
    websocketService.connect('ws://localhost:8000/ws');
    
    // Set up connection status listeners
    const connectHandler = () => setConnectionStatus('connected');
    const disconnectHandler = () => setConnectionStatus('disconnected');
    
    websocketService.on('connect', connectHandler);
    websocketService.on('disconnect', disconnectHandler);
    
    // Set up message listener
    const messageHandler = (data) => {
      setCalculating(false);
      
      // Check for errors
      if (data.error) {
        setErrorMessage(data.message || 'An error occurred');
        return;
      }
      
      // Clear any previous errors
      setErrorMessage('');
      
      // Update force data
      if (data.forceAnalysis) {
        setForceData(data.forceAnalysis);
      }
      
      // Update points if they were changed by the backend
      if (data.updatedPoints) {
        setPoints(data.updatedPoints);
      }
    };
    
    const unsubscribe = websocketService.onMessage(messageHandler);
    
    // Clean up on unmount
    return () => {
      websocketService.close();
      unsubscribe();
    };
  }, []);

  // Function to send data to the server for force calculation
  const calculateForces = useCallback(() => {
    if (connectionStatus !== 'connected') {
      setErrorMessage('Not connected to the server. Please try again later.');
      return;
    }
    
    setCalculating(true);
    
    // Send current state to the server
    websocketService.send({
      points,
      cylinderExtension,
      simulationMode: true
    });
  }, [points, cylinderExtension, connectionStatus]);

  // Recalculate forces when geometry or cylinder extension changes
  useEffect(() => {
    // Debounce the calculation to avoid overwhelming the server
    const debounceTimeout = setTimeout(() => {
      calculateForces();
    }, 300);
    
    return () => clearTimeout(debounceTimeout);
  }, [points, cylinderExtension, calculateForces]);

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
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>RLF Linkage Analysis Tool</h1>
        <div className={`connection-status ${connectionStatus}`}>
          {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
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
          />
        </div>
        
        <div className="analysis-container">
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