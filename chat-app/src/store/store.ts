import { create } from "zustand";
import { IMessage, IUser, CallerData } from "../types";

interface CallParticipant {
  id: string;
  name: string;
  stream?: MediaStream;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  connectionQuality: 'good' | 'fair' | 'poor';
}

interface CallHistoryEntry {
  id: string;
  roomId: string;
  participants: string[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
  callType: 'video' | 'audio';
  status: 'completed' | 'missed' | 'rejected' | 'failed';
}

interface CallState {
  isActive: boolean;
  isConnecting: boolean;
  isIncoming: boolean;
  roomId: string | null;
  participants: CallParticipant[];
  startTime: Date | null;
  duration: number;
  callType: 'video' | 'audio';
  localStream: MediaStream | null;
  remoteStreams: MediaStream[];
  error: string | null;
  networkQuality: 'good' | 'fair' | 'poor';
}

interface Store {
  // Existing state
  messages: IMessage[] | null;
  unreadMessages: any[] | null;
  search: string;
  searchData: IUser[] | null;
  stream: null | MediaStream;
  usersStream: MediaStream[] | null;
  peerConnection: any;

  // Enhanced call state
  callState: CallState;
  callHistory: CallHistoryEntry[];
  devicePermissions: {
    camera: boolean;
    microphone: boolean;
    screen: boolean;
  };
  callSettings: {
    autoAnswer: boolean;
    audioOnly: boolean;
    enableEchoCancellation: boolean;
    enableNoiseSuppression: boolean;
    preferredQuality: 'low' | 'medium' | 'high';
  };

  // Existing setters
  setUsersStream: (state: MediaStream) => void;
  setPeerConnection: (state: any) => void;
  setStream: (state: MediaStream) => void;
  setMessages: (state: IMessage[]) => void;
  addToMessages: (state: IMessage) => void;
  setUnreadMessages: (state: IMessage[]) => void;
  addToUnreadMessages: (state: IMessage) => void;
  addToSearchData: (state: IUser[] | null) => void;
  removeUnreadById: (state: string[]) => void;
  setSearch: (state: string) => void;

  // Enhanced call actions
  initializeCall: (roomId: string, callType: 'video' | 'audio') => void;
  acceptCall: (roomId: string) => void;
  rejectCall: (roomId: string) => void;
  endCall: () => void;
  setCallConnecting: (isConnecting: boolean) => void;
  setCallActive: (isActive: boolean) => void;
  setCallError: (error: string | null) => void;
  updateCallDuration: (duration: number) => void;
  setNetworkQuality: (quality: 'good' | 'fair' | 'poor') => void;
  
  // Device management
  setDevicePermissions: (permissions: Partial<{ camera: boolean; microphone: boolean; screen: boolean }>) => void;
  
  // Settings
  updateCallSettings: (settings: Partial<Store['callSettings']>) => void;
  
  // Call history
  addCallToHistory: (call: Omit<CallHistoryEntry, 'id'>) => void;
  clearCallHistory: () => void;
  
  // Stream management
  setLocalStream: (stream: MediaStream | null) => void;
  addRemoteStream: (stream: MediaStream) => void;
  removeRemoteStream: (stream: MediaStream) => void;
  clearRemoteStreams: () => void;

