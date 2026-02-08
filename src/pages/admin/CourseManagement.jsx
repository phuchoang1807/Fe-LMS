import React, { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import { BookOpen, Edit3, GripVertical, Trash2 } from "lucide-react";
import { getCourses, deleteCourse, reorderCourses } from "../../services/courseService";
import { useNotification } from "../../contexts/NotificationContext";
import CourseModal from "../../components/admin/CourseModal";
import ConfirmModal from "../../components/ConfirmModal";
import "../../styles/admin.css";

export default function CourseManagement() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(false);

    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [draggedId, setDraggedId] = useState(null);
    
    // State cho Modal Thêm/Sửa
    const [showModal, setShowModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);

    // State cho Modal Xóa
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { showNotification } = useNotification();

    // ✅ FIX 1 & 2: Dùng useCallback để ổn định hàm, thêm dependency showNotification
    const normalizeCourseOrder = (list = []) =>
        list
            .map((course, idx) => ({
                ...course,
                displayOrder:
                    course?.displayOrder ??
                    course?.orderIndex ??
                    course?.sortOrder ??
                    course?.order ??
                    course?.position ??
                    idx + 1,
            }))
            .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    const fetchCourses = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getCourses();
            setCourses(normalizeCourseOrder(data));
        } catch (error) { // ✅ FIX 3: Đổi tên biến hoặc log ra console để tránh lỗi "unused vars"
            console.error("Failed to fetch courses:", error);
            showNotification("Lỗi tải danh sách môn học", "error");
        } finally {
            setLoading(false);
        }
    }, [showNotification]);

    // ✅ FIX 4: Thêm fetchCourses vào dependency array
    useEffect(() => { 
        fetchCourses(); 
    }, [fetchCourses]);

    const onDeleteClick = (id) => {
        setDeleteId(id);
        setShowConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await deleteCourse(deleteId);
            showNotification("Đã xóa môn học", "success");
            
            setShowConfirm(false);
            setDeleteId(null);
            fetchCourses();
        } catch (error) { // Tương tự, log error hoặc bỏ khai báo biến nếu không dùng
            console.error(error);
            showNotification(error.response?.data?.message || "Không thể xóa", "error");
            setShowConfirm(false);
        } finally {
            setIsDeleting(false);
        }
    };

     const handleDrop = async (targetId) => {
        if (!draggedId || draggedId === targetId) return;

        const updated = [...courses];
        const fromIndex = updated.findIndex((c) => c.courseId === draggedId);
        const toIndex = updated.findIndex((c) => c.courseId === targetId);

        if (fromIndex === -1 || toIndex === -1) return;

        const [moved] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, moved);
        const normalized = updated.map((c, idx) => ({
    ...c,
    displayOrder: idx + 1, // gán thứ tự mới theo vị trí MẢNG, KHÔNG sort lại
}));

setCourses(normalized);
setIsSavingOrder(true);

try {
    await reorderCourses(normalized.map((c) => c.courseId));
    showNotification("Đã cập nhật thứ tự môn học", "success");
} catch (error) {
    console.error("Failed to reorder courses", error);
    showNotification(
        error.response?.data?.message || "Không thể sắp xếp",
        "error"
    );
    fetchCourses(); // reload lại từ BE nếu lỗi
} finally {
    setDraggedId(null);
    setIsSavingOrder(false);
}

    };

    return (
        <Layout>
            <div className="breadcrumb-container fade-slide">
                <div className="breadcrumb-left">
                    <span className="breadcrumb-icon"><BookOpen size={20}/></span>
                    <span className="breadcrumb-item">Hệ thống</span>
                    <span className="breadcrumb-separator">&gt;</span>
                    <span className="breadcrumb-current">Quản lý môn học</span>
                </div>
            </div>

            <div className="user-page fade-slide">
                <div className="title-row">
                    <h2 className="page-title-small">Danh sách môn học</h2>
                    <div className="filter-bar">
                        <div className="filter-item add-btn-wrapper" style={{marginLeft: 'auto'}}>
                            <button className="add-plan-btn modern-add" onClick={() => { setSelectedCourse(null); setShowModal(true); }}>
                                ＋ Thêm môn học
                            </button>
                        </div>
                    </div>
                </div>

                <div className="table-container fade-in">
                    {loading ? <p className="loading-text">Đang tải...</p> : (
                        <table className="styled-table course-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 90 }}>Thứ tự</th>
                                    <th>Tên môn học</th>
                                    <th>Số ngày học</th>
                                    <th>Mô tả</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {courses.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center">Chưa có môn học nào</td></tr>
                                ) : courses.map((c, index) => (
                                    <tr
                                        key={c.courseId}
                                        draggable
                                        onDragStart={() => setDraggedId(c.courseId)}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => handleDrop(c.courseId)}
                                        className={draggedId === c.courseId ? "dragging-row" : ""}
                                    >
                                        <td className="order-cell">
                                            <span className="drag-handle" title="Kéo để sắp xếp">
                                                <GripVertical size={18} />
                                            </span>
                                            <span className="order-badge">{index + 1}</span>
                                        </td>
                                        <td style={{fontWeight: 600, color: '#0f172a'}}>{c.courseName}</td>
                                        <td>
                                            <span className="status-badge status-new" style={{fontSize: '0.9rem'}}>
                                                {c.durationDays} ngày
                                            </span>
                                        </td>
                                        <td>{c.description || "—"}</td>
                                        
                                        <td className="actions-cell">
                                            <div className="btn-group">
                                                <div className="btn-action-wrapper">
                                                    <button 
                                                        className="btn-action btn-edit" 
                                                        onClick={() => { setSelectedCourse(c); setShowModal(true); }}
                                                    >
                                                        <Edit3 size={18} />
                                                    </button>
                                                    <span className="action-tooltip">Chỉnh sửa</span>
                                                </div>

                                                <div className="btn-action-wrapper">
                                                    <button 
                                                        className="btn-action btn-reject-red" 
                                                        onClick={() => onDeleteClick(c.courseId)}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                    <span className="action-tooltip">Xóa</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                     {isSavingOrder && <p className="saving-text">Đang lưu thứ tự mới...</p>}
                </div>
            </div>

            <CourseModal 
                isOpen={showModal} 
                onClose={() => setShowModal(false)} 
                course={selectedCourse} 
                onSuccess={fetchCourses} 
            />

            <ConfirmModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleConfirmDelete}
                title="Xác nhận xóa"
                message="Bạn có chắc chắn muốn xóa môn học này? Hành động này không thể hoàn tác."
                isDanger={true}
                confirmLabel="Xóa"
                isLoading={isDeleting}
            />
        </Layout>
    );
}