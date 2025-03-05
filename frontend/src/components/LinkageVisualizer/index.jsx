// frontend/src/components/LinkageVisualizer/index.jsx
import React, { useState, useEffect, useRef } from 'react';
import './style.css';

const LinkageVisualizer = ({ points, onPointDrag, cylinderExtension }) => {
  // State management
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [showCoords, setShowCoords] = useState(false);
  
  // Ref for the SVG element
  const svgRef = useRef(null);
  
  // SVG Constants
  const SVG_WIDTH = 600;
  const SVG_HEIGHT = 400;
  const SCALE = 1.5;
  const CENTER_X = SVG_WIDTH / 2;
  const CENTER_Y = SVG_HEIGHT / 2;
  
  // Coordinate conversion functions
  const toSVGX = (x) => CENTER_X + x * SCALE;
  const toSVGY = (y) => CENTER_Y - y * SCALE;
  
  const toWorldX = (svgX) => (svgX - CENTER_X) / SCALE;
  const toWorldY = (svgY) => (CENTER_Y - svgY) / SCALE;

  // Get only the valid draggable points (with x,y coordinates)
  const getPointsToRender = () => {
    const result = {};
    for (const key in points) {
      if (
        points[key] && 
        typeof points[key] === 'object' &&
        'x' in points[key] && 
        'y' in points[key] &&
        typeof points[key].x === 'number' &&
        typeof points[key].y === 'number'
      ) {
        result[key] = points[key];
      }
    }
    return result;
  };
  
  const renderablePoints = getPointsToRender();
  
  // Convert points to SVG coordinates
  const getSvgPoints = () => {
    const result = {};
    for (const key in renderablePoints) {
      result[key] = {
        x: toSVGX(renderablePoints[key].x),
        y: toSVGY(renderablePoints[key].y)
      };
    }
    return result;
  };
  
  const svgPoints = getSvgPoints();
  
  // Event handlers for dragging
  const handleMouseDown = (e, pointId) => {
    e.preventDefault();
    console.log(`Mouse down on point: ${pointId}`);
    setDraggingPoint(pointId);
    setShowCoords(true);
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleMouseMove = (e) => {
    if (!draggingPoint || !svgRef.current) return;
    
    const svgRect = svgRef.current.getBoundingClientRect();
    
    // Calculate position relative to SVG
    const svgX = e.clientX - svgRect.left;
    const svgY = e.clientY - svgRect.top;
    
    // Convert to world coordinates
    const worldX = toWorldX(svgX);
    const worldY = toWorldY(svgY);
    
    console.log(`Dragging ${draggingPoint} to:`, { x: worldX, y: worldY });
    
    // Update the point position through the callback
    onPointDrag(draggingPoint, { x: worldX, y: worldY });
  };
  
  const handleMouseUp = () => {
    console.log(`Stopped dragging: ${draggingPoint}`);
    setDraggingPoint(null);
    setShowCoords(false);
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  
  return (
    <div className="linkage-visualizer-container" style={{ 
      backgroundColor: '#ffffff', 
      borderRadius: '8px', 
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', 
      padding: '16px', 
      marginBottom: '20px' 
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#333' }}>
        Linkage Mechanism
      </h3>
      
      <svg 
        ref={svgRef}
        className="linkage-svg" 
        width="100%" 
        height={SVG_HEIGHT}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        style={{ 
          border: '1px solid #ddd', 
          borderRadius: '4px', 
          maxWidth: '100%',
          backgroundColor: '#f9f9f9'
        }}
      >
        {/* Grid */}
        <g opacity="0.2">
          {Array.from({ length: 21 }).map((_, i) => (
            <React.Fragment key={`grid-${i}`}>
              <line 
                x1={0} 
                y1={toSVGY((i - 10) * 20)} 
                x2={SVG_WIDTH} 
                y2={toSVGY((i - 10) * 20)} 
                stroke="#ccc" 
                strokeWidth="1" 
              />
              <line 
                x1={toSVGX((i - 10) * 20)} 
                y1={0} 
                x2={toSVGX((i - 10) * 20)} 
                y2={SVG_HEIGHT} 
                stroke="#ccc" 
                strokeWidth="1" 
              />
            </React.Fragment>
          ))}
        </g>
        
        {/* Base connections */}
        {svgPoints.pivotBase && svgPoints.cylinderBase && (
          <line
            x1={svgPoints.pivotBase.x}
            y1={svgPoints.pivotBase.y}
            x2={svgPoints.cylinderBase.x}
            y2={svgPoints.cylinderBase.y}
            stroke="#666"
            strokeWidth="2"
          />
        )}
        
        {/* Arm */}
        {svgPoints.pivotBase && svgPoints.pivotArm && (
          <line
            x1={svgPoints.pivotBase.x}
            y1={svgPoints.pivotBase.y}
            x2={svgPoints.pivotArm.x}
            y2={svgPoints.pivotArm.y}
            stroke="#333"
            strokeWidth="4"
          />
        )}
        
        {/* Cylinder */}
        {svgPoints.cylinderBase && svgPoints.cylinderArm && (
          <line
            x1={svgPoints.cylinderBase.x}
            y1={svgPoints.cylinderBase.y}
            x2={svgPoints.cylinderArm.x}
            y2={svgPoints.cylinderArm.y}
            stroke="#0066cc"
            strokeWidth="6"
            style={{ transition: cylinderExtension > 0 ? 'all 0.3s ease-in-out' : 'none' }}
          />
        )}
        
        {/* Points */}
        {Object.entries(renderablePoints).map(([id, point]) => (
          <g key={id}>
            <circle
              cx={svgPoints[id].x}
              cy={svgPoints[id].y}
              r="8"
              fill={id.includes('pivot') ? "#f44336" : id.includes('cylinder') ? "#2196f3" : "#ff9800"}
              stroke="#fff"
              strokeWidth="2"
              cursor="move"
              onMouseDown={(e) => handleMouseDown(e, id)}
            />
            
            <text
              x={svgPoints[id].x + 15}
              y={svgPoints[id].y + 5}
              fill="#333"
              fontSize="12"
            >
              {id}
            </text>
            
            {showCoords && draggingPoint === id && (
              <text
                x={svgPoints[id].x + 15}
                y={svgPoints[id].y - 15}
                fill="#333"
                fontSize="10"
              >
                ({point.x.toFixed(1)}, {point.y.toFixed(1)})
              </text>
            )}
          </g>
        ))}
      </svg>
      
      <div style={{ 
        marginTop: '16px', 
        paddingTop: '12px', 
        borderTop: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap'
      }}>
        <p style={{ margin: '4px 0', fontSize: '14px', color: '#555' }}>
          Cylinder Extension: {cylinderExtension.toFixed(2)} inches
        </p>
        <p style={{ margin: '4px 0', fontSize: '14px', color: '#555' }}>
          Drag points to adjust linkage geometry
        </p>
      </div>
    </div>
  );
};

export default LinkageVisualizer;