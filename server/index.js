/**
 * CMS for Data-Driven Testing (DDT)
 * Main Express Server
 *
 * This single server handles:
 * 1. Static file serving (HTML, CSS, JS from public/)
 * 2. REST API endpoints (under /api)
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');

// Database setup
const { migrate } = require('./db/migrations');
const { seed } = require('./db/seed');

// Middleware
const { identifyUser } = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'"
      ],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "'unsafe-eval'",
        "localhost:4000"
      ],
      fontSrc: ["'self'", "data:"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "ws://localhost:4000", "http://localhost:4000"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (development only)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, req.user?.username || 'anonymous');
    next();
  });
}

// User identification middleware (applies to all routes)
app.use(identifyUser);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    user: req.user?.username
  });
});

// API Routes
app.use('/api/releases', require('./routes/releases'));
app.use('/api/test-sets', require('./routes/testSets'));
// app.use('/api/test-cases', require('./routes/testCases'));
// app.use('/api/test-steps', require('./routes/testSteps'));
// app.use('/api/config', require('./routes/config'));
// app.use('/api/dashboard', require('./routes/dashboard'));
// app.use('/api/test-runs', require('./routes/testRuns'));

// Temporary API endpoint for testing
app.get('/api/status', (req, res) => {
  res.json({
    message: 'CMS DDT API is running',
    version: '0.1.0',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// Catch-all route for SPA - serve index.html
app.get('*', (req, res, next) => {
  // Only serve index.html for non-API routes
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    next();
  }
});

// 404 handler for API routes
app.use('/api/*', notFoundHandler);

// Global error handler
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    console.log('='.repeat(50));
    console.log('CMS for Data-Driven Testing (DDT)');
    console.log('='.repeat(50));
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`Port: ${PORT}`);

    // Run database migrations
    console.log('\nInitializing database...');
    migrate();

    // Seed database with default data
    console.log('\nSeeding database...');
    seed();

    // Start server
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ API available at http://localhost:${PORT}/api`);
      console.log(`✓ Health check at http://localhost:${PORT}/health`);
      console.log('='.repeat(50) + '\n');

      if (NODE_ENV === 'development') {
        console.log('Hot reload enabled - changes will auto-refresh\n');
      }
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
