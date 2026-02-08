import React, { useEffect, useState, useRef } from 'react'; // 1. Thêm useRef
import { useSearchParams, Link } from 'react-router-dom';
import { verifyEmail } from '../services/authService';
import Spinner from '../components/Utils/Spinner';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('Đang xác thực tài khoản của bạn...');

  // 2. Tạo một ref để theo dõi
  // ref sẽ giữ nguyên giá trị của nó ngay cả khi component render lại
  const effectRan = useRef(false);

  useEffect(() => {
    // 3. Chỉ chạy logic nếu token tồn tại VÀ ref là false
    if (token && effectRan.current === false) {

      const doVerify = async () => {
        try {
          // Gọi API
          const successMsg = await verifyEmail(token);
          setStatus('success');
          setMessage(successMsg);
        } catch (err) {

          setStatus('error');
          setMessage(err.response?.data?.message || 'Token không hợp lệ hoặc đã hết hạn.');
        }
      };

      doVerify();

      return () => {
        effectRan.current = true;
      };
    } else if (!token) {
      setStatus('error');
      setMessage('Lỗi: Không tìm thấy token xác thực.');
    }
  }, [token]); // Chỉ chạy khi token thay đổi


  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <Spinner />
            <p>{message}</p>
          </>
        );
      case 'success':
        return (
          <>
            <p style={{ color: 'green' }}>{message}</p>
            <Link to="/login" className="auth-button" style={{ textDecoration: 'none', marginTop: '1rem' }}>
              Đi đến Đăng nhập
            </Link>
          </>
        );
      case 'error':
        return (
          <>
            <p style={{ color: 'red' }}>{message}</p>
            <Link to="/register" className="auth-button" style={{ textDecoration: 'none', marginTop: '1rem' }}>
              Thử đăng ký lại
            </Link>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-form" style={{ textAlign: 'center' }}>
        <h2>Xác Thực Tài Khoản</h2>
        {renderContent()}
      </div>
    </div>
  );
};

export default VerifyEmail;