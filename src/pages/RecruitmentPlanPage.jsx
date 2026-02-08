// src/pages/RecruitmentPlanPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "../components/Layout";
import Pagination from "../components/Pagination";
import ActionButtons from "../components/ActionButtons.jsx";
import AddPlanModal from "../components/AddPlanModal";
import DatePicker from "../components/DatePicker";
import Modal from "../components/Modal";
import { useAuth } from "../contexts/AuthContext"; // ✅ 1. Import AuthContext
import "../styles/plan.css";
import { HiUserGroup } from "react-icons/hi";
import { FiSearch } from "react-icons/fi";

const formatDate = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("vi-VN");
};

const getStatusLabel = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "NEW": return "Mới tạo";
    case "FAILED": return "Thất bại";
    case "CONFIRMED": return "Đã xác nhận";
    case "REJECTED": return "Bị từ chối";
    case "COMPLETED": return "Đã hoàn thành";
    default: return status || "Không rõ";
  }
};

const getStatusClass = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "NEW": return "status-new";
    case "CONFIRMED": return "status-confirmed";
    case "FAILED": return "status-failed";
    case "REJECTED": return "status-rejected";
    case "COMPLETED": return "status-completed";
    default: return "status-unknown";
  }
};

const derivePlanStatus = (plan = {}, meta = {}) => {
  const base = String(plan.status || "").toUpperCase();
  if (base === "FAILED" || base === "FAILURE") return "FAILED";

  const techRows = plan.request?.quantityCandidates || [];
  const outputRequired = techRows.reduce((sum, qc) => sum + (qc.soLuong || 0), 0);

  const handoverCount = meta.handoverCount ?? meta.deliveredCount ?? plan.handoverCount ?? plan.deliveredCount ?? 0;
  const hasRejectReason = !!(meta.requestRejectReason || plan.requestRejectReason || "")?.trim();

  if (base === "COMPLETED" && outputRequired > 0 && handoverCount < outputRequired && hasRejectReason) {
    return "FAILED";
  }
  return base;
};

const getSenderName = (plan) => {
  if (!plan) return "Không rõ";
  const status = (plan.status || "").toUpperCase();
  const createdByName = plan.request?.createdBy?.fullName || plan.request?.createdByName || plan.createdByName || "";
  const rejectedByName = plan.rejectedByName || "";

  if (status === "REJECTED" || status === "CANCELED") {
    return rejectedByName || createdByName || "Không rõ";
  }
  return createdByName || "Không rõ";
};

const buildFullPlanName = (shortName) => {
  const trimmed = (shortName || "").trim();
  if (!trimmed) return "";
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return `Kế hoạch tuyển dụng ${trimmed} tháng ${month}, ${year}`;
};

const parseRejectReason = (raw) => {
  if (!raw) return { by: "", reason: "" };
  const nameLabel1 = "Người từ chối kế hoạch:";
  const nameLabel2 = "Người từ chối nhu cầu:";
  const reasonLabel = "Lý do:";

  let by = "";
  let reason = raw.trim();
  const reasonIdx = raw.indexOf(reasonLabel);
  if (reasonIdx !== -1) {
    reason = raw.slice(reasonIdx + reasonLabel.length).trim();
  }
  const nameIdx = raw.indexOf(nameLabel1) !== -1 ? raw.indexOf(nameLabel1) : raw.indexOf(nameLabel2);

  if (nameIdx !== -1) {
    const endIdx = reasonIdx === -1 ? raw.length : reasonIdx;
    const namePart = raw.slice(nameIdx + (raw.indexOf(nameLabel1) !== -1 ? nameLabel1.length : nameLabel2.length), endIdx);
    by = namePart.replace(/[.\s]+$/g, "").trim();
  }
  return { by, reason };
};

const INITIAL_PLAN_META = {
  deliveredCount: null,
  requestStatus: null,
  requestRejectReason: "",
  candidateCount: 0,
  candidatePassedCount: 0,
  trainingCount: 0,
  handoverCount: 0,
};

