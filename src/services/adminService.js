import api from './api';

/**
 * Lấy danh sách TẤT CẢ user (cho Admin)
 * Backend API: GET /api/admin/users
 */
export const getAllUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

/**
 * Cập nhật role VÀ status cho 1 user
 * Backend API: PUT /api/admin/users/{userId}/role
 * @param {string} userId - ID của user (UUID)
 * @param {string} roleName - Role mới
 * @param {boolean} status - Trạng thái hoạt động (true/false)
 */
export const assignRole = async (userId, roleName, status) => {
  const roleToSend = roleName || null;

  // ✅ Gửi cả roleName và status xuống backend
  const response = await api.put(`/admin/users/${userId}/role`, { 
    roleName: roleToSend,
    status: status 
  });

  return response.data; 
};

/**
 * Lấy danh sách tất cả các Role có sẵn trong hệ thống
 */
export const getAvailableRoles = async () => {
  return Promise.resolve(['SUPER_ADMIN', 'LEAD', 'QLDT', 'HR']);
};