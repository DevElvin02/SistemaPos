export function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, next) {
  console.error('[API ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({
    ok: false,
    message: err.message || 'Internal server error',
  });
}
