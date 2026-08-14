// src/server.js
// Supports both local development and Vercel serverless

import app from './app.js';

const PORT = process.env.PORT || 4000;

// For Vercel serverless - export the app
export default app;

// For local development - start the server
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`✅ PoC² Backend running on http://localhost:${PORT}`);
  });
}
