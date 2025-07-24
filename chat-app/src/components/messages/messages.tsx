import { useEffect, useState, useCallback } from 'react'
import { selectChat, sendMessage } from '../../apis/chatApis'
import { IMessage } from '../../types'
import { SendIcon } from '../../assets/icons/sendIcon'
import { getSocketSafely, emitEvent } from '../../config/socket'
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

    // Load messages when chat ID changes
    useEffect(() => {
        const loadMessages = async () => {
            if (!id) return
            
            try {
                setLoading(true)
                clearError()
                console.log('📤 Loading messages for chat:', id);
                const data = await selectChat(id)
                console.log('✅ Messages loaded:', data.messages?.length || 0, 'messages');
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

    // Handle typing indicators using useSocketEvent with better error handling
    useSocketEvent<{ roomId: string; userId: string; fullname: string }>(
        SOCKET_EVENTS.IS_TYPING, 
        (userData) => {
            console.log('👋 Typing event received:', userData);
            if (userData.roomId === id && userData.userId !== AuthStorage.getUserId()) {
                setTyperId(userData.userId)
                setRoomId(userData.roomId)
                setIsTyping(true)
            }
        }, 
        [id]
    );

    // Handle incoming chat messages with better logging
    useSocketEvent<IMessage>(
        SOCKET_EVENTS.CHAT, 
        (messageData) => {
            console.log('📨 Received chat message:', messageData);
            if (messageData.chat?._id === id) {
                console.log('✅ Adding message to current chat');
                addToMessages(messageData);
            } else {
                console.log('ℹ️ Message for different chat, ignoring');
            }
        }, 
        [id, addToMessages]
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
        if (!text.trim() || !id) return;

        const userId = AuthStorage.getUserId()
        const userData = {
            roomId: id,
            userId: userId,
            fullname: AuthStorage.getFullname() || 'User'
        }
        
        // Use emitEvent for better error handling
        const success = emitEvent(SOCKET_EVENTS.IS_TYPING, userData);
        if (!success) {
            console.warn('⚠️ Failed to emit typing event');
        }
    }, [text, id])

    // Send message function
    const send = useCallback(async () => {
        if (!text.trim() || !id || isLoading) return

        try {
            setLoading(true)
            clearError()
            
            console.log('📤 Sending message...', { chatId: id, content: text.trim() });
            
            // Send message via API (this should always work)
            const messageData = await sendMessage(id, text.trim())
            console.log('✅ Message sent successfully:', messageData);
            
            // Add to local state optimistically
            addToMessages(messageData)
            
            // Clear input
            setText('')
            
            // Try to emit to socket for real-time updates (optional)
            const success = emitEvent(SOCKET_EVENTS.CHAT, messageData);
            if (success) {
                console.log('🔌 Socket notification sent');
            } else {
                console.warn('⚠️ Socket not available (but message was sent)');
            }
            
        } catch (err) {
            console.error('❌ Failed to send message:', err)
            setError('Failed to send message')
        } finally {
            setLoading(false)
        }
    }, [text, id, isLoading, addToMessages, setLoading, setError, clearError])

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

    return (
        <>
            <div className="chat-area-main">
                {error && (
                    <div className="error-container">
                        <p className="error-message">{error}</p>
                        <button onClick={clearError} className="error-dismiss">×</button>
                    </div>
                )}
                
                {messages?.map(item => {
                    return (
                        <div className={`chat-msg ${item.sender_id === AuthStorage.getUserId() ? "owner":"sender"}`} key={item._id}>
                            <div className="chat-msg-profile">
                                <img
                                    className="chat-msg-img"
                                    src={item.user.pic}
                                    alt={item.user.fullname}
                                />
                                {!timeAgo(item?.created_at).includes('NaN') && (
                                    <div className="chat-msg-date">{timeAgo(item?.created_at)}</div>
                                )}
                            </div>
                            <div className="chat-msg-content">
                                <div className="chat-msg-text">
                                    {item.content}
                                </div>
                            </div>
                        </div>
                    )
                })}
                
                {isTyping && typerId !== AuthStorage.getUserId() && id === roomId && (
                    <div className="typing-indicator">
                        <p>Typing...</p>
                    </div>
                )}
            </div>
           
            <div className="chat-area-footer">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="feather feather-image"
                >
                    <rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                </svg>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="feather feather-plus-circle"
                >
                    <circle cx={12} cy={12} r={10} />
                    <path d="M12 8v8M8 12h8" />
                </svg>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="feather feather-paperclip"
                >
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
                
                <input 
                    type="text" 
                    placeholder="Type something here..." 
                    value={text} 
                    onChange={e => setText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                />
                
                <button 
                    onClick={send} 
                    className='send-btn'
                    disabled={isLoading || !text.trim()}
                >
                    {isLoading ? '...' : <SendIcon />}
                </button>

                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="feather feather-smile"
                >
                    <circle cx={12} cy={12} r={10} />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
                </svg>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="feather feather-thumbs-up"
                >
                    <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                </svg>
            </div>
        </>
    )
}
