import { create } from "zustand";
import { IMessage, IUser } from "../types";

interface Store {
  // Core chat state
  messages: IMessage[] | null;
  unreadMessages: any[] | null;
  search: string;
  searchData: IUser[] | null;


  // Core chat setters
  setMessages: (state: IMessage[]) => void;
  addToMessages: (state: IMessage) => void;
  setUnreadMessages: (state: IMessage[]) => void;
  addToUnreadMessages: (state: IMessage) => void;
  addToSearchData: (state: IUser[] | null) => void;
  removeUnreadById: (state: string[]) => void;
  setSearch: (state: string) => void;

  
}



export const useStore = create<Store>((set, get) => ({
  // Core chat state
  messages: null,
  unreadMessages: null,
  search: "",
  searchData: null,


  // Core chat setters
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
  addToSearchData: (newState) => set(() => ({ searchData: newState })),
  setSearch: (newState) => set(() => ({ search: newState })),
  removeUnreadById: (newState) =>
    set((state) => {
      const filteredItems = state.unreadMessages?.filter(
        (item) => !newState.includes(item._id)
      );
      return { unreadMessages: filteredItems };
    }),


}));
