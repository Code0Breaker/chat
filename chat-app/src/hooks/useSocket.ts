import { useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { UseSocketReturn } from '../types';
import { getSocketSafely, initializeSocket, disconnectSocket, isSocketConnected } from '../config/socket';
import { SOCKET_EVENTS } from '../config/constants';

/**
 * Custom hook for managing socket connection with enhanced error handling
 * Uses the singleton socket from config/socket.ts
 */
export const useSocket = (): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const initializingRef = useRef(false);

  const initializeSocketConnection = useCallback(async () => {
    if (socketRef.current || initializingRef.current) {
      return;
    }

    initializingRef.current = true;

    try {
      console.log('🔄 Initializing socket connection...');
      const socket = await initializeSocket();
      
      if (!socket) {
        setError('Failed to initialize socket connection');
        return;
      }

      socketRef.current = socket;

      // Update connection state
      setIsConnected(socket.connected);

      // Set up event listeners for state management
      const handleConnect = () => {
        console.log('✅ Socket connection established');
        setIsConnected(true);
        setError(null);
      };

      const handleDisconnect = () => {
        console.log('❌ Socket disconnected');
        setIsConnected(false);
      };

      const handleConnectError = (err: any) => {
        console.error('❌ Socket connection error:', err);
        setIsConnected(false);
        setError(`Connection failed: ${err.message}`);
      };

      const handleReconnect = () => {
        console.log('✅ Socket reconnected');
        setIsConnected(true);
        setError(null);
      };

      const handleReconnectError = (err: any) => {
        console.error('❌ Socket reconnection error:', err);
        setError(`Reconnection failed: ${err.message}`);
      };

      const handleReconnectFailed = () => {
        console.error('❌ Socket reconnection failed permanently');
        setError('Failed to reconnect after multiple attempts');
        setIsConnected(false);
      };

      // Add event listeners
      socket.on(SOCKET_EVENTS.CONNECT, handleConnect);
      socket.on(SOCKET_EVENTS.DISCONNECT, handleDisconnect);
      socket.on(SOCKET_EVENTS.CONNECT_ERROR, handleConnectError);
      socket.on(SOCKET_EVENTS.RECONNECT, handleReconnect);
      socket.on(SOCKET_EVENTS.RECONNECT_ERROR, handleReconnectError);
      socket.on(SOCKET_EVENTS.RECONNECT_FAILED, handleReconnectFailed);

      // Store cleanup function
      cleanupRef.current = () => {
        socket.off(SOCKET_EVENTS.CONNECT, handleConnect);
        socket.off(SOCKET_EVENTS.DISCONNECT, handleDisconnect);
        socket.off(SOCKET_EVENTS.CONNECT_ERROR, handleConnectError);
        socket.off(SOCKET_EVENTS.RECONNECT, handleReconnect);
        socket.off(SOCKET_EVENTS.RECONNECT_ERROR, handleReconnectError);
        socket.off(SOCKET_EVENTS.RECONNECT_FAILED, handleReconnectFailed);
      };

    } catch (err: any) {
      console.error('❌ Failed to initialize socket:', err);
      setError(err.message || 'Failed to initialize connection');
    } finally {
      initializingRef.current = false;
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  }, [isConnected]);

  const cleanup = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    socketRef.current = null;
    initializingRef.current = false;
  }, []);

  useEffect(() => {
    initializeSocketConnection();

    return () => {
      cleanup();
    };
  }, [initializeSocketConnection, cleanup]);

  return {
    isConnected,
    error,
    emit,
  };
};

/**
 * Hook for socket event listeners with automatic cleanup and retry logic
 */
export const useSocketEvent = <T = any>(
  event: string,
  handler: (data: T) => void,
  deps: any[] = []
) => {
  const retryCount = useRef(0);
  const maxRetries = 3;
  const retryTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const setupListener = () => {
      try {
        const socket = getSocketSafely();
        if (!socket || !socket.connected) {
          if (retryCount.current < maxRetries) {
            retryCount.current++;
            console.warn(`⚠️ Socket not available for event ${event}, retrying in 3s... (${retryCount.current}/${maxRetries})`);
            retryTimeout.current = setTimeout(setupListener, 3000);
          } else {
            console.error(`❌ Failed to set up socket event listener for ${event} after ${maxRetries} retries`);
          }
          return;
        }

        // Reset retry count on successful connection
        retryCount.current = 0;
        
        console.log(`🔌 Setting up socket event listener for: ${event}`);
        socket.on(event, handler);

        return () => {
          console.log(`🔌 Cleaning up socket event listener for: ${event}`);
          socket.off(event, handler);
          if (retryTimeout.current) {
            clearTimeout(retryTimeout.current);
            retryTimeout.current = null;
          }
        };
      } catch (error) {
        console.error(`Error setting up socket event listener for ${event}:`, error);
        if (retryCount.current < maxRetries) {
          retryCount.current++;
          retryTimeout.current = setTimeout(setupListener, 3000);
        }
      }
    };

    const cleanup = setupListener();
    return cleanup;
  }, [event, ...deps]);
};

/**
 * Hook for managing socket with event listeners  
 * DEPRECATED: Use useSocket and useSocketEvent instead
 */
export const useSocketWithEvents = () => {
  console.warn('useSocketWithEvents is deprecated. Use useSocket and useSocketEvent instead.');
  
  const { isConnected, error, emit } = useSocket();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketInstance = getSocketSafely();
    setSocket(socketInstance);
  }, []);

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