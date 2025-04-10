import { useNavigate } from "react-router-dom";
import s from "./caller.module.css";
import {FC} from "react";

interface CallerProps {
    caller: { name: string; id: string; roomId: string };
    setOpen: (state: boolean) => void;
}

export const Caller: FC<CallerProps> = ({ caller, setOpen }) => {
    const navigate = useNavigate();

    const answerCall = () => {
        // Navigate to the call page as an answerer
        navigate(`/messenger/call/${caller.roomId}?type=answer`);
        setOpen(false);
    };

    return (
        <div className={s.caller}>
            <h3>{caller.name}</h3>
            <button onClick={answerCall}>Answer</button>
        </div>
    );
};
