import { IChat, IMessage } from "../types"
import { base_url } from "./baseUrl"

export const getContacts = async (): Promise<IChat[]> => {
    const { data } = await base_url.get('chat/getAllRooms' )
    return data
}

export const getChat = async (roomId:string): Promise<IChat> => {
    const { data } = await base_url.get(`chat/getChat/${roomId}`)
    return data
}

export const selectChat = async (selectedRoom: string): Promise<IChat> => {
    const { data } = await base_url.get('chat/getMessages/' + selectedRoom)
    return data
}

export const sendMessage = async (id: string, content: string) => {
    const { data } = await base_url.post('messages', { chatId: id, content, myId: localStorage._id })
    return data
}

export const getUnreadMessages = async():Promise<IMessage[]>=>{
    const { data } = await base_url.get(`messages/${localStorage._id}`)
    return data
}

export const chancgeUnwatchStatus = async(ids:string[]) =>{
    const { data } = await base_url.patch(`messages`, {ids})
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