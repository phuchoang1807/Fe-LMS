import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/authService';
import { useNotification } from '../contexts/NotificationContext';
import Input from '../components/Form/Input';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [apiError, setApiError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotification();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setApiError(null);

        try {
            const message = await forgotPassword({ email });

            // 1. Hiển thị thông báo thành công (2-3 giây)
            showNotification(message, 'success');
            setEmail('');

        } catch (err) {
            // 2. Hiển thị lỗi (dòng báo đỏ)
            const errorMsg = err.response?.data?.message || 'Email không tồn tại';
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
                <h2>Quên Mật Khẩu</h2>
                <p>Nhập email của bạn, chúng tôi sẽ gửi link khôi phục.</p>

                {apiError && <div className="api-error-box">{apiError}</div>}

                <Input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Nhập email đã đăng ký"
                    required
                />

                <button type="submit" disabled={loading} className="auth-button">
                    {loading ? 'Đang gửi...' : 'Gửi Email'}
                </button>

                <div className="auth-links">
                    <Link to="/login">Quay lại Đăng nhập</Link>
                </div>
            </form>
        </div>
    </div>
</div>
    );
};

export default ForgotPassword;