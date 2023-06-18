import { create } from 'zustand'
import { IMessage } from '../types'

interface Store {
    messages: IMessage[] | null,
    unreadMessages: any[] | null,
    setMessages: (state: IMessage[]) => void,
    addToMessages: (state: IMessage) => void,
    setUnreadMessages: (state: IMessage[]) => void
    addToUnreadMessages: (state: IMessage) => void
    removeUnreadById: (state: string[]) => void
}

export const useStore = create<Store>((set) => ({
    messages: null,
    unreadMessages: null,
    setMessages: (newState) => set(() => ({ messages: newState })),
    addToMessages: (newState) => set((state) => ({ messages: [...state.messages as IMessage[], newState] })),
    setUnreadMessages: (newState) => set(() => ({ unreadMessages: newState })),
    addToUnreadMessages: (newState) => set((state) => ({ unreadMessages: [...state.unreadMessages as IMessage[], newState] })),
    removeUnreadById: (newState) => set((state) => {
        const filteredItems = state.unreadMessages?.filter(item => !newState.includes(item._id));
        return { unreadMessages: filteredItems }
    })
}))