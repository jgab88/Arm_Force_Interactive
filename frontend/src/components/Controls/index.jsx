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
  onGenerateGraph,
  calculating,
  generatingGraph
}) => {
  console.log('Controls rendering, cylinderExtension:', cylinderExtension);
  
  // Handle slider change
  const handleSliderChange = (e) => {
    const value = parseFloat(e.target.value);
    console.log('Slider changed to:', value);
    onCylinderExtensionChange(value);
  };

  // Handle slider change end - when user releases the slider
  const handleSliderChangeEnd = (e) => {
    const value = parseFloat(e.target.value);
    console.log('Slider change ended at:', value);
    // If auto-update is off, manually trigger calculation when slider is released
    if (!autoUpdate) {
      setTimeout(() => onCalculate(), 100);
    }
  };

  return (
    <div className="controls-container">
      <div className="control-group">
        <label htmlFor="cylinder-extension">
          Cylinder Extension: {cylinderExtension.toFixed(2)} inches
        </label>
        <input
          id="cylinder-extension"
          type="range"
          min="0"
          max="10"
          step="0.1"
          value={cylinderExtension}
          onChange={handleSliderChange}
          onMouseUp={handleSliderChangeEnd}
          onTouchEnd={handleSliderChangeEnd}
          className="slider"
        />
        <div className="slider-markers">
          <span>0</span>
          <span>5</span>
          <span>10</span>
        </div>
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
        
        <button 
          onClick={onGenerateGraph} 
          className="graph-button" 
          disabled={generatingGraph}
        >
          {generatingGraph ? 'Generating...' : 'Generate Graph'}
        </button>
      </div>
    </div>
  );
});

export default Controls;