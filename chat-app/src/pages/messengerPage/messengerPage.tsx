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
    const incomingCall = useStore(state => state.incomingCall);
    const caller = useStore(state => state.caller);
    const [offerSignal, setOfferSignal] = useState<SignalData | null>(null);
    const [candidateSignal, setCandidateSignal] = useState<SignalData[]>([]);
    const [open, setOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Передаем данные через Outlet для использования на странице звонка
    const callData: OutletCallContextType = {
        peerData: offerSignal,
        candidateSignal,
        setOfferSignal,
        setCandidateSignal
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
        }
    }, []);

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
            if (!data) {
                return;
            }

            if (data.peerData) {
                if (data.from && data.from.id !== localStorage._id) {
                    if (data.peerData.type === "offer") {
                        setOfferSignal(data.peerData);
                        setOpen(true);
                    } else {
                        setCandidateSignal(prev => [...prev, data.peerData]);
                    }
                }
            }
        });

        return () => {
            socket.off("chat");
            socket.off("isTyping");
            socket.off("reciveCall");
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
            {incomingCall && caller && open && <Caller caller={caller} setOpen={setOpen} />}
            <div className="wrapper">
                <Contacts id={id as string} />
                <div className="chat-area" ref={scrollRef} onMouseEnter={setWatched}>
                    <Outlet context={callData} />
                </div>
            </div>
        </div>
    );
}
