// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Khởi tạo từ localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (e) {
        console.error("Lỗi parse user từ localStorage:", e);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  }, []);

  const loginUser = (data) => {
    // data phải là { token, role, fullName, id, status }
    if (!data || !data.token) {
      console.error("loginUser: dữ liệu login không hợp lệ:", data);
      throw new Error("LOGIN_DATA_INVALID");
    }

    const userPayload = {
      id: data.id,
      fullName: data.fullName,
      role: data.role,
      status: data.status, // ⭐ quan trọng để AccountLockedModal đọc
    };

    // Lưu token + user
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(userPayload));

    api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;

    setUser(userPayload);
    setIsAuthenticated(true);
  };

  const logoutUser = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loginUser,
        logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
