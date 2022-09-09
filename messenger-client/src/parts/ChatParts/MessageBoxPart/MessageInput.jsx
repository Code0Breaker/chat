import * as React from 'react';
import InputUnstyled from '@mui/base/InputUnstyled';
import TextareaAutosize from '@mui/base/TextareaAutosize';
import { Box, styled } from '@mui/system';
import { IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import axios from 'axios';
import socketIOClient from "socket.io-client";
import { setNewMessage } from '../../../redux/messages.reducer';
import { useDispatch } from 'react-redux';
import { useEffect } from 'react';
const ENDPOINT = "http://127.0.0.1:5000";
const socket = socketIOClient(ENDPOINT);
        
const blue = {
  100: '#DAECFF',
  200: '#80BFFF',
  400: '#3399FF',
  500: '#007FFF',
  600: '#0072E5',
};

const grey = {
  50: '#F3F6F9',
  100: '#E7EBF0',
  200: '#E0E3E7',
  300: '#CDD2D7',
  400: '#B2BAC2',
  500: '#A0AAB4',
  600: '#6F7E8C',
  700: '#3E5060',
  800: '#2D3843',
  900: '#1A2027',
};

const StyledInputElement = styled('input')(
  ({ theme }) => `
  width: 320px;
  font-family: IBM Plex Sans, sans-serif;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
  padding: 12px;
  border-radius: 12px;
  color: ${theme.palette.mode === 'dark' ? grey[300] : grey[900]};
  background: ${theme.palette.mode === 'dark' ? grey[900] : '#fff'};
  border: 1px solid ${theme.palette.mode === 'dark' ? grey[700] : grey[200]};
  box-shadow: 0px 2px 2px ${theme.palette.mode === 'dark' ? grey[900] : grey[50]};

  &:hover {
    border-color: ${blue[400]};
  }

  &:focus {
    border-color: ${blue[400]};
    outline: 3px solid ${theme.palette.mode === 'dark' ? blue[500] : blue[200]};
  }
`,
);

const StyledTextareaElement = styled(TextareaAutosize)(
  ({ theme }) => `
  width: 100%;
  font-family: IBM Plex Sans, sans-serif;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
  padding: 12px;
  padding-right:80px;
  border-radius: 12px;
  color: ${theme.palette.mode === 'dark' ? grey[300] : grey[900]};
  background: ${theme.palette.mode === 'dark' ? grey[900] : '#fff'};
  border: 1px solid ${theme.palette.mode === 'dark' ? grey[700] : grey[200]};
  box-shadow: 0px 2px 2px ${theme.palette.mode === 'dark' ? grey[900] : grey[50]};

  &:hover {
    border-color: ${blue[400]};
  }

  &:focus {
    border-color: ${blue[400]};
    outline: 3px solid ${theme.palette.mode === 'dark' ? blue[500] : blue[200]};
  }
`,
);

const CustomInput = React.forwardRef(function CustomInput(props, ref) {
  return (
    <InputUnstyled
      components={{ Input: StyledInputElement, Textarea: StyledTextareaElement }}
      {...props}
      ref={ref}
    />
  );
});




export default function MessageInput(){
  const [content, setContent] = useState('')
  const {id} = useParams()
  const dispatch = useDispatch()
  useEffect(()=>{
    socket.on('message recieved',data=>{
      dispatch(setNewMessage(data));
      // console.log(data);
    })
  },[])
const send = () =>{
  axios.post('http://localhost:5000/user/createMessage',{chatId:id,content, myId:localStorage._id},{headers:{'Authorization':'Bearer '+localStorage.token}}).then(r=>{
  console.log(r.data);  
  socket.emit("new message", {...r.data});
  dispatch(setNewMessage(r.data));
    setContent('')
  })
}
    return(
        <Box position={'relative'}>
            <Box position={'absolute'} right={10} top={'10%'}>
              <IconButton onClick={send}>
                <SendIcon/>
              </IconButton>
            </Box>
            <CustomInput onChange={e=>setContent(e.target.value)} value={content} aria-label="Demo input" multiline placeholder="Type something…" />
        </Box>
    )
}