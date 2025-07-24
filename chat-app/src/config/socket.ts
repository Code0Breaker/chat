import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS, UI_CONSTANTS } from './constants';
import { AuthStorage } from '../utils/storage.utils';

let socket: Socket | null = null;
let isConnecting = false;
let connectionPromise: Promise<Socket> | null = null;

/**
 * Get or create socket instance with enhanced configuration
 */
export const getSocket = (): Socket => {
  // Return existing connected socket
  if (socket && socket.connected) {
    return socket;
  }

  // If connection is in progress, throw a more graceful error
  if (isConnecting && !socket) {
    console.warn('⏳ Socket connection in progress, please wait...');
    // Return a dummy socket that will fail gracefully rather than throwing
    throw new Error('Socket connection in progress');
  }

  // If we have a disconnected socket, clean it up
  if (socket && !socket.connected) {
    console.log('🧹 Cleaning up disconnected socket');
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const serverUrl = import.meta.env.VITE_APP_SERVER_URL || 'http://localhost:3001';
  const token = AuthStorage.getToken();

  if (!token) {
    throw new Error('Authentication token required for socket connection');
  }

  // Start connection process
  isConnecting = true;
  console.log('🔌 Initializing socket connection to:', serverUrl);

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
      }
    });

    socket.on(SOCKET_EVENTS.RECONNECT, (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      isConnecting = false;
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
    console.error('❌ Failed to create socket:', error);
    isConnecting = false;
    throw error;
  }
};

/**
 * Get socket safely without throwing errors
 */
export const getSocketSafely = (): Socket | null => {
  try {
    return getSocket();
  } catch (error) {
    console.warn('⚠️ Could not get socket:', error);
    return null;
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
  connectionPromise = null;
};

/**
 * Emit event with error handling
 */
export const emitEvent = (event: string, data?: any): boolean => {
  try {
    const socketInstance = getSocketSafely();
    
    if (socketInstance && socketInstance.connected) {
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