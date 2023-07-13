import { create } from "zustand";
import { IMessage, IUser } from "../types";

interface Store {
  messages: IMessage[] | null;
  unreadMessages: any[] | null;
  search: string;
  searchData: IUser[] | null;
  stream:null|MediaStream;
  usersStream:MediaStream[]|null
  setUsersStream:(state:MediaStream)=>void
  peerConnection:any;
  setPeerConnection:(state:any)=>void;
  setSearch: (state: string) => void;
  setMessages: (state: IMessage[]) => void;
  addToMessages: (state: IMessage) => void;
  setUnreadMessages: (state: IMessage[]) => void;
  addToUnreadMessages: (state: IMessage) => void;
  addToSearchData:(state:IUser[]|null)=>void
  removeUnreadById: (state: string[]) => void;
  setStream:(state:MediaStream)=>void
}

export const useStore = create<Store>((set) => ({
  messages: null,
  unreadMessages: null,
  search: "",
  searchData: null,
  stream:null,
  usersStream:null,
  setUsersStream:(stream)=>set((state)=>({
    usersStream:Array.isArray(state.usersStream)?[...state.usersStream,stream]:[stream]
  })),
  setPeerConnection:(peerConnection)=>set(()=>({peerConnection})),
  peerConnection:null,
  setStream: (stream) => set(()=>({stream})),
  setMessages: (newState) => set(() => ({ messages: newState })),
  addToMessages: (newState) =>
    set((state) => ({
      messages: [...(state.messages as IMessage[]), newState],
    })),
  setUnreadMessages: (newState) => set(() => ({ unreadMessages: newState })),
  addToUnreadMessages: (newState) =>
    set((state) => ({
      unreadMessages: [...(state.unreadMessages as IMessage[]), newState],
    })),
  addToSearchData: (newState)=>set(()=>({searchData:newState})),
  setSearch: (newState) => set(() => ({ search: newState })),
  removeUnreadById: (newState) =>
    set((state) => {
      const filteredItems = state.unreadMessages?.filter(
        (item) => !newState.includes(item._id)
      );
      return { unreadMessages: filteredItems };
    }),
}));
