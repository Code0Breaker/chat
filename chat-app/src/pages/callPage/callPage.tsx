import { useEffect, useRef, useState } from "react";
import s from "./callPage.module.css";
import { useLocation, useOutletContext, useParams } from "react-router-dom";
import { socket } from "../../socket";
import SimplePeer, { SignalData } from "simple-peer/simplepeer.min.js";
import { hasWebcam } from "../../utils/devices.utils.ts";
import { OutletCallContextType } from "../../types";

const CallPage = () => {
    const { id } = useParams();
    const callDataContext = useOutletContext<OutletCallContextType>();
    const myVideo = useRef<HTMLVideoElement | null>(null);
    const userVideo = useRef<HTMLVideoElement | null>(null);
    const peerRef = useRef<any>(null);
    const [myStream, setMyStream] = useState<MediaStream | null>(null);

    // При загрузке компонента получаем медиапоток
    useEffect(() => {
        (async () => {
            const hasVideo = await hasWebcam();
            const stream = await navigator.mediaDevices.getUserMedia({
                video: hasVideo,
                audio: true,
            });
            setMyStream(stream);
            if (myVideo.current) {
                myVideo.current.srcObject = stream;
            }

            // Если получены входящие данные от другого пира - отвечаем на звонок
            if (callDataContext?.peerData) {
                const peer = new SimplePeer({
                    initiator: false,        // НЕ инициатор
                    trickle: true,           // Включен режим trickle ICE
                    stream: stream,
                    config: {
                        iceServers: [
                            { urls: "stun:stun.l.google.com:19302" },
                            // при необходимости можно добавить TURN-сервер
                        ],
                    },
                });

                // При каждом сигнале (ICE кандидат или SDP) отправляем ответ
                peer.on("signal", (data: SignalData) => {
                    socket.emit("answerCall", {
                        signal: data,
                        to: {
                            roomId: id,
                            id: localStorage._id,
                            name: localStorage.fullname,
                        },
                    });
                });

                // При получении медиа-потока от другого пользователя устанавливаем его в видеоэлемент
                peer.on("stream", (remoteStream: MediaStream) => {
                    if (userVideo.current) {
                        userVideo.current.srcObject = remoteStream;
                        userVideo.current.play();
                    }
                });

                // Подаем на SimplePeer сигналы, которые пришли в качестве данных звонка
                peer.signal(callDataContext.peerData);
                peerRef.current = peer;
            }
        })();
    }, []);

    // Функция для инициации звонка
    const callUser = () => {
        if (!myStream) return;
        const peer = new SimplePeer({
            initiator: true,         // инициатор звонка
            trickle: true,           // включен режим trickle ICE
            stream: myStream,
            config: {
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    // при необходимости можно добавить TURN-сервер
                ],
            },
        });

        // При каждом сигнале отправляем его через сокеты
        peer.on("signal", (data: SignalData) => {
            socket.emit("callUser", {
                peerData: data,
                roomId: id,
                from: { name: localStorage.fullname, id: localStorage._id },
            });
        });

        // При получении потока от вызываемого пользователя отображаем его
        peer.on("stream", (remoteStream: MediaStream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = remoteStream;
                userVideo.current.play();
            }
        });

        // Для режима trickle ICE важно получать все сигналы, поэтому используем socket.on,
        // а не socket.once – кандидаты могут приходить в несколько сообщений.
        socket.on("callAccepted", (data) => {
            peer.signal(data.signal);
        });

        peerRef.current = peer;
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
                <button onClick={callUser}>Call</button>
            </div>
        </div>
    );
};

export default CallPage;
