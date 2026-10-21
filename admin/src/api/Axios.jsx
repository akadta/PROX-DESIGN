import axios from "axios";
import { getToken, clearToken } from "../utils/auth"; // adjust path to where you put this

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = getToken(); // ✅ checks both localStorage AND sessionStorage

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken(); // ✅ removes from both storages
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

export default api;
