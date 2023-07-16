import axios from "axios";

export const url = import.meta.env.VITE_APP_SERVER_URL
// VITE_APP_DEV_URL
// VITE_APP_SERVER_URL
export const base_url = axios.create({
    baseURL:url
})