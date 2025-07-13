import axios from "axios";

// export const url = import.meta.env.VITE_APP_SERVER_URL

// VITE_APP_DEV_URL
// VITE_APP_SERVER_URL
export const url = {
    baseURL: import.meta.env.VITE_APP_SERVER_URL,
}

export const base_url = axios.create(url)


export const authrised_url = axios.create(url)

authrised_url.interceptors.request.use((conf) => {
    const token = localStorage.getItem('token')
    conf.headers.Authorization = `Bearer ${token}`
    return conf
})