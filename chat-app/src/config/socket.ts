import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS, UI_CONSTANTS } from './constants';
import { AuthStorage } from '../utils/storage.utils';

let socket: Socket | null = null;
let connectionPromise: Promise<Socket> | null = null;

/**
 * Create a new socket connection
 */
const createSocket = (): Promise<Socket> => {
  const serverUrl = import.meta.env.VITE_APP_SERVER_URL || 'http://localhost:3001';
  const token = AuthStorage.getToken();

  if (!token) {
    throw new Error('Authentication token required for socket connection');
  }

  console.log('🔌 Creating new socket connection to:', serverUrl);

  return new Promise((resolve, reject) => {
    const newSocket = io(serverUrl, {
      auth: {
        token: `Bearer ${token}`,
      },
      transports: ['polling'], // Start with polling only, let socket.io handle upgrades
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
    });

    // Set up one-time connection handlers
    const onConnect = () => {
      console.log('🔌 Socket connected successfully');
      socket = newSocket;
      cleanup();
      resolve(newSocket);
    };

    const onConnectError = (error: any) => {
      console.error('❌ Socket connection error:', error);
      cleanup();
      reject(error);
    };

    const onDisconnect = (reason: string) => {
      console.log('🔌 Socket disconnected:', reason);
      if (socket === newSocket) {
        socket = null;
      }
    };

    const onReconnect = (attemptNumber: number) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      socket = newSocket;
    };

    const onReconnectError = (error: any) => {
      console.error('❌ Socket reconnection error:', error);
    };

    const onReconnectFailed = () => {
      console.error('❌ Socket reconnection failed after all attempts');
      if (socket === newSocket) {
        socket = null;
      }
    };

    const cleanup = () => {
      newSocket.off(SOCKET_EVENTS.CONNECT, onConnect);
      newSocket.off(SOCKET_EVENTS.CONNECT_ERROR, onConnectError);
    };

    // Add event listeners
    newSocket.once(SOCKET_EVENTS.CONNECT, onConnect);
    newSocket.once(SOCKET_EVENTS.CONNECT_ERROR, onConnectError);
    newSocket.on(SOCKET_EVENTS.DISCONNECT, onDisconnect);
    newSocket.on(SOCKET_EVENTS.RECONNECT, onReconnect);
    newSocket.on(SOCKET_EVENTS.RECONNECT_ERROR, onReconnectError);
    newSocket.on(SOCKET_EVENTS.RECONNECT_FAILED, onReconnectFailed);

    // Set a timeout for connection
    const connectionTimeout = setTimeout(() => {
      if (!newSocket.connected) {
        console.error('❌ Socket connection timeout');
        cleanup();
        newSocket.disconnect();
        reject(new Error('Socket connection timeout'));
      }
    }, UI_CONSTANTS.SOCKET_TIMEOUT);

    newSocket.once(SOCKET_EVENTS.CONNECT, () => {
      clearTimeout(connectionTimeout);
    });
  });
};

/**
 * Get or create socket instance with proper promise-based singleton
 */
export const getSocket = (): Socket => {
  // Return existing connected socket
  if (socket && socket.connected) {
    return socket;
  }

  // If connection is in progress, throw error to prevent multiple attempts
  if (connectionPromise) {
    throw new Error('Socket connection already in progress');
  }

  // Clean up disconnected socket
  if (socket && !socket.connected) {
    console.log('🧹 Cleaning up disconnected socket');
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  throw new Error('Socket not connected, use getSocketAsync() for async connection');
};

/**
 * Get socket asynchronously with proper singleton pattern
 */
export const getSocketAsync = async (): Promise<Socket> => {
  // Return existing connected socket
  if (socket && socket.connected) {
    return socket;
  }

  // If connection is already in progress, wait for it
  if (connectionPromise) {
    console.log('⏳ Socket connection in progress, waiting...');
    try {
      return await connectionPromise;
    } catch (error) {
      connectionPromise = null;
      throw error;
    }
  }

  // Clean up disconnected socket
  if (socket && !socket.connected) {
    console.log('🧹 Cleaning up disconnected socket');
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  // Start new connection
  connectionPromise = createSocket();

  try {
    const newSocket = await connectionPromise;
    connectionPromise = null;
    return newSocket;
  } catch (error) {
    connectionPromise = null;
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
 * Initialize socket connection asynchronously
 */
export const initializeSocket = async (): Promise<Socket | null> => {
  try {
    return await getSocketAsync();
  } catch (error) {
    console.error('❌ Failed to initialize socket:', error);
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