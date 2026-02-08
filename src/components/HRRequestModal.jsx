// src/components/HRRequestModal.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/HRRequestModal.css";
import Modal from "./Modal";
import { useAuth } from "../contexts/AuthContext"; // ✅ 1. Import AuthContext
import api from "../services/api";

export default function HRRequestModal({
  isOpen,
  onClose,
  request,
  onActionSuccess,
  onActionError,
}) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [techDict, setTechDict] = useState({});

  // modal lý do từ chối
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // 🔹 Meta kế hoạch
  const [planMeta, setPlanMeta] = useState(null);

  const navigate = useNavigate();
  const { user } = useAuth(); // ✅ Lấy thông tin user
  const role = user?.role; // ✅ Lấy role

  // ====== helpers lấy tên người duyệt kế hoạch cho chắc ======
  const getPlanApproverName = (plan) => {
    if (!plan) return "";
    return (
      plan?.confirmedBy?.fullName ||
      plan?.confirmedBy?.email ||
      plan?.confirmedByName ||
      plan?.approvedByName ||
      plan?.updatedBy?.fullName ||
      plan?.updatedBy?.email ||
      plan?.updatedByName ||
      ""
    );
  };

  const getPlanCreatorName = (plan, fallback = "") => {
    if (!plan) return fallback || "";
    return (
      plan?.createdBy?.fullName ||
      plan?.createdBy?.email ||
      plan?.createdByName ||
      plan?.request?.createdBy?.fullName ||
      plan?.request?.createdBy?.email ||
      plan?.request?.createdByName ||
      fallback ||
      ""
    );
  };

  // ✅ FIX: khi click link kế hoạch => chỉ sang trang Kế hoạch tuyển dụng + filter đúng planName
  // và thêm noAutoOpen=1 để RecruitmentPlanPage KHÔNG auto-open modal chi tiết
  const handleGoToPlanPage = useCallback(() => {
    const planName = planMeta?.planName || "";
    const searchParam = planName
      ? `?planName=${encodeURIComponent(planName)}&noAutoOpen=1`
      : `?noAutoOpen=1`;

    navigate(`/recruitment/plan${searchParam}`);
    onClose?.();
  }, [navigate, planMeta?.planName, onClose]);

  // ====== LOAD DANH MỤC CÔNG NGHỆ ======
  useEffect(() => {
    if (!isOpen) return;
   api
      .get("/hr-request/technologies")
      .then((r) => {
        const dict = {};
        (r.data || []).forEach((t) => (dict[t.id] = t.name));
        setTechDict(dict);
      })
      .catch(() => setTechDict({}));
  }, [isOpen]);

  // ====== LOAD KẾ HOẠCH GẮN VỚI REQUEST ======
  useEffect(() => {
    if (!isOpen || !request?.requestId) {
      setPlanMeta(null);
      return;
    }

    api
      .get("/recruitment-plans")
      .then((res) => {
        const plans = res.data;
        const matched =
          (plans || []).find(
            (p) => p.request && p.request.requestId === request.requestId
          ) || null;

        if (!matched) {
          setPlanMeta(null);
          return;
        }

        const createdByName = getPlanCreatorName(
          matched,
          request.createdByName || ""
        );

        // ✅ FIX: lấy đúng người phê duyệt kế hoạch (QLDT) từ plan
        const confirmedByName = getPlanApproverName(matched);

        const quantityList = matched.request?.quantityCandidates || [];
        const inputRequired = quantityList.reduce(
          (sum, qc) => sum + (qc.soLuong || 0) * 2,
          0
        );
        const outputRequired = quantityList.reduce(
          (sum, qc) => sum + (qc.soLuong || 0),
          0
        );

        setPlanMeta({
          status: matched.status || "",
          planName: matched.planName || "",
          createdByName,
          confirmedByName, // ✅ NEW
          recruitmentPlanId: matched.recruitmentPlanId,
          inputRequired,
          candidateCount: 0,
          candidatePassedCount: 0,
          trainingCount: 0,
          outputRequired,
          handoverCount: 0,
        });
      })
      .catch(() => setPlanMeta(null));
  }, [isOpen, request?.requestId]);

  // ====== ĐẾM ỨNG VIÊN THEO PLAN ======
  useEffect(() => {
    if (!isOpen || !planMeta?.recruitmentPlanId) return;

    api
      .get("/candidates", { params: { planId: planMeta.recruitmentPlanId } })
      .then((res) => {
        const list = res.data;
        const count = Array.isArray(list) ? list.length : 0;
        const hiredCount = Array.isArray(list)
          ? list.filter(
              (c) =>
                typeof c.status === "string" &&
                c.status.trim().toLowerCase() === "đã nhận việc"
            ).length
          : 0;
        setPlanMeta((prev) =>
          prev
            ? {
                ...prev,
                candidateCount: count,
                candidatePassedCount: hiredCount,
              }
            : prev
        );
      })
      .catch(() => {
        setPlanMeta((prev) =>
          prev
            ? {
                ...prev,
                candidateCount: 0,
                candidatePassedCount: 0,
              }
            : prev
        );
      });
  }, [isOpen, planMeta?.recruitmentPlanId]);

  // ====== ĐẾM TTS THAM GIA ĐÀO TẠO THEO PLAN ======
  useEffect(() => {
    if (!isOpen || !planMeta?.recruitmentPlanId) return;

        api
      .get("/trainings/count-by-plan", {
        params: { planId: planMeta.recruitmentPlanId },
      })
      .then((res) => {
        const count = res.data;
        const num = typeof count === "number" ? count : Number(count ?? 0) || 0;
        setPlanMeta((prev) =>
          prev
            ? {
                ...prev,
                trainingCount: num,
              }
            : prev
        );
      })
      .catch(() => {
        setPlanMeta((prev) =>
          prev
            ? {
                ...prev,
                trainingCount: 0,
              }
            : prev
        );
      });
  }, [isOpen, planMeta?.recruitmentPlanId]);

  // ====== ĐẾM TTS ĐÃ BÀN GIAO (PASS) THEO PLAN ======
  useEffect(() => {
    if (!isOpen || !planMeta?.recruitmentPlanId) return;

     api
      .get("/trainings/delivered-count-by-plan", {
        params: { planId: planMeta.recruitmentPlanId },
      })
      .then((res) => {
        const count = res.data;
        const num = typeof count === "number" ? count : Number(count ?? 0) || 0;

        setPlanMeta((prev) =>
          prev
            ? {
                ...prev,
                handoverCount: num,
              }
            : prev
        );
      })
      .catch(() => {
        setPlanMeta((prev) =>
          prev
            ? {
                ...prev,
                handoverCount: 0,
              }
            : prev
        );
      });
  }, [isOpen, planMeta?.recruitmentPlanId]);

  // ====== NOTE / REJECT ======
  useEffect(() => {
    if (isOpen && request) {
      setNote(request.note || "");
      setShowRejectModal(false);
      setRejectReason("");
    }
  }, [isOpen, request]);

  const handleOpenCandidateManagement = () => {
    if (!planMeta?.recruitmentPlanId) return;

    const planId = planMeta.recruitmentPlanId;
    const planName = planMeta.planName
      ? encodeURIComponent(planMeta.planName)
      : "";
    const query = [`planId=${planId}`];

    if (planName) {
      query.push(`planName=${planName}`);
    }

    navigate(`/recruitment/candidates?${query.join("&")}`);
    onClose?.();
  };

  const handleOpenTrainingManagement = () => {
    if (!planMeta?.recruitmentPlanId) return;

    const planId = planMeta.recruitmentPlanId;
    const planName = planMeta.planName
      ? encodeURIComponent(planMeta.planName)
      : "";
    const query = [`planId=${planId}`];

    if (planName) {
      query.push(`planName=${planName}`);
    }

    navigate(`/training?${query.join("&")}`);
    onClose?.();
  };

  const techRows = useMemo(() => {
    const arr = request?.techQuantities || [];
    return arr.map((t) => ({
      name: techDict[t.technologyId] || `#${t.technologyId}`,
      quantity: t.soLuong,
    }));
  }, [request?.techQuantities, techDict]);

  const createdAtText = useMemo(() => {
    if (!request?.createdAt) return "—";
    return new Date(request.createdAt).toLocaleString("vi-VN");
  }, [request?.createdAt]);

  const expectedDeliveryText = useMemo(() => {
    if (!request?.expectedDeliveryDate) return "—";
    return new Date(request.expectedDeliveryDate).toLocaleDateString("vi-VN");
  }, [request?.expectedDeliveryDate]);

  const totalCandidates = useMemo(() => {
    return techRows.reduce((sum, row) => sum + (row.quantity || 0), 0);
  }, [techRows]);

  const rejectReasonText = (request?.rejectReason || "").trim();

  // Map mã trạng thái -> label tiếng Việt
  const getStatusLabel = (status) => {
    switch (String(status || "").toUpperCase()) {
      case "NEW":
        return "Đã gửi";
      case "FAILED":
      case "FAILURE":
        return "Thất bại";
      case "PENDING":
        return "Đang chờ";
      case "IN_PROGRESS":
        return "Đang tiến hành";
      case "COMPLETED":
        return "Đã hoàn thành";
      case "CANCELED":
        return "Bị từ chối";
      default:
        return status || "Không rõ";
    }
  };

  // ===== STATUS TÍNH TOÁN LẠI DỰA TRÊN KẾ HOẠCH =====
  const computedStatusRaw = useMemo(() => {
    const base = (request?.status || "").toUpperCase();

    const hasFailureReason = !!rejectReasonText;
    const outputRequired = planMeta?.outputRequired || 0;
    const delivered = planMeta?.handoverCount || 0;

    if (
      base !== "CANCELED" &&
      outputRequired > 0 &&
      delivered < outputRequired &&
      hasFailureReason
    ) {
      return "FAILED";
    }

    if (base === "FAILED" || base === "FAILURE") return "FAILED";

    if (base === "COMPLETED" && hasFailureReason) return "FAILED";

    // Nếu nhu cầu không bị từ chối và đã có planMeta + bàn giao đủ nhân sự
    if (
      base !== "CANCELED" &&
      planMeta &&
      (planMeta.outputRequired || 0) > 0 &&
      (planMeta.handoverCount || 0) >= (planMeta.outputRequired || 0)
    ) {
      return "COMPLETED";
    }

    return base;
  }, [request?.status, planMeta, rejectReasonText]);

  // dùng status đã tính toán thay cho status gốc
  const statusRaw = computedStatusRaw;
  const statusLabel = getStatusLabel(statusRaw);

  const status = statusRaw;
  const isNew = status === "NEW";
  const isApproved = status === "APPROVED";
  const isCanceled = status === "CANCELED";

  // tách chuỗi "Người từ chối kế hoạch/nhu cầu: X. Lý do: Y"
  const parsedReject = useMemo(() => {
    const raw = request?.rejectReason || "";
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

    const nameIdx =
      raw.indexOf(nameLabel1) !== -1
        ? raw.indexOf(nameLabel1)
        : raw.indexOf(nameLabel2);

    if (nameIdx !== -1) {
      const endIdx = reasonIdx === -1 ? raw.length : reasonIdx;
      const namePart = raw.slice(
        nameIdx +
          (raw.indexOf(nameLabel1) !== -1
            ? nameLabel1.length
            : nameLabel2.length),
        endIdx
      );
      by = namePart.replace(/[.\s]+$/g, "").trim();
    }

    return { by, reason };
  }, [request?.rejectReason]);

  // ================== BUILD TIẾN TRÌNH ==================
  const progressSteps = useMemo(() => {
    const createdBy = request?.createdByName || "Không rõ";
    const requestTitle = request?.requestTitle || "nhu cầu";
    const requestLabel = ` "${requestTitle}"`;

    const requestApproverName =
      request?.approvedByName || request?.updatedByName || "Người phê duyệt";

    // 🔹 Lấy thông tin kế hoạch từ planMeta
    const planName = planMeta?.planName || "";
    const planLabel = planName || "Kế hoạch tuyển dụng";

    const planStatus = (planMeta?.status || "").toUpperCase();

    // ✅ FIX: xác định plan đã được duyệt hay chưa
    const isPlanApproved = ["CONFIRMED", "APPROVED", "IN_PROGRESS", "COMPLETED"].includes(
      planStatus
    );

    // ✅ FIX: link kế hoạch chỉ click khi plan đã duyệt
    const planLinkButton = planName ? (
      <button
        type="button"
        className={`timeline-link ${!isPlanApproved ? "disabled" : ""}`}
        disabled={!isPlanApproved}
        onClick={() => {
          if (!isPlanApproved) return;
          handleGoToPlanPage();
        }}
      >
        {planLabel}
      </button>
    ) : null;

    const buildPlanDetail = (prefix, suffix) => {
      if (!planLinkButton) return `${prefix}${planLabel}${suffix}`;
      return (
        <span className="timeline-desc-inline">
          {prefix}
          {planLinkButton}
          {suffix}
        </span>
      );
    };

    const planCreator = planMeta?.createdByName || createdBy;

    // ✅ FIX: ưu tiên đúng người duyệt kế hoạch (QLDT) từ planMeta.confirmedByName
    const planApprover =
      planMeta?.confirmedByName ||
      request?.planApprovedByName ||
      requestApproverName ||
      "Người phê duyệt";

    const steps = [
      {
        key: "request",
        title: "Khởi tạo nhu cầu",
        status: "success",
        actor: createdBy,
        detail: `Nhu cầu "${requestTitle}"`,
      },
      {
        key: "approve-request",
        title: "Phê duyệt nhu cầu",
        status: "pending",
        actor: "Chưa thực hiện",
        detail: `Chờ phê duyệt ${requestLabel}`,
      },
      {
        key: "plan-create",
        title: "Khởi tạo kế hoạch",
        status: "pending",
        actor: "Chưa thực hiện",
        detail: `Chờ ${requestLabel} được phê duyệt để lập kế hoạch mới`,
      },
      {
        key: "plan-approve",
        title: "Phê duyệt kế hoạch",
        status: "pending",
        actor: "Chưa thực hiện",
        // ✅ nếu chưa duyệt => link disabled (xám, ko bấm)
        detail: buildPlanDetail("Chờ phê duyệt ", " để triển khai tuyển dụng"),
      },
      {
        key: "candidate",
        title: "Quản lý ứng viên",
        status: "pending",
        actor: "Chưa thực hiện",
        detail: "Chờ kế hoạch được duyệt",
      },
      {
        key: "training",
        title: "Đào tạo",
        status: "pending",
        actor: "Chưa thực hiện",
        detail: "Chờ ứng viên đạt yêu cầu",
      },
      {
        key: "handover",
        title: "Bàn giao nhân sự",
        status: "pending",
        actor: "Chưa thực hiện",
        detail: "Chờ bàn giao nhân sự",
      },
    ];

    // ===== 1. THEO TRẠNG THÁI NHU CẦU =====
    if (statusRaw === "APPROVED") {
      steps[1] = {
        ...steps[1],
        status: "success",
        actor: requestApproverName,
        detail: `${requestLabel} đã được phê duyệt`,
      };
    } else if (statusRaw === "IN_PROGRESS") {
      steps[1] = {
        ...steps[1],
        status: "success",
        actor: requestApproverName,
        detail: `${requestLabel} đã được phê duyệt`,
      };
      steps[2] = {
        ...steps[2],
        status: "success",
        actor: planCreator,
        detail: `${planLabel.charAt(0).toUpperCase()}${planLabel.slice(
          1
        )} đã được khởi tạo`,
      };
    } else if (statusRaw === "COMPLETED") {
      // trạng thái COMPLETED sẽ tiếp tục được ghi đè chi tiết bởi planMeta phía dưới
      steps.forEach((s, idx) => {
        if (idx <= 3) {
          steps[idx] = {
            ...s,
            status: "success",
            actor: idx === 0 ? createdBy : "Đã hoàn thành",
            detail: idx === 0 ? s.detail : "Giai đoạn đã hoàn tất",
          };
        } else if (idx === 4) {
          steps[idx] = {
            ...s,
            status: "pending",
            actor: "Chưa thực hiện",
            detail: "Chờ triển khai quản lý ứng viên",
          };
        } else if (idx === 5) {
          steps[idx] = {
            ...s,
            status: "pending",
            actor: "Chưa thực hiện",
            detail: "Chờ triển khai đào tạo",
          };
        } else if (idx === 6) {
          steps[idx] = {
            ...s,
            status: "pending",
            actor: "Chưa thực hiện",
            detail: "Chờ bàn giao nhân sự",
          };
        }
      });
    } else if (statusRaw === "CANCELED") {
      const reasonLower = (parsedReject.reason || request?.rejectReason || "")
        .toLowerCase()
        .trim();
      let rejectIndex = 1;

      if (reasonLower.includes("phê duyệt nhu cầu") || reasonLower.includes("")) {
        rejectIndex = 1;
      } else if (reasonLower.includes("khởi tạo kế hoạch")) {
        rejectIndex = 2;
      } else if (reasonLower.includes("phê duyệt kế hoạch") || reasonLower.includes("kế hoạch")) {
        rejectIndex = 3;
      } else if (reasonLower.includes("ứng viên")) {
        rejectIndex = 4;
      } else if (reasonLower.includes("đào tạo")) {
        rejectIndex = 5;
      } else if (reasonLower.includes("bàn giao")) {
        rejectIndex = 6;
      }

      const rejectActor =
        parsedReject.by ||
        request?.updatedByName ||
        request?.approvedByName ||
        request?.createdByName ||
        "Không rõ";

      steps.forEach((s, idx) => {
        if (idx < rejectIndex) {
          steps[idx] = { ...s, status: "success" };
        } else if (idx === rejectIndex) {
          steps[idx] = {
            ...s,
            status: "rejected",
            actor: rejectActor,
            detail: parsedReject.reason || request?.rejectReason || "Không rõ lý do",
            rejectReason:
              parsedReject.reason || request?.rejectReason || "Không rõ lý do",
          };
        } else {
          steps[idx] = { ...s, status: "pending" };
        }
      });
    }

    // ===== 2. GHI ĐÈ THEO TRẠNG THÁI KẾ HOẠCH + SỐ LƯỢNG ỨNG VIÊN / TTS =====
    if (statusRaw !== "CANCELED" && planStatus) {
      const isPlanRejected = ["REJECTED", "CANCELED"].includes(planStatus);

      // Có kế hoạch => coi như nhu cầu đã được phê duyệt
      if (steps[1].status !== "success") {
        steps[1] = {
          ...steps[1],
          status: "success",
          actor: requestApproverName,
          detail: `Phê duyệt ${requestLabel} để lập ${planLabel}`,
        };
      }

      // Khởi tạo kế hoạch
      steps[2] = {
        ...steps[2],
        status: "success",
        actor: planCreator,
        detail: `${planLabel.charAt(0).toUpperCase()}${planLabel.slice(
          1
        )} đã được khởi tạo`,
      };

      // Phê duyệt / Từ chối kế hoạch
      if (isPlanApproved) {
        steps[3] = {
          ...steps[3],
          status: "success",
          actor: planApprover || "Không rõ",
          detail: buildPlanDetail("", " đã được phê duyệt"),
        };
      } else if (isPlanRejected) {
        steps[3] = {
          ...steps[3],
          status: "rejected",
          actor: planApprover || "Không rõ",
          detail:
            parsedReject.reason ||
            request?.rejectReason ||
            "Kế hoạch tuyển dụng đã bị từ chối.",
          rejectReason:
            parsedReject.reason ||
            request?.rejectReason ||
            "Kế hoạch tuyển dụng đã bị từ chối.",
        };
      } else {
        steps[3] = {
          ...steps[3],
          status: "pending",
          actor: "Chưa thực hiện",
          detail: buildPlanDetail("Chờ phê duyệt ", ""),
        };
      }

      // ===== 2.1. QUẢN LÝ ỨNG VIÊN =====
      const inputRequired = planMeta?.inputRequired || 0; // NV đầu vào (soLuong * 2)
      const candidateCount =
        planMeta?.candidateCount != null ? planMeta.candidateCount : 0;
      const trainingCount =
        planMeta?.trainingCount != null ? planMeta.trainingCount : 0;
      const outputRequired = planMeta?.outputRequired || 0; // NV đầu ra
      const handoverCount =
        planMeta?.handoverCount != null ? planMeta.handoverCount : 0;

      if (inputRequired > 0) {
        const baseActorCandidate =
          steps[4].actor && steps[4].actor !== "Chưa thực hiện"
            ? steps[4].actor
            : planCreator;

        const candidateLinkDisabled = candidateCount <= 0;
        const candidateDetail = (
          <div className="timeline-desc-stack">
            <span>
              Số lượng ứng viên ứng tuyển: {candidateCount}/
              {inputRequired || outputRequired}
            </span>

            {planMeta?.recruitmentPlanId && (
              <button
                type="button"
                className={`timeline-link ${
                  candidateLinkDisabled ? "disabled" : ""
                }`}
                disabled={candidateLinkDisabled}
                onClick={handleOpenCandidateManagement}
              >
                Xem kết quả tuyển dụng
              </button>
            )}
          </div>
        );
        steps[4] = {
          ...steps[4],
          actor: baseActorCandidate,
          detail: candidateDetail,
          status: candidateCount > 0 ? "success" : "pending",
        };

        // ===== 2.2. ĐÀO TẠO – SỐ LƯỢNG TTS =====
        const baseActorTraining =
          steps[5].actor && steps[5].actor !== "Chưa thực hiện"
            ? steps[5].actor
            : planCreator;

        const trainingLinkDisabled = trainingCount <= 0;

        const trainingDetail = (
          <div className="timeline-desc-stack">
            <span>Số lượng TTS tham gia đào tạo: {trainingCount}</span>

            {planMeta?.recruitmentPlanId && (
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
        steps[5] = {
          ...steps[5],
          actor: baseActorTraining,
          detail: trainingDetail,
          status: trainingCount > 0 ? "success" : "pending",
        };
      }

      // ===== 2.3. BÀN GIAO NHÂN SỰ – THÀNH CÔNG / THẤT BẠI =====
      if (outputRequired > 0) {
        const baseActorHandover =
          steps[6].actor && steps[6].actor !== "Chưa thực hiện"
            ? steps[6].actor
            : planCreator;

        const hasRejectReason = !!(parsedReject.reason || request?.rejectReason);
        const isFailure =
          hasRejectReason &&
          (statusRaw === "FAILED" ||
            (statusRaw === "COMPLETED" &&
              (handoverCount || 0) < outputRequired));

        if (handoverCount >= outputRequired) {
          steps[6] = {
            ...steps[6],
            status: "success",
            actor: baseActorHandover,
            detail: `Đã bàn giao nhân sự: ${handoverCount}/${outputRequired}`,
          };
        } else if (isFailure) {
          const baseDetail =
            handoverCount > 0
              ? `Chỉ bàn giao được ${handoverCount}/${outputRequired} nhân sự`
              : `Không bàn giao được nhân sự nào (0/${outputRequired}).`;

          steps[6] = {
            ...steps[6],
            status: "rejected",
            actor: baseActorHandover,
            detail: baseDetail,
            rejectReason:
              parsedReject.reason ||
              request?.rejectReason ||
              "Không có thực tập sinh nào đạt yêu cầu để bàn giao.",
          };
        } else {
          const text = `Đã bàn giao nhân sự: ${handoverCount}/${outputRequired}`;
          steps[6] = {
            ...steps[6],
            status: "pending",
            actor: baseActorHandover,
            detail: text,
          };
        }
      }
    }

    // ❗ CUỐI CÙNG: loại bỏ 2 bước bạn không muốn hiển thị
    return steps.filter((s) => s.key !== "request" && s.key !== "plan-create");
  }, [
    request?.createdAt,
    request?.createdByName,
    request?.approvedByName,
    request?.updatedByName,
    request?.requestTitle,
    request?.rejectReason,
    statusRaw,
    parsedReject,
    planMeta,
    handleOpenCandidateManagement,
    handleOpenTrainingManagement,
    handleGoToPlanPage,
  ]);

  // ================== API ERROR HELPER ==================
  const readErrorMessage = async (res) => {
    if (!res) return "Có lỗi xảy ra.";

    // Axios response
    if (res.data) {
      const msg = res.data?.message || res.data?.error;
      if (msg) return msg;
    }

    if (typeof res.text === "function") {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        return data?.message || text || "Có lỗi xảy ra.";
      } catch {
        return text || "Có lỗi xảy ra.";
      }
    }
    return res.statusText || "Có lỗi xảy ra.";
  };

  // ================== PHÊ DUYỆT ==================
  const handleApprove = async () => {
    if (!request || !isNew) return;

    setLoading(true);
    try {
      onClose();
      navigate(`/recruitment/plan?requestId=${request.requestId}`);
    } finally {
      setLoading(false);
    }
  };

  // ================== TỪ CHỐI ==================
  const handleStartReject = () => {
    if (!request || !isNew) return;
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleSubmitReject = async () => {
    if (!request || !isNew) return;
    if (!rejectReason.trim()) {
      alert("Lý do từ chối không được để trống.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.put(`/hr-request/${request.requestId}/reject`, {
        rejectionReason: rejectReason.trim(),
      });

      const { status } = res;

      if (status < 200 || status >= 300) {
        const msg = await readErrorMessage(res);
        if (status === 401)
          alert("⚠️ Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        else if (status === 403)
          alert("⚠️ Bạn không có quyền từ chối yêu cầu này.");
        else if (status === 409) alert(`⚠️ Không thể từ chối: ${msg}`);
        else if (status === 400) alert(`⚠️ Dữ liệu không hợp lệ: ${msg}`);
        else alert(`⚠️ Lỗi khi từ chối yêu cầu: ${msg}`);
        onActionError?.(msg);
        return;
      }

      onActionSuccess?.();
      setShowRejectModal(false);
      onClose();
    } catch (err) {
      const msg = err?.message || "";
      alert(`⚠️ Lỗi mạng khi từ chối yêu cầu: ${msg}`);
      onActionError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  // ================== RENDER ==================
  if (!isOpen || !request) return null;

  const disableActions = loading || !isNew;
  const hasNote = note && note.trim().length > 0;

  // ✅ LOGIC CHUẨN: Chỉ Admin hoặc HR mới được Duyệt/Từ chối.
  const showActionButtons =
    request?.status === "NEW" && (role === "SUPER_ADMIN" || role === "HR");

  return (
    <>
      {/* ====== BƯỚC 1: CHI TIẾT YÊU CẦU NHÂN SỰ ====== */}
      {!showRejectModal && (
        <div className="hrmodal-overlay">
          <div className="hrmodal-card">
            {/* Header */}
            <div className="hrmodal-header">
              <div>
                <h3 className="hrmodal-title">Chi tiết yêu cầu nhân sự</h3>
                <span className={`status-pill status-${statusRaw.toLowerCase()}`}>
                  {statusLabel}
                </span>
              </div>
              <button
                className="hrmodal-close"
                onClick={onClose}
                aria-label="Đóng modal"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="hrmodal-body">
              {/* khối thông tin chung */}
              <div className="request-overview">
                <div className="overview-top">
                  <div className="overview-heading">
                    <p className="overview-label">Thông tin yêu cầu</p>
                    <h4 className="overview-title">{request.requestTitle}</h4>
                    <p className="overview-sub">
                      Nhìn tổng quan về người gửi, thời gian và trạng thái
                    </p>
                  </div>
                  <div className="overview-status" aria-label="Trạng thái">
                    <span className={`status-dot status-${statusRaw.toLowerCase()}`} />
                    <span className="overview-status-text">{statusLabel}</span>
                  </div>
                </div>

                <dl className="overview-list">
                  <div className="overview-row">
                    <dt>Người gửi</dt>
                    <dd>{request.createdByName}</dd>
                  </div>
                  <div className="overview-row">
                    <dt>Ngày tạo</dt>
                    <dd>{createdAtText}</dd>
                  </div>
                  <div className="overview-row">
                    <dt>Ngày bàn giao dự kiến</dt>
                    <dd>{expectedDeliveryText}</dd>
                  </div>
                  <div className="overview-row">
                    <dt>Tổng số lượng nhân sự</dt>
                    <dd>{totalCandidates}</dd>
                  </div>
                </dl>
              </div>

              <div className="section-block progress-block">
                <div className="process-header">
                  <h4 className="process-title">Quy trình thực hiện</h4>
                  <span className="process-sub">
                    Tuân theo thứ tự bước (có thể xem người thực hiện và lý do)
                  </span>
                </div>

                <div className="process-timeline" role="list">
                  {progressSteps.map((step, idx) => {
                    const isLast = idx === progressSteps.length - 1;
                    const statusClass =
                      step.status === "success"
                        ? "timeline-success"
                        : step.status === "rejected"
                        ? "timeline-rejected"
                        : "timeline-pending";
                    const statusText =
                      step.status === "success"
                        ? "Đã hoàn thành"
                        : step.status === "rejected"
                        ? "Thất bại"
                        : "Đang chờ";

                    return (
                      <div
                        key={step.key}
                        className={`timeline-item ${statusClass}`}
                        role="listitem"
                        aria-label={step.title}
                      >
                        <div className="timeline-marker" aria-hidden>
                          <span className="timeline-icon">
                            {step.status === "success" && "✓"}
                            {step.status === "pending" && "•"}
                            {step.status === "rejected" && "✕"}
                          </span>
                          {!isLast && <span className="timeline-connector" />}
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-title-row">
                            <div className="timeline-title">{step.title}</div>
                            <span className={`timeline-badge ${statusClass}`}>
                              {statusText}
                            </span>
                          </div>
                          <div className="timeline-desc">{step.detail}</div>
                          {step.status === "rejected" && (
                            <div className="timeline-reject-reason">
                              <span className="reject-label-inline">Lý do:</span>
                              <span className="reject-text-inline">
                                {step.rejectReason ||
                                  step.detail ||
                                  "Không rõ lý do"}
                              </span>
                            </div>
                          )}
                          {step.key !== "candidate" &&
                            step.key !== "training" &&
                            step.key !== "handover" && (
                              <div className="timeline-meta">
                                Người thực hiện: {step.actor}
                              </div>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ghi chú: chỉ hiển thị khi THỰC SỰ có ghi chú, và chỉ đọc */}
              {hasNote && (
                <div className="section-block">
                  <div className="section-header">
                    <h4>Ghi chú</h4>
                  </div>
                  <textarea
                    className="note-input note-readonly"
                    value={note}
                    readOnly
                    onFocus={(e) => e.target.blur()}
                  />
                </div>
              )}

              {(isApproved || isCanceled) && (
                <p className="hint-text">
                  {isApproved &&
                    "Yêu cầu đã được phê duyệt — thao tác “Từ chối / Phê duyệt” không khả dụng."}
                  {isCanceled &&
                    "Yêu cầu đã bị từ chối — thao tác “Từ chối / Phê duyệt” không khả dụng."}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="hrmodal-footer">
              <div className="footer-left" />
              <div className="footer-actions">
                {showActionButtons && (
                  <>
                    <button
                      className={`btn-reject-main ${
                        disableActions ? "btn-disabled" : ""
                      }`}
                      onClick={handleStartReject}
                      disabled={disableActions}
                    >
                      Từ chối
                    </button>

                    <button
                      className={`btn-approve-main ${
                        disableActions ? "btn-disabled" : ""
                      }`}
                      onClick={handleApprove}
                      disabled={disableActions}
                    >
                      Phê duyệt và Khởi tạo
                    </button>
                  </>
                )}

                {!showActionButtons && (
                  <button className="btn-close-main" onClick={onClose}>
                    Đóng
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== BƯỚC 2: MODAL LÝ DO TỪ CHỐI ====== */}
      {showRejectModal && (
        <Modal
          title="Lý do Từ chối Nhu cầu"
          onClose={() => setShowRejectModal(false)}
          width={520}
        >
          <div className="reject-form">
            <label htmlFor="rejectReason" className="reject-label">
              Vui lòng nhập lý do từ chối nhu cầu:{" "}
              <span className="reject-plan-name">"{request.requestTitle}"</span>
            </label>
            <textarea
              id="rejectReason"
              className="reject-textarea"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do cụ thể, rõ ràng để người lập nhu cầu dễ dàng điều chỉnh..."
            />
          </div>
          <div className="modal-footer modal-footer-actions">
            <button
              className="modal-btn btn-secondary"
              onClick={() => setShowRejectModal(false)}
            >
              Hủy
            </button>
            <button
              className="modal-btn btn-reject"
              onClick={handleSubmitReject}
              disabled={!rejectReason.trim() || loading}
            >
              Xác nhận từ chối
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
