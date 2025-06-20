import { useCallback, useEffect, useState, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { IMessage, UseChatReturn } from '../types';
import { selectChat, sendMessage } from '../apis/chatApis';
import { ApiUtils } from '../utils/api.utils';
import { ERROR_MESSAGES } from '../config/constants';

/**
 * Custom hook for chat functionality with enhanced error handling and state management
 */
export const useChat = (chatId: string): UseChatReturn => {
  const {
    messages,
    isLoading,
    error,
    setMessages,
    addToMessages,
    setLoading,
    setError,
    clearError,
  } = useChatStore();

  // Load chat messages
  const loadMessages = useCallback(async () => {
    if (!chatId) return;

    try {
      setLoading(true);
      clearError();
      
      const chatData = await selectChat(chatId);
      setMessages(chatData.messages || []);
    } catch (err) {
      const apiError = ApiUtils.handleError(err);
      setError(apiError.message || ERROR_MESSAGES.CHAT_LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }, [chatId, setMessages, setLoading, setError, clearError]);

  // Send message with optimistic updates
  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !chatId) return;

    try {
      setLoading(true);
      clearError();

      const messageData = await sendMessage(chatId, content.trim());
      addToMessages(messageData);
    } catch (err) {
      const apiError = ApiUtils.handleError(err);
      setError(apiError.message || ERROR_MESSAGES.MESSAGE_SEND_ERROR);
    } finally {
      setLoading(false);
    }
  }, [chatId, addToMessages, setLoading, setError, clearError]);

  // Load messages when chatId changes
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  return {
    messages,
    sendMessage: handleSendMessage,
    isLoading,
    error,
  };
};

/**
 * Hook for managing unread messages
 */
export const useUnreadMessages = () => {
  const {
    unreadMessages,
    setUnreadMessages,
    addToUnreadMessages,
    removeUnreadById,
  } = useChatStore();

  const markAsRead = useCallback((messageIds: string[]) => {
    removeUnreadById(messageIds);
  }, [removeUnreadById]);

  const addUnread = useCallback((message: IMessage) => {
    addToUnreadMessages(message);
  }, [addToUnreadMessages]);

  const getUnreadCount = useCallback(() => {
    return unreadMessages?.length || 0;
  }, [unreadMessages]);

  const getUnreadForChat = useCallback((chatId: string) => {
    return unreadMessages?.filter(msg => msg.chat?._id === chatId) || [];
  }, [unreadMessages]);

  return {
    unreadMessages,
    unreadCount: getUnreadCount(),
    markAsRead,
    addUnread,
    getUnreadForChat,
    setUnreadMessages,
  };
};

/**
 * Hook for managing typing indicators
 */
export const useTyping = (chatId: string) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const startTyping = useCallback((userId: string) => {
    setTypingUsers(prev => {
      if (!prev.includes(userId)) {
        return [...prev, userId];
      }
      return prev;
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to remove user from typing list
    typingTimeoutRef.current = setTimeout(() => {
      setTypingUsers(prev => prev.filter(id => id !== userId));
    }, 3000);
  }, []);

  const stopTyping = useCallback((userId: string) => {
    setTypingUsers(prev => prev.filter(id => id !== userId));
  }, []);

  const setUserTyping = useCallback((typing: boolean) => {
    setIsTyping(typing);
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    typingUsers,
    isTyping,
    startTyping,
    stopTyping,
    setUserTyping,
  };
};

/**
 * Hook for optimistic updates
 */
export const useOptimisticUpdates = () => {
  const { addToMessages } = useChatStore();

  const addOptimisticMessage = useCallback((message: Partial<IMessage>) => {
    const optimisticMessage: IMessage = {
      _id: `temp-${Date.now()}`,
      content: message.content || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isWatched: false,
      sender_id: message.sender_id || '',
      user: message.user || {} as any,
      chat: message.chat || {} as any,
      ...message,
    };

    addToMessages(optimisticMessage);
    return optimisticMessage._id;
  }, [addToMessages]);

  return {
    addOptimisticMessage,
  };
}; 