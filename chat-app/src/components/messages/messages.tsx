import { useEffect, useState, useCallback, useMemo } from 'react'
import { selectChat, sendMessage } from '../../apis/chatApis'
import { IMessage } from '../../types'
import { SendIcon } from '../../assets/icons/sendIcon'
import { getSocket } from '../../config/socket'
import { useChatStore } from '../../store/chatStore'
import { timeAgo } from '../../utils/time.utils'
import { SOCKET_EVENTS } from '../../config/constants'
import { AuthStorage } from '../../utils/storage.utils'
import { useSocketEvent } from '../../hooks/useSocket'

export default function Messages({ id }: { id: string }) {
    const { messages, setMessages, addToMessages, isLoading, error, setLoading, setError, clearError } = useChatStore()
    const [text, setText] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [typerId, setTyperId] = useState<string | null>(null)
    const [roomId, setRoomId] = useState<string | null>(null)
    
    // Get socket instance once and memoize it
    const socket = useMemo(() => {
        try {
            return getSocket();
        } catch (error) {
            console.error('Failed to get socket:', error);
            return null;
        }
    }, []);

    // Load messages when chat ID changes
    useEffect(() => {
        const loadMessages = async () => {
            if (!id) return
            
            try {
                setLoading(true)
                clearError()
                const data = await selectChat(id)
                setMessages(data.messages as IMessage[])
            } catch (err) {
                console.error('Failed to load messages:', err)
                setError('Failed to load messages')
            } finally {
                setLoading(false)
            }
        }

        loadMessages()
    }, [id, setMessages, setLoading, setError, clearError])

    // Handle typing indicators using useSocketEvent
    useSocketEvent<{ roomId: string; userId: string; fullname: string }>(
        SOCKET_EVENTS.IS_TYPING, 
        (userData) => {
            if (userData.roomId === id && userData.userId !== AuthStorage.getUserId()) {
                setTyperId(userData.userId)
                setRoomId(userData.roomId)
                setIsTyping(true)
            }
        }, 
        [id]
    );

    // Clear typing indicator after timeout
    useEffect(() => {
        if (isTyping) {
            const timeout = setTimeout(() => {
                setIsTyping(false)
                setTyperId(null)
            }, 2000)
            return () => clearTimeout(timeout)
        }
    }, [isTyping])

    // Emit typing when user is typing
    useEffect(() => {
        if (!socket || !text.trim() || !id) return;

        const userId = AuthStorage.getUserId()
        const userData = {
            roomId: id,
            userId: userId,
            fullname: AuthStorage.getFullname() || 'User'
        }
        socket.emit(SOCKET_EVENTS.IS_TYPING, userData)
    }, [text, id, socket])

    // Send message function
    const send = useCallback(async () => {
        if (!text.trim() || !id || isLoading || !socket) return

        try {
            setLoading(true)
            clearError()
            
            // Send message via API
            const messageData = await sendMessage(id, text.trim())
            
            // Emit to socket for real-time updates
            socket.emit(SOCKET_EVENTS.CHAT, messageData)
            
            // Add to local state optimistically
            addToMessages(messageData)
            
            // Clear input
            setText('')
        } catch (err) {
            console.error('Failed to send message:', err)
            setError('Failed to send message')
        } finally {
            setLoading(false)
        }
    }, [text, id, isLoading, socket, addToMessages, setLoading, setError, clearError])

    // Handle Enter key press
    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send()
        }
    }, [send])

    if (isLoading && !messages?.length) {
        return (
            <div className="chat-area-main">
                <div className="loading-container">
                    <p>Loading messages...</p>
                </div>
            </div>
        )
    }

    if (error && !messages?.length) {
        return (
            <div className="chat-area-main">
                <div className="error-container">
                    <p className="error-message">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="chat-area-main">
            <div className="chat-area-header">
                <div className="chat-area-title">Chat Messages</div>
                {isTyping && (
                    <div className="typing-indicator">
                        <small>Someone is typing...</small>
                    </div>
                )}
            </div>
            
            <div className="chat-area-group">
                {messages?.map((message, index) => (
                    <div 
                        key={message._id} 
                        className={`chat-area-message ${message.sender_id === AuthStorage.getUserId() ? 'right' : 'left'}`}
                    >
                        <div className="message-content">
                            <div className="message-text">{message.content}</div>
                            <div className="message-time">
                                {timeAgo(message.created_at)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="chat-area-footer">
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                />
                <button 
                    onClick={send} 
                    disabled={isLoading || !text.trim()}
                    className="send-button"
                >
                    <SendIcon />
                </button>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}
        </div>
    )
}
