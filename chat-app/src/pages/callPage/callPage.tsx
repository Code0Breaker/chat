import {useEffect, useRef, useState} from "react";
import s from "./callPage.module.css";
import {useOutletContext, useParams} from "react-router-dom";
import {socket} from "../../socket";
import SimplePeer from "simple-peer/simplepeer.min.js";
import {hasWebcam} from "../../utils/devices.utils.ts";
import {OutletCallContextType} from "../../types";
import {SignalData, Instance} from "simple-peer";

const CallPage = () => {
    const {id} = useParams();

    const searchParams = new URLSearchParams(window.location.search);
    const isAnswering = searchParams.get("type") === "answer";

    const callDataContext = useOutletContext<OutletCallContextType>();

    const myVideo = useRef<HTMLVideoElement | null>(null);
    const userVideo = useRef<HTMLVideoElement | null>(null);
    const peerRef = useRef<Instance | null>(null);
    const [myStream, setMyStream] = useState<MediaStream | null>(null);

    const createPeer = (initiator: boolean, stream: MediaStream) => {
        const peer = new SimplePeer({
            initiator,
            trickle: true,
            stream,
            config: {
                iceServers: [
                    {
                        urls: [
                            "stun:relay1.expressturn.com:3478"
                        ],
                        username: "ef45KJSYNE034M5IUE",
                        credential: "bYXVJbbTvjC61JyA"
                    }
                ]
            },
        });

        peer.on('error', () => {
            // Handle error silently
        });

        peer.on("icecandidate", (candidate: RTCIceCandidate) => {
            if (candidate) {
                socket.emit("new-ice-candidate", {
                    candidate,
                    roomId: id,
                });
            }
        });

        return peer;
    };

    useEffect(() => {
        (async () => {
            try {
                const hasVideo = await hasWebcam();
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: hasVideo,
                    audio: true,
                });
                setMyStream(stream);
                if (myVideo.current) {
                    myVideo.current.srcObject = stream;
                }
            } catch (err) {
                // Handle error silently
            }
        })();
    }, []);

    useEffect(() => {
        if (!isAnswering) return;
        if (!myStream) return;

        if (!peerRef.current && callDataContext?.peerData?.type === "offer") {
            const peer = createPeer(false, myStream);
            peerRef.current = peer;

            peer.on("signal", (data: SignalData) => {
                if (data.type === "answer") {
                    socket.emit("answerCall", {
                        signal: data,
                        to: {roomId: id, id: localStorage._id, name: localStorage.fullname},
                    });
                }
            });

            peer.on("stream", (remoteStream: MediaStream) => {
                if (userVideo.current) {
                    userVideo.current.srcObject = remoteStream;
                    userVideo.current
                        .play()
                        .catch(() => {
                            // Handle error silently
                        });
                }
            });

            peer.signal(callDataContext.peerData);
            if (callDataContext.candidateSignal.length > 0) {
                callDataContext.candidateSignal.forEach((candidate) => {
                    peer.signal(candidate);
                });
            }
        }
    }, [callDataContext.peerData, callDataContext.candidateSignal, isAnswering, myStream, id]);

    const callUser = () => {
        if (!myStream) {
            return;
        }
        const peer = createPeer(true, myStream);
        peerRef.current = peer;

        peer.on("signal", (data: SignalData) => {
            socket.emit("callUser", {
                peerData: data,
                roomId: id,
                from: {name: localStorage.fullname, id: localStorage._id},
            });
        });

        peer.on("stream", (remoteStream: MediaStream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = remoteStream;
                userVideo.current
                    .play()
                    .catch(() => {
                        // Handle error silently
                    });
            }
        });

        const handleCallAccepted = (data: { signal: SignalData }) => {
            peer.signal(data.signal);
        };

        socket.on("callAccepted", handleCallAccepted);
    };

    useEffect(() => {
        socket.on("new-ice-candidate", (data: { candidate: SignalData }) => {
            if (peerRef.current && data.candidate) {
                peerRef.current.signal(data.candidate);
            }
        });

        return () => {
            socket.off("new-ice-candidate");
        };
    }, []);

    return (
        <div className={s.call}>
            <video
                playsInline
                ref={myVideo}
                autoPlay
                muted
                style={{width: "300px"}}
            />
            <video
                playsInline
                ref={userVideo}
                autoPlay
                style={{width: "300px"}}
            />
            <div className={s.callActions}>
                {!isAnswering && <button onClick={callUser}>Call</button>}
            </div>
        </div>
    );
};

export default CallPage;