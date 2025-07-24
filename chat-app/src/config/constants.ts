// API Configuration
export const API_ENDPOINTS = {
  CHAT: {
    GET_ALL_ROOMS: '/chat/getAllRooms',
    GET_CHAT: '/chat/getChat',
    GET_MESSAGES: '/chat/getMessages',
    CREATE_ROOM: '/chat/create-room',
    SEARCH: '/chat/search',
  },
  MESSAGES: {
    SEND: '/messages',
    GET_UNREAD: '/messages',
    UPDATE_STATUS: '/messages',
  },
  AUTH: {
    LOGIN: '/user/login',
    REGISTER: '/user/register',
    REFRESH: '/user/token',
  },
} as const;

// Socket Events
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CHAT: 'chat',
  NEW_CONTACT_MESSAGE: 'new-contact-message',
  JOIN: 'join',
  LEAVE: 'leave',
  IS_TYPING: 'isTyping',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  RECONNECT_ERROR: 'reconnect_error',
  RECONNECT_FAILED: 'reconnect_failed',
} as const;

// UI Constants
export const UI_CONSTANTS = {
  TYPING_TIMEOUT: 2000,
  SEARCH_DEBOUNCE: 1000,
  RECONNECTION_ATTEMPTS: 10,
  RECONNECTION_DELAY: 1000,
  RECONNECTION_DELAY_MAX: 5000,
  SOCKET_TIMEOUT: 20000,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER_ID: '_id',
  USER_PIC: 'pic',
  THEME: 'theme',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Please log in again.',
  CHAT_LOAD_ERROR: 'Failed to load chat. Please try again.',
  MESSAGE_SEND_ERROR: 'Failed to send message. Please try again.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
} as const;

// Theme Constants
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export const THEME_COLORS = {
  BLUE: 'blue',
  PURPLE: 'purple',
  GREEN: 'green',
  ORANGE: 'orange',
} as const; 