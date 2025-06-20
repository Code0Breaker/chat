import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS, UI_CONSTANTS } from './constants';
import { AuthStorage } from '../utils/storage.utils';

let socket: Socket | null = null;

/**
 * Get or create socket instance with enhanced configuration
 */
export const getSocket = (): Socket => {
  if (socket && socket.connected) {
    return socket;
  }

  const serverUrl = import.meta.env.VITE_APP_SERVER_URL || 'http://localhost:3001';
  const token = AuthStorage.getToken();

  if (!token) {
    throw new Error('Authentication token required for socket connection');
  }

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
    forceNew: false,
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
  });

  socket.on(SOCKET_EVENTS.CONNECT_ERROR, (error) => {
    console.error('❌ Socket connection error:', error);
  });

  socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
    console.log('🔌 Socket disconnected:', reason);
    
    if (reason === 'io server disconnect') {
      // Server initiated disconnect, attempt to reconnect
      socket?.connect();
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
  });

  return socket;
};

/**
 * Disconnect and cleanup socket
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Emit event with error handling
 */
export const emitEvent = (event: string, data?: any): boolean => {
  const socketInstance = getSocket();
  
  if (socketInstance.connected) {
    socketInstance.emit(event, data);
    return true;
  }
  
  console.warn('Socket not connected, cannot emit event:', event);
  return false;
};

/**
 * Check if socket is connected
 */
export const isSocketConnected = (): boolean => {
  return socket?.connected || false;
};

// Backward compatibility - export the socket instance
export { socket };

// Default export for existing imports
export default getSocket; 