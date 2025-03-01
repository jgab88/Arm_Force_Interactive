// frontend/src/components/Controls/index.jsx
import React, { memo } from 'react';
import './styles.css';

const Controls = memo(({ 
  cylinderExtension, 
  onCylinderExtensionChange, 
  onReset,
  autoUpdate,
  setAutoUpdate,
  onCalculate,
  calculating
}) => {
  console.log('Controls rendering, mode:', undefined);
  
  // Handle slider change
  const handleSliderChange = (e) => {
    const value = parseFloat(e.target.value);
    onCylinderExtensionChange(value);
  };

  return (
    <div className="controls-container">
      <div className="control-group">
        <label htmlFor="cylinder-extension">Cylinder Extension: {cylinderExtension.toFixed(2)} inches</label>
        <input
          id="cylinder-extension"
          type="range"
          min="0"
          max="10"
          step="0.1"
          value={cylinderExtension}
          onChange={handleSliderChange}
          className="slider"
        />
      </div>

      <div className="control-actions">
        <button onClick={onReset} className="reset-button">
          Reset
        </button>
        
        <label className="auto-update-toggle">
          <input 
            type="checkbox" 
            checked={autoUpdate} 
            onChange={() => setAutoUpdate(prev => !prev)}
          />
          Auto-Update
        </label>
        
        {!autoUpdate && (
          <button 
            onClick={onCalculate} 
            className="update-button" 
            disabled={calculating}
          >
            {calculating ? 'Updating...' : 'Update Analysis'}
          </button>
        )}
      </div>
    </div>
  );
});

export default Controls;