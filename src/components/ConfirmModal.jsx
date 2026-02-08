import React from "react";
import Modal from "./Modal";
import "../styles/admin.css"; // Để lấy style nút bấm

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Xác nhận hành động", 
  message = "Bạn có chắc chắn muốn thực hiện hành động này?",
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  isDanger = false, // Nếu true thì nút Confirm màu đỏ, false thì màu xanh
  isLoading = false
}) {
  if (!isOpen) return null;

  return (
    <Modal title={title} onClose={onClose} width={420}>
      <div style={{ padding: "10px 0 20px 0", color: "#374151", fontSize: "0.95rem", lineHeight: "1.5" }}>
        {message}
      </div>

      <div className="modal-footer" style={{ borderTop: "none", paddingTop: 0 }}>
        <button 
          className="modal-btn btn-secondary" 
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelLabel}
        </button>
        
        <button 
          className={`modal-btn ${isDanger ? "btn-reject" : "btn-save"}`} 
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? "Đang xử lý..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}