// src/services/authService.js
import api from "./api";

// Đăng nhập
export const login = async (credentials) => {
  // ✅ KHÔNG thêm /api ở đây, vì baseURL đã có /api rồi
  const response = await api.post("/auth/login", credentials);
  return response.data; // { token, role, fullName, id }
};

// Đăng ký
export const register = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

// Quên mật khẩu
export const forgotPassword = async (data) => {
  const response = await api.post("/auth/forgot-password", data);
  return response.data;
};

// Xác thực email
export const verifyEmail = async (token) => {
  const response = await api.get(`/auth/verify?token=${token}`);
  return response.data;
};

// Đặt lại mật khẩu
export const resetPassword = async (data) => {
  const response = await api.post("/auth/reset-password", data);
  return response.data;
};
