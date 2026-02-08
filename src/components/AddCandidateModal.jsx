// src/components/AddCandidateModal.jsx
import React, { useState, useEffect } from "react";
import Input from "./Form/Input";
import api from "../services/api";
import "../styles/AddCandidateModal.css";

export default function AddCandidateModal({
  isOpen,
  onClose,
  onSuccess,
  planOptions = [],
}) {
  // --- State cho Form ---
  const initialState = {
    fullName: "",
    email: "",
    phoneNumber: "",
    cvLink: "",
    interviewDate: "",
    planId: "",
  };

  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // Thêm toast giống EditTrainingModal

  // Toast helper
  const showToast = (msg, type = "error") => {
    setToast({ msg, type });
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => setToast(null), 3500);
  };

  // Reset form khi mở modal
  useEffect(() => {
    if (isOpen) {
      setFormData(initialState);
      setErrors({});
      setApiError(null);
      setToast(null);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // --- Validate Form (Client-side) ---
  const validateForm = () => {
    const newErrors = {};
    const { fullName, email, phoneNumber, interviewDate, planId, cvLink } = formData;

    if (!fullName.trim()) newErrors.fullName = "Họ và tên không được để trống.";
    if (!email.trim()) newErrors.email = "Email không được để trống.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Email không đúng định dạng.";

    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(phoneNumber))
      newErrors.phoneNumber = "SĐT phải là 10 chữ số bắt đầu bằng 0.";

    if (!interviewDate) newErrors.interviewDate = "Thời gian hẹn phỏng vấn không được để trống.";
    else {
      const selectedTime = new Date(interviewDate).getTime();
      const now = new Date().getTime();
      if (selectedTime <= now)
        newErrors.interviewDate = "Thời gian hẹn phỏng vấn phải ở trong tương lai.";
    }

    if (!planId) newErrors.planId = "Kế hoạch tuyển dụng không được để trống.";

    if (!cvLink.trim()) newErrors.cvLink = "Link CV không được để trống.";
    else {
      const urlRegex = /^(https?:\/\/)[^\s$.?#].[^\s]*$/i;
      if (!urlRegex.test(cvLink))
        newErrors.cvLink = "Link CV phải bắt đầu bằng http:// hoặc https://";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Xử lý Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        planId: formData.planId ? Number(formData.planId) : null,
      };

      const response = await api.post("/candidates/create", payload);
      onSuccess(response.data);
      showToast("Thêm ứng viên thành công!", "success");
      onClose();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Lỗi khi tạo ứng viên";
      setApiError(msg);
      showToast(msg, "error");
      console.error("Lỗi khi tạo ứng viên:", err);
    } finally {
      setLoading(false);
    }
  };

  const normalizePlan = (raw) => {
    const id = raw.id ?? raw.recruitmentPlanId ?? raw.planId ?? null;
    const name = raw.name ?? raw.planName ?? raw.title ?? "Kế hoạch không tên";
    return { id, name };
  };

  // Không render nếu không mở
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay giống EditTrainingModal */}
      <div className="modal-overlay" onClick={onClose} />

      {/* Modal content - stopPropagation */}
      <div
        className=" add-candidate-modal" // thêm class riêng nếu cần
        style={{ maxWidth: "700px" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="modal-header">
      <h3 className="modal-title" style={{ color: "#fff" }}>
Thông tin ứng viên
      </h3>

          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body candidate-form-grid">
            {apiError && <div className="api-error-box">{apiError}</div>}

            {/* Cột 1 */}
            <div className="form-column">
              <Input
                label="Họ và tên ứng viên *"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Nhập họ và tên ứng viên..."
                error={errors.fullName}
                required
              />
              <Input
                label="Số điện thoại *"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="Nhập SĐT"
                error={errors.phoneNumber}
                required
              />
              <Input
                label="Thời gian hẹn phỏng vấn *"
                name="interviewDate"
                type="datetime-local"
                value={formData.interviewDate}
                onChange={handleChange}
                error={errors.interviewDate}
                required
              />
            </div>

            {/* Cột 2 */}
            <div className="form-column">
              <Input
                label="Email *"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Nhập email ứng viên..."
                error={errors.email}
                required
              />

              <Input
                label="Link CV *"
                name="cvLink"
                value={formData.cvLink}
                onChange={handleChange}
                placeholder="Link CV (Google Drive, TopCV...)"
                error={errors.cvLink}
                required
              />

              <div className="form-group">
                <label>Kế hoạch tuyển dụng *</label>
                <select
                  name="planId"
                  value={formData.planId}
                  onChange={handleChange}
                  className={`input-style ${errors.planId ? "input-error" : ""}`}
                  required
                >
                  <option value="">— Chọn kế hoạch đã duyệt —</option>
                  {planOptions.map((raw) => {
                    const plan = normalizePlan(raw);
                    if (!plan.id) return null;
                    return (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    );
                  })}
                </select>
                {errors.planId && (
                  <span className="error-message">{errors.planId}</span>
                )}
              </div>
            </div>
          </div>

          {/* Footer giống EditTrainingModal */}
          <div className="modal-footer">
            <div className="footer-left">
              {/* Có thể để trống hoặc thêm nút khác sau này */}
            </div>
            <div className="footer-right">
              <button
                type="button"
                className="modal-btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="modal-btn btn-add-candidate"
                disabled={loading}
              >
                {loading ? "Đang thêm..." : "Thêm"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Toast giống hệt EditTrainingModal */}
      {toast && (
        <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
          {toast.msg}
        </div>
      )}
    </>
  );
}