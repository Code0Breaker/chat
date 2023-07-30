import { useEffect, useRef, useState } from "react";
import s from "./callPage.module.css";
import { getChat } from "../../apis/chatApis";
import { IChat } from "../../types";
import { useLocation, useParams } from "react-router-dom";
import { useStore, userMediaStream } from "../../store/store";
import { socket } from "../../socket";
import Peer from 'simple-peer/simplepeer.min.js';

const CallPage = () => {
  const location = useLocation()
  const [stream, setStream] = useStore((state) => [state.stream, state.setStream])
  const [usersStream, setUsersStream] = useStore((state) => [state.usersStream, state.setUsersStream])
  const [peerConnection, setPeerConnection] = useStore((state) => [state.peerConnection, state.setPeerConnection])
  const [state, setState] = useState<IChat | null>(null);
  const [answered, setAnswered] = useState(false)
  const [caller, setCaller] = useState<{ name: string, id: string, roomId: string } | null>(null)
  const [callerSignal, setCallerSignal] = useState<any>(null)
  const myVideo = useRef<HTMLVideoElement | null>(null)
  const userVideo = useRef<HTMLVideoElement | null>(null)
  const connectionRef = useRef()
  //   const currentUserVideoRef = useRef<any>();
  const { id } = useParams();

  useEffect(() => {
    (async () => {
      socket.emit('join', [id]);
      if (location.search.split('=')[1] === 'answer') {
        socket.emit('acceptPeerConnection', { fullname: localStorage.fullname, acceptorId: localStorage._id, accept: true, roomId: id })

        const peer = new Peer({
          initiator: false,
          trickle: false,
          stream: stream
        })
        socket.on('recivePeerSignal', (callData) => {
          console.log(callData, 'recivePeerSignal');

          peer.signal(callData.signalData)
        })
        peer.on("signal", (signalData: any) => {
          socket.emit('sendingPeerSignal', {
            roomId: id,
            signalData,
            from: { name: localStorage.fullname, id: localStorage._id }
          })
        })

        peer.on('stream', (remoteStream: MediaStream) => {
          console.log(remoteStream, 'remoteStream');
          if (userVideo.current) {
            userVideo.current.srcObject = remoteStream;
          }
        });
      }

      if (location.search.split('=')[1] === 'call') {
        const peer = new Peer({
          initiator: true,
          trickle: false,
          stream: stream
        })
        socket.on('acceptedPeerConnection', ({ fullname, acceptorId, accept, roomId }) => {



        })

        peer.on('signal', (signalData: any) => {
          socket.emit('sendingPeerSignal', {
            roomId: id,
            signalData,
            from: { name: localStorage.fullname, id: localStorage._id }
          })
        })

        socket.on('recivePeerSignal', (callData) => {
          console.log(callData, 'recivePeerSignal');
          peer.signal(callData.signalData)
        })

        peer.on('stream', (remoteStream: MediaStream) => {
          console.log(remoteStream, 'remoteStream');

          if (userVideo.current) {
            userVideo.current.srcObject = remoteStream;
          }
        });
      }


      const data = await getChat(id as string);
      setState(data);

      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        const audioDevices = devices.filter(
          (device) => device.kind === "audioinput"
        );
        return navigator.mediaDevices
          .getUserMedia({
            video: videoDevices.length > 0,
            audio: audioDevices.length > 0,
          })
          .then((stream: MediaStream) => {
            setStream(stream);
            if (myVideo.current && myVideo.current.srcObject !== stream) {
              myVideo.current.srcObject = stream;
            }
            if (sessionStorage.signalData) {
              const data = JSON.parse(sessionStorage.signalData)
              setCaller({ name: data.name, id: data.id, roomId: data.roomId })
              setCallerSignal(data.signalData)
              console.log(data);
              // setUsersStream(data.signalData)
            }

            // currentUserVideoRef.current.srcObject = stream;
          });
      });





    })();
  }, []);
  console.log(caller, callerSignal);

  const callUser = () => {

    socket.emit('callUser', {
      roomId: id,
      from: { name: localStorage.fullname, id: localStorage._id }
    })
  }

  return (
    <div className={s.call}>
      {myVideo && <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px" }} />}
      {userVideo && <video playsInline ref={userVideo} autoPlay style={{ width: "300px" }} />}
      {/* <video
              playsInline
              ref={e => e && (e.srcObject = stream)}
              muted
              autoPlay
              style={{ width: "300px", height: 300, position: 'absolute', top: 0 }}
            /> */}
      {/* {usersStream&& <div >
                    <video ref={e => e && (e.srcObject = usersStream[0])} autoPlay playsInline style={{ width: "300px", height: 300 }} />
                  </div>} */}
      {/* {
              usersStream?.map((item, index) => {
                return (
                )
              })
            } */}
      <div className={s.callActions}>
        <button onClick={callUser}>call</button>
      </div>
    </div>
  );
};

export default CallPage;
