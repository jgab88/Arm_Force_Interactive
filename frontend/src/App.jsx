// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import LinkageVisualizer from './components/LinkageVisualizer';
import ForceAnalysis from './components/ForceAnalysis';

const App = () => {
  // State for pivot points
  const [pivotPoints, setPivotPoints] = useState({
    p1: { x: 100, y: 200 },
    p2: { x: 300, y: 200 },
    p3: { x: 500, y: 200 }
  });

  // Mock data generation (will be replaced with actual API calls)
  const generateSurfaceData = () => {
    const xOffsets = Array.from({length: 40}, (_, i) => -2 + (i * 2/40));
    const yOffsets = Array.from({length: 40}, (_, i) => -2 + (i * 2/40));
    const cylinderPositions = [0, 0.5, 1.0, 1.75];
    
    const calculateForce = (x, y, stroke) => {
      const distance = Math.sqrt(x*x + y*y);
      return 265.05 * (1 - distance/4) * (1 + stroke/2);
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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">RLF Linkage Analysis Tool</h1>
      <div className="space-y-6">
        <LinkageVisualizer 
          pivotPoints={pivotPoints}
          onPivotPointChange={handlePivotPointChange}
        />
        <ForceAnalysis surfaceData={surfaceData} />
      </div>
    </div>
  );
};

export default App;