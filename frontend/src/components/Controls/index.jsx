// src/components/Controls/index.jsx
import React from 'react';
import './styles.css'; // Create this file if it doesn't exist

const Controls = ({ 
  currentMode, 
  onModeChange, 
  stroke, 
  maxStroke, 
  onStrokeChange, 
  showCylinderControls 
}) => {
  console.log("Controls rendering, mode:", currentMode);
  
  return (
    <div className="controls-panel">
      <div className="mode-toggle">
        <h3>Mode:</h3>
        <div className="button-group">
          <button 
            className={`mode-btn ${currentMode === 'design' ? 'active' : ''}`}
            onClick={() => onModeChange('design')}
          >
            Design
          </button>
          <button 
            className={`mode-btn ${currentMode === 'simulation' ? 'active' : ''}`}
            onClick={() => onModeChange('simulation')}
          >
            Simulation
          </button>
        </div>
      </div>
      
      {showCylinderControls && (
        <div className="cylinder-controls">
          <h3>Cylinder Controls:</h3>
          <label>Extension: {stroke.toFixed(2)} mm</label>
          <input
            type="range"
            min="0"
            max={maxStroke}
            value={stroke}
            onChange={(e) => onStrokeChange(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      )}
    </div>
  );
};

export default Controls;