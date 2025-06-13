import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import s from './caller.module.css';
import { CallerData } from '../../types';

interface CallerProps {
    caller: CallerData;
    setOpen: (state: boolean) => void;
}

export const Caller: FC<CallerProps> = ({ caller, setOpen }) => {
    const navigate = useNavigate();

    const answerCall = () => {
        // Navigate to the call page as an answerer
        console.log('Answering call, navigating to call page...');
        navigate(`/messenger/call/${caller.roomId}?type=answer`, { replace: true });
        setOpen(false);
    };

    const rejectCall = () => {
        console.log('Rejecting call...');
        setOpen(false);
    };

    return (
        <div className={s.caller}>
            <div className={s.callerInfo}>
                <h3>Incoming call from</h3>
                <h2>{caller.name}</h2>
            </div>
            <div className={s.callActions}>
                <button onClick={answerCall} className={s.answerBtn}>
                    📞 Answer
                </button>
                <button onClick={rejectCall} className={s.rejectBtn}>
                    📞 Reject
                </button>
            </div>
        </div>
    );
};
