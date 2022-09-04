import { Typography } from "@mui/material";
import { Box } from "@mui/system";
import { useEffect } from "react";
import { useRef } from "react";
import { useSelector } from "react-redux";
import MessageComponent from "../../components/MessageComponent";
import socketIOClient from "socket.io-client";
import { useParams } from "react-router-dom";
const ENDPOINT = "http://127.0.0.1:5000";
const socket = socketIOClient(ENDPOINT);
export default function Messages(){
    const {id} = useParams()
    const data = useSelector(state=>state.messages)
    const scrollRef = useRef()
    useEffect(()=>{
        if(scrollRef.current){
            scrollRef.current.scrollTo(0,scrollRef.current.scrollHeight)
        }
    })
    useEffect(()=>{
        socket.emit('join chat',id);
    },[id])
    // console.log(data,'rsdgfdfgsdfg');
    return(
        <Box>
            <Box width={'100%'} display={'flex'} alignItems={'flex-end'}>
                <Box ref={scrollRef} display={'flex'} flexDirection={'column'} width={'100%'} overflow={'auto'} height={'calc(100vh - 170px)'}>
                    {
                        data?.map(item=>{
                            return(
                                <Box key={item._id} width={'100%'} display={'flex'} justifyContent={item.sender === localStorage._id?'flex-end':'flex-start'}>
                                    <Box margin={1} padding={2} sx={{background: item.sender === localStorage._id?'#5f5fcf':'#d8d8e9',color:item.sender === localStorage._id?'white':'black'}} borderRadius={3}>
                                        <Typography maxWidth={200} sx={{lineBreak:"anywhere"}}>
                                            {item.content}
                                        </Typography>
                                    </Box>
                                </Box>
                            )
                        })
                    }
                    
                </Box>
            </Box>
            <MessageComponent/>
        </Box>
    )
}