// src/pages/TrainingPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Layout from "../components/Layout";
import FloatingAssistant from "../components/AIAssistantBubble"; // 👈 thêm dòng này
import "../styles/training.css"; // css riêng của trang, nếu có

export default function TrainingPage() {
  const [interns, setInterns] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/training");
        setInterns(res.data);
      } catch (err) {
        console.error("Lỗi load training:", err);
      }
    };
    fetchData();
  }, []);

  const filteredInterns = useMemo(() => {
    return interns.filter((item) => {
      const matchName =
        !searchKeyword ||
        item.name?.toLowerCase().includes(searchKeyword.toLowerCase());
      const matchStatus =
        !statusFilter || item.status === statusFilter;
      const matchPlan =
        !planFilter || String(item.recruitmentPlanId) === String(planFilter);
      return matchName && matchStatus && matchPlan;
    });
  }, [interns, searchKeyword, statusFilter, planFilter]);

  const totalInterns = filteredInterns.length;

  return (
    <Layout>
      {/* phần nội dung trang như cũ */}
      <div className="training-page">
        {/* ... breadcrumb, filters, table ... */}
      </div>

      {/* 👇 Trợ lý AI nổi, luôn hiện trên trang đào tạo */}
      <FloatingAssistant totalInterns={totalInterns} />
    </Layout>
  );
}
