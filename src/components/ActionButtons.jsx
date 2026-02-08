// src/components/ActionButtons.jsx
import React from "react";
import { Eye, Edit2 } from "lucide-react";
import "../styles/request.css";

const ActionButtons = ({ 
  onView, 
  onEdit, 
  canEdit = true,           // ← THÊM PROP MỚI
  showBanOnDisabled = false // ← CHỈ DÙNG TRONG MODAL CHẤM ĐIỂM
}) => {
  return (
    <div className="btn-group">
      <div className="btn-action-wrapper">
        <button
          className="btn-action btn-view"
          onClick={onView}
          data-tooltip="Xem chi tiết"
        >
          <Eye size={18} />
        </button>
        <span className="action-tooltip">Xem chi tiết</span>
      </div>

      <div className="btn-action-wrapper">
        <button
          className={`btn-action btn-edit ${!canEdit ? "btn-edit-disabled" : ""} ${
            !canEdit && showBanOnDisabled ? "show-ban-effect" : ""
          }`}
          onClick={onEdit}
          disabled={!canEdit}
          data-tooltip={!canEdit ? "Không thể chỉnh sửa" : "Chỉnh sửa"}
        >
          <Edit2 size={18} />
        </button>
        <span className="action-tooltip">
          {!canEdit ? "Không thể chỉnh sửa" : "Chỉnh sửa"}
        </span>
      </div>
    </div>
  );
};

export default ActionButtons;