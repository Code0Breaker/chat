import { useEffect, useRef } from "react";
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

export default function MessengerPage() {
    const { id } = useParams();
    const { addToMessages, setUnreadMessages, removeUnreadById, unreadMessages } = useChatStore();
    const scrollRef = useRef<HTMLDivElement>(null);
    
    // Get socket instance
    const socket = getSocket();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
        }
    }, []);

    // Join/leave chat room when chat ID changes
    useEffect(() => {
        const userId = AuthStorage.getUserId();
        
        if (id && userId) {
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

    useEffect(() => {
        // Handle incoming chat messages
        const handleChatMessage = async (messageData: IMessage) => {
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
        };

        // Handle new contact messages (same as chat messages)
        const handleNewContactMessage = async (messageData: IMessage) => {
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
        };

        // Listen for chat messages
        socket.on(SOCKET_EVENTS.CHAT, handleChatMessage);
        socket.on(SOCKET_EVENTS.NEW_CONTACT_MESSAGE, handleNewContactMessage);

        return () => {
            socket.off(SOCKET_EVENTS.CHAT, handleChatMessage);
            socket.off(SOCKET_EVENTS.NEW_CONTACT_MESSAGE, handleNewContactMessage);
        };
    }, [id, addToMessages, setUnreadMessages, socket]);

    useEffect(() => {
        (async () => {
            const data = await getUnreadMessages();
            setUnreadMessages(data);
        })();
    }, [setUnreadMessages]);

    function playNotificationSound() {
        const audio = new Audio(newMessageNote);
        audio.play();
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
