// frontend/src/components/ForceAnalysis/index.jsx
import React, { useEffect, useState, useRef, memo } from 'react';
import Plotly from 'plotly.js-dist';
import './styles.css';

const ForceAnalysis = memo(({ forceData, loading }) => {
  const plotContainer = useRef(null);
  const plotInstance = useRef(null);
  const [viewType, setViewType] = useState('surface'); // 'surface', 'contour', 'heatmap'
  const prevForceDataRef = useRef(null);

  // Effect to create or update the plot when data changes
  useEffect(() => {
    // Skip only if no data or loading
    if (!forceData || loading) {
      return;
    }

    console.log("Force data update - processing new data:", forceData);

    // Force update reference to trigger re-render
    prevForceDataRef.current = JSON.parse(JSON.stringify(forceData));

    // Extract data from forceData
    const { surfaceData } = forceData;
    if (!surfaceData || !surfaceData.x || !surfaceData.y || !surfaceData.z) {
      console.warn('Incomplete surface data:', surfaceData);
      return;
    }

    const { x, y, z, currentPosition } = surfaceData;

    // Create the appropriate plot based on view type
    createPlot(viewType, x, y, z, currentPosition);
  }, [forceData, viewType, loading]);

  // Handle window resize to make the plot responsive
  useEffect(() => {
    const handleResize = () => {
      if (plotInstance.current && plotContainer.current) {
        Plotly.Plots.resize(plotContainer.current);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Function to create different plot types
  const createPlot = (type, x, y, z, currentPosition) => {
    if (!plotContainer.current) return;

    // Define plot data
    let plotData = [];
    let layout = {
      margin: { l: 50, r: 20, t: 50, b: 50 },
      title: 'Force Analysis',
      scene: {
        xaxis: { title: 'Cylinder Extension (inches)' },
        yaxis: { title: 'Pressure (PSI)' },
        zaxis: { title: 'Output Force (lbs)' }
      },
      autosize: true,
      showlegend: true,
      colorscale: 'Blues'
    };

    try {
      // Create different plot types
      switch (type) {
        case 'surface':
          // 3D Surface plot
          plotData = [
            {
              type: 'surface',
              x: x,
              y: y,
              z: z,
              colorscale: 'Blues',
              showscale: true,
              name: 'Force Surface'
            }
          ];

          // Add a marker for the current position if available
          if (currentPosition) {
            plotData.push({
              type: 'scatter3d',
              x: [currentPosition.x],
              y: [currentPosition.y],
              z: [currentPosition.z],
              mode: 'markers',
              marker: {
                size: 8,
                color: 'red',
              },
              name: 'Current Position'
            });
          }
          break;

        case 'contour':
          // 2D Contour plot
          plotData = [
            {
              type: 'contour',
              x: x,
              y: y,
              z: z,
              colorscale: 'Blues',
              showscale: true,
              name: 'Force Contours'
            }
          ];

          // Add a marker for the current position
          if (currentPosition) {
            plotData.push({
              type: 'scatter',
              x: [currentPosition.x],
              y: [currentPosition.y],
              mode: 'markers',
              marker: {
                size: 12,
                color: 'red',
                symbol: 'circle'
              },
              name: 'Current Position'
            });
          }

          // Adjust layout for 2D view
          layout.scene = undefined;
          layout.xaxis = { title: 'Cylinder Extension (inches)' };
          layout.yaxis = { title: 'Pressure (PSI)' };
          break;

        case 'heatmap':
          // Heatmap view
          plotData = [
            {
              type: 'heatmap',
              x: x,
              y: y,
              z: z,
              colorscale: 'Blues',
              showscale: true,
              name: 'Force Heatmap'
            }
          ];

          // Add a marker for the current position
          if (currentPosition) {
            plotData.push({
              type: 'scatter',
              x: [currentPosition.x],
              y: [currentPosition.y],
              mode: 'markers',
              marker: {
                size: 12,
                color: 'red',
                symbol: 'circle',
                line: {
                  color: 'white',
                  width: 2
                }
              },
              name: 'Current Position'
            });
          }

          // Adjust layout for heatmap
          layout.scene = undefined;
          layout.xaxis = { title: 'Cylinder Extension (inches)' };
          layout.yaxis = { title: 'Pressure (PSI)' };
          break;

        default:
          // Default to surface plot
          plotData = [
            {
              type: 'surface',
              x: x,
              y: y,
              z: z,
              colorscale: 'Blues',
              showscale: true
            }
          ];
      }

      // Create or update the plot
      if (!plotInstance.current) {
        plotInstance.current = Plotly.newPlot(
          plotContainer.current,
          plotData,
          layout,
          {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['sendDataToCloud', 'toggleHover'],
            displaylogo: false
          }
        );
      } else {
        Plotly.react(
          plotContainer.current,
          plotData,
          layout,
          {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['sendDataToCloud', 'toggleHover'],
            displaylogo: false
          }
        );
      }
    } catch (error) {
      console.error('Error creating plot:', error);
    }
  };

  // Handle view type change
  const handleViewChange = (e) => {
    setViewType(e.target.value);
  };

  return (
    <div className="force-analysis-container">
      <div className="force-analysis-header">
        <h3>Force Analysis</h3>
        <div className="view-controls">
          <label>
            View:
            <select value={viewType} onChange={handleViewChange}>
              <option value="surface">3D Surface</option>
              <option value="contour">Contour Map</option>
              <option value="heatmap">Heat Map</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="loading-indicator">Loading analysis data...</div>
      ) : !forceData ? (
        <div className="placeholder">
          <p>Adjust the linkage geometry or cylinder extension to see force analysis</p>
        </div>
      ) : (
        <div className="plot-container" ref={plotContainer} style={{ height: '400px', width: '100%' }} />
      )}

      {forceData && (
        <div className="force-metrics">
          <div className="metric">
            <span className="metric-label">Cylinder Force:</span>
            <span className="metric-value">{forceData.cylinderForce?.toFixed(2)} lbs</span>
          </div>
          <div className="metric">
            <span className="metric-label">Output Force:</span>
            <span className="metric-value">{forceData.outputForce?.toFixed(2)} lbs</span>
          </div>
          <div className="metric">
            <span className="metric-label">Mechanical Advantage:</span>
            <span className="metric-value">{forceData.mechanicalAdvantage?.toFixed(4)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Angle:</span>
            <span className="metric-value">{forceData.angleDegrees?.toFixed(1)}°</span>
          </div>
          <div className="metric">
            <span className="metric-label">Torque:</span>
            <span className="metric-value">{forceData.torque?.toFixed(2)} in-lbs</span>
          </div>
        </div>
      )}
    </div>
  );
});

export default ForceAnalysis;