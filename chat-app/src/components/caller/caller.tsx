import { socket } from "../../socket"
import Peer from 'simple-peer/simplepeer.min.js';
import { useStore } from "../../store/store";
import { useNavigate } from "react-router-dom";
import s from './caller.module.css'
export const Caller = ({caller, callerSignal}:{caller:{ name: string, id: string, roomId: string },callerSignal:any}) =>{
    const [stream] = useStore(state=>[state.stream])
    const navigate = useNavigate()
    const [usersStream,setUsersStream] = useStore(state=>[state.usersStream, state.setUsersStream])
    const [setPeerConnection] = useStore(store=>[store.setPeerConnection])
    const answerCall = () => {
        // setCallAccepted(true)
        const peer = new Peer({
          initiator: false,
          trickle: false,
          stream: stream
        })

        peer.on("signal", (data: any) => {
          console.log({ signal: data, to: caller });
          
          socket.emit("answerCall", { signal: data, to: caller })
        })

        peer.on("stream", (stream: MediaStream) => {
            setUsersStream(stream)
        //   userVideoRef.current.srcObject = stream
        })
    
        peer.signal(callerSignal)
        setPeerConnection(peer)
        navigate(`/call/${caller.roomId}`)
      }
    return(
        <div className={s.caller}>
            <h3>{caller.name}</h3>
            <button onClick={answerCall}>answer</button>
        </div>
    )
}