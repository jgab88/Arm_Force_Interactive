import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './output.css';  // Import the CSS directly

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);