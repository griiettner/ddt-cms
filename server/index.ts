import express from 'express';
import type { Express, Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import type { User } from './types/index.js';

// Extend Express Request to include user property - using module augmentation
declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

// Load environment variables
dotenv.config();

import { initSchema } from './db/migrations.js';

// Initialize Unified Database
try {
  initSchema();
} catch (err) {
  const error = err as Error;
  console.error('Failed to initialize database:', error.message);
  console.error('Stack:', error.stack);
  // Don't exit - let the server start and show errors per-request
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
const PORT: string | number = process.env.PORT || 3000;

import releaseRoutes from './routes/releases.js';
import dashboardRoutes from './routes/dashboard.js';
import testSetRoutes from './routes/test-sets.js';
import testCaseRoutes from './routes/test-cases.js';
import testStepRoutes from './routes/test-steps.js';
import configRoutes from './routes/config.js';
import exportRoutes from './routes/export.js';
import selectConfigRoutes from './routes/select-configs.js';
import matchConfigRoutes from './routes/match-configs.js';
import categoryRoutes from './routes/categories.js';
import testRunRoutes from './routes/test-runs.js';
import reusableCasesRoutes from './routes/reusable-cases.js';
import auditLogRoutes from './routes/audit-logs.js';
import testGenerationRoutes from './routes/test-generation.js';

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for POC/development convenience if needed
    crossOriginResourcePolicy: false,
  })
);

// CORS - handle preflight explicitly
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Authenticated-User', 'Remote-User'],
    credentials: true,
  })
);

// Handle OPTIONS preflight for all routes
app.options('*', cors());

// Request logging - BEFORE body parsing to catch all requests
app.use((req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'OPTIONS') {
    console.log('  -> CORS Preflight request');
  }
  next();
});

app.use(express.json());

// Log body after parsing
app.use((req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    console.log('  -> Body:', JSON.stringify(req.body));
  }
  next();
});

// Serve static files - serve from dist in production OR when SERVE_STATIC=true (for corporate env)
const isProduction: boolean = process.env.NODE_ENV === 'production';
const serveStatic: boolean = isProduction || process.env.SERVE_STATIC === 'true';
if (serveStatic) {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// Basic Identification Middleware mock (per documentation)
app.use((req: Request, res: Response, next: NextFunction): void => {
  req.user = {
    eid:
      (req.headers['x-authenticated-user'] as string) || process.env.MOCK_USER_EID || 'anonymous',
    name: (req.headers['remote-user'] as string) || process.env.MOCK_USER_NAME || 'Anonymous User',
  };
  next();
});

/**
 * Health check response interface
 */
interface HealthCheckResponse {
  success: boolean;
  status: string;
  timestamp: string;
  user: User | undefined;
}

// Health Check
app.get('/api/health', (req: Request, res: Response<HealthCheckResponse>): void => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    user: req.user,
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
app.use('/api/reusable-cases', reusableCasesRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/test-generation', testGenerationRoutes);

// SPA fallback - serve index.html for non-API routes when serving static files
if (serveStatic) {
  app.get('*', (req: Request, res: Response): void => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details: string;
  };
}

// Error handling middleware
const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction
): void => {
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
      details: err.message, // Always show for debugging
    },
  });
};

app.use(errorHandler);

app.listen(PORT, (): void => {
  console.log('=== SERVER READY ===');
  console.log(`Test Builder server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Serve Static: ${process.env.SERVE_STATIC || 'false'}`);
  console.log('Waiting for requests...');
});
