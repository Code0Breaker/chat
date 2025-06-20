import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { IMessage, IUser, ChatStore } from '../types';

/**
 * Enhanced chat store with better state management patterns
 */
export const useChatStore = create<ChatStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // State
        messages: null,
        unreadMessages: null,
        search: '',
        searchData: null,
        isLoading: false,
        error: null,

        // Actions
        setMessages: (messages) =>
          set((state) => {
            state.messages = messages;
          }),

        addToMessages: (message) =>
          set((state) => {
            if (state.messages) {
              // Avoid duplicates
              const exists = state.messages.some((m) => m._id === message._id);
              if (!exists) {
                state.messages.push(message);
              }
            } else {
              state.messages = [message];
            }
          }),

        setUnreadMessages: (messages) =>
          set((state) => {
            state.unreadMessages = messages;
          }),

        addToUnreadMessages: (message) =>
          set((state) => {
            if (state.unreadMessages) {
              // Avoid duplicates
              const exists = state.unreadMessages.some((m) => m._id === message._id);
              if (!exists) {
                state.unreadMessages.push(message);
              }
            } else {
              state.unreadMessages = [message];
            }
          }),

        removeUnreadById: (ids) =>
          set((state) => {
            if (state.unreadMessages) {
              state.unreadMessages = state.unreadMessages.filter(
                (item) => !ids.includes(item._id)
              );
            }
          }),

        setSearch: (search) =>
          set((state) => {
            state.search = search;
          }),

        addToSearchData: (data) =>
          set((state) => {
            state.searchData = data;
          }),

        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
          }),

        clearError: () =>
          set((state) => {
            state.error = null;
          }),
      }))
    ),
    {
      name: 'chat-store',
    }
  )
);

// Selectors for better performance
export const useChatSelectors = {
  messages: () => useChatStore((state) => state.messages),
  unreadMessages: () => useChatStore((state) => state.unreadMessages),
  search: () => useChatStore((state) => state.search),
  searchData: () => useChatStore((state) => state.searchData),
  isLoading: () => useChatStore((state) => state.isLoading),
  error: () => useChatStore((state) => state.error),
  
  // Computed selectors
  unreadCount: () => useChatStore((state) => state.unreadMessages?.length || 0),
  hasMessages: () => useChatStore((state) => Boolean(state.messages?.length)),
  hasUnreadMessages: () => useChatStore((state) => Boolean(state.unreadMessages?.length)),
  isSearching: () => useChatStore((state) => Boolean(state.search.length)),
  hasSearchResults: () => useChatStore((state) => Boolean(state.searchData?.length)),
};

// Actions for better organization
export const useChatActions = {
  setMessages: () => useChatStore((state) => state.setMessages),
  addToMessages: () => useChatStore((state) => state.addToMessages),
  setUnreadMessages: () => useChatStore((state) => state.setUnreadMessages),
  addToUnreadMessages: () => useChatStore((state) => state.addToUnreadMessages),
  removeUnreadById: () => useChatStore((state) => state.removeUnreadById),
  setSearch: () => useChatStore((state) => state.setSearch),
  addToSearchData: () => useChatStore((state) => state.addToSearchData),
  setLoading: () => useChatStore((state) => state.setLoading),
  setError: () => useChatStore((state) => state.setError),
  clearError: () => useChatStore((state) => state.clearError),
};

// Backward compatibility with existing store
export const useStore = useChatStore; 