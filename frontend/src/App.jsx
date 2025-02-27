// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import LinkageVisualizer from './components/LinkageVisualizer';
import ForceAnalysis from './components/ForceAnalysis';
import Controls from './components/Controls';
import ForceDisplay from './components/ForceDisplay';
import { calculateGeometryFromStroke, calculateBasicForces } from './utils/calculations';

const App = () => {
  // State for mode
  const [mode, setMode] = useState('design');
  
  // State for pivot points
  const [pivotPoints, setPivotPoints] = useState({
    p1: { x: 100, y: 200 },
    p2: { x: 300, y: 200 },
    p3: { x: 500, y: 200 }
  });

  // State for simulation
  const [stroke, setStroke] = useState(0);
  const [maxStroke, setMaxStroke] = useState(100);
  const [simulationGeometry, setSimulationGeometry] = useState(null);
  const [forceAnalysis, setForceAnalysis] = useState(null);

  // Mock data generation (will be replaced with actual API calls)
  const generateSurfaceData = () => {
    const xOffsets = Array.from({ length: 40 }, (_, i) => -2 + (i * 2 / 40));
    const yOffsets = Array.from({ length: 40 }, (_, i) => -2 + (i * 2 / 40));
    const cylinderPositions = [0, 0.5, 1.0, 1.75];

    const calculateForce = (x, y, stroke) => {
      const distance = Math.sqrt(x * x + y * y);
      return 265.05 * (1 - distance / 4) * (1 + stroke / 2);
    };

    return cylinderPositions.map(stroke => {
      const zValues = [];
      for (let y of yOffsets) {
        const row = [];
        for (let x of xOffsets) {
          row.push(calculateForce(x, y, stroke));
        }
        zValues.push(row);
      }
      return {
        stroke,
        x: xOffsets,
        y: yOffsets,
        z: zValues
      };
    });
  };

  const [surfaceData, setSurfaceData] = useState(generateSurfaceData());

  // Handler for mode change
  const handleModeChange = (newMode) => {
    console.log("Mode changed to:", newMode);
    setMode(newMode);
    if (newMode === 'simulation') {
      // We'll use pivot points as the geometry for now
      setSimulationGeometry(pivotPoints);
      setStroke(0);
      const forces = { cylinderForce: 1000, outputForce: 500, mechanicalAdvantage: 0.5 };
      setForceAnalysis(forces);
    }
  };

  // Handler for stroke change
  const handleStrokeChange = (newStroke) => {
    console.log("Stroke changed to:", newStroke);
    setStroke(newStroke);
    // In a real implementation, we would calculate new geometry here
    
    // Mock force calculation
    const forces = { 
      cylinderForce: 1000 + newStroke * 10, 
      outputForce: 500 + newStroke * 5, 
      mechanicalAdvantage: 0.5 + newStroke * 0.01 
    };
    setForceAnalysis(forces);
  };

  // Handle pivot point changes
  const handlePivotPointChange = (pointId, newPosition) => {
    setPivotPoints(prev => ({
      ...prev,
      [pointId]: newPosition
    }));
  };

  // Update analysis when points change
  useEffect(() => {
    // This will eventually make an API call to the backend
    setSurfaceData(generateSurfaceData());
  }, [pivotPoints]);

  return (
    <div className={`app ${mode === 'simulation' ? 'simulation-mode' : ''}`}>
      <header className="app-header">
        <h1>RLF Linkage Analysis Tool</h1>
        {/* Debug information */}
        <div style={{background: 'yellow', padding: '5px', marginBottom: '10px'}}>
          Current Mode: {mode}
        </div>
      </header>
      
      <div className="app-container">
        <Controls 
          currentMode={mode}
          onModeChange={handleModeChange}
          stroke={stroke}
          maxStroke={maxStroke}
          onStrokeChange={handleStrokeChange}
          showCylinderControls={mode === 'simulation'}
        />
        
        <LinkageVisualizer 
          pivotPoints={pivotPoints} 
          onPivotPointChange={handlePivotPointChange} 
          isInteractive={mode === 'design'}
        />
        
        {mode === 'simulation' && forceAnalysis && (
          <ForceDisplay forceAnalysis={forceAnalysis} />
        )}
      </div>
    </div>
  );
};

export default App;