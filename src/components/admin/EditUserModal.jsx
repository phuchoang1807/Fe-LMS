import React, { useState, useEffect } from 'react';
import { assignRole } from '../../services/adminService';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../Modal'; 
import "../../styles/editmodal.css"; 

const EditUserModal = ({ show, handleClose, user, availableRoles, onSaveSuccess }) => {
  const [selectedRole, setSelectedRole] = useState(user?.currentRoleName || '');
  
  // ✅ Fix: Đảm bảo luôn là boolean, tránh undefined
  const [status, setStatus] = useState(user?.status ?? true);
  
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  
  const { showNotification } = useNotification();
  const { user: adminUser } = useAuth();

  // ✅ Fix: Khi prop 'user' thay đổi, cập nhật lại state an toàn
  useEffect(() => {
    if (user) {
      setSelectedRole(user.currentRoleName || '');
      // Nếu user.status là null/undefined thì mặc định là true
      setStatus(user.status ?? true); 
      setLocalError(null);
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (adminUser && adminUser.email === user.email) {
       setLocalError('Bạn không thể tự thay đổi quyền của chính mình.');
       return;
    }
    
    // Kiểm tra xem có thay đổi gì không
    if (selectedRole === (user.currentRoleName || '') && status === user.status) {
      handleClose();
      return;
    }

    setLoading(true);
    setLocalError(null);

    try {
      await assignRole(user.id, selectedRole, status);
      
      showNotification('Cập nhật thành công!', 'success');
      
      onSaveSuccess({ 
        ...user, 
        currentRoleName: selectedRole, 
        status: status 
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Có lỗi xảy ra";
      setLocalError(msg);
    } finally {
      setLoading(false);
    }
  };
  
  if (!show || !user) return null;

  return (
    <Modal 
      title={<span style={{ color: "#fff" }}>Chỉnh sửa tài khoản</span>}
      onClose={handleClose} 
      width={500}
    >
      <form onSubmit={handleSubmit} className="modal-form-custom">
        
        {localError && (
          <div className="error-alert">
            {localError}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Họ và tên</label>
          <input 
            type="text" 
            className="input-style" 
            value={user.fullName || ''} 
            readOnly 
            disabled 
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input 
            type="text" 
            className="input-style" 
            value={user.email || ''} 
            readOnly 
            disabled 
          />
        </div>

        <div className="form-group">
          <label className="form-label">Vai trò (Role) <span style={{color: '#ef4444'}}>*</span></label>
          <select
            className="input-style"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            disabled={loading}
          >
            <option value="">-- Chưa gán Role --</option>
            {availableRoles.map(role => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Trạng thái hoạt động</label>
          <select
            className="input-style"
            // ✅ Fix quan trọng: Dùng String(status) an toàn hơn .toString()
            value={String(status)} 
            onChange={(e) => setStatus(e.target.value === 'true')}
            disabled={loading}
          >
            <option value="true">Hoạt động</option>
            <option value="false">Đã khóa</option>
          </select>
        </div>

        <div className="modal-footer">
          <button 
            type="button" 
            className="modal-btn btn-secondary" 
            onClick={handleClose} 
            disabled={loading}
          >
            Hủy
          </button>
          
          <button 
            type="submit" 
            className="modal-btn btn-save" 
            disabled={loading}
          >
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>

      </form>
    </Modal>
  );
};

export default EditUserModal;