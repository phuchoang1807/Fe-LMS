import React, { useState, useEffect, useMemo } from "react";
import Layout from "../../components/Layout";
import { UserCog, Edit3, Search, RefreshCw } from "lucide-react"; 
import { getAllUsers, getAvailableRoles } from "../../services/adminService";
import { useNotification } from "../../contexts/NotificationContext";
import EditUserModal from "../../components/admin/EditUserModal";
import Pagination from "../../components/Pagination";
import "../../styles/admin.css"; 

export default function UserManagement() {
  const { showNotification } = useNotification();

  const [users, setUsers] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchName, setSearchName] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersData, rolesData] = await Promise.all([
          getAllUsers(),
          getAvailableRoles(),
        ]);
        setUsers(usersData);
        setAvailableRoles(rolesData);
      } catch (err) {
        showNotification("Không thể tải danh sách tài khoản!", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showNotification]);

  // --- Filter ---
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesName = u.fullName?.toLowerCase().includes(searchName.toLowerCase()) || 
                          u.email?.toLowerCase().includes(searchName.toLowerCase());
      const matchesRole = roleFilter ? u.currentRoleName === roleFilter : true;
      return matchesName && matchesRole;
    });
  }, [users, searchName, roleFilter]);

  // --- Pagination ---
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirst, indexOfLast);

  const handleChangeItemsPerPage = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentPage(page);
      setIsAnimating(false);
    }, 180);
  };

  const handleShowModal = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const handleSaveSuccess = (updatedUser) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === updatedUser.id
          // Cập nhật lại toàn bộ thông tin mới từ Modal trả về (bao gồm status)
          ? { ...u, ...updatedUser }
          : u
      )
    );
    handleCloseModal();
  };

  // ✅ HÀM HELPER: Lấy nhãn hiển thị (Label)
  const getStatusLabel = (status) => {
    // So sánh chính xác với true để tránh lỗi logic
    return status === true ? "Hoạt động" : "Đã khóa";
  };

  // ✅ HÀM HELPER: Lấy class CSS màu sắc (Badge)
  const getStatusClass = (status) => {
    return status === true ? "status-completed" : "status-failed"; 
  };

  return (
    <Layout>
      {/* === Breadcrumb === */}
      <div className="breadcrumb-container fade-slide">
        <div className="breadcrumb-left">
          <span className="breadcrumb-icon"><UserCog size={20}/></span>
          <span className="breadcrumb-item">Hệ thống</span>
          <span className="breadcrumb-separator">&gt;</span>
          <span className="breadcrumb-current">Quản lý người dùng</span>
        </div>

        <div className="breadcrumb-right">
          <div className="mini-pagination">
            <label className="mini-pagination-label">Hiển thị:</label>
            <select
              value={itemsPerPage}
              onChange={handleChangeItemsPerPage}
              className="mini-pagination-select"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
      </div>

      {/* === CONTENT === */}
      <div className="user-page fade-slide">
        <div className="title-row">
          <h2 className="page-title-small">Danh sách tài khoản</h2>

          {/* --- Bộ lọc --- */}
          <div className="filter-bar">
            {/* 🔍 Tìm theo tên */}
            <div className="filter-item">
              <input
                type="text"
                className="filter-input"
                placeholder="Tìm tên hoặc email..."
                value={searchName}
                onChange={(e) => {
                    setSearchName(e.target.value);
                    setCurrentPage(1);
                }}
              />
              <span className="filter-icon"><Search size={16} /></span>
            </div>

            {/* 🎭 Lọc theo role */}
            <div className="filter-item">
              <select
                className="filter-select"
                value={roleFilter}
                onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setCurrentPage(1);
                }}
              >
                <option value="">Tất cả vai trò</option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            {/* 🔁 Nút reset */}
            <div className="filter-item clear-filters-wrapper">
              <button
                className="clear-filters-btn modern-reset"
                onClick={() => {
                  setSearchName("");
                  setRoleFilter("");
                  setCurrentPage(1);
                }}
                title="Làm mới bộ lọc"
              >
                <RefreshCw size={16} className="icon-refresh" />
                <span>Xóa bộ lọc</span>
              </button>
            </div>
          </div>
        </div>

        {/* === Table === */}
        <div className={`table-container ${isAnimating ? "fade-out" : "fade-in"}`}>
          {loading ? (
             <p className="loading-text">Đang tải dữ liệu...</p>
          ) : (
            <table className="styled-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Họ và tên</th>
                  <th>Email</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Vai trò</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
               {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center">Không tìm thấy tài khoản nào</td>
                  </tr>
                ) : (
                  currentUsers.map((u, index) => (
                    <tr key={u.id}>
                      <td className="text-center">{indexOfFirst + index + 1}</td>
                      <td>{u.fullName}</td>
                      <td>{u.email}</td>
                      
                      {/* ✅ ÁP DỤNG CÁCH MỚI Ở ĐÂY: Dùng hàm helper */}
                      <td className="text-center">
                        <span className={`status-badge ${getStatusClass(u.status)}`}>
                          {getStatusLabel(u.status)}
                        </span>
                      </td>

                      <td className="text-center">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString("vi-VN") : "—"}
                      </td>
                      <td className="text-center">
                        <span className={`status-badge ${u.currentRoleName ? 'status-new' : 'status-pending'}`}>
                          {u.currentRoleName || "Chưa gán"}
                        </span>
                      </td>
                      <td className="actions-cell text-center">
                        <div className="btn-action-wrapper">
                          <button
                            className="btn-action btn-edit"
                            onClick={() => handleShowModal(u)}
                            title="Chỉnh sửa & Phân quyền"
                          >
                            <Edit3 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* === Pagination === */}
        {filteredUsers.length > 0 && (
            <div className="pagination-bar">
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            />
            <div className="mini-pagination">
                <label className="mini-pagination-label">Hiển thị:</label>
                <select
                value={itemsPerPage}
                onChange={handleChangeItemsPerPage}
                className="mini-pagination-select"
                >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                </select>
            </div>
            </div>
        )}
      </div>

      {/* === Modal === */}
      {selectedUser && (
        <EditUserModal
          show={showModal}
          handleClose={handleCloseModal}
          user={selectedUser}
          availableRoles={availableRoles}
          onSaveSuccess={handleSaveSuccess}
        />
      )}
    </Layout>
  );
}