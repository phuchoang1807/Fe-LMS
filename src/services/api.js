import axios from "axios";

// Vite: DEV = khi chạy npm run dev
// PROD = khi build/deploy
const isDev = import.meta.env.DEV;

// Nếu bạn set env VITE_API_BASE_URL trên Render thì lấy ở đây
// Ví dụ giá trị: https://ten-backend.onrender.com
const apiBaseFromEnv = import.meta.env.VITE_API_BASE_URL;

// Tự chọn base URL theo môi trường
const baseURL = isDev
  ? "http://localhost:8080/api"
  : `${apiBaseFromEnv || ""}/api`;

  export const API_BASE_URL = baseURL;

const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Attach JWT token nếu có
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