const RecruitmentPlanPage = () => {
  const { user } = useAuth(); 
  const role = user?.role;    

  // ✅ PHÂN QUYỀN LOGIC:

  // 1. Tạo mới: Chỉ Admin và HR (QLDT không tạo).
  const canCreate = role === "SUPER_ADMIN" || role === "HR";

  // 2. Tương tác (Xem/Sửa): Admin, QLDT, HR được click. (LEAD bị cấm click).
  const canInteract = role !== "LEAD";

  // 3. Duyệt/Từ chối (Modal): Admin và QLDT.
  // HR được tạo nhưng không được tự duyệt.
  const canApproveReject = role === "SUPER_ADMIN" || role === "QLDT";

  const [selectedDate, setSelectedDate] = useState(null);
  const [plans, setPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [searchName, setSearchName] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isAnimating, setIsAnimating] = useState(false);

  const [openAddModal, setOpenAddModal] = useState(false);
  const [techSummary, setTechSummary] = useState([]);
  const [requestTitle, setRequestTitle] = useState("");
  const [modalMode, setModalMode] = useState("select");
  const [requestOptions, setRequestOptions] = useState([]);

  const [form, setForm] = useState({ requestId: undefined, planName: "", status: "NEW", recruitmentDeadline: "", deliveryDeadline: "", note: "" });

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [modalStep, setModalStep] = useState(0);
  const [rejectReason, setRejectReason] = useState("");
  const [planMeta, setPlanMeta] = useState(INITIAL_PLAN_META);
    const [pendingPlanName, setPendingPlanName] = useState("");

  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const axiosAuth = axios.create({ baseURL: "http://localhost:8080", headers: { Authorization: `Bearer ${token}` } });

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await axiosAuth.get("/api/recruitment-plans");
      const enrichedPlans = await Promise.all(
        (res.data || []).map(async (plan) => {
          const planId = plan.recruitmentPlanId;
          const requestId = plan.request?.requestId;
          let handoverCount = plan.handoverCount ?? plan.deliveredCount ?? planMeta.handoverCount;
          let requestRejectReason = plan.requestRejectReason || "";

          try {
            if (planId) {
              const deliveredRes = await axiosAuth.get("/api/trainings/delivered-count-by-plan", { params: { planId } });
              handoverCount = typeof deliveredRes.data === "number" ? deliveredRes.data : Number(deliveredRes.data ?? handoverCount) || handoverCount;
            }
            if (requestId) {
              const hrReqRes = await axiosAuth.get(`/api/hr-request/${requestId}`);
              requestRejectReason = hrReqRes.data?.rejectReason || requestRejectReason;
            }
          } catch (e) {
            console.warn("⚠️ Không thể tải meta cho kế hoạch", planId, e);
          }

          const derivedStatus = derivePlanStatus(plan, { ...planMeta, handoverCount, deliveredCount: handoverCount, requestRejectReason });
          return { ...plan, status: derivedStatus };
        })
      );
      setPlans(enrichedPlans);
      setFilteredPlans(enrichedPlans);
      setError(null);
    } catch {
      setError("❌ Không thể tải danh sách kế hoạch tuyển dụng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const paramsForSearch = new URLSearchParams(location.search);
    const planNameFromUrl = paramsForSearch.get("planName");
    if (planNameFromUrl) setSearchName(planNameFromUrl);
    if (!token) {
      setError("⚠️ Bạn chưa đăng nhập hoặc token đã hết hạn");
      setLoading(false);
      return;
    }
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (location.state?.planName) {
      setPendingPlanName(location.state.planName);
    }
  }, [location.state]);

  useEffect(() => {
    if (!pendingPlanName || !plans.length) return;

    const matchedPlan = plans.find(
      (plan) => (plan.planName || "").toLowerCase() === pendingPlanName.toLowerCase()
    );

    if (matchedPlan) {
      setSelectedPlan(matchedPlan);
      setModalStep(1);
      setSearchName(pendingPlanName);
    }

    setPendingPlanName("");
  }, [pendingPlanName, plans]);

  const handleOpenCandidateManagement = useCallback(() => {
    if (!selectedPlan?.recruitmentPlanId) return;
    const planId = selectedPlan.recruitmentPlanId;
    const planName = selectedPlan.planName ? encodeURIComponent(selectedPlan.planName) : "";
    const query = [`planId=${planId}`];
    if (planName) query.push(`planName=${planName}`);
    navigate(`/recruitment/candidates?${query.join("&")}`);
    setModalStep(0); setSelectedPlan(null); setRejectReason(""); setPlanMeta(INITIAL_PLAN_META);
  }, [navigate, selectedPlan]);

  const handleOpenTrainingManagement = useCallback(() => {
    if (!selectedPlan?.recruitmentPlanId) return;
    const planId = selectedPlan.recruitmentPlanId;
    const planName = selectedPlan.planName ? encodeURIComponent(selectedPlan.planName) : "";
    const query = [`planId=${planId}`];
    if (planName) query.push(`planName=${planName}`);
    navigate(`/training?${query.join("&")}`);
    setModalStep(0); setSelectedPlan(null); setRejectReason(""); setPlanMeta(INITIAL_PLAN_META);
  }, [navigate, selectedPlan]);

  useEffect(() => {
    if (!selectedPlan || modalStep !== 1) {
      setPlanMeta(INITIAL_PLAN_META);
      return;
    }
    const fetchMeta = async () => {
      try {
        const planId = selectedPlan.recruitmentPlanId;
        const requestId = selectedPlan.request?.requestId;
        const requests = [];
        if (planId) {
          requests.push(axiosAuth.get("/api/trainings/delivered-count-by-plan", { params: { planId } }));
          requests.push(axiosAuth.get("/api/candidates", { params: { planId } }));
          requests.push(axiosAuth.get("/api/trainings/count-by-plan", { params: { planId } }));
        } else {
          requests.push(Promise.resolve({ data: null }), Promise.resolve({ data: [] }), Promise.resolve({ data: 0 }));
        }
        if (requestId) requests.push(axiosAuth.get(`/api/hr-request/${requestId}`));
        else requests.push(Promise.resolve({ data: null }));

        const [deliveredRes, candidatesRes, trainingCountRes, hrReqRes] = await Promise.all(requests);
        const deliveredCount = typeof deliveredRes.data === "number" ? deliveredRes.data : Number(deliveredRes.data ?? 0) || 0;
        const candidateList = Array.isArray(candidatesRes.data) ? candidatesRes.data : [];
        const candidateCount = candidateList.length;
        const candidatePassedCount = candidateList.filter(candidate => typeof candidate.status === "string" && candidate.status.trim().toLowerCase() === "đã nhận việc").length;
        const trainingCount = typeof trainingCountRes.data === "number" ? trainingCountRes.data : Number(trainingCountRes.data ?? 0) || 0;
        const hrReq = hrReqRes.data || null;

        setPlanMeta({ deliveredCount, handoverCount: deliveredCount, candidateCount, candidatePassedCount, trainingCount, requestStatus: hrReq?.status || null, requestRejectReason: hrReq?.rejectReason || "" });
      } catch (e) {
        console.error("Không thể tải meta cho timeline kế hoạch:", e);
        setPlanMeta((prev) => ({ ...prev }));
      }
    };
    fetchMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlan, modalStep]);

  useEffect(() => {
    if (!selectedPlan) return;
    const derived = derivePlanStatus(selectedPlan, planMeta);
    const current = String(selectedPlan.status || "").toUpperCase();
    if (derived && derived !== current) {
      const updatedPlan = { ...selectedPlan, status: derived };
      setSelectedPlan(updatedPlan);
      setPlans((prev) => prev.map((p) => p.recruitmentPlanId === updatedPlan.recruitmentPlanId ? { ...p, status: derived } : p));
      setFilteredPlans((prev) => prev.map((p) => p.recruitmentPlanId === updatedPlan.recruitmentPlanId ? { ...p, status: derived } : p));
    }
  }, [planMeta, selectedPlan]);

  useEffect(() => {
    let filtered = [...plans];
    if (searchName.trim()) filtered = filtered.filter((p) => (p.planName || "").toLowerCase().includes(searchName.toLowerCase()));
    if (statusFilter) filtered = filtered.filter((p) => derivePlanStatus(p) === statusFilter);
    if (selectedDate?.value) {
      const createdFilter = new Date(selectedDate.value);
      const filterMode = selectedDate.filterMode || "day";
      const selectedDay = createdFilter.getDate();
      const selectedMonth = selectedDate.displayMonth ?? createdFilter.getMonth();
      const selectedYear = selectedDate.displayYear ?? createdFilter.getFullYear();

      filtered = filtered.filter((p) => {
        const created = p.createdAt ? new Date(p.createdAt) : null;
        if (!created) return false;
        if (filterMode === "day") return created.getDate() === selectedDay && created.getMonth() === selectedMonth && created.getFullYear() === selectedYear;
        else if (filterMode === "month") return created.getMonth() === selectedMonth && created.getFullYear() === selectedYear;
        else if (filterMode === "year") return created.getFullYear() === selectedYear;
        return true;
      });
    }
    setFilteredPlans(filtered);
    setCurrentPage(1);
  }, [searchName, statusFilter, selectedDate, plans]);

  const filteredSorted = [...filteredPlans].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

  const totalPages = Math.ceil(filteredSorted.length / itemsPerPage) || 1;
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentPlans = filteredSorted.slice(indexOfFirst, indexOfLast);

  const handleChangeItemsPerPage = (e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); };
  const handlePageChange = (p) => {
    if (p < 1 || p > totalPages) return;
    setIsAnimating(true);
    setTimeout(() => { setCurrentPage(p); setIsAnimating(false); }, 180);
  };

  const openEmptyAddModal = async () => {
    setForm({ requestId: undefined, planName: "", status: "NEW", recruitmentDeadline: "", deliveryDeadline: "", note: "" });
    setTechSummary([]); setRequestTitle(""); setModalMode("select");
    try {
      const res = await axiosAuth.get("/api/hr-request");
      const opts = (res.data || [])
        .filter((r) => String(r.status || "").toUpperCase() === "NEW")
        .map((r) => ({ id: r.requestId, title: r.requestTitle }))
        .sort((a, b) => a.title.localeCompare(b.title));
      setRequestOptions(opts);
    } catch { setRequestOptions([]); }
    setOpenAddModal(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reqId = params.get("requestId");
    if (reqId) {
      openEmptyAddModal();
      setForm((f) => ({ ...f, requestId: reqId }));
      handlePickRequest(reqId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handlePickRequest = async (id) => {
    if (!id) {
      setForm((f) => ({ ...f, requestId: undefined, recruitmentDeadline: "", deliveryDeadline: "" }));
      setTechSummary([]); setRequestTitle(""); return;
    }
    try {
      const res = await axiosAuth.get(`/api/hr-request/${id}/plan-defaults`);
      const d = res.data;
      setForm({ requestId: d.requestId, planName: "", status: d.status || "NEW", recruitmentDeadline: d.recruitmentDeadline || "", deliveryDeadline: d.deliveryDeadline || "", note: d.note || "" });
      setRequestTitle(d.suggestedPlanName || d.requestTitle || "");
      setTechSummary(d.techQuantities || []);
    } catch {
      setForm((f) => ({ ...f, requestId: undefined, recruitmentDeadline: "", deliveryDeadline: "" }));
      setTechSummary([]); setRequestTitle("");
    }
  };

  const submitPlan = async () => {
    try {
      if (!form.requestId) { alert("⚠️ Vui lòng chọn nhu cầu trước khi tạo kế hoạch."); return; }
      if (!form.planName || !form.recruitmentDeadline || !form.deliveryDeadline) { alert("⚠️ Vui lòng nhập tên kế hoạch và thời hạn."); return; }
      const fullPlanName = buildFullPlanName(form.planName);
      const payload = { ...form, planName: fullPlanName };
      await axiosAuth.post("/api/recruitment-plans", payload);
      const requestStatus = String(form.status || "").toUpperCase();
      if (requestStatus === "NEW") {
        try {
          await axiosAuth.put(`/api/hr-request/${form.requestId}/approve`, { params: { note: "" } });
        } catch (err) {
          console.error("Không thể cập nhật trạng thái nhu cầu:", err);
        }
      }
      window.dispatchEvent(new Event("hr:requests:changed"));
      setOpenAddModal(false);
      await loadPlans();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Lỗi không xác định";
      alert(`⚠️ Không thể tạo kế hoạch: ${msg}`);
    }
  };

  const handleViewDetails = (plan) => { setSelectedPlan(plan); setModalStep(1); };

  const handleApprove = async () => {
    if (!selectedPlan) return;
    const planId = selectedPlan.recruitmentPlanId;
    try {
      const res = await axiosAuth.put(`/api/recruitment-plans/${planId}/confirm`);
      const updated = res.data;
      setPlans((prev) => prev.map((p) => (p.recruitmentPlanId === planId ? updated : p)));
      setFilteredPlans((prev) => prev.map((p) => (p.recruitmentPlanId === planId ? updated : p)));
      setSelectedPlan(updated);
      window.dispatchEvent(new Event("hr:requests:changed"));
    } catch (error) { console.error("Lỗi khi phê duyệt kế hoạch:", error); }
  };

  const handleStartReject = () => { setModalStep(3); setRejectReason(""); };
  const handleCloseModal = () => { setModalStep(0); setSelectedPlan(null); setRejectReason(""); setPlanMeta(INITIAL_PLAN_META); };

  const handleSubmitRejection = async () => {
    if (!selectedPlan) return;
    const planId = selectedPlan.recruitmentPlanId;
    if (!planId || !rejectReason.trim()) { alert("Lý do từ chối không được để trống."); return; }
    try {
      const formattedReason = `Kế hoạch tuyển dụng: ${rejectReason.trim()}`;
      const res = await axiosAuth.post(`/api/recruitment-plans/${planId}/reject`, { rejectionReason: formattedReason });
      const updated = res.data;
      setPlans((prev) => prev.map((p) => (p.recruitmentPlanId === planId ? updated : p)));
      setFilteredPlans((prev) => prev.map((p) => (p.recruitmentPlanId === planId ? updated : p)));
      setSelectedPlan(updated);
      window.dispatchEvent(new Event("hr:requests:changed"));
      handleCloseModal();
    } catch (error) { console.error("Lỗi khi từ chối:", error); }
  };

  const planProgressSteps = useMemo(() => {
    if (!selectedPlan) return [];
    const plan = selectedPlan;
    const planStatus = derivePlanStatus(plan, planMeta);
    const planName = plan.planName || "Kế hoạch tuyển dụng";
    const planLabel = planName || "Kế hoạch tuyển dụng";
    const createdBy = plan.createdBy?.fullName || plan.createdByName || plan.request?.createdBy?.fullName || plan.request?.createdByName || "Không rõ";
    const approverName = plan.confirmedByName || plan.updatedByName || "Người phê duyệt";
    const rejectActor = plan.rejectedByName || approverName || createdBy || "Không rõ";
    const techRows = plan.request?.quantityCandidates || [];
    const outputRequired = techRows.reduce((sum, qc) => sum + (qc.soLuong || 0), 0);
    const statusRaw = (planMeta.requestStatus || "").toUpperCase();
    const parsedReject = parseRejectReason(planMeta.requestRejectReason || "");
    
    const trainingCount = planMeta.trainingCount != null ? planMeta.trainingCount : 0;
    const handoverCount = planMeta.handoverCount != null ? planMeta.handoverCount : planMeta.deliveredCount != null ? planMeta.deliveredCount : 0;
    const hasRejectReason = !!(parsedReject.reason || planMeta.requestRejectReason);

    const steps = [
      { key: "plan-approve", title: "Phê duyệt kế hoạch", status: "pending", actor: createdBy, detail: `Chờ phê duyệt "${planLabel}" để triển khai tuyển dụng` },
      { key: "candidate", title: "Quản lý ứng viên", status: "pending", actor: "Chưa thực hiện", detail: "Chờ kế hoạch được duyệt trước khi quản lý ứng viên" },
      { key: "training", title: "Đào tạo", status: "pending", actor: "Chưa thực hiện", detail: "Chờ ứng viên đạt yêu cầu để đưa vào đào tạo" },
      { key: "handover", title: "Bàn giao nhân sự", status: "pending", actor: "Chưa thực hiện", detail: "Chờ bàn giao nhân sự" },
    ];

    if (planStatus === "CONFIRMED" || planStatus === "COMPLETED" || planStatus === "FAILED") {
      steps[0] = { ...steps[0], status: "success", actor: approverName || createdBy, detail: `"${planLabel}" đã được phê duyệt` };
    } else if (planStatus === "REJECTED" || planStatus === "CANCELED") {
      const reason = plan.note && plan.note.trim().length > 0 ? plan.note.trim() : "Không có lý do cụ thể được ghi lại.";
      steps[0] = { ...steps[0], status: "rejected", actor: rejectActor, detail: reason, rejectReason: reason };
      steps[1] = { ...steps[1], detail: "Kế hoạch đã bị từ chối, không thực hiện quản lý ứng viên." };
      steps[2] = { ...steps[2], detail: "Kế hoạch đã bị từ chối, không tổ chức đào tạo." };
      steps[3] = { ...steps[3], detail: "Kế hoạch đã bị từ chối, không bàn giao nhân sự." };
      return steps;
    }

    if (planStatus !== "NEW") {
      const candidatePassedCount = planMeta.candidatePassedCount != null ? planMeta.candidatePassedCount : 0;
      const baseActorCandidate = steps[1].actor && steps[1].actor !== "Chưa thực hiện" ? steps[1].actor : createdBy;
      const candidateLinkDisabled = candidatePassedCount <= 0;
      const detail = (
        <div className="timeline-desc-stack">
          <span>Số lượng ứng viên ứng tuyển: {candidatePassedCount}/{outputRequired}</span>
          {selectedPlan?.recruitmentPlanId && (
            <button
              type="button"
              className={`timeline-link ${candidateLinkDisabled ? "disabled" : ""}`}
              disabled={candidateLinkDisabled}
              onClick={handleOpenCandidateManagement}
            >
              Xem kết quả tuyển dụng
            </button>
          )}
        </div>
      );
      steps[1] = { ...steps[1], actor: baseActorCandidate, detail, status: candidatePassedCount > 0 ? "success" : "pending" };
    }

    // ===== ĐÀO TẠO =====
if (planStatus !== "NEW") {
  const baseActorTraining =
    steps[2].actor && steps[2].actor !== "Chưa thực hiện"
      ? steps[2].actor
      : createdBy;

  const trainingLinkDisabled = trainingCount <= 0;

  const detail = (
    <div className="timeline-desc-stack">
      <span>Số lượng TTS tham gia đào tạo: {trainingCount}</span>

      {selectedPlan?.recruitmentPlanId && (
        <button
          type="button"
          className={`timeline-link ${
            trainingLinkDisabled ? "disabled" : ""
          }`}
          disabled={trainingLinkDisabled}
          onClick={handleOpenTrainingManagement}
        >
          Xem kết quả đào tạo
        </button>
      )}
    </div>
  );

  steps[2] = {
    ...steps[2],
    actor: baseActorTraining,
    detail,
    status: trainingCount > 0 ? "success" : "pending",
  };
}


    if (outputRequired > 0) {
      const baseActorHandover = steps[3].actor && steps[3].actor !== "Chưa thực hiện" ? steps[3].actor : createdBy;
      const isFailure = planStatus === "FAILED" || (hasRejectReason && statusRaw === "COMPLETED" && (handoverCount || 0) < outputRequired);
      if (planStatus === "COMPLETED" && !hasRejectReason && handoverCount >= outputRequired) {
        steps[3] = { ...steps[3], status: "success", actor: baseActorHandover, detail: `Đã bàn giao ${handoverCount} nhân sự` };
      } else if (isFailure || (planStatus === "COMPLETED" && hasRejectReason)) {
        const baseDetail = handoverCount > 0 ? `Chỉ bàn giao được ${handoverCount}/${outputRequired} nhân sự` : `Không bàn giao được nhân sự nào (0/${outputRequired}).`;
        const rejectText = parsedReject.reason || planMeta.requestRejectReason || "Không có thực tập sinh nào đạt yêu cầu để bàn giao.";
        steps[3] = { ...steps[3], status: "rejected", actor: baseActorHandover, detail: baseDetail, rejectReason: rejectText };
      } else {
        const text = handoverCount > 0 ? `Đã bàn giao ${handoverCount} nhân sự` : "Đã bàn giao 0 nhân sự";
        steps[3] = { ...steps[3], status: "pending", actor: baseActorHandover, detail: text };
      }
    }

    return steps;
  }, [selectedPlan, planMeta, handleOpenCandidateManagement, handleOpenTrainingManagement]);

  const renderPlanDetails = (plan, showStatus = false) => {
    if (!plan) return null;
    const request = plan.request;
    if (!request) return <p className="error-text">Lỗi: Kế hoạch này thiếu thông tin nhu cầu (request).</p>;
    const techRows = request.quantityCandidates || [];
    const derivedStatus = derivePlanStatus(plan, planMeta);

    return (
      <div className="detail-list">
        <div className="detail-item"><span className="detail-label">Tên nhu cầu:</span><span className="detail-value">{request.requestTitle}</span></div>
        <div className="detail-item"><span className="detail-label">Tên kế hoạch:</span><span className="detail-value">{plan.planName}</span></div>
        <table className="tech-table">
          <thead><tr><th>Công nghệ</th><th className="text-center">Đầu ra (SL)</th><th className="text-center">Đầu vào (SL)</th></tr></thead>
          <tbody>
            {techRows.length > 0 ? techRows.map((qc) => (<tr key={qc.technology.id}><td>{qc.technology.name}</td><td className="text-center">{qc.soLuong}</td><td className="text-center">{qc.soLuong * 2}</td></tr>)) : <tr><td colSpan="3" className="text-center">Không có thông tin công nghệ.</td></tr>}
          </tbody>
        </table>
        <div className="detail-item"><span className="detail-label">Thời hạn tuyển dụng:</span><span className="detail-value">{formatDate(plan.recruitmentDeadline)}</span></div>
        <div className="detail-item"><span className="detail-label">Thời hạn bàn giao:</span><span className="detail-value">{formatDate(plan.deliveryDeadline)}</span></div>
        {showStatus && (<div className="detail-item"><span className="detail-label">Trạng thái:</span><span className={`detail-value ${getStatusClass(derivedStatus)}`}>{getStatusLabel(derivedStatus)}</span></div>)}
      </div>
    );
  };

  const derivedPlanStatus = selectedPlan ? derivePlanStatus(selectedPlan, planMeta) : "";
  const planStatusLabel = getStatusLabel(derivedPlanStatus);
  const planStatusClass = getStatusClass(derivedPlanStatus);

  return (
    <Layout>
      <div className="breadcrumb-container fade-slide">
        <div className="breadcrumb-left"><span className="breadcrumb-icon"><HiUserGroup /></span><span className="breadcrumb-item">Tuyển dụng</span><span className="breadcrumb-separator">&gt;</span><span className="breadcrumb-current">Kế hoạch tuyển dụng</span></div>
      </div>

      <div className="recruitment-page fade-slide">
        <div className="title-row">
          <h2 className="page-title-small">Kế hoạch tuyển dụng</h2>
          <div className="filter-bar">
            <div className="filter-item"><input type="text" className="filter-input" placeholder="Tìm theo tên..." value={searchName} onChange={(e) => setSearchName(e.target.value)} /><span className="filter-icon"><FiSearch /></span></div>
            <div className="filter-item">
              <select className="filter-select smooth-dropdown" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Chọn trạng thái</option><option value="NEW">Mới tạo</option><option value="CONFIRMED">Đã xác nhận</option><option value="FAILED">Thất bại</option><option value="REJECTED">Bị từ chối</option><option value="COMPLETED">Đã hoàn thành</option>
              </select>
            </div>
            <div className="filter-item"><DatePicker selectedDate={selectedDate} onDateChange={setSelectedDate} /></div>
            <div style={{ flex: 1 }}></div>
            
            {/* ✅ Nút Thêm: Chỉ HR và Admin */}
            {canCreate && (
              <div className="filter-item add-btn-wrapper">
                <button className="add-plan-btn modern-add" onClick={openEmptyAddModal}>＋ Thêm kế hoạch tuyển dụng</button>
              </div>
            )}
          </div>
        </div>

        <div className={`table-container ${isAnimating ? "fade-out" : "fade-in"}`}>
          {loading ? <p className="loading-text">Đang tải dữ liệu...</p> : error ? <p className="error-text">{error}</p> : (
            <table className="styled-table">
              <thead><tr><th>STT</th><th>Tên kế hoạch</th><th>Ngày tạo</th><th>Trạng thái</th><th>Người gửi</th><th>Hành động</th></tr></thead>
              <tbody>
                {currentPlans.length === 0 ? <tr><td colSpan="6" className="text-center">Không có dữ liệu</td></tr> : currentPlans.map((plan, index) => {
                  const rowStatus = derivePlanStatus(plan);
                  return (
                    <tr key={plan.recruitmentPlanId || index}>
                      <td>{indexOfFirst + index + 1}</td><td>{plan.planName}</td><td>{plan.createdAt ? formatDate(plan.createdAt) : "—"}</td>
                      <td><span className={`status-badge ${getStatusClass(rowStatus)}`}>{getStatusLabel(rowStatus)}</span></td>
                      <td>{getSenderName(plan)}</td>
                      <td className="actions-cell text-center">
                        <div style={!canInteract ? { pointerEvents: "none", opacity: 0.4, cursor: "not-allowed" } : {}} title={!canInteract ? "Bạn không có quyền thao tác" : ""}>
                          <ActionButtons 
                             onView={() => handleViewDetails(plan)} 
                             // ✅ HR & Admin được sửa khi kế hoạch Mới
                             onEdit={() => {}} 
                             canEdit={(role === 'HR' || role === 'SUPER_ADMIN') && plan.status === 'NEW'}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {filteredSorted.length > 0 && (
          <div className="pagination-bar">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            <div className="mini-pagination"><label className="mini-pagination-label">Hiển thị:</label><select value={itemsPerPage} onChange={handleChangeItemsPerPage} className="mini-pagination-select"><option value={10}>10</option><option value={15}>15</option><option value={20}>20</option></select></div>
          </div>
        )}
      </div>

      <AddPlanModal open={openAddModal} onClose={() => setOpenAddModal(false)} form={form} onChange={setForm} onSubmit={submitPlan} techSummary={techSummary} requestTitle={requestTitle} mode={modalMode} requestOptions={requestOptions} onPickRequest={handlePickRequest} />

      {modalStep === 1 && selectedPlan && (
        <Modal title="Chi tiết Kế hoạch tuyển dụng" subtitle={<span className={`status-badge ${planStatusClass}`}>{planStatusLabel}</span>} onClose={handleCloseModal} width={640}>
          {renderPlanDetails(selectedPlan, false)}
          <div className="section-block progress-block">
            <div className="process-header"><h4 className="process-title">Quy trình thực hiện</h4><span className="process-sub">Tuân theo thứ tự bước (có thể xem người thực hiện và lý do)</span></div>
            <div className="process-timeline" role="list">
              {planProgressSteps.map((step, idx) => {
                const isLast = idx === planProgressSteps.length - 1;
                const statusClass = step.status === "success" ? "timeline-success" : step.status === "rejected" ? "timeline-rejected" : "timeline-pending";
                const statusText = step.status === "success" ? "Đã hoàn thành" : step.status === "rejected" ? "Thất bại" : "Đang chờ";
                return (
                  <div key={step.key} className={`timeline-item ${statusClass}`} role="listitem" aria-label={step.title}>
                    <div className="timeline-marker" aria-hidden><span className="timeline-icon">{step.status === "success" && "✓"}{step.status === "pending" && "•"}{step.status === "rejected" && "✕"}</span>{!isLast && <span className="timeline-connector" />}</div>
                    <div className="timeline-content">
                      <div className="timeline-title-row"><div className="timeline-title">{step.title}</div><span className={`timeline-badge ${statusClass}`}>{statusText}</span></div>
                      <div className="timeline-desc">{step.detail}</div>
                      {step.status === "rejected" && (<div className="timeline-reject-reason"><span className="reject-label-inline">Lý do:</span><span className="reject-text-inline">{step.rejectReason || step.detail || "Không rõ lý do"}</span></div>)}
                      {step.key === "plan-approve" && (<div className="timeline-meta">Người thực hiện: {step.actor}</div>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ✅ Logic nút duyệt/từ chối: Chỉ Admin và QLDT */}
          {selectedPlan.status === "NEW" ? (
            canApproveReject ? (
              <div className="modal-footer modal-footer-actions">
                <button className="modal-btn btn-reject" onClick={handleStartReject}>Từ chối</button>
                <button className="modal-btn btn-approve btn-approve-green" onClick={handleApprove}>Phê duyệt</button>
              </div>
            ) : (
                <div className="modal-footer justify-end">
                    <button className="modal-btn btn-secondary" onClick={handleCloseModal}>Đóng</button>
                </div>
            )
          ) : selectedPlan.status === "CANCELED" || selectedPlan.status === "REJECTED" ? (
            <div className="rejection-card">
              <p className="rejection-title">LÝ DO KẾ HOẠCH BỊ {selectedPlan.status === "CANCELED" ? "HỦY" : "TỪ CHỐI"}:</p>
              <p className="rejection-reason-text">{selectedPlan.note || "Không có lý do cụ thể được ghi lại."}</p>
              <div className="modal-footer justify-end" />
            </div>
          ) : (
            <div className="modal-footer justify-center only-view-footer">
              <p className="only-view-text">Kế hoạch đang ở trạng thái "{getStatusLabel(selectedPlan.status)}". Chỉ có thể xem.</p>
            </div>
          )}
        </Modal>
      )}

      {modalStep === 3 && selectedPlan && (
        <Modal title="Lý do Từ chối Kế hoạch" onClose={handleCloseModal} width={520}>
          <div className="reject-form">
            <label htmlFor="rejectReason" className="reject-label">Vui lòng nhập lý do từ chối kế hoạch: <span className="reject-plan-name">"{selectedPlan.planName}"</span></label>
            <textarea id="rejectReason" className="reject-textarea" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Nhập lý do cụ thể..." />
          </div>
          <div className="modal-footer modal-footer-actions">
            <button className="modal-btn btn-secondary" onClick={handleCloseModal}>Hủy</button>
            <button className="modal-btn btn-reject" onClick={handleSubmitRejection} disabled={!rejectReason.trim()}>Xác nhận từ chối</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
};

export default RecruitmentPlanPage;