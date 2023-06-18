import axios from "axios";

export const base_url = axios.create({
    baseURL:import.meta.env.VITE_APP_SERVER_URL
})