// src/app.js

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import healthRoutes from './routes/health.routes.js';
import aiRoutes from './routes/ai.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import consentRoutes from './routes/consent.routes.js';
import authRoutes from './auth/auth.routes.js';
import blockchainRoutes from './routes/blockchain.routes.js';

// Middleware
import { errorHandler } from './middleware/error.middleware.js';
import { rateLimiter } from './middleware/rateLimit.middleware.js';
import { initializeBlockchain, checkBlockchainConnection } from './services/blockchain.service.js';

/* =========================
   ESM PATH SETUP
========================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   APP INITIALIZATION
========================= */

const app = express();

/* =========================
   GLOBAL MIDDLEWARE
========================= */

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'http://localhost:4000', 'http://127.0.0.1:4000'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS Configuration - Allow all development ports
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5501',
    'http://localhost:5502',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5502',
    'http://127.0.0.1:5501',
    'http://127.0.0.1:8080',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// HTTP Logging
app.use(morgan(':method :url :status :response-time ms - :res[content-length]'));

// Request Logging Middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health Check Quick Route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/* =========================
   RATE LIMITING
========================= */

// Apply rate limiting to API routes
app.use('/api/', rateLimiter);

/* =========================
   STATIC FILE SERVING
========================= */

// Serve generated consent forms (Public)
app.use(
  '/consents',
  express.static(path.join(__dirname, '../generated-consents'), {
    setHeaders: (res, filepath) => {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      if (filepath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
    },
  })
);

// Serve public assets
app.use('/public', express.static(path.join(__dirname, '../public')));

/* =========================
   API ROUTES
========================= */

// Health Check Endpoint
app.use('/api/health', healthRoutes);

// Authentication Routes
app.use('/api/auth', authRoutes);

// Consent Management Routes
app.use('/api/consent', consentRoutes);

// AI Services Routes
app.use('/api/ai', aiRoutes);

// Quiz Service Routes
app.use('/api/quiz', quizRoutes);

// Blockchain Routes
app.use('/api/blockchain', blockchainRoutes);

/* =========================
   WEBHOOK ROUTES
========================= */

// Webhook for consent signatures
app.post('/webhooks/consent-signed', (req, res) => {
  try {
    const { consentId, patientSignature, timestamp } = req.body;

    if (!consentId) {
      return res.status(400).json({ 
        success: false,
        error: 'consentId is required' 
      });
    }

    console.log(`✅ Consent signed: ${consentId} at ${timestamp}`);

    res.status(200).json({
      success: true,
      message: 'Consent signature recorded',
      consentId,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Webhook processing failed' 
    });
  }
});

/* =========================
   404 HANDLER
========================= */

app.use((req, res) => {
  console.warn(`⚠️ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableRoutes: {
      health: 'GET /api/health',
      auth: 'POST /api/auth/login, POST /api/auth/register',
      consent: 'POST /api/consent/create, POST /api/consent/sign, GET /api/consent/:consentId',
      ai: 'POST /api/ai/explain, POST /api/ai/generate-content, POST /api/ai/ask',
      blockchain: 'POST /api/blockchain/record, GET /api/blockchain/verify/:consentId, GET /api/blockchain/proof/:consentId',
      consents: 'GET /consents/{consentId}.html (static file)',
    },
  });
});

/* =========================
   ERROR HANDLER (MUST BE LAST)
========================= */

app.use(errorHandler);

/* =========================
   GRACEFUL SHUTDOWN
========================= */

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Initialize blockchain on startup
initializeBlockchain().catch(err => console.error('Blockchain init error:', err));

export default app;