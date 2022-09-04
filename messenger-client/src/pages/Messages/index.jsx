import { Typography } from "@mui/material";
import { Box } from "@mui/system";
import { useEffect } from "react";
import { useRef } from "react";
import { useSelector } from "react-redux";
import MessageComponent from "../../components/MessageComponent";

export default function Messages(){
    const data = useSelector(state=>state.messages)
    const scrollRef = useRef()
    useEffect(()=>{
        if(scrollRef.current){
            scrollRef.current.scrollTo(0,scrollRef.current.scrollHeight)
        }
    })
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