export function errorHandler(err, req, res, next) {
  // Always log server-side for debugging
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message || err);

  // Multer errors (file size or type limits)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size limit exceeded. Images must be ≤ 10MB, videos ≤ 100MB.'
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`
    });
  }

  // Custom client validation / bad request errors
  if (err.status && err.status < 500) {
    return res.status(err.status).json({
      success: false,
      error: err.message || 'Client request error.'
    });
  }

  // Never expose internal stack traces or database errors to client
  return res.status(500).json({
    success: false,
    error: 'Internal server error. Please try again later or contact support.'
  });
}
