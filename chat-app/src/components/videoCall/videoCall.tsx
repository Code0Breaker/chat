import { useEffect, useRef, useState } from 'react'
import Peer from 'simple-peer/simplepeer.min.js';
import { socket } from '../../socket'
export const VideoCall = ({ setOpenVideoCall, openVideoCall, id }: { setOpenVideoCall: (state: boolean) => void, openVideoCall: boolean, id: string }) => {
  const [stream, setStream] = useState<any>(null)
  const [callAccepted, setCallAccepted] = useState(false)
  const [incomingCall, setIncomingCall] = useState(false)
  const [caller, setCaller] = useState<{ name: string, id: string, roomId: string } | null>(null)
  const [callerSignal, setCallerSignal] = useState<any>(null)
  const connectionRef = useRef<any>()
  const videoRef = useRef<any>()
  const userVideoRef = useRef<any>()

  useEffect(() => {



    hasVideoAndAudioDevice()
    socket.on('reciveCall', (data) => {

      setIncomingCall(true)
      setCaller({ ...data.from, roomId: data.roomId })
      setCallerSignal(data.signalData)

    })
  }, [])

  function hasVideoAndAudioDevice() {
    return navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        return navigator.mediaDevices.getUserMedia({
          video: videoDevices.length > 0,
          audio: audioDevices.length > 0
        }).then(stream => {
          setStream(stream)
          videoRef.current.srcObject = stream
        })
      })
    // .then((stream) => {
    //   if (videoRef.current) {
    //     videoRef.current.srcObject = stream;
    //   }
    // })
    // .catch(error => {
    //   console.error('Error accessing media devices:', error);
    // });
  }

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

    peer.on('stream', (stream: any) => {
      userVideoRef.current.srcObject = stream
    })

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true)
      peer.signal(signal)
    })

    connectionRef.current = peer
  }

  const answerCall = () => {
    setCallAccepted(true)
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream
    })
    peer.on("signal", (data: any) => {
      socket.emit("answerCall", { signal: data, to: caller })
    })
    peer.on("stream", (stream: any) => {
      userVideoRef.current.srcObject = stream
    })

    peer.signal(callerSignal)
    connectionRef.current = peer
  }

  const leaveCall = () =>{
    // setCallEnded(false)
    console.log(callAccepted);
    
    connectionRef.current.destroy()
  }
  return (
    <>
      {incomingCall && <button onClick={answerCall}>answer</button>}
      {(openVideoCall||callAccepted) && <div className="video-layout">
        <div className="close-video-call" onClick={() => setOpenVideoCall(false)}>close</div>
        <button onClick={callUser}>call</button>
        <button onClick={leaveCall}>leave call</button>
        <div className="video-call">
          <video playsInline ref={videoRef} muted autoPlay style={{ width: "300px", height: 300 }} />
          <video playsInline ref={userVideoRef} autoPlay style={{ width: "300px", height: 300 }} />
        </div>
      </div>}</>

  )
}
