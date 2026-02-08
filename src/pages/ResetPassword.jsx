import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { resetPassword } from '../services/authService';
import { useNotification } from '../contexts/NotificationContext';
import Input from '../components/Form/Input';

const ResetPassword = () => {
    // 1. Lấy token từ URL (chỉ lấy 1 lần)
    const [searchParams] = useSearchParams();
    const [token] = useState(searchParams.get('token')); // Dùng useState để giữ token

    const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
    const [formErrors, setFormErrors] = useState({});
    
    const [apiError, setApiError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotification();
    const navigate = useNavigate();

    // Đây là cờ (flag) để chống React StrictMode gọi 2 lần
    const effectRan = useRef(false);

    // 2. Kiểm tra token ngay khi tải trang (chỉ 1 lần)
    useEffect(() => {
        // Chỉ chạy logic nếu cờ là false
        if (effectRan.current === false) {
            if (!token) {
                setApiError('Lỗi: Không tìm thấy token. Vui lòng thử lại từ email.');
            }

            // Đánh dấu là đã chạy
            return () => {
                effectRan.current = true;
            };
        }
    }, [token]); // Chỉ chạy 1 lần khi có token

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // 3. Validate form (phía client)
    const validateForm = () => {
        const errors = {};
        if (formData.newPassword !== formData.confirmPassword) {
            errors.confirmPassword = 'Mật khẩu nhập lại không khớp.';
        }
        // Regex giống backend
        const passRegex = /^(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/;
        if (!passRegex.test(formData.newPassword)) {
            errors.newPassword = 'Mật khẩu phải ít nhất 8 ký tự, 1 chữ hoa, 1 ký tự đặc biệt.';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError(null);

        if (!validateForm()) return;
        if (!token) {
            setApiError('Lỗi: Token không hợp lệ.');
            return;
        }

        setLoading(true);

        try {
            const message = await resetPassword({
                token: token,
                newPassword: formData.newPassword
            });

            // 4. Thông báo và chuyển hướng
            showNotification(message, 'success');
            navigate('/login');

        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Token đã hết hạn hoặc không hợp lệ.';
            setApiError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-wrapper">
                <div className="login-card">
                    <form className="auth-form" onSubmit={handleSubmit}>
                <h2>Đặt Lại Mật Khẩu Mới</h2>

                {apiError && <div className="api-error-box">{apiError}</div>}

                {/* Ẩn form nếu không có token */}
                {token ? (
                    <>
                        <Input
                            type="password"
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                            placeholder="Nhập mật khẩu mới"
                            error={formErrors.newPassword}
                            required
                        />
                        <Input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Nhập lại mật khẩu mới"
                            error={formErrors.confirmPassword}
                            required
                        />
                        <button type="submit" disabled={loading} className="auth-button">
                            {loading ? 'Đang lưu...' : 'Đặt Lại Mật Khẩu'}
                        </button>
                    </>
                ) : (
                    <Link to="/forgot-password">Yêu cầu link mới</Link>
                )}

            </form>
        </div>
    </div>
</div>
    );
};

export default ResetPassword;