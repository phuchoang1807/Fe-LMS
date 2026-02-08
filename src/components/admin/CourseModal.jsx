import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { useNotification } from '../../contexts/NotificationContext';
import { createCourse, updateCourse } from '../../services/courseService';
import "../../styles/editmodal.css"; // Dùng lại CSS modal có sẵn

export default function CourseModal({ isOpen, onClose, onSuccess, course }) {
    const [formData, setFormData] = useState({ courseName: '', durationDays: '', description: '' });
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotification();

    useEffect(() => {
        if (course) {
            setFormData({
                courseName: course.courseName,
                durationDays: course.durationDays || '',
                description: course.description || ''
            });
        } else {
            setFormData({ courseName: '', durationDays: '', description: '' });
        }
    }, [course, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (course) {
                await updateCourse(course.courseId, formData);
                showNotification("Cập nhật thành công", "success");
            } else {
                await createCourse(formData);
                showNotification("Thêm mới thành công", "success");
            }
            onSuccess();
            onClose();
        } catch (err) {
            showNotification(err.response?.data?.message || "Có lỗi xảy ra", "error");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            title={<span style={{ color: "#fff" }}>{course ? "Chỉnh sửa môn học" : "Thêm môn học"}</span>}
            onClose={onClose}
            width={500}
        >

            <form onSubmit={handleSubmit} className="modal-form-custom">
                <div className="form-group">
                    <label className="form-label">Tên môn học *</label>
                    <input
                        className="input-style"
                        value={formData.courseName}
                        onChange={e => setFormData({ ...formData, courseName: e.target.value })}
                        required
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Số ngày học (Dự kiến) *</label>
                    <input
                        type="number"
                        min="1"
                        className="input-style"
                        value={formData.durationDays}
                        onChange={e => setFormData({ ...formData, durationDays: e.target.value })}
                        required
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Mô tả</label>
                    <textarea
                        className="input-style"
                        rows="3"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>
                <div className="modal-footer">
                    <button type="button" className="modal-btn btn-secondary" onClick={onClose}>Hủy</button>
                    <button type="submit" className="modal-btn btn-save" disabled={loading}>
                        {loading ? 'Đang lưu...' : 'Lưu'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}