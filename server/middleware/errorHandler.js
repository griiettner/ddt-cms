/**
 * Error Handling Middleware
 */

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    path: req.path
  });
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  // Log error
  console.error('Error occurred:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    user: req.user?.username
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Send error response
  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details
    })
  });
}

/**
 * Async route wrapper to catch promise rejections
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error creator
 */
function validationError(message, details = null) {
  const error = new Error(message);
  error.name = 'ValidationError';
  error.statusCode = 400;
  error.details = details;
  return error;
}

/**
 * Not found error creator
 */
function notFoundError(resource, id = null) {
  const message = id
    ? `${resource} with ID ${id} not found`
    : `${resource} not found`;
  const error = new Error(message);
  error.name = 'NotFoundError';
  error.statusCode = 404;
  return error;
}

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
  validationError,
  notFoundError
};
