console.log('=== SERVER STARTING ===');

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

console.log('=== IMPORTS LOADED ===');

import { initRegistrySchema } from './db/migrations.js';

// Initialize Registry Database
try {
  initRegistrySchema();
  console.log('Registry database initialized successfully');
} catch (err) {
  console.error('Failed to initialize registry database:', err.message);
  console.error('Stack:', err.stack);
  // Don't exit - let the server start and show errors per-request
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

console.log('=== LOADING ROUTES ===');
import releaseRoutes from './routes/releases.js';
console.log('  - releases loaded');
import dashboardRoutes from './routes/dashboard.js';
console.log('  - dashboard loaded');
import testSetRoutes from './routes/test-sets.js';
console.log('  - test-sets loaded');
import testCaseRoutes from './routes/test-cases.js';
console.log('  - test-cases loaded');
import testStepRoutes from './routes/test-steps.js';
console.log('  - test-steps loaded');
import configRoutes from './routes/config.js';
console.log('  - config loaded');
import exportRoutes from './routes/export.js';
console.log('  - export loaded');
import selectConfigRoutes from './routes/select-configs.js';
console.log('  - select-configs loaded');
import matchConfigRoutes from './routes/match-configs.js';
console.log('  - match-configs loaded');
import categoryRoutes from './routes/categories.js';
console.log('  - categories loaded');
import testRunRoutes from './routes/test-runs.js';
console.log('=== ALL ROUTES LOADED ===');

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for POC/development convenience if needed
  crossOriginResourcePolicy: false,
}));

// CORS - handle preflight explicitly
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Authenticated-User', 'Remote-User'],
  credentials: true,
}));

// Handle OPTIONS preflight for all routes
app.options('*', cors());

// Request logging - BEFORE body parsing to catch all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.method === 'OPTIONS') {
    console.log('  -> CORS Preflight request');
  }
  next();
});

app.use(express.json());

// Log body after parsing
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    console.log('  -> Body:', JSON.stringify(req.body));
  }
  next();
});

// Serve static files - serve from dist in production OR when SERVE_STATIC=true (for corporate env)
const isProduction = process.env.NODE_ENV === 'production';
const serveStatic = isProduction || process.env.SERVE_STATIC === 'true';
if (serveStatic) {
  console.log('Serving static files from dist/ (same-origin mode)');
  app.use(express.static(path.join(__dirname, '../dist')));
}

// Basic Identification Middleware mock (per documentation)
app.use((req, res, next) => {
  req.user = {
    eid: req.headers['x-authenticated-user'] || process.env.MOCK_USER_EID || 'anonymous',
    name: req.headers['remote-user'] || process.env.MOCK_USER_NAME || 'Anonymous User'
  };
  next();
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    user: req.user
  });
});

// Routes
app.use('/api/releases', releaseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/test-sets', testSetRoutes);
app.use('/api/test-cases', testCaseRoutes);
app.use('/api/test-steps', testStepRoutes);
app.use('/api/config', configRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/select-configs', selectConfigRoutes);
app.use('/api/match-configs', matchConfigRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/test-runs', testRunRoutes);

// SPA fallback - serve index.html for non-API routes when serving static files
if (serveStatic) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('=== ERROR CAUGHT ===');
  console.error('Path:', req.method, req.path);
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('====================');
  res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: 'An internal server error occurred',
      details: err.message // Always show for debugging
    }
  });
});

app.listen(PORT, () => {
  console.log('=== SERVER READY ===');
  console.log(`Test Builder server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Serve Static: ${process.env.SERVE_STATIC || 'false'}`);
  console.log('Waiting for requests...');
});
