import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/store';
import { socket } from '../../socket';
import s from './caller.module.css';
import { CallerData } from '../../types';

interface CallerProps {
    caller: CallerData;
    onReject: () => void;
}

export const Caller: FC<CallerProps> = ({ caller, onReject }) => {
    const navigate = useNavigate();
    const setIncomingCall = useStore(state => state.setIncomingCall);
    const setCaller = useStore(state => state.setCaller);

    const answerCall = () => {
        console.log('Answering call globally, navigating to call page...');
        
        // Clear the incoming call state
        setIncomingCall(false);
        setCaller(null);
        
        // Navigate to the call page as an answerer
        navigate(`/messenger/call/${caller.roomId}?type=answer`, { replace: true });
    };

    const rejectCall = () => {
        console.log('Rejecting call globally...');
        
        // Emit reject call event to notify the caller
        socket.emit("rejectCall", { 
            roomId: caller.roomId,
            reason: "User declined" 
        });
        
        // Clear the incoming call state
        setIncomingCall(false);
        setCaller(null);
        
        // Call the onReject callback
        onReject();
    };

    return (
        <div className={s.caller}>
            <div className={s.backdrop} onClick={rejectCall}></div>
            <div className={s.callerModal}>
                <div className={s.callerInfo}>
                    <h3>Incoming Video Call</h3>
                    <h2>{caller.name}</h2>
                    <p>Room ID: {caller.roomId}</p>
                </div>
                <div className={s.callActions}>
                    <button onClick={answerCall} className={s.answerBtn}>
                        📞 Answer
                    </button>
                    <button onClick={rejectCall} className={s.rejectBtn}>
                        ❌ Decline
                    </button>
                </div>
            </div>
        </div>
    );
};
