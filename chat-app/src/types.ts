// Base types
export interface BaseEntity {
  _id: string;
  created_at: string;
  updated_at: string;
}

// Auth types
export interface ILogin {
    email: string
    password: string
}

export interface IRegister extends ILogin {
    phone: string
    fullname: string
}

export interface IAuthResponse {
  token: string;
  user: IUserProfile;
}

// User types
export interface IUser {
    _id: string;
    fullname: string;
    email: string;
    isAdmin: boolean;
    password: string;
    pic: string;
}

export interface IUserProfile {
  _id: string;
  fullname: string;
  email: string;
  pic: string;
}

// Message types
export interface IMessage {
    content: string
    created_at: string
    isWatched: boolean
    sender_id: string
    updated_at: string
    user: IUser
    _id: string
    chat?: {
        _id: string;
    };
}

// Chat types
export interface IChat {
    _id: string
    chatName: string | null;
    created_at: string;
    isGroupChat: boolean;
    updated_at: string;
    users?: IUser[];
    messages?: IMessage[];
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

// Socket types
export interface SocketUser {
  id: string;
  name: string;
}

export interface TypingEvent {
  roomId: string;
  typerId: string;
}

// Store types
export interface ChatStore {
  // State
  messages: IMessage[] | null;
  unreadMessages: IMessage[] | null;
  search: string;
  searchData: IUser[] | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setMessages: (messages: IMessage[]) => void;
  addToMessages: (message: IMessage) => void;
  setUnreadMessages: (messages: IMessage[]) => void;
  addToUnreadMessages: (message: IMessage) => void;
  removeUnreadById: (ids: string[]) => void;
  setSearch: (search: string) => void;
  addToSearchData: (data: IUser[] | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// Component Props types
export interface ContactProps {
  chat: IChat;
  id: string;
  isActive?: boolean;
}

export interface MessagesProps {
  id: string;
}

export interface HeaderProps {
  onThemeChange?: (theme: string) => void;
}

// Hook return types
export interface UseSocketReturn {
  isConnected: boolean;
  error: string | null;
  emit: (event: string, data?: any) => void;
}

export interface UseAuthReturn {
  user: IUserProfile | null;
  isAuthenticated: boolean;
  login: (credentials: ILogin) => Promise<void>;
  register: (data: IRegister) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

export interface UseChatReturn {
  messages: IMessage[] | null;
  sendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// Utility types
export type Theme = 'light' | 'dark';
export type ThemeColor = 'blue' | 'purple' | 'green' | 'orange';

export interface ThemeConfig {
  theme: Theme;
  color: ThemeColor;
}

// Form types
export interface FormField {
  value: string;
  error: string | null;
  touched: boolean;
}

export interface LoginForm {
  email: FormField;
  password: FormField;
}

export interface RegisterForm extends LoginForm {
  fullname: FormField;
  phone: FormField;
  confirmPassword: FormField;
}

// Status types
export type LoadingState = 'idle' | 'loading' | 'succeeded' | 'failed';
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Event handler types
export type EventHandler<T = void> = (data: T) => void;
export type AsyncEventHandler<T = void> = (data: T) => Promise<void>;

