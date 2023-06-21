import { IChat, IMessage } from "../types"
import { base_url } from "./baseUrl"

export const getContacts = async (): Promise<IChat[]> => {
    const { data } = await base_url.post('chat/getAllRooms', { _id: localStorage._id }, { headers: { 'Authorization': 'Bearer ' + localStorage.token } })
    return data
}

export const selectChat = async (selectedRoom: string): Promise<IChat> => {
    const { data } = await base_url.get('chat/getMessages/' + selectedRoom, { headers: { 'Authorization': 'Bearer ' + localStorage.token } })
    return data
}

export const sendMessage = async (id: string, content: string) => {
    const { data } = await base_url.post('messages', { chatId: id, content, myId: localStorage._id }, { headers: { 'Authorization': 'Bearer ' + localStorage.token } })
    return data
}

export const getUnreadMessages = async():Promise<IMessage[]>=>{
    const { data } = await base_url.get(`messages/${localStorage._id}`, { headers: { 'Authorization': 'Bearer ' + localStorage.token } })
    return data
}

export const chancgeUnwatchStatus = async(ids:string[]) =>{
    const { data } = await base_url.patch(`messages`, {ids},{ headers: { 'Authorization': 'Bearer ' + localStorage.token } })
    return data
}

export const createRoom = async(selectedId:string)=>{
    const {data} = await base_url.post('/chat/create-room',{_id: [selectedId], myId:localStorage._id})
    return data
}

export const chatSearch = async(text:string)=>{
    const {data} = await base_url.post('/chat/search',{text})
    return data
}