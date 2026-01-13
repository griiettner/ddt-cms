/**
 * Authentication Middleware
 *
 * POC Implementation: Uses placeholder user
 * Production Implementation: Extract user from HTTP headers (enterprise auth layer)
 */

/**
 * User identification middleware
 *
 * In production environment, the enterprise network layer handles authentication
 * and passes user information via HTTP headers.
 *
 * For POC, we use a placeholder user from environment variables.
 */
function identifyUser(req, res, next) {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    // Production: Extract user from headers
    // Common header names (adjust based on your enterprise setup):
    // - X-Forwarded-User
    // - X-Auth-User
    // - SM_USER (SiteMinder)
    // - REMOTE_USER

    const username = req.headers['x-forwarded-user']
                  || req.headers['x-auth-user']
                  || req.headers['remote_user']
                  || 'unknown-user';

    const email = req.headers['x-forwarded-email']
               || req.headers['x-auth-email']
               || `${username}@capitalone.com`;

    req.user = {
      username,
      email,
      displayName: req.headers['x-forwarded-name'] || username
    };

    console.log(`User identified: ${req.user.username}`);
  } else {
    // POC/Development: Use placeholder user
    req.user = {
      username: process.env.DEFAULT_USER || 'test-user',
      email: process.env.DEFAULT_USER_EMAIL || 'test.user@capitalone.com',
      displayName: 'Test User'
    };
  }

  next();
}

/**
 * Require authenticated user
 * (For future use if needed)
 */
function requireAuth(req, res, next) {
  if (!req.user || req.user.username === 'unknown-user') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'User authentication required'
    });
  }
  next();
}

module.exports = {
  identifyUser,
  requireAuth
};
