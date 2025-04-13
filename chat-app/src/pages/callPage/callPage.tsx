import {useEffect, useRef, useState} from "react";
import s from "./callPage.module.css";
import {useOutletContext, useParams} from "react-router-dom";
import {socket} from "../../socket";
import SimplePeer from "simple-peer/simplepeer.min.js";
import {hasWebcam} from "../../utils/devices.utils.ts";
import {OutletCallContextType} from "../../types";
import {SignalData, Instance} from "simple-peer";

const CallPage = () => {
    const { id } = useParams();

    // Определяем режим по URL-параметру: если type=answer, то это режим отвечающего.
    const searchParams = new URLSearchParams(window.location.search);
    const isAnswering = searchParams.get("type") === "answer";

    const callDataContext = useOutletContext<OutletCallContextType>();

    const myVideo = useRef<HTMLVideoElement | null>(null);
    const userVideo = useRef<HTMLVideoElement | null>(null);
    const peerRef = useRef<Instance | null>(null);
    const [myStream, setMyStream] = useState<MediaStream | null>(null);

    // Функция создания peer с общими настройками
    const createPeer = (initiator: boolean, stream: MediaStream) => {
        console.log(`Создание peer (initiator=${initiator})`);
        const peer = new SimplePeer({
            initiator,
            trickle: true,
            stream,
            config: {
                iceServers: [
                    {
                        urls: [
                            "turn:turn.animehub.club:3478?transport=udp",
                            "turn:turn.animehub.club:3478?transport=tcp"
                        ],
                        username: "webrtcuser",
                        credential: "Overlord_9600"
                    }
                ]
            },
        });

        // Если возможно, отслеживаем состояние RTCPeerConnection
        const pc = (peer as any)._pc;
        if (pc) {
            pc.onconnectionstatechange = () => {
                console.log("RTCPeerConnection state:", pc.connectionState);
            };
            pc.onicecandidateerror = (e: any) => {
                console.error("ICE candidate error:", e);
            };
            pc.oniceconnectionstatechange = () => {
                console.log("ICE connection state:", pc.iceConnectionState);
            };
            pc.onicecandidate = (event:any) => {
                if (event.candidate) {
                    console.log('Candidate:', event.candidate.candidate);
                }
            };
        }
        return peer;
    };

    // Получаем локальный медиапоток (общ для обоих режимов)
    useEffect(() => {
        (async () => {
            try {
                console.log("Проверка наличия камеры...");
                const hasVideo = await hasWebcam();
                console.log(`Камера найдена: ${hasVideo}`);
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: hasVideo,
                    audio: true,
                });
                setMyStream(stream);
                if (myVideo.current) {
                    myVideo.current.srcObject = stream;
                }
                console.log("Локальный медиапоток установлен");
                console.log("Локальные треки:", stream.getTracks());
            } catch (err) {
                console.error("Ошибка получения медиапотока:", err);
            }
        })();
    }, []);

    // Логика для отвечающего (answerer)
    useEffect(() => {
        if (!isAnswering) return; // выполняем только для ответчика
        if (!myStream) return; // ждём локальный медиапоток

        // Если peer ещё не создан и имеется offer, создаем peer.
        if (!peerRef.current && callDataContext?.peerData?.type === "offer") {
            console.log("Answer side: получен SDP offer", callDataContext.peerData);
            const peer = createPeer(false, myStream);
            peerRef.current = peer;

            peer.on("signal", (data: SignalData) => {
                console.log("Answer side: отправка сигнала", data);
                if (data.type === "answer") {
                    socket.emit("answerCall", {
                        signal: data,
                        to: { roomId: id, id: localStorage._id, name: localStorage.fullname },
                    });
                }
            });

            peer.on("stream", (remoteStream: MediaStream) => {
                console.log("Answer side: получен remote stream");
                console.log("Remote треки:", remoteStream.getTracks());
                if (userVideo.current) {
                    userVideo.current.srcObject = remoteStream;
                    userVideo.current
                        .play()
                        .catch((err) =>
                            console.error("Ошибка воспроизведения remote stream:", err)
                        );
                }
            });

            // Передаем offer в peer
            peer.signal(callDataContext.peerData);
            console.log("Применяем отложенные candidate:", callDataContext.candidateSignal);
            if (callDataContext.candidateSignal.length > 0) {
                callDataContext.candidateSignal.forEach((candidate) => {
                    console.log("Применяем candidate", candidate);
                    peer.signal(candidate);
                });
            }
        }
    }, [callDataContext.peerData, callDataContext.candidateSignal, isAnswering, myStream, id]);

    // Логика для вызывающего (caller)
    const callUser = () => {
        console.log("Инициация вызова...");
        if (!myStream) {
            console.warn("Нет локального потока!");
            return;
        }
        // В режиме caller мы сразу создаем peer с initiator: true
        const peer = createPeer(true, myStream);
        peerRef.current = peer;

        peer.on("signal", (data: SignalData) => {
            console.log("Caller side: отправка сигнала", data);
            if (data.type === "offer") {
                socket.emit("callUser", {
                    peerData: data,
                    roomId: id,
                    from: { name: localStorage.fullname, id: localStorage._id },
                });
            } else {
                socket.emit("callUser", {
                    peerData: data,
                    roomId: id,
                    from: { name: localStorage.fullname, id: localStorage._id },
                });
            }
        });

        peer.on("stream", (remoteStream: MediaStream) => {
            console.log("Caller side: получен remote stream");
            console.log("Remote треки (caller):", remoteStream.getTracks());
            if (userVideo.current) {
                userVideo.current.srcObject = remoteStream;
                userVideo.current
                    .play()
                    .catch((err) =>
                        console.error("Ошибка воспроизведения remote stream (caller):", err)
                    );
            }
        });



        const handleCallAccepted = (data: { signal: SignalData }) => {
            console.log("Caller side: callAccepted получен", data);
            peer.signal(data.signal);
        };

        socket.on("callAccepted", handleCallAccepted);
        const handleCandidate = (data: { signal: SignalData }) => {
            console.log("Caller side: получен candidate из socket", data);
            peer.signal(data.signal);
        };
        socket.on("signalCandidate", handleCandidate);

        return () => {
            socket.off("callAccepted", handleCallAccepted);
            socket.off("signalCandidate", handleCandidate);
        };
    };

    return (
        <div className={s.call}>
            <video
                playsInline
                ref={myVideo}
                autoPlay
                muted
                style={{ width: "300px" }}
            />
            <video
                playsInline
                ref={userVideo}
                autoPlay
                style={{ width: "300px" }}
            />
            <div className={s.callActions}>
                {/* Если режим вызывающего, отображаем кнопку "Call" */}
                {!isAnswering && <button onClick={callUser}>Call</button>}
            </div>
        </div>
    );
};

export default CallPage;