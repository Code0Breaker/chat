import { ApiError, ApiResponse } from '../types';
import { ERROR_MESSAGES } from '../config/constants';

/**
 * API utility functions for error handling and response processing
 */
export class ApiUtils {
  /**
   * Handle API response and extract data
   */
  static handleResponse<T>(response: any): T {
    if (response.data) {
      return response.data;
    }
    return response;
  }

  /**
   * Handle API errors with proper error messages
   */
  static handleError(error: any): ApiError {
    if (error?.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || this.getStatusMessage(status);
      return {
        message,
        status,
        code: error.response.data?.code,
      };
    } else if (error?.request) {
      // Request made but no response received
      return {
        message: ERROR_MESSAGES.NETWORK_ERROR,
        status: 0,
      };
    } else {
      // Something else happened
      return {
        message: error?.message || ERROR_MESSAGES.GENERIC_ERROR,
        status: 0,
      };
    }
  }

  /**
   * Get user-friendly message based on HTTP status
   */
  private static getStatusMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 403:
        return 'Access denied.';
      case 404:
        return 'Resource not found.';
      case 429:
        return 'Too many requests. Please wait and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service unavailable. Please try again later.';
      default:
        return ERROR_MESSAGES.GENERIC_ERROR;
    }
  }

  /**
   * Create a standardized API response
   */
  static createResponse<T>(data: T, message?: string, status: number = 200): ApiResponse<T> {
    return {
      data,
      message,
      status,
    };
  }

  /**
   * Check if error is authentication related
   */
  static isAuthError(error: ApiError): boolean {
    return error.status === 401 || error.status === 403;
  }

  /**
   * Check if error is network related
   */
  static isNetworkError(error: ApiError): boolean {
    return error.status === 0;
  }

  /**
   * Retry logic for failed requests
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (i === maxRetries) {
          throw error;
        }
        
        // Don't retry on authentication errors
        const apiError = this.handleError(error);
        if (this.isAuthError(apiError)) {
          throw error;
        }
        
        // Wait before retrying
        await this.delay(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
    
    throw lastError;
  }

  /**
   * Delay utility for retry mechanism
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Debounce utility for API calls
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle utility for API calls
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
} 