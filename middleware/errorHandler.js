/**
 * JSON parsing error handler middleware
 * Handles malformed JSON in request bodies
 */
const jsonErrorHandler = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON format',
      details: 'Request body contains malformed JSON'
    });
  }
  next(err);
};

/**
 * Database connection error handler
 * Handles PostgreSQL connection and query errors
 */
const databaseErrorHandler = (err, req, res, next) => {
  // PostgreSQL connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    console.error('Database connection error:', {
      code: err.code,
      message: err.message,
      timestamp: new Date().toISOString(),
      endpoint: req.originalUrl
    });
    return res.status(500).json({
      error: 'Database connection failed'
    });
  }

  // PostgreSQL query errors
  if (err.code && err.code.startsWith('23')) { // Integrity constraint violations
    console.error('Database constraint error:', {
      code: err.code,
      constraint: err.constraint,
      timestamp: new Date().toISOString(),
      endpoint: req.originalUrl
    });
    return res.status(422).json({
      error: 'Data integrity violation',
      details: 'The operation violates database constraints'
    });
  }

  // Other database errors
  if (err.severity || err.routine) { // PostgreSQL error indicators
    console.error('Database error:', {
      code: err.code,
      severity: err.severity,
      message: err.message,
      timestamp: new Date().toISOString(),
      endpoint: req.originalUrl
    });
    return res.status(500).json({
      error: 'Database operation failed'
    });
  }

  next(err);
};

/**
 * Validation error formatter
 * Handles validation errors and formats them consistently
 */
const validationErrorHandler = (err, req, res, next) => {
  if (err.name === 'ValidationError' || err.type === 'validation') {
    const details = err.details || [];
    return res.status(422).json({
      error: 'Validation failed',
      details: details.map(detail => ({
        field: detail.field || 'unknown',
        message: detail.message || 'Invalid value'
      }))
    });
  }
  next(err);
};

/**
 * Authentication error handler
 * Handles missing or invalid authentication
 */
const authErrorHandler = (err, req, res, next) => {
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }
  next(err);
};

/**
 * Global error handler - catches all unhandled errors
 * Logs error details and returns generic error response
 */
const globalErrorHandler = (err, req, res, next) => {
  // Log the full error for debugging (server-side only)
  console.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Return generic error to client (don't expose internal details)
  res.status(500).json({
    error: 'Internal server error'
  });
};

/**
 * 404 handler for unmatched routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
};

/**
 * Helper function to create validation errors
 */
const createValidationError = (details) => {
  const error = new Error('Validation failed');
  error.name = 'ValidationError';
  error.type = 'validation';
  error.details = details;
  return error;
};

module.exports = {
  jsonErrorHandler,
  databaseErrorHandler,
  validationErrorHandler,
  authErrorHandler,
  globalErrorHandler,
  notFoundHandler,
  createValidationError
};