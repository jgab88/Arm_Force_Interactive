// frontend/src/components/ForceAnalysis/index.jsx
import React from 'react';
import Plot from 'react-plotly.js';

const ForceAnalysis = ({ surfaceData }) => {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h2 className="text-lg font-semibold mb-4">Force Analysis</h2>
      <div className="grid grid-cols-2 gap-4">
        {surfaceData.map((surface, index) => (
          <Plot
            key={index}
            data={[{
              type: 'surface',
              x: surface.x,
              y: surface.y,
              z: surface.z,
              colorscale: 'Viridis',
              name: `Stroke: ${surface.stroke}"`
            }]}
            layout={{
              title: `Stroke Position: ${surface.stroke}"`,
              width: 500,
              height: 500,
              scene: {
                xaxis: { title: 'X Offset (inches)' },
                yaxis: { title: 'Y Offset (inches)' },
                zaxis: { title: 'Force (lbs)' }
              }
            }}
            config={{ responsive: true }}
          />
        ))}
      </div>
    </div>
  );
};

export default ForceAnalysis;