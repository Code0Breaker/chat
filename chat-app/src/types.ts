import {SignalData} from "simple-peer";

export interface ILogin {
    email: string
    password: string
}

export interface IRegister extends ILogin {
    phone: string
    fullname: string
}

export interface IUser {
    _id: string;
    fullname: string;
    email: string;
    isAdmin: boolean;
    password: string;
    pic: string;
}

export interface IMessage {
    content: string
    created_at: string
    isWatched: boolean
    sender_id: string
    updated_at: string
    user: IUser
    _id: string
}

export interface IChat {
    _id: string
    chatName: string | null;
    created_at: string;
    isGroupChat: boolean;
    updated_at: string;
    users?: IUser[];
    messages?: IMessage[];
}

export interface IPeerSignalMessage {
    peerData: SignalData;
    roomId: string;
    from: {
        name: string;
        id: string;
    };
}

export interface OutletCallContextType {
    peerData: SignalData|null;
}