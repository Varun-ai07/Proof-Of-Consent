// src/middleware/error.middleware.js

export function errorHandler(err, req, res, next) {
  const timestamp = new Date().toISOString();
  const requestId = req.id || Math.random().toString(36).substr(2, 9);

  console.error(`[${timestamp}] Error (${requestId}):`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    success: false,
    error: message,
    requestId,
    timestamp,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}