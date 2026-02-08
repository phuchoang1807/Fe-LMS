// src/pages/TrainingManagementPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import { BookOpenCheck } from "lucide-react";

// 🔹 NEW: Trợ lý AI
import AIAssistantBubble from "../components/AIAssistantBubble";

import Layout from "../components/Layout";
import Pagination from "../components/Pagination";
import ActionButtons from "../components/ActionButtons.jsx";
import EditTrainingModal from "../components/EditTrainingModal";
import { FiSearch } from "react-icons/fi";
import "../styles/toast.css";
import "../styles/training.css";

// --- STATUS HELPER ---
const getStatusClass = (status) => {
  switch (status) {
    case "Đang thực tập": return "status-intern";
    case "Đã hoàn thành": return "status-completed";
    case "Đã dừng thực tập": return "status-stopped";
    default: return "status-unknown";
  }
};

const getStatusLabel = (status) => status || "Đang thực tập";

export default function TrainingManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [trainings, setTrainings] = useState([]);
  const [courses, setCourses] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  const [searchInput, setSearchInput] = useState(searchParams.get("name") || "");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("name") || "");
  const [internStatusFilter, setInternStatusFilter] = useState(searchParams.get("status") || "");
  const [planFilter, setPlanFilter] = useState(searchParams.get("plan") || "");

  const [planOptions, setPlanOptions] = useState([]);

  // Modal
  const [editingTraining, setEditingTraining] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), 2500);
  };

  // === FETCH DATA ===
  const fetchTrainings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/trainings");
      setTrainings(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Lỗi tải danh sách đào tạo:", e);
      setError("Không tải được danh sách đào tạo");
    } finally {
      setLoading(false);
    }
  };

  // LẤY DANH SÁCH MÔN THEO display_order
  const fetchCourses = async () => {
    try {
      const res = await api.get("/courses"); 
      const sortedCourses = Array.isArray(res.data) ? res.data : [];
      setCourses(sortedCourses);
    } catch (e) {
      console.error("Lỗi tải danh sách môn học:", e);
      setCourses([]);
    }
  };

  // 🔹 FIX LỖI AI: Chuẩn hóa dữ liệu Plan
  const fetchPlans = async () => {
    try {
      const res = await api.get("/recruitment-plans/approved");
      const rawData = Array.isArray(res.data) ? res.data : [];
      
      // Map lại dữ liệu để đảm bảo luôn có field 'name' cho AI đọc
      const normalizedPlans = rawData.map(plan => ({
        ...plan,
        id: plan.id ?? plan.planId,
        // AI thường tìm field .name, nếu API trả về planName thì AI sẽ không thấy
        name: plan.name || plan.planName || "Kế hoạch không tên" 
      }));

      setPlanOptions(normalizedPlans);
    } catch (e) {
      console.error("Lỗi tải kế hoạch tuyển dụng:", e);
    }
  };

  useEffect(() => {
    fetchTrainings();
    fetchCourses();
    fetchPlans();
  }, []);

  // === URL PARAMS ===
  const updateSearchParams = ({ name, status, plan, page }) => {
    const newParams = {
      ...Object.fromEntries([...searchParams]),
      ...(name !== undefined ? { name } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(plan !== undefined ? { plan } : {}),
      ...(page !== undefined ? { page } : {}),
    };
    Object.keys(newParams).forEach(key => newParams[key] === "" && delete newParams[key]);
    setSearchParams(newParams);
  };

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput);
      updateSearchParams({ name: searchInput, page: 1 });
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // === FILTERED DATA ===
  const filteredTrainings = useMemo(() => 
    trainings.filter((t) => {
      const keyword = searchTerm.trim().toLowerCase();
      if (keyword) {
        const name = (t.traineeName || t.fullName || t.name || "").toLowerCase();
        const email = (t.email || "").toLowerCase();
        const phone = (t.phoneNumber || t.phone || "").toLowerCase();
        if (!name.includes(keyword) && !email.includes(keyword) && !phone.includes(keyword)) return false;
      }
      if (internStatusFilter && !String(t.internStatus || "").includes(internStatusFilter)) return false;
      if (planFilter) {
        const planId = t.recruitmentPlan?.recruitmentPlanId ?? t.recruitmentPlanId;
        if (String(planId) !== planFilter) return false;
      }
      return true;
    }), [trainings, searchTerm, internStatusFilter, planFilter]
  );

  const totalPages = Math.ceil(filteredTrainings.length / itemsPerPage) || 1;
  const currentTrainings = filteredTrainings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const headerSubjects = courses;

  // === HANDLERS ===
  const handleChangeItemsPerPage = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
    updateSearchParams({ page: 1 });
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentPage(page);
      updateSearchParams({ page });
      setIsAnimating(false);
    }, 180);
  };

  const handleViewTraining = async (training) => {
    try {
      const res = await api.get(`/trainings/${training.internId}`);
      setEditingTraining(res.data);
      setIsViewOnly(true);
      setIsEditModalOpen(true);
    } catch (err) {
      showToast("Lỗi tải chi tiết thực tập sinh!", "error");
    }
  };

  const handleEditTraining = async (training) => {
    try {
      const res = await api.get(`/trainings/${training.internId}`);
      setEditingTraining(res.data);
      setIsViewOnly(false);
      setIsEditModalOpen(true);
    } catch (err) {
      showToast("Lỗi tải chi tiết thực tập sinh!", "error");
    }
  };

  const handleSaveTraining = (updatedTraining) => {
    setTrainings(prev => 
      prev.map(t => t.internId === updatedTraining.internId ? updatedTraining : t)
    );
    showToast("Cập nhật thành công!");
  };

  // === SYNC URL PARAMS ===
  useEffect(() => {
    const urlName = searchParams.get("name") || "";
    const urlStatus = searchParams.get("status") || "";
    const urlPlan = searchParams.get("plan") || "";
    const urlPage = Number(searchParams.get("page")) || 1;

    setSearchInput(urlName);
    setSearchTerm(urlName);
    setInternStatusFilter(urlStatus);
    setPlanFilter(urlPlan);
    setCurrentPage(urlPage);
  }, [searchParams]);

  return (
    <Layout>
      {/* BREADCRUMB */}
      <div className="breadcrumb-container fade-slide">
        <div className="breadcrumb-left">
          <span className="breadcrumb-icon"><BookOpenCheck size={20}/></span>
          <span className="breadcrumb-item">Đào tạo</span>
          <span className="breadcrumb-separator">&gt;</span>
          <span className="breadcrumb-current">Quản lý đào tạo</span>
        </div>
      </div>

      <div className="training-page fade-slide">
        <div className="title-row">
          <h2 className="page-title-small">Quản lý đào tạo</h2>

          <div className="filter-bar candidate-filter-bar">
            <div className="filter-item">
              <input
                type="text"
                className="filter-input"
                placeholder="Tìm theo tên..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <span className="filter-icon">
                <FiSearch />
              </span>
            </div>

            <div className="filter-item">
              <select
                className="filter-select"
                value={internStatusFilter}
                onChange={(e) => {
                  setInternStatusFilter(e.target.value);
                  setCurrentPage(1);
                  updateSearchParams({ status: e.target.value, page: 1 });
                }}
              >
                <option value="">Chọn trạng thái</option>
                <option value="Đang thực tập">Đang thực tập</option>
                <option value="Đã hoàn thành">Đã hoàn thành</option>
                <option value="Đã dừng thực tập">Đã dừng thực tập</option>
              </select>
            </div>

            <div className="filter-item">
              <select
                className="filter-select candidate-plan-select"
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value);
                  setCurrentPage(1);
                  updateSearchParams({ plan: e.target.value, page: 1 });
                }}
              >
                <option value="">Chọn kế hoạch tuyển dụng</option>
                {planOptions.map((plan) => (
                  <option key={plan.id} value={String(plan.id)}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className={`table-container table-fade ${isAnimating ? "fade-out" : "fade-in"}`}>
          {loading ? (
            <p className="loading-text">Đang tải dữ liệu...</p>
          ) : error ? (
            <p className="text-center text-error">{error}</p>
          ) : (
            <div className="training-table-container">
              {/* Cột trái */}
              <table className="training-table-fixed-left">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Họ tên</th>
                    <th>Số ngày thực tập</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTrainings.map((t, i) => (
                    <tr key={t.internId}>
                      <td>{(currentPage - 1) * itemsPerPage + i + 1}</td>
                      <td>{t.traineeName || t.fullName || "Không rõ"}</td>
                      <td>{t.trainingDays ?? "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Bảng giữa */}
              <div className="training-table-scroll">
                <table>
                  <thead>
                    <tr>
                      {headerSubjects.map((course) => (
                        <th key={course.courseId}>{course.courseName}</th>
                      ))}
                      {headerSubjects.length === 0 && <th>Chưa có môn học</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {currentTrainings.map((t) => (
                      <tr key={t.internId}>
                        {headerSubjects.map((course) => {
                          const score = (t.scores || []).find(s => s.courseName === course.courseName);
                          const display = score?.totalScore != null 
                            ? Number(score.totalScore).toFixed(2) 
                            : "N/A";
                          return <td key={course.courseId}>{display}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cột phải */}
              <table className="training-table-fixed-right">
                <thead>
                  <tr>
                    <th>Tổng kết</th>
                    <th>Đánh giá team</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTrainings.map((t) => (
                    <tr key={t.internId}>
                      <td>{t.summaryResult != null ? Number(t.summaryResult).toFixed(2) : "N/A"}</td>
                      <td>{t.teamReview || "Chưa có"}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(t.internStatus)}`}>
                          {getStatusLabel(t.internStatus)}
                        </span>
                      </td>
                      <td>
                        <ActionButtons
                          onView={() => handleViewTraining(t)}
                          onEdit={() => handleEditTraining(t)}
                          canEdit={t.internStatus !== "Đã dừng thực tập" && t.internStatus !== "Đã hoàn thành"}
                          showBanOnDisabled={true}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredTrainings.length > 0 && (
          <div className="pagination-bar">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            <div className="mini-pagination">
              <label className="mini-pagination-label">Hiển thị:</label>
              <select value={itemsPerPage} onChange={handleChangeItemsPerPage} className="mini-pagination-select">
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {isEditModalOpen && editingTraining && (
        <EditTrainingModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          trainingData={editingTraining}
          onSave={handleSaveTraining}
          isViewOnly={isViewOnly}
        />
      )}

      {/* TOAST */}
      {toast && (
        <div className={`toast-container ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
          {toast.msg}
        </div>
      )}

      {/* 🔹 TRỢ LÝ AI (Nhận dữ liệu đã chuẩn hóa) */}
      <AIAssistantBubble
        trainings={trainings}
        planOptions={planOptions}
        courseOrder={courses}
      />
      
    </Layout>
  );
}