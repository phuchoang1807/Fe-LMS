import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";            // ✅ thêm
import "../styles/accountLockedModal.css";

const AccountLockedModal = () => {
  const { user, logoutUser } = useAuth();
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();                         // ✅ thêm

  useEffect(() => {
    const isLocked = user?.status === false || user?.status === "false";

    if (isLocked) {
      setVisible(true);
      document.body.classList.add("locked-modal-open");
    } else {
      setVisible(false);
      document.body.classList.remove("locked-modal-open");
    }

    return () => {
      document.body.classList.remove("locked-modal-open");
    };
  }, [user]);

  // ✅ Ấn Đóng -> logout + quay lại màn đăng nhập
  const handleCloseAndLogout = () => {
    logoutUser();
    setVisible(false);
    document.body.classList.remove("locked-modal-open");
    navigate("/login");
  };

  if (!visible) return null;

  return ReactDOM.createPortal(
    <div className="locked-overlay">
      <div className="locked-backdrop" />
      <div className="locked-modal" role="alertdialog" aria-modal="true">
        <div className="locked-icon">🔒</div>
        <h3>Tài khoản đã bị khóa</h3>
        <p>
          Tài khoản đang bị tạm khóa sử dụng dịch vụ.
          Vui lòng liên hệ Admin hoặc bộ phận liên quan để được hỗ trợ.
        </p>
        <div className="locked-actions">
          <button
            className="locked-button primary"
            onClick={handleCloseAndLogout}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AccountLockedModal;
