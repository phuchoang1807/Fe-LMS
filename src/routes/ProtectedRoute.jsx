// src/routes/ProtectedRoute.jsx  (hoặc src/components/ProtectedRoute.jsx tùy bạn)
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  // 1. Chưa đăng nhập → đá về login
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }} // để sau này có thể quay lại trang cũ
      />
    );
  }

  // 2. Nếu KHÔNG truyền allowedRoles -> mặc định: chỉ cần login là vào được
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    return children;
  }

  // 3. Có truyền allowedRoles -> kiểm tra role
  //    Chuẩn project backend của bạn: user.role là string: 'SUPER_ADMIN' | 'HR' | ...
  const userRole = user.role || user.roleName || user.authorities?.[0]?.authority;

  if (!userRole || !allowedRoles.includes(userRole)) {
    // Không có quyền
    return <Navigate to="/forbidden" replace />;
  }

  // 4. Có quyền → render children
  return children;
}
