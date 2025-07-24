import axios from "axios";

export const url = import.meta.env.VITE_APP_SERVER_URL
// VITE_APP_DEV_URL
// VITE_APP_SERVER_URL
export const base_url = axios.create({
    baseURL: url,
    withCredentials: true
})

// Add request interceptor to include JWT token from localStorage
base_url.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle auth errors
base_url.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear auth data and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('fullname');
            localStorage.removeItem('pic');
            localStorage.removeItem('_id');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

