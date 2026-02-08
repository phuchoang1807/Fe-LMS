import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/authService';
import { useNotification } from '../contexts/NotificationContext';
import Input from '../components/Form/Input';

const Register = () => {
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
    const [formErrors, setFormErrors] = useState({});
    const [apiError, setApiError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotification();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Hàm validate (kiểm tra phía client)
    const validateForm = () => {
        const errors = {};
        if (!formData.fullName) errors.fullName = 'Vui lòng nhập họ tên.';

        // Regex giống backend
        const passRegex = /^(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/;
        if (!passRegex.test(formData.password)) {
            errors.password = 'Mật khẩu phải ít nhất 8 ký tự, 1 chữ hoa, 1 ký tự đặc biệt.';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0; // true nếu không có lỗi
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError(null);

        // 1. Kiểm tra lỗi client trước
        if (!validateForm()) return;

        setLoading(true);

        try {
            const message = await register(formData);

            // 2. Hiển thị thông báo thành công (2-3 giây)
            showNotification(message, 'success');

            // 3. Chuyển về trang đăng nhập
            navigate('/login');

        } catch (err) {
            // 4. Hiển thị lỗi API (dòng báo đỏ)
            const errorMsg = err.response?.data?.message || 'Email này đã tồn tại';
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
                <h2>Đăng Ký</h2>

                {apiError && <div className="api-error-box">{apiError}</div>}

                <Input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Nhập họ và tên"
                    error={formErrors.fullName} // Lỗi client-side
                    required
                />
                <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Nhập email"
                    required
                />
                <Input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Ít nhất 8 ký tự, 1 hoa, 1 đặc biệt"
                    error={formErrors.password} // Lỗi client-side
                    required
                />

                <button type="submit" disabled={loading} className="auth-button">
                    {loading ? 'Đang tạo...' : 'Đăng Ký'}
                </button>

                <div className="auth-links">
                    <Link to="/login">Đã có tài khoản? Đăng nhập</Link>
                </div>
            </form>
        </div>
    </div>
</div>
    );
};

export default Register;