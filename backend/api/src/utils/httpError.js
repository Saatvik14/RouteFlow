class HttpError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const sendError = (res, error) => {
  const statusCode = Number(error?.statusCode) || 500;
  const isServerError = statusCode >= 500;

  return res.status(statusCode).json({
    success: false,
    error: {
      code: error?.code || (isServerError ? 'INTERNAL_ERROR' : 'REQUEST_FAILED'),
      message: isServerError
        ? 'An unexpected server error occurred.'
        : error?.message || 'The request could not be completed.',
      ...(error?.details ? { details: error.details } : {}),
    },
    message: isServerError
      ? 'An unexpected server error occurred.'
      : error?.message || 'The request could not be completed.',
  });
};

module.exports = { HttpError, asyncHandler, sendError };
