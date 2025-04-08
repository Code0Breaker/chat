import {connect} from "socket.io-client";
import {url} from "./apis/baseUrl";

export const socket = connect(url, {
    auth: {
        token: `Bearer ${localStorage.getItem("token")}`,
    }
});