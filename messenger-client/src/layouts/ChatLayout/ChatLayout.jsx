import { Outlet } from "react-router-dom";
import { Box } from "@mui/system";
import ChatComponent from "../../components/ChatComponent";
import { useEffect } from "react";
import socketIOClient from "socket.io-client";
const ENDPOINT = "http://127.0.0.1:5000";
const socket = socketIOClient(ENDPOINT);
export default function ChatLayout(){
    useEffect(()=>{
        if(localStorage._id){
            socket.emit("setup", localStorage._id);
        }
    },[])
    return(
        <Box width={'100%'} height={'100vh'} sx={{background:'white'}}>
            <ChatComponent>
                <Outlet/>
            </ChatComponent>
        </Box>
    )
}