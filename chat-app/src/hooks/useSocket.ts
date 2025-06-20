import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { UseSocketReturn } from '../types';
import { SOCKET_EVENTS, UI_CONSTANTS } from '../config/constants';
import { AuthStorage } from '../utils/storage.utils';

/**
 * Custom hook for managing socket connection with enhanced error handling
 */
export const useSocket = (serverUrl: string): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const initializeSocket = useCallback(() => {
    if (socketRef.current) {
      return;
    }

    const token = AuthStorage.getToken();
    if (!token) {
      setError('Authentication token not found');
      return;
    }

    try {
      const socket = io(serverUrl, {
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

      // Connection event handlers
      socket.on(SOCKET_EVENTS.CONNECT, () => {
        console.log('Socket connected successfully');
        setIsConnected(true);
        setError(null);
      });

      socket.on(SOCKET_EVENTS.CONNECT_ERROR, (err) => {
        console.error('Socket connection error:', err);
        setIsConnected(false);
        setError(`Connection failed: ${err.message}`);
      });

      socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, reconnect manually
          socket.connect();
        }
      });

      socket.on(SOCKET_EVENTS.RECONNECT, (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
        setError(null);
      });

      socket.on(SOCKET_EVENTS.RECONNECT_ATTEMPT, (attemptNumber) => {
        console.log('Socket reconnection attempt:', attemptNumber);
        setError(`Reconnecting... (attempt ${attemptNumber})`);
      });

      socket.on(SOCKET_EVENTS.RECONNECT_ERROR, (err) => {
        console.error('Socket reconnection error:', err);
        setError(`Reconnection failed: ${err.message}`);
      });

      socket.on(SOCKET_EVENTS.RECONNECT_FAILED, () => {
        console.error('Socket reconnection failed after all attempts');
        setError('Failed to reconnect after multiple attempts');
        setIsConnected(false);
      });

      socketRef.current = socket;
    } catch (err) {
      console.error('Failed to initialize socket:', err);
      setError('Failed to initialize connection');
    }
  }, [serverUrl]);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  }, [isConnected]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    initializeSocket();

    return () => {
      disconnect();
    };
  }, [initializeSocket, disconnect]);

  return {
    isConnected,
    error,
    emit,
  };
};

/**
 * Hook for socket event listeners with automatic cleanup
 */
export const useSocketEvent = <T = any>(
  socket: Socket | null,
  event: string,
  handler: (data: T) => void
) => {
  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
};

/**
 * Hook for managing socket with event listeners
 */
export const useSocketWithEvents = (serverUrl: string) => {
  const { isConnected, error, emit } = useSocket(serverUrl);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = AuthStorage.getToken();
    if (!token) return;

    const socketInstance = io(serverUrl, {
      auth: { token: `Bearer ${token}` },
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [serverUrl]);

  const on = useCallback((event: string, handler: (data: any) => void) => {
    if (socket) {
      socket.on(event, handler);
    }
  }, [socket]);

  const off = useCallback((event: string, handler?: (data: any) => void) => {
    if (socket) {
      if (handler) {
        socket.off(event, handler);
      } else {
        socket.off(event);
      }
    }
  }, [socket]);

  return {
    socket,
    isConnected,
    error,
    emit,
    on,
    off,
  };
}; 