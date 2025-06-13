import { useState } from "react";
import { useParams } from "react-router-dom";
import { VideoCall } from "../../components/videoCall/videoCall";

const CallPage = () => {
    const { id } = useParams();
    const [openVideoCall, setOpenVideoCall] = useState(true);

    return (
        <VideoCall 
            id={id || ''} 
            openVideoCall={openVideoCall} 
            setOpenVideoCall={setOpenVideoCall}
        />
    );
};

export default CallPage;