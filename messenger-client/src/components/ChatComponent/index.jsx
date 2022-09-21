import React, { useState } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

import ChatListHeader from '../../parts/ChatParts/ChatListPart/ChatListHeader';
import { AppBar, Drawer, DrawerHeader } from '../../models/drawer';
import { Avatar } from '@mui/material';
import { StyledBadge, StyledInput } from '../../models/chatlist';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setMessages } from '../../redux/messages.reducer';
import socketIOClient from "socket.io-client";
import { useEffect } from 'react';
const ENDPOINT = "http://127.0.0.1:5000";
const socket = socketIOClient(ENDPOINT);
export default function ChatComponent({children}) {
  const [search, setSearch] = useState('')
  const theme = useTheme();
  const navigate = useNavigate()
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(null)
  const [searchResults, setSearchResults] = useState(null)
  const dispatch = useDispatch()
  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  useEffect(()=>{
    socket.emit("setup", localStorage._id);
    axios.post('http://localhost:5000/user/allChatList', {_id:localStorage._id},{headers:{'Authorization':'Bearer '+ localStorage.token}}).then(r=>{
      setState(r.data)
    })
  },[])

  useEffect(()=>{
    if(search.length>=3){
      axios.post('http://localhost:5000/chat/search',{text:search}).then(r=>{
      console.log(r.data);
      setSearchResults(r.data);
    })
    }
  },[search])

  const selectChat = (selectedUser) =>{
    console.log(selectedUser);
    const currentChat = selectedUser.find(item=>item._id!==localStorage._id)
    sessionStorage.selectedChat = currentChat._id
    // console.log(selectedUser[0]._id);
    axios.post('http://localhost:5000/user/select',{_id:[currentChat._id]},{headers:{'Authorization':'Bearer '+ localStorage.token}}).then(r=>{
      dispatch(setMessages(r.data.messages))
      socket.emit('join chat', r.data.roomId)
      navigate(`/chat/${r.data.roomId}`)
    })
  
  }

  const selectChatFromSearch = (selectedUser) =>{
    console.log(selectedUser);
    sessionStorage.selectedChat = selectedUser._id
    // console.log(selectedUser[0]._id);
    axios.post('http://localhost:5000/user/select',{_id:[selectedUser._id],myId:localStorage._id},{headers:{'Authorization':'Bearer '+ localStorage.token}}).then(r=>{
      dispatch(setMessages(r.data.messages))
      console.log(r.data);
      socket.emit('join chat', r.data.roomId)
      navigate(`/chat/${r.data.roomId}`)
    })
  
  }

  const filterFriends = (friends) =>{
    const data = friends.filter(item=>item._id!==localStorage._id)
    console.log(data);
    return data
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{
              marginRight: 5,
              ...(open && { display: 'none' }),
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Mini variant drawer
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" open={open}>
        <DrawerHeader>
            <ChatListHeader/>
            <IconButton onClick={handleDrawerClose}>
              {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
        </DrawerHeader>
        <Divider />
        <Box padding={2}>
        <StyledInput placeholder="Search ..." value={search} onChange={(e)=>setSearch(e.target.value)}/>
        <Box>
        <List>
          {searchResults&&searchResults.map((item) => (
            <ListItem key={item._id} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                onClick={()=>selectChatFromSearch(item)}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                <StyledBadge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  variant="dot"
                >
                  <Avatar/>
                </StyledBadge>
                </ListItemIcon>
                      <ListItemText sx={{ opacity: open ? 1 : 0 }}>
                        {item.fullname}
                      </ListItemText>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        </Box>
        </Box>
        <List>
          {state&&state.map((item) => (
            <ListItem key={item._id} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                onClick={()=>selectChat(item.users)}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                <StyledBadge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  variant="dot"
                >
                  <Avatar/>
                </StyledBadge>
                </ListItemIcon>
                {
                  filterFriends(item.users).map(user=>{
                    return(
                      <ListItemText sx={{ opacity: open ? 1 : 0 }} key={user._id}>
                        {user.fullname}
                      </ListItemText>
                    )
                  }) 
                }
                
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <DrawerHeader />
        {children}
      </Box>
    </Box>
  );
}
