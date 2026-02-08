import React, { useState, useEffect } from 'react';
import { assignRole } from '../../services/adminService';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../Modal'; 
import Spinner from '../Utils/Spinner';
import "../../styles/editmodal.css"; // Import CSS mới

const EditUserModal = ({ show, handleClose, user, availableRoles, onSaveSuccess }) => {
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  
  const { showNotification } = useNotification();
  const { user: adminUser } = useAuth();

  useEffect(() => {
    if (user) {
      setSelectedRole(user.currentRoleName || '');
      setLocalError(null);
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (adminUser && adminUser.email === user.email) {
       setLocalError('Bạn không thể tự thay đổi role của chính mình.');
       return;
    }
    
    if (selectedRole === (user.currentRoleName || '')) {
      handleClose();
      return;
    }

    setLoading(true);
    setLocalError(null);

    try {
      await assignRole(user.id, selectedRole);
      showNotification('Cập nhật role thành công!', 'success');
      onSaveSuccess({ ...user, currentRoleName: selectedRole });
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
      title="Phân quyền người dùng" 
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
            value={user.fullName} 
            readOnly 
            disabled 
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input 
            type="text" 
            className="input-style" 
            value={user.email} 
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