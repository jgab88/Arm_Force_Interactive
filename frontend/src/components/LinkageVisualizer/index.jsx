import React, { useState, useRef } from 'react';

const SCALE_FACTOR = 40;
const VIEWPORT_WIDTH = 1000;
const VIEWPORT_HEIGHT = 800;

// Default positions
const DEFAULT_POSITIONS = {
  point1: { x: 0, y: 8 },
  point2: { x: -6.279, y: 8 },
  point3: { x: -2, y: 4.795 },
  pointA: { x: 0, y: 9 },
  pointB: { x: -6.279, y: 9 },
  pointC: { x: -10, y: 9 },
  pointD: { x: -13.34, y: 5.3 },
  pointE: { x: -14.6, y: 6.65 }
};

const LinkageVisualizer = () => {
  // State for points and history
  const [points, setPoints] = useState(DEFAULT_POSITIONS);
  const [history, setHistory] = useState([DEFAULT_POSITIONS]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showCoordinates, setShowCoordinates] = useState(false);
  
  // Convert coordinates with adjusted viewport center
  const VIEWPORT_OFFSET_X = VIEWPORT_WIDTH * 0.65; // Adjust these values to move the viewport
  const VIEWPORT_OFFSET_Y = VIEWPORT_HEIGHT * 0.6;
  
  const toSVGX = (inches) => (inches * SCALE_FACTOR) + VIEWPORT_OFFSET_X;
  const toSVGY = (inches) => VIEWPORT_OFFSET_Y - (inches * SCALE_FACTOR);
  
  // Point dragging handler
  const createDragHandler = (pointId) => (e) => {
    e.preventDefault();
    const svg = e.currentTarget.closest('svg');
    const svgRect = svg.getBoundingClientRect();
    
    const initialX = e.clientX;
    const initialY = e.clientY;
    const initialPoint = points[pointId];
    setShowCoordinates(true);
    
    function handleMove(moveEvent) {
      const dx = (moveEvent.clientX - initialX) / SCALE_FACTOR;
      const dy = -(moveEvent.clientY - initialY) / SCALE_FACTOR;
      
      const newPoints = {
        ...points,
        [pointId]: {
          x: initialPoint.x + dx,
          y: initialPoint.y + dy
        }
      };
      setPoints(newPoints);
    }

    function handleUp() {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      setShowCoordinates(false);
      
      // Add to history
      setHistory(prev => [...prev.slice(0, historyIndex + 1), points]);
      setHistoryIndex(prev => prev + 1);
    }

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  // Convert all points to SVG coordinates
  const svgPoints = Object.entries(points).reduce((acc, [key, point]) => ({
    ...acc,
    [key]: {
      x: toSVGX(point.x),
      y: toSVGY(point.y)
    }
  }), {});

  // Undo/Redo handlers
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setPoints(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setPoints(history[historyIndex + 1]);
    }
  };

  // Save/Load handlers
  const handleSave = () => {
    const config = {
      points: points,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(config)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linkage-config-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const handleLoad = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          setPoints(config.points);
          setHistory(prev => [...prev, config.points]);
          setHistoryIndex(prev => prev + 1);
        } catch (error) {
          console.error('Error loading configuration:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Control Panel */}
      <div className="flex gap-2 p-2 bg-white rounded-lg shadow">
        <button 
          onClick={() => {
            setPoints(DEFAULT_POSITIONS);
            setHistory([DEFAULT_POSITIONS]);
            setHistoryIndex(0);
          }}
          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          Reset
        </button>
        <button 
          onClick={handleUndo}
          disabled={historyIndex === 0}
          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Undo
        </button>
        <button 
          onClick={handleRedo}
          disabled={historyIndex === history.length - 1}
          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Redo
        </button>
        <button 
          onClick={handleSave}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Save
        </button>
        <label className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer">
          Load
          <input
            type="file"
            accept=".json"
            onChange={handleLoad}
            className="hidden"
          />
        </label>
      </div>

      {/* Main SVG */}
      <div className="border rounded-lg p-4 bg-white">
        <h2 className="text-lg font-semibold mb-4">Linkage System - Design Mode</h2>
        <svg 
          className="w-full h-96 border" 
          viewBox={`0 0 ${VIEWPORT_WIDTH} ${VIEWPORT_HEIGHT}`}
          style={{ backgroundColor: '#f8f9fa' }}
        >
          {/* Grid and axes */}
          <g opacity="0.1">
            {Array.from({length: 41}, (_, i) => (
              <React.Fragment key={`grid-${i}`}>
                <line 
                  x1={toSVGX(-20)} y1={toSVGY(i-20)} 
                  x2={toSVGX(20)} y2={toSVGY(i-20)} 
                  stroke="gray" strokeWidth="1"
                />
                <line 
                  x1={toSVGX(i-20)} y1={toSVGY(-20)} 
                  x2={toSVGX(i-20)} y2={toSVGY(20)} 
                  stroke="gray" strokeWidth="1"
                />
              </React.Fragment>
            ))}
          </g>

          {/* Main arm structure */}
          <path
            d={`M ${svgPoints.pointA.x} ${svgPoints.pointA.y}
                L ${svgPoints.pointB.x} ${svgPoints.pointB.y}
                L ${svgPoints.pointC.x} ${svgPoints.pointC.y}
                L ${svgPoints.pointD.x} ${svgPoints.pointD.y}
                L ${svgPoints.pointE.x} ${svgPoints.pointE.y}`}
            stroke="black"
            strokeWidth="8"
            fill="none"
          />
          
          {/* Vertical connections */}
          <line
            x1={svgPoints.point1.x} y1={svgPoints.point1.y}
            x2={svgPoints.pointA.x} y2={svgPoints.pointA.y}
            stroke="black" strokeWidth="8"
          />
          <line
            x1={svgPoints.point2.x} y1={svgPoints.point2.y}
            x2={svgPoints.pointB.x} y2={svgPoints.pointB.y}
            stroke="black" strokeWidth="8"
          />
          
          {/* Air Cylinder */}
          <g>


            {/* Cylinder body */}
            <rect
              x={toSVGX(-0.5)}
              y={toSVGY(2)}
              width={SCALE_FACTOR * 1}
              height={SCALE_FACTOR * 4}
              fill="#D3D3D3"
              stroke="gray"
              strokeWidth="1"
            />
            
            {/* Cylinder mount */}
            <rect
              x={toSVGX(-0.-.75)}
              y={toSVGY(0)}
              width={SCALE_FACTOR * 1.5}
              height={SCALE_FACTOR * 0.5}
              fill="#A9A9A9"
              stroke="gray"
              strokeWidth="1"
            />
          </g>

                      {/* Piston rod (drawn first so it's behind) */}
                      <rect
              x={toSVGX(-0.125)}
              y={toSVGY(4)}
              width={SCALE_FACTOR * 0.25}
              height={SCALE_FACTOR * 4}
              fill="#808080"
              stroke="gray"
              strokeWidth="1"
            />

          {/* Cross link */}
          <line
            x1={svgPoints.point2.x} y1={svgPoints.point2.y}
            x2={svgPoints.point3.x} y2={svgPoints.point3.y}
            stroke="blue" strokeWidth="3"
          />

          {/* Numbered points (pivots) */}
          {['point1', 'point2', 'point3'].map((id, index) => (
            <g key={id}>
              <circle
                cx={svgPoints[id].x}
                cy={svgPoints[id].y}
                r="8"
                fill="red"
                cursor="move"
                onMouseDown={createDragHandler(id)}
              />
              <text
                x={svgPoints[id].x + 15}
                y={svgPoints[id].y - 10}
                fill="red"
              >
                {index + 1}
              </text>
              {showCoordinates && (
                <text
                  x={svgPoints[id].x + 15}
                  y={svgPoints[id].y + 20}
                  fill="black"
                  fontSize="12"
                >
                  ({points[id].x.toFixed(2)}, {points[id].y.toFixed(2)})
                </text>
              )}
            </g>
          ))}

          {/* Lettered points */}
          {['A', 'B', 'C', 'D', 'E'].map((letter) => {
            const id = `point${letter}`;
            return (
              <g key={letter}>
                <circle
                  cx={svgPoints[id].x}
                  cy={svgPoints[id].y}
                  r="6"
                  fill="purple"
                  cursor="move"
                  onMouseDown={createDragHandler(id)}
                />
                <text
                  x={svgPoints[id].x + 15}
                  y={svgPoints[id].y - 10}
                  fill="purple"
                >
                  {letter}
                </text>
                {showCoordinates && (
                  <text
                    x={svgPoints[id].x + 15}
                    y={svgPoints[id].y + 20}
                    fill="black"
                    fontSize="12"
                  >
                    ({points[id].x.toFixed(2)}, {points[id].y.toFixed(2)})
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default LinkageVisualizer;