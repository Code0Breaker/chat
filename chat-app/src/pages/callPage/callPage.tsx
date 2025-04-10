import {useEffect, useRef, useState} from "react";
import s from "./callPage.module.css";
import {getChat} from "../../apis/chatApis";
import {IChat, OutletCallContextType} from "../../types";
import {useLocation, useOutletContext, useParams} from "react-router-dom";
import {useStore} from "../../store/store";
import {socket} from "../../socket";
import SimplePeer from "simple-peer/simplepeer.min.js";
import {SignalData} from "simple-peer";


const CallPage = () => {
    const location = useLocation();
    const [usersStream, setUsersStream] = useStore((state) => [state.usersStream, state.setUsersStream]);
    const [peerConnection, setPeerConnection] = useStore((state) => [state.peerConnection, state.setPeerConnection]);
    const [state, setState] = useState<IChat | null>(null);
    const [answered, setAnswered] = useState(false);
    const [caller, setCaller] = useState<{ name: string, id: string, roomId: string } | null>(null);
    const [callerSignal, setCallerSignal] = useState<any>(null);
    const [acceptorSignal, setAcceptorSignal] = useState<any>(null);
    const myVideo = useRef<HTMLVideoElement | null>(null);
    const userVideo = useRef<HTMLVideoElement | null>(null);
    const connectionRef = useRef(null);
    const {id} = useParams();
    const callDataContext = useOutletContext<OutletCallContextType>();

    useEffect(() => {
        (async () => {
            // Получаем свой медиапоток
            const myStream = await navigator.mediaDevices.getUserMedia({
                video: false,  // если нужна видеокамера – установите true
                audio: true
            });

            // Привязываем свой поток к видеоэлементу
            if (myVideo.current) {
                myVideo.current.srcObject = myStream;
                await myVideo.current.play();
            }

            if (callDataContext?.peerData) {
                // Создаем peer без инициатора (так как мы принимаем звонок)
                const peer = new SimplePeer({
                    initiator: false,
                    trickle: false,
                    stream: myStream,
                });

                peer.on('signal', (data: SignalData) => {
                    socket.emit('answerCall', {
                        signal: data,
                        to: {
                            name: localStorage.fullname,
                            id: localStorage._id,
                            roomId: id,
                        }
                    });
                })
                peer.on('stream', (remoteStream: MediaStream) => {
                    if (userVideo.current) {
                        userVideo.current.srcObject = remoteStream;
                        userVideo.current.play();
                    }
                });
                peer.signal(callDataContext.peerData)
                setCallerSignal(peer)
            }
        })();
    }, []);


    const callUser = async () => {


        const peer = new SimplePeer({
            initiator: true,
            trickle: false,
            stream: myVideo.current?.srcObject
        });

        peer.on('signal', (data: SignalData) => {
            socket.emit('callUser', {
                peerData: data,
                roomId: id,
                from: {name: localStorage.fullname, id: localStorage._id}
            });
        })

        peer.on('stream', (remoteStream: MediaStream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = remoteStream;
                userVideo.current.play();
            }
        });

        socket.on('callAccepted', (data) => {
            peer.signal(data.peerData)
            setAcceptorSignal(data.peerData)
        })
    };

    return (
        <div className={s.call}>
            <video
                playsInline
                ref={myVideo}
                autoPlay
                muted
                style={{width: "300px"}}
            />
            <video playsInline ref={userVideo} autoPlay style={{width: "300px"}}/>
            <div className={s.callActions}>
                <button onClick={callUser}>Call</button>
            </div>
        </div>
    );
};

export default CallPage;
