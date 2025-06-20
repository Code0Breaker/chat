import { useEffect, useRef, useState } from "react";
import Header from "../../components/header/header";
import Contacts from "../../components/contacts/contacts";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { socket } from "../../socket";
import { useStore } from "../../store/store";
import { chancgeUnwatchStatus, getUnreadMessages } from "../../apis/chatApis";
import newMessageNote from "../../assets/new-message.wav";


export default function MessengerPage() {
    const { id } = useParams();
    const [addToMessages] = useStore((state) => [state.addToMessages]);
    const [unreadMessages, removeUnreadById, setUnreadMessages] = useStore(
        (state) => [state.unreadMessages, state.removeUnreadById, state.setUnreadMessages]
    );
    
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
        }
    }, []);

    useEffect(() => {
        // Handle regular chat messages
        socket.on("chat", async (messages) => {
            const data = await getUnreadMessages();
            setUnreadMessages(data);
            if (messages.sender_id !== localStorage._id) {
                playNotificationSound();
            }
            if (messages.chat._id === id) {
                addToMessages(messages);
            }
        });



        return () => {
            socket.off("chat");
        };
    }, [id, addToMessages, setUnreadMessages]);

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
        const ids = unreadMessages?.filter((item) => item.chat._id === id).map((item) => item._id);
        removeUnreadById(ids as string[]);
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
