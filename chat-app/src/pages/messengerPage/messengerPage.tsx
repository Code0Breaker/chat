import { useEffect, useRef } from "react";
import Header from "../../components/header/header";
import Contacts from "../../components/contacts/contacts";
import { Outlet, useParams } from "react-router-dom";
import { emitEvent } from "../../config/socket";
import { useChatStore } from "../../store/chatStore";
import { getUnreadMessages } from "../../apis/chatApis";
import newMessageNote from "../../assets/new-message.wav";
import { SOCKET_EVENTS } from "../../config/constants";
import { AuthStorage } from "../../utils/storage.utils";
import { IMessage } from "../../types";
import { useSocket, useSocketEvent } from "../../hooks/useSocket";

export default function MessengerPage() {
    const { id } = useParams();
    const { addToMessages, setUnreadMessages, removeUnreadById, unreadMessages } = useChatStore();
    const scrollRef = useRef<HTMLDivElement>(null);
    
    // Initialize socket connection
    const { isConnected, error: socketError } = useSocket();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
        }
    }, []);

    // Join/leave chat room when chat ID changes
    useEffect(() => {
        if (!id || !isConnected) return;
        
        const userId = AuthStorage.getUserId();
        
        if (userId) {
            // Join the chat room
            const success = emitEvent(SOCKET_EVENTS.JOIN, {
                roomId: id,
                userId: userId
            });
            
            if (success) {
                console.log(`✅ Joined chat room: ${id}`);
            } else {
                console.warn(`⚠️ Failed to join chat room: ${id}`);
            }
        }
        
        // Cleanup: leave room when component unmounts or chat changes
        return () => {
            if (userId && isConnected) {
                emitEvent(SOCKET_EVENTS.LEAVE, {
                    roomId: id,
                    userId: userId
                });
                console.log(`👋 Left chat room: ${id}`);
            }
        };
    }, [id, isConnected]);

    // Load unread messages on mount
    useEffect(() => {
        const loadUnreadMessages = async () => {
            try {
                const unreadData = await getUnreadMessages();
                setUnreadMessages(unreadData);
            } catch (error) {
                console.error('Failed to load unread messages:', error);
            }
        };

        loadUnreadMessages();
    }, [setUnreadMessages]);

    // Play notification sound utility
    const playNotificationSound = () => {
        try {
            const audio = new Audio(newMessageNote);
            audio.play().catch(err => console.warn('Could not play notification sound:', err));
        } catch (error) {
            console.warn('Notification sound not available:', error);
        }
    };

    // Handle incoming chat messages using the new useSocketEvent hook
    useSocketEvent<IMessage>(SOCKET_EVENTS.CHAT, async (messageData) => {
        console.log('📨 Received chat message in MessengerPage:', messageData);
        
        // Add message to store
        addToMessages(messageData);
        
        // Play notification sound if message is not from current user
        if (messageData.sender_id !== AuthStorage.getUserId()) {
            playNotificationSound();
        }
        
        // If message is not for current chat, add to unread
        if (messageData.chat?._id !== id) {
            const isAlreadyUnread = unreadMessages.some(msg => msg._id === messageData._id);
            if (!isAlreadyUnread) {
                setUnreadMessages([...unreadMessages, messageData]);
            }
        } else {
            // Remove from unread if it was there
            removeUnreadById(messageData._id);
        }
    }, [addToMessages, id, unreadMessages, setUnreadMessages, removeUnreadById]);

    // Handle new contact messages using the new useSocketEvent hook
    useSocketEvent<IMessage>(SOCKET_EVENTS.NEW_CONTACT_MESSAGE, async (messageData) => {
        console.log('📨 Received new contact message:', messageData);
        
        // Add to unread messages if not already there
        const isAlreadyUnread = unreadMessages.some(msg => msg._id === messageData._id);
        if (!isAlreadyUnread) {
            setUnreadMessages([...unreadMessages, messageData]);
            playNotificationSound();
        }
    }, [unreadMessages, setUnreadMessages]);

    // Mark messages as watched when entering chat
    const setWatched = () => {
        const ids = unreadMessages?.filter((item) => item.chat?._id === id).map((item) => item._id);
        if (ids && ids.length > 0) {
            removeUnreadById(ids as string[]);
        }
    };

    return (
        <div className="app">
            {socketError && (
                <div className="socket-error-banner" style={{
                    background: '#ffebee',
                    color: '#c62828',
                    padding: '8px 16px',
                    borderBottom: '1px solid #ffcdd2',
                    fontSize: '14px',
                    textAlign: 'center'
                }}>
                    <span>⚠️ Connection issue: {socketError}</span>
                    <small style={{ display: 'block', marginTop: '4px', opacity: 0.8 }}>
                        Messages will still send, but real-time features may be limited.
                    </small>
                </div>
            )}
            <Header />
            <div className="wrapper">
                <Contacts id={id as string} />
                <div className="chat-area" ref={scrollRef} onMouseEnter={setWatched}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
