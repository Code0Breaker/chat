import { useEffect, useRef, useState } from "react";
import s from "./callPage.module.css";
import { getChat } from "../../apis/chatApis";
import { IChat } from "../../types";
import { useParams } from "react-router-dom";
import { useStore } from "../../store/store";
import { socket } from "../../socket";
import Peer from 'simple-peer/simplepeer.min.js';

const CallPage = () => {
  const [stream, setStream] = useStore((state) => [state.stream,state.setStream])
  const [usersStream, setUsersStream] = useStore((state) => [state.usersStream,state.setUsersStream])
  const [peerConnection, setPeerConnection] = useStore((state) => [state.peerConnection,state.setPeerConnection])
  const [state, setState] = useState<IChat | null>(null);
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
          .then((stream) => {
            setStream(stream);
            // currentUserVideoRef.current.srcObject = stream;
          });
      });
    })();
  }, []);

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
        setUsersStream(stream)
    })

    socket.on("callAccepted", (signal) => {
    //   setCallAccepted(true)
      peer.signal(signal)
    })

    setPeerConnection(peer)
  }

  return (
    <div className={s.call}>
      <video
        playsInline
        ref={e=>e&&(e.srcObject=stream)}
        muted
        autoPlay
        style={{ width: "300px", height: 300, position:'absolute', top:0 }}
      />
        {
            usersStream?.map((item,index)=>{
                return(
                    <div key={index}>
                        <video ref={e=>e&&(e.srcObject = item)} autoPlay playsInline style={{ width: "300px", height: 300}}/>
                    </div>
                )
            })
        }
      <div className={s.callActions}>
        <button onClick={callUser}>call</button>
      </div>
    </div>
  );
};

export default CallPage;
