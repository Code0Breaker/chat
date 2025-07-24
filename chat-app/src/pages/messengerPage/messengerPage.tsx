import { useEffect, useRef, useMemo } from "react";
import Header from "../../components/header/header";
import Contacts from "../../components/contacts/contacts";
import { Outlet, useParams } from "react-router-dom";
import { getSocket } from "../../config/socket";
import { useChatStore } from "../../store/chatStore";
import { getUnreadMessages } from "../../apis/chatApis";
import newMessageNote from "../../assets/new-message.wav";
import { SOCKET_EVENTS } from "../../config/constants";
import { AuthStorage } from "../../utils/storage.utils";
import { IMessage } from "../../types";
import { useSocketEvent } from "../../hooks/useSocket";

export default function MessengerPage() {
    const { id } = useParams();
    const { addToMessages, setUnreadMessages, removeUnreadById, unreadMessages } = useChatStore();
    const scrollRef = useRef<HTMLDivElement>(null);
    
    // Get socket instance once and memoize it
    const socket = useMemo(() => {
        try {
            return getSocket();
        } catch (error) {
            console.error('Failed to get socket:', error);
            return null;
        }
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
        }
    }, []);

    // Join/leave chat room when chat ID changes
    useEffect(() => {
        if (!socket || !id) return;
        
        const userId = AuthStorage.getUserId();
        
        if (userId) {
            // Join the chat room
            socket.emit(SOCKET_EVENTS.JOIN, {
                roomId: id,
                userId: userId
            });
            
            console.log(`Joined chat room: ${id}`);
            
            // Cleanup: leave room when component unmounts or chat changes
            return () => {
                socket.emit(SOCKET_EVENTS.LEAVE, {
                    roomId: id,
                    userId: userId
                });
                console.log(`Left chat room: ${id}`);
            };
        }
    }, [id, socket]);

    // Handle incoming chat messages using the new useSocketEvent hook
    useSocketEvent<IMessage>(SOCKET_EVENTS.CHAT, async (messageData) => {
        try {
            console.log('Received chat message:', messageData);
            
            // Update unread messages
            const unreadData = await getUnreadMessages();
            setUnreadMessages(unreadData);
            
            // Play notification sound for messages from others
            if (messageData.sender_id !== AuthStorage.getUserId()) {
                playNotificationSound();
            }
            
            // Add message to current chat if it matches
            if (messageData.chat?._id === id) {
                addToMessages(messageData);
            }
        } catch (error) {
            console.error('Error handling chat message:', error);
        }
    }, [id, addToMessages, setUnreadMessages]);

    // Handle new contact messages using the new useSocketEvent hook
    useSocketEvent<IMessage>(SOCKET_EVENTS.NEW_CONTACT_MESSAGE, async (messageData) => {
        try {
            console.log('Received new contact message:', messageData);
            
            // Update unread messages
            const unreadData = await getUnreadMessages();
            setUnreadMessages(unreadData);
            
            // Play notification sound for messages from others
            if (messageData.sender_id !== AuthStorage.getUserId()) {
                playNotificationSound();
            }
            
            // Add message to current chat if it matches
            if (messageData.chat?._id === id) {
                addToMessages(messageData);
            }
        } catch (error) {
            console.error('Error handling new contact message:', error);
        }
    }, [id, addToMessages, setUnreadMessages]);

    useEffect(() => {
        (async () => {
            try {
                const data = await getUnreadMessages();
                setUnreadMessages(data);
            } catch (error) {
                console.error('Failed to load unread messages:', error);
            }
        })();
    }, [setUnreadMessages]);

    function playNotificationSound() {
        try {
            const audio = new Audio(newMessageNote);
            audio.play().catch(err => console.log('Could not play notification sound:', err));
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }
    }

    const setWatched = () => {
        const ids = unreadMessages?.filter((item) => item.chat?._id === id).map((item) => item._id);
        if (ids && ids.length > 0) {
            removeUnreadById(ids as string[]);
        }
    };

    return (
        <div className="app">
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
