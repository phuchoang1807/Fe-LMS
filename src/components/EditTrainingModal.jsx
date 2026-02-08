// src/components/EditTrainingModal.jsx
import React, { useEffect, useState } from "react";
import "../styles/EditTrainingModal.css";
import api from "../services/api";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function EditTrainingModal({
  isOpen,
  onClose,
  trainingData,
  onSave,
  isViewOnly = false,
}) {
  const [allCourses, setAllCourses] = useState([]);
  const [scoresMap, setScoresMap] = useState({});
  const [teamReview, setTeamReview] = useState("");
  const [toast, setToast] = useState(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(null);

  // Dữ liệu từ backend
  const summaryResult = trainingData?.summaryResult != null
    ? Number(trainingData.summaryResult).toFixed(2)
    : "N/A";
  const internshipResult = trainingData?.internshipResult || "N/A";

  const isCompleted = trainingData?.internStatus === "Đã hoàn thành";
  const isStopped = trainingData?.internStatus === "Đã dừng thực tập";
  const canEdit = !isViewOnly && !isCompleted && !isStopped;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => setToast(null), 3500);
  };

  const renderIcon = (score) => {
    if (!score || score === "N/A") return null;
    const num = Number(score);
    return num >= 7 ? (
      <svg width="18" height="18" fill="#22c55e" viewBox="0 0 20 20">
        <path d="M6.173 14.727L2.1 10.654l1.4-1.4 2.673 2.673 6.727-6.727 1.4 1.4z" />
      </svg>
    ) : (
      <svg width="18" height="18" fill="#ef4444" viewBox="0 0 20 20">
        <path d="M4.222 3l5.364 5.364L14.95 3l1.414 1.414-5.364 5.364 5.364 5.364-1.414 1.414-5.364-5.364L4.222 15.55 2.808 14.136l5.364-5.364L2.808 3z" />
      </svg>
    );
  };

  const calculateSubjectTotal = (s) => {
    if (s.theoryScore == null || s.practiceScore == null || s.attitudeScore == null) return null;
    return ((s.theoryScore + s.practiceScore + s.attitudeScore) / 3).toFixed(2);
  };

  const isCourseLocked = (courseName) => {
    const s = scoresMap[courseName];
    if (!s) return false;
    const total = Number(s.totalScore || 0);
    const attempts = s.totalAttempts || 0;
    return (total >= 7 && attempts > 0) || attempts >= 3;
  };

  const isCourseUnlocked = (index) => {
    if (!canEdit) return false;
    if (index === 0) return true;
    const prev = allCourses[index - 1];
    const prevScore = scoresMap[prev?.courseName];
    return prevScore?.theoryScore != null && prevScore?.practiceScore != null && prevScore?.attitudeScore != null;
  };

  const shouldShowReasonInput = (courseName) => {
    const current = scoresMap[courseName];
    if (!current) return false;

    const orig = trainingData.scores?.find(s => s.courseName === courseName);
    if (!orig) return false;

    const canInput = canEdit && isCourseUnlocked(allCourses.findIndex(c => c.courseName === courseName)) && !isCourseLocked(courseName);
    if (!canInput) return false;

    // Đã đủ 3 điểm mới kiểm tra
    if (current.theoryScore == null || current.practiceScore == null || current.attitudeScore == null) return false;

    const currentTotal = (current.theoryScore + current.practiceScore + current.attitudeScore) / 3;

    // Chỉ hiện khi điểm mới <7 VÀ khác với điểm cũ (đang chấm lần mới)
    const origTotal = orig.totalScore ? Number(orig.totalScore) : null;
    const isNewScoreDifferent = origTotal == null ||
      Math.abs(currentTotal - origTotal) > 0.01 ||
      current.theoryScore !== orig.theoryScore ||
      current.practiceScore !== orig.practiceScore ||
      current.attitudeScore !== orig.attitudeScore;

    return currentTotal < 7 && isNewScoreDifferent;
  };

  const handleScoreChange = (courseName, field, value) => {
    if (!canEdit) return;

    let num = value.trim() === "" ? null : parseFloat(value);
    if (num !== null) {
      if (isNaN(num)) return;
      num = Math.round(num * 2) / 2;
      if (num < 0) num = 0;
      if (num > 10) num = 10;
    }

    setScoresMap(prev => ({
      ...prev,
      [courseName]: {
        ...prev[courseName],
        [field]: num,
        reason: num !== null && shouldShowReasonInput(courseName) ? "" : prev[courseName]?.reason // XÓA LÝ DO CŨ KHI NHẬP ĐIỂM MỚI <7
      }
    }));
  };

  const handleReasonChange = (courseName, value) => {
    setScoresMap(prev => ({
      ...prev,
      [courseName]: { ...prev[courseName], reason: value }
    }));
  };

  const handleSave = async () => {
    const original = trainingData.scores || [];

    const changedScores = allCourses
      .map(course => {
        const current = scoresMap[course.courseName] || {};
        const orig = original.find(o => o.courseName === course.courseName);

        if (current.theoryScore == null || current.practiceScore == null || current.attitudeScore == null) {
          return null;
        }

        const currentTotal = calculateSubjectTotal(current);
        const needReason = currentTotal && Number(currentTotal) < 7;

        // Kiểm tra có thay đổi điểm không
        const hasScoreChange =
          orig?.theoryScore !== current.theoryScore ||
          orig?.practiceScore !== current.practiceScore ||
          orig?.attitudeScore !== current.attitudeScore;

        if (!hasScoreChange) return null;

        if (needReason && (!current.reason || current.reason.trim() === "")) {
          showToast(`Môn "${course.courseName}" dưới 7 → phải nhập lý do mới!`, "error");
          return null;
        }

        return {
          courseName: course.courseName,
          theoryScore: current.theoryScore,
          practiceScore: current.practiceScore,
          attitudeScore: current.attitudeScore,
          reason: needReason ? current.reason.trim() : null
        };
      })
      .filter(Boolean);

    const hasTeamChange = teamReview.trim() !== (trainingData.teamReview || "").trim();

    if (changedScores.length === 0 && !hasTeamChange) {
      showToast("Không có thay đổi nào để lưu!", "info");
      onClose();
      return;
    }

    try {
      const payload = {};
      if (changedScores.length > 0) payload.scores = changedScores;
      if (hasTeamChange) payload.teamReview = teamReview.trim() || null;

      const res = await api.put(`/trainings/${trainingData.internId}/scores`, payload);
      onSave(res.data);
      showToast("Lưu điểm thành công!");
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || "Lỗi khi lưu điểm!", "error");
    }
  };

  const handleStopInternship = async () => {
    try {
      const res = await api.put(`/trainings/${trainingData.internId}/stop`);
      onSave(res.data);
      showToast("Đã dừng thực tập thành công!");
      onClose();
    } catch (err) {
      showToast("Lỗi khi dừng thực tập!", "error");
    }
  };

  useEffect(() => {
    if (!isOpen || !trainingData) return;

    api.get("/courses").then(res => {
      const courses = Array.isArray(res.data) ? res.data : [];
      setAllCourses(courses);

      const map = {};
      courses.forEach(course => {
        const existing = trainingData.scores?.find(s => s.courseName === course.courseName);
        map[course.courseName] = existing ? {
          ...existing,
          reason: "" // Luôn để trống khi mở modal
        } : {
          courseName: course.courseName,
          theoryScore: null,
          practiceScore: null,
          attitudeScore: null,
          totalScore: null,
          reason: "",
          history: [],
          totalAttempts: 0,
          remainingAttempts: 3
        };
      });
      setScoresMap(map);
    }).catch(() => showToast("Lỗi tải môn học!", "error"));

    setTeamReview(trainingData.teamReview || "");
  }, [isOpen, trainingData]);

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="edit-training-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Kết quả học tập - {trainingData.fullName}</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="training-info-grid">
            <div><strong>Ngày bắt đầu:</strong> {trainingData.startDate ? new Date(trainingData.startDate).toLocaleDateString("vi-VN") : "N/A"}</div>
            <div><strong>Ngày kết thúc:</strong> {trainingData.endDate ? new Date(trainingData.endDate).toLocaleDateString("vi-VN") : "Chưa kết thúc"}</div>
            <div><strong>Số ngày thực tập:</strong> {trainingData.trainingDays ?? "N/A"}</div>
            <div><strong>Trạng thái:</strong> <span className="status-badge">{trainingData.internStatus}</span></div>
          </div>

          <div className="scores-table-container">
            <table className="scores-table">
              <thead>
                <tr>
                  <th>Môn học</th>
                  <th>Lý thuyết</th>
                  <th>Thực hành</th>
                  <th>Thái độ</th>
                  <th>Tổng</th>
                </tr>
              </thead>
              <tbody>
                {allCourses.map((course, index) => {
                  const s = scoresMap[course.courseName] || {};
                  const total = calculateSubjectTotal(s);
                  const isUnlocked = isCourseUnlocked(index);
                  const isLocked = isCourseLocked(course.courseName);
                  const canInput = canEdit && isUnlocked && !isLocked;
                  const showReasonInput = shouldShowReasonInput(course.courseName);

                  const latestReason = s.history?.length > 0
                    ? s.history[s.history.length - 1].reason
                    : null;

                  return (
                    <React.Fragment key={course.courseId || course.courseName}>
                      <tr className={!canInput ? "row-disabled" : ""}>
                        <td className="subject-name">
                          {course.courseName}
                          {s.totalAttempts > 0 && (
                            <span className="attempt-badge">{s.totalAttempts}/3</span>
                          )}
                          {!isViewOnly && !isUnlocked && index > 0 && (
                            <span className="lock-hint">Hoàn thành môn trước</span>
                          )}
                          {isLocked && s.totalScore >= 7 && (
                            <span className="lock-hint success">Đã đạt</span>
                          )}
                          {isLocked && s.totalAttempts >= 3 && s.totalScore < 7 && (
                            <span className="lock-hint fail">Đủ 3 lần</span>
                          )}
                        </td>

                        {["theoryScore", "practiceScore", "attitudeScore"].map(field => (
                          <td key={field}>
                            <input
                              type="text"
                              inputMode="decimal"
                              disabled={!canInput}
                              value={s[field] ?? ""}
                              onChange={e => handleScoreChange(course.courseName, field, e.target.value)}
                              className={`score-input ${isLocked ? "score-locked" : ""}`}
                              placeholder="0-10"
                            />
                          </td>
                        ))}

                        <td className="total-cell">
                          {total ? (
                            <div className="total-with-history">
                              <span className="total-score">{total}</span>
                              {renderIcon(total)}
                              {s.history?.length > 0 && (
                                <div className="history-wrapper">
                                  <button
                                    className="history-btn"
                                    onClick={() => setExpandedHistory(
                                      expandedHistory === course.courseName ? null : course.courseName
                                    )}
                                    title="Xem lịch sử chấm điểm"
                                  >
                                    {expandedHistory === course.courseName ? (
                                      <ChevronUp size={20} />
                                    ) : (
                                      <ChevronDown size={20} />
                                    )}
                                  </button>

                                  {/* CHỈ HIỆN TOOLTIP KHI CHƯA MỞ LỊCH SỬ */}
                                  {latestReason && expandedHistory !== course.courseName && (
                                    <div className="tooltip">
                                      Lý do: {latestReason}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : "N/A"}
                        </td>
                      </tr>

                      {/* CHỈ HIỆN KHI ĐANG NHẬP ĐIỂM MỚI <7 */}
                      {showReasonInput && (
                        <tr className="reason-expanded-row">
                          <td colSpan="5" className="reason-detail">
                            <div className="reason-title">
                              Lý do điểm môn <strong>{course.courseName}</strong> dưới 7 <span className="required">*</span>
                            </div>
                            <textarea
                              placeholder="Nhập lý do mới cho lần chấm này..."
                              value={s.reason || ""}
                              onChange={e => handleReasonChange(course.courseName, e.target.value)}
                              className="reason-textarea"
                              rows="2"
                            />
                          </td>
                        </tr>
                      )}

                      {/* Lịch sử */}
                      {expandedHistory === course.courseName && s.history?.length > 0 && (
                        <tr className="history-expanded-row">
                          <td colSpan="5" className="history-detail">
                            <div className="history-title">Lịch sử chấm điểm ({s.history.length} lần)</div>
                            <table className="inner-history-table">
                              <thead>
                                <tr><th>Lần</th><th>Lý thuyết</th><th>Thực hành</th><th>Thái độ</th><th>Tổng</th><th>Lý do</th></tr>
                              </thead>
                              <tbody>
                                {s.history.map(h => (
                                  <tr key={h.attemptNumber}>
                                    <td><strong>{h.attemptNumber}</strong></td>
                                    <td>{h.theoryScore ?? "-"}</td>
                                    <td>{h.practiceScore ?? "-"}</td>
                                    <td>{h.attitudeScore ?? "-"}</td>
                                    <td>{h.totalScore?.toFixed(2)}</td>
                                    <td className="reason-text">{h.reason || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tổng kết */}
          <div className="summary-section">
            <div className="summary-top-row">
              <div><strong>Tổng kết:</strong> {summaryResult} {renderIcon(summaryResult)}</div>
              <div>
                <strong>Kết quả thực tập:</strong>
                <span className={`status-badge ${internshipResult === "Đạt" ? "status-completed" :
                  internshipResult === "Không đạt" ? "status-stopped" : "status-pending"
                  }`}>
                  {internshipResult}
                </span>
              </div>
            </div>

            <div className="team-review-full">
              <label><strong>Đánh giá team:</strong> (không bắt buộc)</label>
              <textarea
                disabled={!canEdit}
                value={teamReview}
                onChange={e => setTeamReview(e.target.value)}
                placeholder="Ghi chú từ team..."
                className="team-review-textarea"
                rows="4"
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="footer-left">
            {!isViewOnly && !isCompleted && !isStopped && (
              <button className="btn-stop" onClick={() => setConfirmStop(true)}>
                Dừng thực tập
              </button>
            )}
          </div>
          <div className="footer-right">
            {canEdit && (
              <button className="btn-save" onClick={handleSave}>
                Lưu điểm
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm stop */}
      {confirmStop && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <p>Xác nhận <strong>dừng thực tập</strong> cho <strong>{trainingData.fullName}</strong>?</p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={() => setConfirmStop(false)}>Hủy</button>
              <button className="btn-confirm" onClick={handleStopInternship}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
          {toast.msg}
        </div>
      )}
    </>
  );
}