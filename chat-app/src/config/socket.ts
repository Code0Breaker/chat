import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS, UI_CONSTANTS } from './constants';
import { AuthStorage } from '../utils/storage.utils';

let socket: Socket | null = null;
let isConnecting = false;

/**
 * Get or create socket instance with enhanced configuration
 */
export const getSocket = (): Socket => {
  // Return existing connected socket
  if (socket && socket.connected) {
    return socket;
  }

  // Prevent multiple connection attempts
  if (isConnecting) {
    throw new Error('Socket connection already in progress');
  }

  const serverUrl = import.meta.env.VITE_APP_SERVER_URL || 'http://localhost:3001';
  const token = AuthStorage.getToken();

  if (!token) {
    throw new Error('Authentication token required for socket connection');
  }

  // Clean up existing socket if it exists but is disconnected
  if (socket && !socket.connected) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  isConnecting = true;

  try {
    socket = io(serverUrl, {
      auth: {
        token: `Bearer ${token}`,
      },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: UI_CONSTANTS.RECONNECTION_ATTEMPTS,
      reconnectionDelay: UI_CONSTANTS.RECONNECTION_DELAY,
      reconnectionDelayMax: UI_CONSTANTS.RECONNECTION_DELAY_MAX,
      timeout: UI_CONSTANTS.SOCKET_TIMEOUT,
      autoConnect: true,
      forceNew: false, // ✅ Explicitly set to false
      path: '/socket.io/',
      withCredentials: true,
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
      upgrade: true,
      rememberUpgrade: true,
      secure: true,
      rejectUnauthorized: false,
      transportOptions: {
        polling: {
          extraHeaders: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    });

    // Enhanced event listeners
    socket.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('🔌 Socket connected successfully');
      isConnecting = false;
    });

    socket.on(SOCKET_EVENTS.CONNECT_ERROR, (error) => {
      console.error('❌ Socket connection error:', error);
      isConnecting = false;
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      isConnecting = false;
      
      // Only reconnect if it was a server-initiated disconnect
      if (reason === 'io server disconnect') {
        console.log('🔄 Server initiated disconnect, attempting reconnect...');
        // The socket.io client will handle reconnection automatically
      }
    });

    socket.on(SOCKET_EVENTS.RECONNECT, (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
    });

    socket.on(SOCKET_EVENTS.RECONNECT_ATTEMPT, (attemptNumber) => {
      console.log('🔄 Socket reconnection attempt:', attemptNumber);
    });

    socket.on(SOCKET_EVENTS.RECONNECT_ERROR, (error) => {
      console.error('❌ Socket reconnection error:', error);
    });

    socket.on(SOCKET_EVENTS.RECONNECT_FAILED, () => {
      console.error('❌ Socket reconnection failed after all attempts');
      isConnecting = false;
    });

    return socket;
  } catch (error) {
    isConnecting = false;
    throw error;
  }
};

/**
 * Disconnect and cleanup socket
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  isConnecting = false;
};

/**
 * Emit event with error handling
 */
export const emitEvent = (event: string, data?: any): boolean => {
  try {
    const socketInstance = getSocket();
    
    if (socketInstance.connected) {
      socketInstance.emit(event, data);
      return true;
    }
    
    console.warn('Socket not connected, cannot emit event:', event);
    return false;
  } catch (error) {
    console.error('Error emitting socket event:', error);
    return false;
  }
};

/**
 * Check if socket is connected
 */
export const isSocketConnected = (): boolean => {
  return socket?.connected || false;
};

// Default export for existing imports
export default getSocket; 