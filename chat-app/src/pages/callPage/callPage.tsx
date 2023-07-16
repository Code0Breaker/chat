import { useEffect, useRef, useState } from "react";
import s from "./callPage.module.css";
import { getChat } from "../../apis/chatApis";
import { IChat } from "../../types";
import { useParams } from "react-router-dom";
import { useStore, userMediaStream } from "../../store/store";
import { socket } from "../../socket";
import Peer from 'simple-peer/simplepeer.min.js';

const CallPage = () => {
  const [stream, setStream] = useStore((state) => [state.stream, state.setStream])
  const [usersStream, setUsersStream] = useStore((state) => [state.usersStream, state.setUsersStream])
  const [peerConnection, setPeerConnection] = useStore((state) => [state.peerConnection, state.setPeerConnection])
  const [state, setState] = useState<IChat | null>(null);
  const [answered, setAnswered] = useState(false)
  const [caller, setCaller] = useState<{ name: string, id: string, roomId: string } | null>(null)
  const [callerSignal, setCallerSignal] = useState<any>(null)
  const myVideo = useRef<HTMLVideoElement|null>(null)
	const userVideo = useRef<HTMLVideoElement|null>(null)
	const connectionRef= useRef()
  //   const currentUserVideoRef = useRef<any>();
  const { id } = useParams();

  useEffect(() => {
    (async () => {
       

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
          .then((stream:MediaStream) => {
            setStream(stream);
            if (myVideo.current && myVideo.current.srcObject !== stream) {
              myVideo.current.srcObject = stream;
            }
            if(sessionStorage.signalData){
              const data = JSON.parse(sessionStorage.signalData)
              setCaller({name:data.name,id:data.id,roomId:data.roomId})
              setCallerSignal(data.signalData)
              console.log(data);
              // setUsersStream(data.signalData)
            }

            // currentUserVideoRef.current.srcObject = stream;
          });
      });

  



    })();
  }, []);
console.log(caller,callerSignal);

  const callUser = () => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream
    })

    peer.on('signal', (data: any) => {
      socket.emit('callUser', {
        roomId: id,
        signalData: data,
        from: { name: localStorage.fullname, id: localStorage._id }
      })
    })

    peer.on('stream', (stream: MediaStream) => {
      // setUsersStream(stream)
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    })

    socket.on("callAccepted", (signal) => {
      //   setCallAccepted(true)
      console.log(signal);

      peer.signal(signal)
    })
    console.log(peer);

    // setPeerConnection(peer)
    connectionRef.current = peer
  }

  const answerCall = () => {
    // setCallAccepted(true)
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream
    })

    peer.on("signal", (data: any) => {
      // console.log({ signal: data, to: caller });

      socket.emit("answerCall", { signal: data, to: caller })
    })

    peer.on("stream", (stream: MediaStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
      // setUsersStream(stream)
      //   userVideoRef.current.srcObject = stream
    })

    peer.signal(callerSignal)
    connectionRef.current = peer
    // setPeerConnection(peer)
    // window.open(`/call/${caller.roomId}`,'','popup')
    // setOpen(true)
    setAnswered(true)
  }
console.log(usersStream);


  return (
    <>
      {
        !answered&&sessionStorage.signalData ?
          <div className={s.caller}>
            <h3>{caller?.name}</h3>
            <button onClick={answerCall}>answer</button>
          </div>
          :
          <div className={s.call}>
            {stream&&myVideo&&<video playsInline muted ref={myVideo} autoPlay style={{ width: "300px" }} />}
            {userVideo&&<video playsInline ref={userVideo} autoPlay style={{ width: "300px"}} />}
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
      }
    </>
  );
};

export default CallPage;
