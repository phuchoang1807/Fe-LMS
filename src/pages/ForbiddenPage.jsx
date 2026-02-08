// src/pages/ForbiddenPage.jsx
import React from "react";
import { Link } from "react-router-dom";
import "../styles/style.css"; // Đảm bảo import CSS chung nếu cần

const ForbiddenPage = () => {
  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#f3f4f6",
      color: "#1f2937",
      fontFamily: "Inter, sans-serif"
    }}>
      <div style={{
        fontSize: "6rem",
        fontWeight: "900",
        color: "#ef4444",
        marginBottom: "1rem"
      }}>
        403
      </div>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Truy cập bị từ chối</h1>
      <p style={{ color: "#6b7280", marginBottom: "2rem", textAlign: "center", maxWidth: "500px" }}>
        Bạn không có quyền truy cập vào trang này. Nếu bạn cho rằng đây là một lỗi, vui lòng liên hệ với quản trị viên.
      </p>
      <Link to="/" style={{
        padding: "10px 24px",
        backgroundColor: "#2563eb",
        color: "white",
        borderRadius: "8px",
        textDecoration: "none",
        fontWeight: "600",
        transition: "background 0.2s"
      }}>
        Quay về Trang chủ
      </Link>
    </div>
  );
};

export default ForbiddenPage;