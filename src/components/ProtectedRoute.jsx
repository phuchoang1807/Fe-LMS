import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

function ProtectedRoute({ children }) {
  const { token } = useContext(AuthContext);

  if (!token) {
    console.log("⛔ Không có token, redirect về /login");
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
