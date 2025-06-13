import { connect } from "socket.io-client";
import { url } from "./apis/baseUrl";

export const socket = connect(url, {
    auth: {
        token: `Bearer ${localStorage.getItem("token")}`,
    },
    transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
    forceNew: true,
    path: '/socket.io/',
});

// Add connection event listeners
socket.on('connect', () => {
    console.log('Socket connected successfully');
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
});

socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
});

socket.on('reconnect', (attemptNumber) => {
    console.log('Socket reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('Socket reconnection attempt:', attemptNumber);
});

socket.on('reconnect_error', (error) => {
    console.error('Socket reconnection error:', error);
});

socket.on('reconnect_failed', () => {
    console.error('Socket reconnection failed after all attempts');
});