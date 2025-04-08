import { useEffect, useRef, useState } from "react";
import s from "./callPage.module.css";
import { getChat } from "../../apis/chatApis";
import { IChat } from "../../types";
import { useLocation, useParams } from "react-router-dom";
import { useStore } from "../../store/store";
import { socket } from "../../socket";
import Peer from 'simple-peer/simplepeer.min.js';

const CallPage = () => {
  const location = useLocation();
  const [stream, setStream] = useStore((state) => [state.stream, state.setStream]);
  const [usersStream, setUsersStream] = useStore((state) => [state.usersStream, state.setUsersStream]);
  const [peerConnection, setPeerConnection] = useStore((state) => [state.peerConnection, state.setPeerConnection]);
  const [state, setState] = useState<IChat | null>(null);
  const [answered, setAnswered] = useState(false);
  const [caller, setCaller] = useState<{ name: string, id: string, roomId: string } | null>(null);
  const [callerSignal, setCallerSignal] = useState<any>(null);
  const myVideo = useRef<HTMLVideoElement | null>(null);
  const userVideo = useRef<HTMLVideoElement | null>(null);
  const connectionRef = useRef();
  const { id } = useParams();

  useEffect(() => {
    (async () => {
      socket.emit('join', [id]);

      // Handle answering the call
      if (location.search.split('=')[1] === 'answer') {
        socket.emit('acceptPeerConnection', { fullname: localStorage.fullname, acceptorId: localStorage._id, accept: true, roomId: id });

        const peer = new Peer({
          initiator: false,
          trickle: false,
          stream: stream
        });

        socket.on('recivePeerSignal', (callData) => {
          console.log(callData, 'recivePeerSignal');
          peer.signal(callData.signalData);
        });

        peer.on("signal", (signalData: any) => {
          socket.emit('sendingPeerSignal', {
            roomId: id,
            signalData,
            from: { name: localStorage.fullname, id: localStorage._id }
          });
        });

        peer.on('stream', (remoteStream: MediaStream) => {
          console.log(remoteStream, 'remoteStream');
          setUsersStream(remoteStream);
          if (userVideo.current) {
            userVideo.current.srcObject = remoteStream;
          }

          // Ensure audio is not muted
          const audioTrack = remoteStream.getAudioTracks()[0];
          if (audioTrack) {
            audioTrack.enabled = true; // Ensure it's enabled
            console.log('Remote audio track:', audioTrack.enabled);
          } else {
            console.log('No remote audio track');
          }
        });
      }

      // Handle starting the call
      if (location.search.split('=')[1] === 'call') {
        const peer = new Peer({
          initiator: true,
          trickle: false,
          stream: stream
        });

        socket.on('acceptedPeerConnection', ({ fullname, acceptorId, accept, roomId }) => {
          peer.on('signal', (signalData: any) => {
            socket.emit('sendingPeerSignal', {
              roomId: id,
              signalData,
              from: { name: localStorage.fullname, id: localStorage._id }
            });
          });

          socket.on('recivePeerSignal', (callData) => {
            console.log(callData, 'recivePeerSignal');
            peer.signal(callData.signalData);
          });

          peer.on('stream', (remoteStream: MediaStream) => {
            console.log(remoteStream, 'remoteStream');

            if (userVideo.current) {
              userVideo.current.srcObject = remoteStream;
            }

            // Ensure audio is not muted
            const audioTrack = remoteStream.getAudioTracks()[0];
            if (audioTrack) {
              audioTrack.enabled = true; // Ensure it's enabled
              console.log('Remote audio track:', audioTrack.enabled);
            } else {
              console.log('No remote audio track');
            }
          });
        });
      }

      const data = await getChat(id as string);
      setState(data);

      // Access the user's media devices (video/audio)
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoDevices = devices.filter(device => device.kind === "videoinput");
        const audioDevices = devices.filter(device => device.kind === "audioinput");

        return navigator.mediaDevices
            .getUserMedia({
              video: videoDevices.length > 0,
              audio: audioDevices.length > 0,
            })
            .then((stream: MediaStream) => {
              setStream(stream);

              // Display the local stream in the video element
              if (myVideo.current && myVideo.current.srcObject !== stream) {
                myVideo.current.srcObject = stream;
              }

              if (sessionStorage.signalData) {
                const data = JSON.parse(sessionStorage.signalData);
                setCaller({ name: data.name, id: data.id, roomId: data.roomId });
                setCallerSignal(data.signalData);
                console.log(data);
              }
            });
      });
    })();
  }, []);

  const callUser = () => {
    socket.emit('callUser', {
      roomId: id,
      from: { name: localStorage.fullname, id: localStorage._id }
    });
  };

  return (
      <div className={s.call}>
        {myVideo && <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px" }} />}
        {userVideo.current && <video playsInline ref={userVideo} autoPlay style={{ width: "300px" }} />}
        <div className={s.callActions}>
          <button onClick={callUser}>Call</button>
        </div>
      </div>
  );
};

export default CallPage;