  incomingCall: boolean;
  caller: CallerData | null;
  setIncomingCall: (incoming: boolean) => void;
  setCaller: (caller: CallerData | null) => void;
}

export const userMediaStream = new BroadcastChannel('userMediaStream');

const initialCallState: CallState = {
  isActive: false,
  isConnecting: false,
  isIncoming: false,
  roomId: null,
  participants: [],
  startTime: null,
  duration: 0,
  callType: 'video',
  localStream: null,
  remoteStreams: [],
  error: null,
  networkQuality: 'good'
};

export const useStore = create<Store>((set, get) => ({
  // Existing state
  messages: null,
  unreadMessages: null,
  search: "",
  searchData: null,
  stream: null,
  usersStream: null,
  peerConnection: null,

  // Enhanced call state
  callState: initialCallState,
  callHistory: [],
  devicePermissions: {
    camera: false,
    microphone: false,
    screen: false
  },
  callSettings: {
    autoAnswer: false,
    audioOnly: false,
    enableEchoCancellation: true,
    enableNoiseSuppression: true,
    preferredQuality: 'medium'
  },

  // Existing setters
  setUsersStream: (stream) => set((state) => ({
    usersStream: Array.isArray(state.usersStream) ? [...state.usersStream, stream] : [stream]
  })),
  setPeerConnection: (peerConnection) => set(() => ({ peerConnection })),
  setStream: (stream) => set(() => ({ stream })),
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

  // Enhanced call actions
  initializeCall: (roomId, callType) => set((state) => ({
    callState: {
      ...state.callState,
      isActive: false,
      isConnecting: true,
      isIncoming: false,
      roomId,
      callType,
      startTime: new Date(),
      error: null
    }
  })),

  acceptCall: (roomId) => set((state) => ({
    callState: {
      ...state.callState,
      isActive: true,
      isConnecting: true,
      isIncoming: false,
      roomId,
      startTime: new Date(),
      error: null
    }
  })),

  rejectCall: (roomId) => {
    const state = get();
    // Add to call history
    state.addCallToHistory({
      roomId,
      participants: [],
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      callType: state.callState.callType,
      status: 'rejected'
    });
    
    set(() => ({
      callState: initialCallState
    }));
  },

  endCall: () => {
    const state = get();
    const callState = state.callState;
    
    if (callState.startTime) {
      const endTime = new Date();
      const duration = endTime.getTime() - callState.startTime.getTime();
      
      // Add to call history
      state.addCallToHistory({
        roomId: callState.roomId || '',
        participants: callState.participants.map(p => p.id),
        startTime: callState.startTime,
        endTime,
        duration,
        callType: callState.callType,
        status: 'completed'
      });
    }
    
    // Clean up streams
    if (callState.localStream) {
      callState.localStream.getTracks().forEach(track => track.stop());
    }
    
    set(() => ({
      callState: initialCallState
    }));
  },

  setCallConnecting: (isConnecting) => set((state) => ({
    callState: { ...state.callState, isConnecting }
  })),

  setCallActive: (isActive) => set((state) => ({
    callState: { ...state.callState, isActive, isConnecting: false }
  })),

  setCallError: (error) => set((state) => ({
    callState: { ...state.callState, error }
  })),

  updateCallDuration: (duration) => set((state) => ({
    callState: { ...state.callState, duration }
  })),

  setNetworkQuality: (networkQuality) => set((state) => ({
    callState: { ...state.callState, networkQuality }
  })),

  // Device management
  setDevicePermissions: (permissions) => set((state) => ({
    devicePermissions: { ...state.devicePermissions, ...permissions }
  })),

  // Settings
  updateCallSettings: (settings) => set((state) => ({
    callSettings: { ...state.callSettings, ...settings }
  })),

  // Call history
  addCallToHistory: (call) => set((state) => ({
    callHistory: [
      ...state.callHistory,
      { ...call, id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }
    ]
  })),

  clearCallHistory: () => set(() => ({ callHistory: [] })),

  // Stream management
  setLocalStream: (localStream) => set((state) => ({
    callState: { ...state.callState, localStream }
  })),

  addRemoteStream: (stream) => set((state) => ({
    callState: {
      ...state.callState,
      remoteStreams: [...state.callState.remoteStreams, stream]
    }
  })),

  removeRemoteStream: (stream) => set((state) => ({
    callState: {
      ...state.callState,
      remoteStreams: state.callState.remoteStreams.filter(s => s.id !== stream.id)
    }
  })),

  clearRemoteStreams: () => set((state) => ({
    callState: { ...state.callState, remoteStreams: [] }
  })),

  incomingCall: false,
  caller: null,
  setIncomingCall: (incoming) => set(() => ({ incomingCall: incoming })),
  setCaller: (caller) => set(() => ({ caller })),
}));
