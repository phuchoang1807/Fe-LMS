import React from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import './Notification.css'; // Sẽ tạo ở dưới

const Notification = () => {
    const { notification } = useNotification();

    // Nếu không có thông báo, không render gì cả
    if (!notification) {
        return null;
    }

    // Render thông báo (toast)
    return (
        <div className={`notification-toast ${notification.type}`}>
            {notification.msg}
        </div>
    );
};

export default Notification;