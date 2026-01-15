import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

import { initRegistrySchema } from './db/migrations.js';

// Initialize Registry Database
initRegistrySchema();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

import releaseRoutes from './routes/releases.js';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for POC/development convenience if needed
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

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
    status: 'ok',
    timestamp: new Date().toISOString(),
    user: req.user
  });
});

// Routes
app.use('/api/releases', releaseRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: 'An internal server error occurred',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    }
  });
});

app.listen(PORT, () => {
  console.log(`CMS for DDT server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
