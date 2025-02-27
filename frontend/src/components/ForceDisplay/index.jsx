// src/components/ForceDisplay/index.jsx
import React from 'react';
import './styles.css'; // Create this file if it doesn't exist

const ForceDisplay = ({ forceAnalysis }) => {
  if (!forceAnalysis) return null;
  
  return (
    <div className="force-display">
      <h3>Force Analysis</h3>
      <div className="force-metrics">
        <div className="metric">
          <span className="label">Cylinder Force:</span>
          <span className="value">{forceAnalysis.cylinderForce.toFixed(2)} N</span>
        </div>
        <div className="metric">
          <span className="label">Output Force:</span>
          <span className="value">{forceAnalysis.outputForce.toFixed(2)} N</span>
        </div>
        <div className="metric">
          <span className="label">Mechanical Advantage:</span>
          <span className="value">{forceAnalysis.mechanicalAdvantage.toFixed(3)}x</span>
        </div>
      </div>
    </div>
  );
};

export default ForceDisplay;