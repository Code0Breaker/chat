import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiError, ApiResponse } from '../types';
import { ApiUtils } from '../utils/api.utils';
import { AuthStorage } from '../utils/storage.utils';
import { ERROR_MESSAGES } from '../config/constants';

/**
 * Centralized API service with enhanced error handling and interceptors
 */
class ApiService {
  private instance: AxiosInstance;

  constructor(baseURL: string) {
    this.instance = axios.create({
      baseURL,
      withCredentials: true,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        const token = AuthStorage.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle authentication errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // Clear auth data on 401
          AuthStorage.clearAuthData();
          
          // Redirect to login or refresh token here
          window.location.href = '/';
          
          return Promise.reject(error);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * GET request with error handling
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.instance.get(url, config);
      return ApiUtils.handleResponse<T>(response);
    } catch (error) {
      throw ApiUtils.handleError(error);
    }
  }

  /**
   * POST request with error handling
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.instance.post(url, data, config);
      return ApiUtils.handleResponse<T>(response);
    } catch (error) {
      throw ApiUtils.handleError(error);
    }
  }

  /**
   * PUT request with error handling
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.instance.put(url, data, config);
      return ApiUtils.handleResponse<T>(response);
    } catch (error) {
      throw ApiUtils.handleError(error);
    }
  }

  /**
   * PATCH request with error handling
   */
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.instance.patch(url, data, config);
      return ApiUtils.handleResponse<T>(response);
    } catch (error) {
      throw ApiUtils.handleError(error);
    }
  }

  /**
   * DELETE request with error handling
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.instance.delete(url, config);
      return ApiUtils.handleResponse<T>(response);
    } catch (error) {
      throw ApiUtils.handleError(error);
    }
  }

  /**
   * Request with retry logic
   */
  async requestWithRetry<T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    data?: any,
    maxRetries: number = 3
  ): Promise<T> {
    return ApiUtils.retry(
      () => this[method]<T>(url, data),
      maxRetries
    );
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    return this.post<T>(url, formData, config);
  }

  /**
   * Get axios instance for custom requests
   */
  getInstance(): AxiosInstance {
    return this.instance;
  }
}

// Create and export API service instance
const serverUrl = import.meta.env.VITE_APP_SERVER_URL || 'http://localhost:3001';
export const apiService = new ApiService(serverUrl);

 