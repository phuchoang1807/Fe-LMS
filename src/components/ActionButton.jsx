// src/components/ActionButtons.jsx
import { Eye, Pencil, CheckCircle2, XCircle } from "lucide-react";

export default function ActionButtons({
  onView,
  onEdit,
  onApprove,
  onReject,
  canAct = false, // chỉ NEW = true
}) {
  const common = "btn-action";
  const dis = !canAct ? " disabled" : "";

  // chặn click khi disabled (vẫn cho hover hiện tooltip)
  const guard = (fn) => (e) => {
    if (!canAct) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      return;
    }
    fn?.(e);
  };

  return (
    <div className="btn-group">
      {/* Xem: luôn cho phép */}
      <span className="btn-action-wrapper">
        <button
          type="button"
          className={`${common} btn-view`}
          onClick={onView}
          title="Xem chi tiết"
        >
          <Eye size={18} />
        </button>
        <span className="action-tooltip">Xem</span>
      </span>

      {/* Sửa: chỉ NEW */}
      <span className="btn-action-wrapper">
        <button
          type="button"
          className={`${common} btn-edit${dis}`}
          onClick={guard(onEdit)}
          title={canAct ? "Chỉnh sửa" : "Chỉ trạng thái NEW mới được sửa"}
        >
          <Pencil size={18} />
        </button>
        <span className="action-tooltip">Chỉnh sửa</span>
      </span>

      {/* Từ chối: chỉ NEW */}
      <span className="btn-action-wrapper">
        <button
          type="button"
          className={`${common} btn-reject${dis}`}
          onClick={guard(onReject)}
          title={canAct ? "Từ chối" : "Chỉ trạng thái NEW mới được thao tác"}
        >
          <XCircle size={18} />
        </button>
        <span className="action-tooltip">Từ chối</span>
      </span>

      {/* Phê duyệt & Khởi tạo: chỉ NEW */}
      <span className="btn-action-wrapper">
        <button
          type="button"
          className={`${common} btn-approve${dis}`}
          onClick={guard(onApprove)}
          title={canAct ? "Phê duyệt & Khởi tạo" : "Chỉ trạng thái NEW mới được thao tác"}
        >
          <CheckCircle2 size={18} />
        </button>
        <span className="action-tooltip">Phê duyệt & Khởi tạo</span>
      </span>
    </div>
  );
}
