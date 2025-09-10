/**
 * Centralized Error Handling for API Requests
 * Common patterns and solutions for React Native API errors
 */

/**
 * Standard error types commonly seen in React Native apps
 */
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  API: 'API_ERROR',
  PARSE: 'PARSE_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  OFFLINE: 'OFFLINE_ERROR'
};

/**
 * Extract meaningful error information from various error types
 */
export const parseError = (error, context = '') => {
  let errorType = ERROR_TYPES.NETWORK;
  let userMessage = 'Something went wrong. Please try again.';
  let debugMessage = error?.message || 'Unknown error';
  
  // Network-related errors
  if (error?.message?.includes('Network request failed')) {
    errorType = ERROR_TYPES.NETWORK;
    userMessage = 'Network connection failed. Please check your internet connection.';
  } else if (error?.message?.includes('timeout')) {
    errorType = ERROR_TYPES.TIMEOUT;
    userMessage = 'Request timed out. Please try again.';
  } else if (error?.name === 'AbortError') {
    errorType = ERROR_TYPES.TIMEOUT;
    userMessage = 'Request was cancelled due to timeout.';
  }
  
  // API-specific errors
  else if (error?.message?.includes('404')) {
    errorType = ERROR_TYPES.API;
    userMessage = 'Service not available. Please try again later.';
  } else if (error?.message?.includes('401')) {
    errorType = ERROR_TYPES.PERMISSION;
    userMessage = 'Authentication required. Please log in again.';
  } else if (error?.message?.includes('403')) {
    errorType = ERROR_TYPES.PERMISSION;
    userMessage = 'Access denied. Please check your permissions.';
  } else if (error?.message?.includes('500')) {
    errorType = ERROR_TYPES.API;
    userMessage = 'Server error. Our team has been notified.';
  }
  
  // JSON parsing errors
  else if (error?.message?.includes('JSON') || error?.message?.includes('parse')) {
    errorType = ERROR_TYPES.PARSE;
    userMessage = 'Invalid response from server. Please try again.';
  }
  
  return {
    type: errorType,
    userMessage,
    debugMessage,
    context,
    timestamp: new Date().toISOString(),
    originalError: error
  };
};

/**
 * Log error with structured format for debugging
 */
export const logError = (error, context = '', additionalData = {}) => {
  const parsedError = parseError(error, context);
  
  console.group(`🔥 API Error - ${context}`);
  console.error('Error Type:', parsedError.type);
  console.error('User Message:', parsedError.userMessage);
  console.error('Debug Message:', parsedError.debugMessage);
  console.error('Context:', context);
  console.error('Timestamp:', parsedError.timestamp);
  if (Object.keys(additionalData).length > 0) {
    console.error('Additional Data:', additionalData);
  }
  console.error('Original Error:', error);
  console.groupEnd();
  
  return parsedError;
};

/**
 * Common retry strategies for different error types
 */
export const shouldRetry = (error, attemptCount = 0, maxAttempts = 3) => {
  const parsedError = parseError(error);
  
  // Don't retry client errors (4xx)
  if (parsedError.type === ERROR_TYPES.PERMISSION) {
    return false;
  }
  
  // Don't retry if we've exceeded max attempts
  if (attemptCount >= maxAttempts) {
    return false;
  }
  
  // Retry network, timeout, and server errors
  return [
    ERROR_TYPES.NETWORK,
    ERROR_TYPES.TIMEOUT,
    ERROR_TYPES.API
  ].includes(parsedError.type);
};

/**
 * Calculate backoff delay for retry attempts
 * Uses exponential backoff with jitter
 */
export const getRetryDelay = (attemptCount, baseDelay = 1000, maxDelay = 10000) => {
  const exponentialDelay = baseDelay * Math.pow(2, attemptCount);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add 30% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
};

/**
 * Enhanced fetch wrapper with comprehensive error handling
 * Implements common React Native API patterns
 */
export const safeApiCall = async (
  apiFunction,
  context = '',
  options = {}
) => {
  const {
    maxRetries = 2,
    baseDelay = 1000,
    fallbackValue = null,
    logErrors = true
  } = options;
  
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiFunction();
      
      // Log successful recovery if this wasn't the first attempt
      if (attempt > 0 && logErrors) {
        console.log(`✅ API call recovered on attempt ${attempt + 1} - ${context}`);
      }
      
      return {
        success: true,
        data: result,
        error: null,
        attempts: attempt + 1
      };
    } catch (error) {
      lastError = error;
      
      if (logErrors) {
        logError(error, `${context} (attempt ${attempt + 1}/${maxRetries + 1})`, {
          attempt: attempt + 1,
          maxRetries: maxRetries + 1
        });
      }
      
      // Check if we should retry
      if (attempt < maxRetries && shouldRetry(error, attempt)) {
        const delay = getRetryDelay(attempt, baseDelay);
        console.log(`⏳ Retrying in ${delay}ms - ${context}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      break;
    }
  }
  
  // All attempts failed
  const parsedError = parseError(lastError, context);
  
  return {
    success: false,
    data: fallbackValue,
    error: parsedError,
    attempts: maxRetries + 1
  };
};

/**
 * Check if device is offline
 * Common issue in React Native apps
 */
export const checkOnlineStatus = async () => {
  try {
    const response = await fetch('https://httpbin.org/status/200', {
      method: 'HEAD',
      cache: 'no-cache',
      timeout: 5000
    });
    return response.ok;
  } catch {
    return false;
  }
};
