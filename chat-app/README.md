# 💬 Modern Chat App

A modern, real-time chat application built with React, TypeScript, and Socket.IO, featuring a clean architecture and best practices.

## ✨ Features

- 🔄 **Real-time messaging** with Socket.IO
- 🎨 **Modern UI/UX** with responsive design
- 🔐 **Authentication** with JWT tokens
- 🔍 **User search** with debounced input
- 📱 **Mobile-friendly** responsive design
- 🌙 **Dark/Light themes** (customizable)
- 🔊 **Sound notifications** for new messages
- ⚡ **Optimistic updates** for better UX
- 🛠 **TypeScript** for type safety
- 📦 **Modular architecture** with separation of concerns

## 🏗️ Architecture Overview

### Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── common/          # Common components (ErrorBoundary, etc.)
│   ├── ui/              # UI primitives (LoadingSpinner, etc.)
│   ├── contact/         # Contact-related components
│   ├── contacts/        # Contacts list components
│   ├── header/          # Header components
│   └── messages/        # Message-related components
├── config/              # Configuration files
│   ├── constants.ts     # App constants and configuration
│   └── socket.ts        # Socket.IO configuration
├── hooks/               # Custom React hooks
│   ├── useSocket.ts     # Socket management hook
│   ├── useChat.ts       # Chat functionality hooks
│   └── ...
├── pages/               # Page components
│   ├── messengerPage/   # Main messenger page
│   └── signPage/        # Authentication page
├── services/            # API services and business logic
│   └── apiService.ts    # Centralized API service
├── store/               # State management
│   ├── chatStore.ts     # Chat-related state (Zustand)
│   └── store.ts         # Legacy store (backward compatibility)
├── utils/               # Utility functions
│   ├── api.utils.ts     # API utilities
│   ├── storage.utils.ts # Storage utilities
│   ├── format.utils.ts  # Formatting utilities
│   └── time.utils.ts    # Time utilities (deprecated)
├── types.ts             # TypeScript type definitions
├── App.tsx              # Main App component
└── main.tsx             # App entry point
```

### Key Architectural Patterns

#### 🏪 **State Management (Zustand)**
- **Enhanced Store**: Improved Zustand store with Immer for immutable updates
- **Selectors**: Optimized selectors for better performance
- **Actions**: Organized actions for clean state management

#### 🔌 **Custom Hooks**
- **useSocket**: Socket.IO connection management with auto-reconnection
- **useChat**: Chat functionality with error handling and loading states
- **useUnreadMessages**: Unread message management
- **useTyping**: Typing indicators functionality

#### 🛡️ **Error Handling**
- **Error Boundary**: React error boundary for graceful error handling
- **API Error Handling**: Centralized API error handling with user-friendly messages
- **Retry Logic**: Automatic retry for failed requests with exponential backoff

#### 🎯 **Performance Optimizations**
- **React.memo**: Memoized components to prevent unnecessary re-renders
- **useCallback/useMemo**: Optimized callbacks and computed values
- **Debounced Search**: Optimized search with debouncing
- **Optimistic Updates**: Immediate UI updates for better UX

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend server running (for API and Socket.IO)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chat-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment example (if needed)
   cp .env.example .env
   
   # Edit .env with your server URL
   VITE_APP_SERVER_URL=http://localhost:3001
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
VITE_APP_SERVER_URL=http://localhost:3001

# Environment
VITE_APP_ENV=development

# API Configuration  
VITE_APP_API_TIMEOUT=30000

# Features
VITE_APP_ENABLE_NOTIFICATIONS=true
VITE_APP_ENABLE_SOUND=true

# Debug
VITE_APP_DEBUG=false
```

### Socket.IO Configuration

The app automatically handles:
- ✅ Connection management
- ✅ Auto-reconnection with exponential backoff
- ✅ Authentication with JWT tokens
- ✅ Error handling and logging

## 🎨 Styling

### CSS Architecture
- **Modular CSS**: Component-specific styles
- **SCSS/CSS Nesting**: Organized nested styles
- **CSS Variables**: Theme-based color system
- **Responsive Design**: Mobile-first approach

### Theme System
- Multiple color themes (blue, purple, green, orange)
- Dark/light mode support
- CSS custom properties for easy theming

## 🔍 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checking
```

## 📱 Features in Detail

### Real-time Messaging
- Instant message delivery via Socket.IO
- Message status indicators (sent, delivered, read)
- Typing indicators
- Online/offline status

### User Management
- User authentication with JWT
- User search functionality
- Profile management
- Contact management

### UI/UX Features
- Responsive design for all screen sizes
- Smooth animations and transitions
- Loading states and error handling
- Accessibility features
- Sound notifications

## 🛠️ Development

### Code Organization
- **Separation of Concerns**: Clear separation between UI, business logic, and data
- **Custom Hooks**: Reusable logic in custom hooks
- **TypeScript**: Full type safety throughout the application
- **Error Boundaries**: Graceful error handling

### Performance Best Practices
- Component memoization with React.memo
- Callback optimization with useCallback
- State selector optimization
- Debounced API calls
- Optimistic UI updates

### Testing Strategy
- Component testing with React Testing Library
- Hook testing with @testing-library/react-hooks
- Integration testing for API calls
- E2E testing with Cypress (recommended)

## 🚢 Deployment

### Build Optimization
- Code splitting for optimal bundle sizes
- Asset optimization
- Tree shaking for unused code elimination
- Production-ready builds

### Deployment Options
- **Vercel**: Zero-config deployment
- **Netlify**: Static site deployment
- **Docker**: Containerized deployment
- **Traditional hosting**: Build and serve static files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Follow the existing code style

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React team for the amazing framework
- Socket.IO for real-time communication
- Zustand for state management
- Vite for the build tool
- TypeScript for type safety

---

**Built with ❤️ using modern web technologies** 