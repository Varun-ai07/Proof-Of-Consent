// src/server.js

import app from './app.js';
import { loadEnv } from './config/env.js';

loadEnv();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ PoC² Backend running on http://localhost:${PORT}`);
});
