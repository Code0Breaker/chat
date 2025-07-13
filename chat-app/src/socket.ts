import { connect } from "socket.io-client";
import { url } from "./apis/baseUrl";

const token = localStorage.getItem("token");

export const socket = connect(url.baseURL, {
    auth: {
        token: `Bearer ${token}`,
    },
    transports: ['polling', 'websocket'], // Start with polling, upgrade to WebSocket
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
    forceNew: true,
    path: '/socket.io/',
    withCredentials: true,
    extraHeaders: {
        Authorization: `Bearer ${token}`
    },
    upgrade: true,
    rememberUpgrade: true,
    secure: true,
    rejectUnauthorized: false,
    transportOptions: {
        polling: {
            extraHeaders: {
                Authorization: `Bearer ${token}`
            }
        }
    }
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