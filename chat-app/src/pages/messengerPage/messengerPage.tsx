import { useEffect, useRef, useState } from "react";
import Header from "../../components/header/header";
import Contacts from "../../components/contacts/contacts";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { socket } from "../../socket";
import { useStore } from "../../store/store";
import { chancgeUnwatchStatus, getUnreadMessages } from "../../apis/chatApis";
import newMessageNote from "../../assets/new-message.wav";
import { Caller } from "../../components/caller/caller";
import { SignalData } from "simple-peer";
import { IPeerSignalMessage, OutletCallContextType } from "../../types";

export default function MessengerPage() {
    const { id } = useParams();
    const [addToMessages] = useStore((state) => [state.addToMessages]);
    const [unreadMessages, removeUnreadById, setUnreadMessages] = useStore(
        (state) => [state.unreadMessages, state.removeUnreadById, state.setUnreadMessages]
    );
    const [incomingCall, setIncomingCall] = useState(false);
    const [caller, setCaller] = useState<{ name: string; id: string; roomId: string } | null>(null);
    const [callerSignal, setCallerSignal] = useState<SignalData | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

    // Prepare the Outlet context for CallPage with the initial peerData
    const callData: OutletCallContextType = {
        peerData: callerSignal,
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
        }
    });

    useEffect(() => {
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

        socket.on("reciveCall", (data: IPeerSignalMessage) => {
            if (data.from.id !== localStorage._id) {
                setIncomingCall(true);
                setCaller({ id: data.from.id, roomId: data.roomId, name: data.from.name });
                setCallerSignal(data.peerData);
                setOpen(true);
            }
        });

        return () => {
            socket.off("chat");
            socket.off("isTyping");
            socket.off("reciveCall");
            socket.off("acceptedPeerConnection");
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
        chancgeUnwatchStatus(ids as string[]);
        removeUnreadById(ids as string[]);
    };

    return (
        <div className="app">
            <Header />
            {incomingCall && caller && open && <Caller caller={caller} setOpen={setOpen} />}
            <div className="wrapper">
                <Contacts id={id as string} />
                <div className="chat-area" ref={scrollRef} onMouseEnter={setWatched}>
                    {/* Provide the Outlet with context for call signal data */}
                    <Outlet context={callData} />
                </div>
            </div>
        </div>
    );
}
