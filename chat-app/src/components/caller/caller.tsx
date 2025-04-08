import { socket } from "../../socket"
import Peer from 'simple-peer/simplepeer.min.js';
import { useStore, userMediaStream } from "../../store/store";
import { useNavigate } from "react-router-dom";
import s from './caller.module.css'
export const Caller = ({caller, callerSignal,setOpen}:{caller:{ name: string, id: string, roomId: string },callerSignal:any,setOpen:(state:boolean)=>void}) =>{
    const [stream] = useStore(state=>[state.stream])
    const navigate = useNavigate()
    const [usersStream,setUsersStream] = useStore(state=>[state.usersStream, state.setUsersStream])
    const [setPeerConnection] = useStore(store=>[store.setPeerConnection])
    const answerCall = () => {
        navigate(`/messenger/call/${caller.roomId}?type=answer`)
        // setCallAccepted(true)
        // const peer = new Peer({
        //   initiator: false,
        //   trickle: false,
        //   stream: stream
        // })

        // peer.on("signal", (data: any) => {
        //   console.log({ signal: data, to: caller });
          
        //   socket.emit("answerCall", { signal: data, to: caller })
        // })

        // peer.on("stream", (stream: MediaStream) => {
        //     setUsersStream(stream)
        // //   userVideoRef.current.srcObject = stream
        // })
    
        // peer.signal(callerSignal)
        // setPeerConnection(peer)
        // setOpen(true)
      }
    return(
        <div className={s.caller}>
            <h3>{caller.name}</h3>
            <button onClick={answerCall}>answer</button>
        </div>
    )
}