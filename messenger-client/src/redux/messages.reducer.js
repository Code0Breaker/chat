import { createSlice } from "@reduxjs/toolkit";

export const messages = createSlice({
    name:'messages',
    initialState:{
        messages:[]
    },
    reducers:{
        setMessages:(state, action)=>{
            state.messages = action.payload
        },
        setNewMessage:(state, action)=>{
            state.messages.push(action.payload)
        },
    }
})

export const {setMessages, setNewMessage} = messages.actions