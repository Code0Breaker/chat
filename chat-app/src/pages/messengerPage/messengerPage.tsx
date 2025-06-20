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
    
    // Global incoming call state
    const incomingCall = useStore(state => state.incomingCall);
    const caller = useStore(state => state.caller);
    const setIncomingCall = useStore(state => state.setIncomingCall);
    const setCaller = useStore(state => state.setCaller);
    
    const [offerSignal, setOfferSignal] = useState<SignalData | null>(null);
    const [candidateSignal, setCandidateSignal] = useState<SignalData[]>([]);
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

        // Handle incoming video calls - using the same event as VideoCall component
        socket.on("receiveCall", (data) => {
            console.log("Global incoming call received:", data);

            // Prevent duplicate call handling
            if (incomingCall) {
                console.log("Call already in progress, ignoring duplicate event");
                return;
            }

            // Store the offer signal
            if (data.signalData?.type === "offer") {
                console.log("Received offer signal, showing global incoming call");
                setIncomingCall(true);
                setCaller({ 
                    name: data.from.name, 
                    id: data.from.id, 
                    roomId: data.roomId 
                });

                // Join the room
                socket.emit("join", {
                    roomId: data.roomId,
                    userId: localStorage.getItem("_id"),
                });
            }
        });

        // Handle call ended
        socket.on("callEnded", () => {
            console.log("Call ended globally");
            setIncomingCall(false);
            setCaller(null);
        });

        // Handle call rejected
        socket.on("callRejected", (data) => {
            console.log("Call rejected globally:", data);
            setIncomingCall(false);
            setCaller(null);
        });

        // Legacy socket listener for backward compatibility
        socket.on("reciveCall", (data: IPeerSignalMessage) => {
            if (!data) {
                return;
            }

            if (data.peerData) {
                if (data.from && data.from.id !== localStorage._id) {
                    if (data.peerData.type === "offer") {
                        setOfferSignal(data.peerData);
                    } else {
                        setCandidateSignal(prev => [...prev, data.peerData]);
                    }
                }
            }
        });

        return () => {
            socket.off("chat");
            socket.off("receiveCall");
            socket.off("callEnded");
            socket.off("callRejected");
            socket.off("reciveCall");
        };
    }, [id, addToMessages, setUnreadMessages, incomingCall, setIncomingCall, setCaller]);

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

    const handleRejectCall = () => {
        console.log("Rejecting call globally...");
        setIncomingCall(false);
        setCaller(null);
        
        // Emit reject call event
        if (caller) {
            socket.emit("rejectCall", { roomId: caller.roomId });
        }
    };

    return (
        <div className="app">
            <Header />
            {/* Global incoming call modal - shows everywhere in authenticated routes */}
            {incomingCall && caller && (
                <Caller 
                    caller={caller} 
                    onReject={handleRejectCall}
                />
            )}
            <div className="wrapper">
                <Contacts id={id as string} />
                <div className="chat-area" ref={scrollRef} onMouseEnter={setWatched}>
                    <Outlet context={callData} />
                </div>
            </div>
        </div>
    );
}
