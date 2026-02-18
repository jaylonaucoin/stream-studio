/**
 * Error handling utilities for the main process
 */

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

/**
 * Error codes for common error scenarios
 */
const ErrorCodes = {
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  FFMPEG_NOT_FOUND: 'FFMPEG_NOT_FOUND',
  YTDLP_NOT_FOUND: 'YTDLP_NOT_FOUND',
  CONVERSION_FAILED: 'CONVERSION_FAILED',
  CONVERSION_CANCELLED: 'CONVERSION_CANCELLED',
  INVALID_URL: 'INVALID_URL',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
  METADATA_ERROR: 'METADATA_ERROR',
};

/**
 * Wraps a function with error handling that returns a consistent error response
 * @param {Function} fn - The function to wrap
 * @param {string} context - Context string for error logging
 * @returns {Function} Wrapped function
 */
function withErrorHandling(fn, context = 'operation') {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`Error in ${context}:`, error);
      
      // If it's already an AppError, preserve it
      if (error instanceof AppError) {
        return {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
        };
      }
      
      // Convert generic errors to a consistent format
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
        code: ErrorCodes.UNKNOWN_ERROR,
      };
    }
  };
}

/**
 * Creates a standardized success response
 * @param {*} data - The response data
 * @returns {Object} Success response object
 */
function successResponse(data = {}) {
  return {
    success: true,
    ...data,
  };
}

/**
 * Creates a standardized error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {*} details - Additional error details
 * @returns {Object} Error response object
 */
function errorResponse(message, code = ErrorCodes.UNKNOWN_ERROR, details = null) {
  return {
    success: false,
    error: message,
    code,
    details,
  };
}

/**
 * Validates that required parameters are present
 * @param {Object} params - Parameters to validate
 * @param {string[]} required - Required parameter names
 * @throws {AppError} If validation fails
 */
function validateRequired(params, required) {
  const missing = required.filter((key) => params[key] === undefined || params[key] === null);
  if (missing.length > 0) {
    throw new AppError(
      `Missing required parameters: ${missing.join(', ')}`,
      ErrorCodes.VALIDATION_ERROR,
      { missing }
    );
  }
}

/**
 * Validates a URL format
 * @param {string} url - URL to validate
 * @throws {AppError} If URL is invalid
 */
function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new AppError('URL is required', ErrorCodes.VALIDATION_ERROR);
  }
  
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    throw new AppError('URL cannot be empty', ErrorCodes.VALIDATION_ERROR);
  }
  
  try {
    new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    throw new AppError('Invalid URL format', ErrorCodes.INVALID_URL);
  }
}

module.exports = {
  AppError,
  ErrorCodes,
  withErrorHandling,
  successResponse,
  errorResponse,
  validateRequired,
  validateUrl,
};
