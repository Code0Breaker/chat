import { STORAGE_KEYS } from '../config/constants';

/**
 * Safe localStorage operations with error handling
 */
export class StorageUtils {
  /**
   * Get item from localStorage with fallback
   */
  static getItem(key: string, fallback: string = ''): string {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (error) {
      console.warn(`Failed to get item from localStorage: ${key}`, error);
      return fallback;
    }
  }

  /**
   * Set item to localStorage with error handling
   */
  static setItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Failed to set item to localStorage: ${key}`, error);
      return false;
    }
  }

  /**
   * Remove item from localStorage
   */
  static removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove item from localStorage: ${key}`, error);
      return false;
    }
  }

  /**
   * Clear all localStorage
   */
  static clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear localStorage', error);
      return false;
    }
  }

  /**
   * Get JSON item from localStorage
   */
  static getJsonItem<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (error) {
      console.warn(`Failed to get JSON item from localStorage: ${key}`, error);
      return fallback;
    }
  }

  /**
   * Set JSON item to localStorage
   */
  static setJsonItem<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Failed to set JSON item to localStorage: ${key}`, error);
      return false;
    }
  }
}

/**
 * Auth-specific storage utilities
 */
export class AuthStorage {
  static getToken(): string {
    return StorageUtils.getItem(STORAGE_KEYS.TOKEN);
  }

  static setToken(token: string): boolean {
    return StorageUtils.setItem(STORAGE_KEYS.TOKEN, token);
  }

  static removeToken(): boolean {
    return StorageUtils.removeItem(STORAGE_KEYS.TOKEN);
  }

  static getUserId(): string {
    return StorageUtils.getItem(STORAGE_KEYS.USER_ID);
  }

  static setUserId(userId: string): boolean {
    return StorageUtils.setItem(STORAGE_KEYS.USER_ID, userId);
  }

  static getUserPic(): string {
    return StorageUtils.getItem(STORAGE_KEYS.USER_PIC);
  }

  static setUserPic(pic: string): boolean {
    return StorageUtils.setItem(STORAGE_KEYS.USER_PIC, pic);
  }

  static getFullname(): string {
    return StorageUtils.getItem('fullname');
  }

  static setFullname(fullname: string): boolean {
    return StorageUtils.setItem('fullname', fullname);
  }

  static clearAuthData(): boolean {
    try {
      StorageUtils.removeItem(STORAGE_KEYS.TOKEN);
      StorageUtils.removeItem(STORAGE_KEYS.USER_ID);
      StorageUtils.removeItem(STORAGE_KEYS.USER_PIC);
      StorageUtils.removeItem('fullname');
      return true;
    } catch (error) {
      console.warn('Failed to clear auth data', error);
      return false;
    }
  }

  static isAuthenticated(): boolean {
    const token = this.getToken();
    return Boolean(token && token.length > 0);
  }
} 