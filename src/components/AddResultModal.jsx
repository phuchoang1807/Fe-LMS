// src/components/AddResultModal.jsx
import React, { useState, useEffect, useMemo } from "react";
import Input from "./Form/Input";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import "../styles/AddResultModal.css";

// ✅ Helper functions
const getPlanName = (candidate) => {
  if (!candidate) return "—";
  return candidate.recruitmentPlanName || "Không rõ kế hoạch";
};

const formatDateTimeLocal = (isoString) => {
  if (!isoString) return "";
  try {
    if (isoString.length === 16 && isoString.indexOf("T") === 10) return isoString;
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
};

const initialState = {
  // Thông tin ứng viên
  fullName: "",
  email: "",
  phoneNumber: "",
  cvLink: "",
  interviewDate: "",
  planId: "",

  // Kết quả
  attendedInterview: "NO",
  testScore: "",
  interviewScore: "",
  comment: "",
  finalResult: "Không đạt",
  candidateStatus: "Chưa có kết quả",
  note: "",
  internshipDate: "",
};

export default function AddResultModal({ isOpen, onClose, onSuccess, candidate }) {
  const { user } = useAuth();
  const role = user?.role;

  // ✅ QUYỀN HẠN
  const isViewOnlyMode = role === "LEAD";
  const canEditInfo = role === "SUPER_ADMIN" || role === "HR";
  const canEditScore = role === "SUPER_ADMIN" || role === "QLDT";

  const getAvailableStatuses = () => {
    if (isViewOnlyMode) return [];

    const allStatuses = [
      "Chưa có kết quả",
      "Đã có kết quả",
      "Đã gửi mail cảm ơn",
      "Đã hẹn ngày thực tập",
      "Không nhận việc",
      "Đã nhận việc"
    ];

    if (role === "SUPER_ADMIN") return allStatuses;
    if (role === "QLDT") return ["Đã có kết quả", "Đã nhận việc", "Không nhận việc"];
    if (role === "HR") return ["Chưa có kết quả", "Đã gửi mail cảm ơn", "Đã hẹn ngày thực tập"];

    return [];
  };

  const availableStatuses = getAvailableStatuses();

  // State
  const [formData, setFormData] = useState(initialState);
  const [planOptions, setPlanOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [errors, setErrors] = useState({});
  const [isFirstTime, setIsFirstTime] = useState(true);
  
  // --- LOGIC KHÓA FORM ---
  const isLockedByFinalStatus = candidate?.status === "Đã nhận việc";
  const isLockedByAttendance = formData.attendedInterview === "NO";
  
  // 1. Khóa Dropdown "Có đến phỏng vấn?":
  const isAttendanceSelectLocked = isViewOnlyMode || isLockedByFinalStatus || !canEditScore;

  // 2. Khóa các ô Điểm:
  const isResultLocked = isAttendanceSelectLocked || isLockedByAttendance;

  // 3. Khóa Info (bao gồm Plan):
  const isInfoLocked = isViewOnlyMode || isLockedByFinalStatus || !canEditInfo;

  // 4. Khóa Status:
  const isStatusLocked = isViewOnlyMode || isLockedByFinalStatus;

  // --- LOAD DANH SÁCH KẾ HOẠCH (Cho HR sửa) ---
  useEffect(() => {
    if (isOpen && canEditInfo) {
      api.get("/recruitment-plans/approved")
        .then(res => setPlanOptions(res.data || []))
        .catch(err => console.error("Lỗi tải kế hoạch:", err));
    }
  }, [isOpen, canEditInfo]);

  // --- NẠP DỮ LIỆU ---
  useEffect(() => {
    if (isOpen && candidate) {
      setErrors({});
      const baseData = {
        fullName: candidate.fullName || "",
        email: candidate.email || "",
        phoneNumber: candidate.phoneNumber || candidate.phone || "",
        cvLink: candidate.cvLink || "",
        interviewDate: formatDateTimeLocal(candidate.interviewDate),
        planId: candidate.recruitmentPlanId || "",
      };

      if (candidate.finalResult && candidate.finalResult !== "NA") {
        setIsFirstTime(false);
        setFormData({
          ...baseData,
          attendedInterview: candidate.attendedInterview || initialState.attendedInterview,
          testScore: candidate.testScore ?? "",
          interviewScore: candidate.interviewScore ?? "",
          comment: candidate.comment || "",
          finalResult: candidate.finalResult || initialState.finalResult,
          candidateStatus: candidate.status || "Đã có kết quả",
          note: candidate.note || "",
          internshipDate: "",
        });
      } else {
        setIsFirstTime(true);
        setFormData({
          ...initialState,
          ...baseData,
        });
      }
      setApiError(null);
    }
  }, [isOpen, candidate]);

  // --- VALIDATE ---
  const validateForm = () => {
    const newErrors = {};
    const { fullName, email, phoneNumber, cvLink, interviewDate } = formData;

    if (!fullName.trim()) newErrors.fullName = "Họ và tên không được để trống.";
    
    if (!email.trim()) newErrors.email = "Email không được để trống.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Email không đúng định dạng.";

    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneNumber.trim()) newErrors.phoneNumber = "SĐT không được để trống.";
    else if (!phoneRegex.test(phoneNumber)) newErrors.phoneNumber = "SĐT phải là 10 chữ số bắt đầu bằng 0.";

    if (!cvLink.trim()) newErrors.cvLink = "Link CV không được để trống.";
    else {
        const urlRegex = /^(https?:\/\/)[^\s$.?#].[^\s]*$/i;
        if (!urlRegex.test(cvLink)) newErrors.cvLink = "Link CV phải bắt đầu bằng http:// hoặc https://";
    }

    if (!interviewDate) newErrors.interviewDate = "Thời gian hẹn phỏng vấn không được để trống.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- AUTO GRADING ---
  useEffect(() => {
    if (isResultLocked) return;

    if (formData.testScore !== "" && formData.interviewScore !== "") {
        const test = Number(formData.testScore);
        const interview = Number(formData.interviewScore);

        if (!isNaN(test) && !isNaN(interview)) {
             if (test >= 70 && interview >= 7) {
                 setFormData((prev) => ({ ...prev, finalResult: "Đạt" }));
             } else {
                 setFormData((prev) => ({ ...prev, finalResult: "Không đạt" }));
             }
        }
    }
  }, [formData.testScore, formData.interviewScore, isResultLocked]);

  // --- RESET KHI CHỌN "KHÔNG ĐẾN" ---
  useEffect(() => {
    if (isLockedByAttendance && !isLockedByFinalStatus && canEditScore && !isViewOnlyMode) {
      setFormData((prev) => ({
        ...prev,
        testScore: "",
        interviewScore: "",
        comment: "",
        finalResult: "Không đạt",
        candidateStatus: "Chưa có kết quả"
      }));
    }
  }, [isLockedByAttendance, isLockedByFinalStatus, canEditScore, isViewOnlyMode]);

  const canSetResultStatus = useMemo(() => {
    return (
      (formData.testScore !== "" && formData.testScore !== null) &&
      (formData.interviewScore !== "" && formData.interviewScore !== null) &&
      (formData.finalResult === "Đạt" || formData.finalResult === "Không đạt")
    );
  }, [formData.testScore, formData.interviewScore, formData.finalResult]);


  // ✅ LOGIC QUYẾT ĐỊNH HIỂN THỊ SECTION TRẠNG THÁI
  const shouldShowStatusSection = useMemo(() => {
    // 1. Nếu đang xem chi tiết (LEAD) hoặc đã chốt kết quả -> Phải hiện để người ta xem
    if (isViewOnlyMode || isLockedByFinalStatus) return true;

    // 2. Nếu chọn "Không đến" phỏng vấn -> Hiện luôn để set trạng thái hủy/fail
    if (formData.attendedInterview === "NO") return true;

    // 3. Nếu chọn "Có đến" -> CHỈ HIỆN KHI ĐÃ CÓ ĐỦ ĐIỂM
    const hasTestScore = formData.testScore !== "" && formData.testScore !== null;
    const hasInterviewScore = formData.interviewScore !== "" && formData.interviewScore !== null;
    
    return hasTestScore && hasInterviewScore;
  }, [isViewOnlyMode, isLockedByFinalStatus, formData.attendedInterview, formData.testScore, formData.interviewScore]);


  // --- AUTO STATUS UPDATE ---
  useEffect(() => {
    if (isLockedByFinalStatus || isViewOnlyMode) return;

    if (canEditScore) {
      if (canSetResultStatus) {
        if (isFirstTime && formData.candidateStatus === "Chưa có kết quả") {
          setFormData((prev) => ({ ...prev, candidateStatus: "Đã có kết quả" }));
        }
      } else {
        if (formData.candidateStatus === "Đã có kết quả") {
          setFormData((prev) => ({ ...prev, candidateStatus: "Chưa có kết quả" }));
        }
      }
    }
  }, [canSetResultStatus, isFirstTime, formData.candidateStatus, isLockedByFinalStatus, canEditScore, isViewOnlyMode]);

  if (!isOpen || !candidate) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const showInternshipDate = formData.candidateStatus === "Đã hẹn ngày thực tập";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isViewOnlyMode) return; // Chặn LEAD

    setApiError(null);
    if (!validateForm()) return;

    setLoading(true);
    const dto = { ...formData };

    try {
      const response = await api.put(
        `/candidates/${candidate.candidateId}/save-result`,
        dto
      );
      onSuccess(response.data);
      onClose();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Có lỗi xảy ra khi lưu kết quả.";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content" style={{ maxWidth: "700px" }} role="dialog">
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: "#fff" }}>
            Thông tin & Kết quả ứng viên
          </h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-scroll-form">
          <div className="modal-body">

            {/* --- Phần 1: Thông tin (Chỉ HR & Admin sửa) --- */}
            <h4 className="form-section-title">Thông tin ứng viên</h4>
            <div className="candidate-form-grid">
              <div className="form-column">
                <Input 
                    label="Họ và tên ứng viên *" 
                    name="fullName"
                    value={formData.fullName} 
                    onChange={handleChange}
                    disabled={isInfoLocked} 
                    error={errors.fullName}
                />
                <Input 
                    label="Số điện thoại *" 
                    name="phoneNumber"
                    value={formData.phoneNumber} 
                    onChange={handleChange}
                    disabled={isInfoLocked}
                    error={errors.phoneNumber}
                />
                <Input 
                    label="Thời gian hẹn phỏng vấn *" 
                    name="interviewDate"
                    type="datetime-local" 
                    value={formData.interviewDate} 
                    onChange={handleChange}
                    disabled={isInfoLocked}
                    error={errors.interviewDate}
                />
              </div>
              <div className="form-column">
                <Input 
                    label="Email *" 
                    name="email"
                    value={formData.email} 
                    onChange={handleChange}
                    disabled={isInfoLocked}
                    error={errors.email}
                />
                <Input 
                    label="Link CV *" 
                    name="cvLink"
                    value={formData.cvLink} 
                    onChange={handleChange}
                    disabled={isInfoLocked}
                    error={errors.cvLink}
                />
                
                <div className="form-group">
                    <label>Kế hoạch tuyển dụng</label>
                    {isInfoLocked ? (
                        <input 
                            className="input-style" 
                            value={getPlanName(candidate)} 
                            readOnly 
                            disabled 
                        />
                    ) : (
                        <select
                            name="planId"
                            value={formData.planId}
                            onChange={handleChange}
                            className="input-style"
                        >
                            <option value="" disabled>-- Chọn kế hoạch --</option>
                            {!planOptions.some(p => String(p.planId) === String(formData.planId)) && formData.planId && (
                                <option value={formData.planId} disabled>{getPlanName(candidate)}</option>
                            )}
                            {planOptions.map(p => (
                                <option key={p.planId} value={p.planId}>
                                    {p.planName}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

              </div>
            </div>

            {/* --- Phần 2: Kết quả phỏng vấn (Chỉ QLDT & Admin sửa) --- */}
            <h4 className="form-section-title">Kết quả phỏng vấn</h4>
            {apiError && <div className="api-error-box">{apiError}</div>}

            <div className="candidate-form-grid-3">
              <div className="form-group">
                <label>Có đến phỏng vấn?</label>
                <select
                  name="attendedInterview"
                  value={formData.attendedInterview}
                  onChange={handleChange}
                  className="input-style"
                  disabled={isAttendanceSelectLocked} 
                >
                  <option value="NO">Không</option>
                  <option value="YES">Có</option>
                </select>
              </div>

              <Input
                label="Điểm kiểm tra (0-100)"
                name="testScore"
                type="number"
                min="0" max="100" step="0.5"
                value={formData.testScore}
                onChange={handleChange}
                placeholder="0-100"
                disabled={isResultLocked} 
              />

              <Input
                label="Điểm PV trực tiếp (0-10)"
                name="interviewScore"
                type="number"
                min="0" max="10" step="0.5"
                value={formData.interviewScore}
                onChange={handleChange}
                placeholder="0-10"
                disabled={isResultLocked}
              />
            </div>

            <div className="form-group full-width">
                <label>Nhận xét (nếu có)</label>
                <textarea 
                    name="comment" 
                    rows="4" 
                    value={formData.comment} 
                    onChange={handleChange} 
                    className="input-style"
                    disabled={isResultLocked}
                    placeholder="Nhập nhận xét..."
                />
            </div>

            <div className="form-group full-width final-result-block">
              <label>Kết quả cuối cùng</label>
              <select
                name="finalResult"
                value={formData.finalResult}
                onChange={handleChange}
                className="input-style final-result-select"
                disabled={isResultLocked}
              >
                <option value="Đạt" className="text-pass">Đạt</option>
                <option value="Không đạt" className="text-fail">Không đạt</option>
              </select>
            </div>

            {/* --- Phần 3: Trạng Thái --- */}
            {/* ✅ BIẾN MẤT HOÀN TOÀN NẾU CHƯA CÓ ĐIỂM (shouldShowStatusSection == false) */}
            {shouldShowStatusSection && (
                <>
                    <h4 className="form-section-title">Trạng Thái</h4>
                    <div className="candidate-form-grid">
                      <div className="form-column">
                        <div className="form-group">
                          <label>Cập nhật trạng thái</label>
                          <select
                            name="candidateStatus"
                            value={formData.candidateStatus}
                            onChange={handleChange}
                            className="input-style"
                            disabled={isStatusLocked} 
                          >
                            {availableStatuses.map(st => (
                              <option 
                                key={st} 
                                value={st}
                                disabled={
                                  (st === "Đã nhận việc" && formData.finalResult === 'Không đạt') ||
                                  (st === "Đã có kết quả" && !canSetResultStatus)
                                }
                              >
                                {st}
                              </option>
                            ))}
                            
                            {!availableStatuses.includes(formData.candidateStatus) && (
                               <option value={formData.candidateStatus} disabled>
                                 {formData.candidateStatus} (Hiện tại)
                               </option>
                            )}
                          </select>
                        </div>
                      </div>
                      <div className="form-column">
                        <Input
                          label="Lưu ý"
                          name="note"
                          value={formData.note}
                          onChange={handleChange}
                          disabled={isLockedByFinalStatus || isViewOnlyMode}
                        />
                      </div>
                    </div>

                    {showInternshipDate && (
                      <div className="form-group" style={{ maxWidth: "323px" }}>
                        <Input
                          label="Chọn ngày thực tập *"
                          name="internshipDate"
                          type="date"
                          value={formData.internshipDate}
                          onChange={handleChange}
                          required
                          disabled={isLockedByFinalStatus || isViewOnlyMode}
                          error={errors.internshipDate}
                        />
                      </div>
                    )}
                </>
            )}

          </div>

          <div className="modal-footer justify-end">
            <button type="button" className="modal-btn btn-secondary" onClick={onClose} disabled={loading}>
                {isViewOnlyMode ? "Đóng" : "Hủy"}
            </button>
            
            {!isViewOnlyMode && (
                <button type="submit" className="modal-btn btn-save" disabled={loading || isLockedByFinalStatus}>
                  {loading ? "Đang lưu..." : "Lưu"}
                </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}