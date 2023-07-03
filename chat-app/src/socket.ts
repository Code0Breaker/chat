import {connect} from "socket.io-client";
export const socket = connect(import.meta.env.VITE_APP_DEV_URL);