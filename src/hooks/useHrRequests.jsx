// src/hooks/useHrRequests.jsx
import { useState, useEffect } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

export default function useHrRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchHRRequests = async () => {


    try {
      const res = await api.get("/hr-request");

      setRequests(res.data);
    } catch (err) {
      console.error("❌ Lỗi khi fetch HR Requests:", err);

      // Nếu server trả 401 hoặc 403 → token hết hạn hoặc không hợp lệ
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHRRequests();
  }, []);

  return { requests, loading, refetch: fetchHRRequests };
}