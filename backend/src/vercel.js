/**
 * Vercel Entry Point — Serves both static files and API
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Import the main app
import app from './app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from public directory (2 levels up from backend/src)
const publicPath = path.join(__dirname, '../../public');
app.use(express.static(publicPath));

// Catch-all: serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

export default app;
