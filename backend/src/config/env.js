// src/config/env.js

import dotenv from 'dotenv';

export function loadEnv() {
  dotenv.config();

  const requiredKeys = ['OPENROUTER_API_KEY'];
  const missing = requiredKeys.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('AI endpoints will not function without these variables');
  }
}

export const config = {
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};