import { useState } from "react";
import api from "../services/api";

export default function useUpdateRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = async (id, data) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post(`/hr-request/update/${id}`, data);
      return { success: true, message: res.data?.message || "Cập nhật thành công" };
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Lỗi khi cập nhật yêu cầu";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  return { update, loading, error };
}
