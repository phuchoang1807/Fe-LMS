import React, { createContext, useState, useContext } from 'react';

// 1. Tạo Context
const NotificationContext = createContext();

// 2. Tạo Provider (Component cha)
export const NotificationProvider = ({ children }) => {
    const [notification, setNotification] = useState(null); // { msg: '', type: 'success' | 'error' }

    // Hàm để kích hoạt thông báo
    const showNotification = (msg, type = 'success') => {
        setNotification({ msg, type });

        // Tự động ẩn sau 3 giây
        setTimeout(() => {
            setNotification(null);
        }, 3000);
    };

    return (
        <NotificationContext.Provider value={{ notification, showNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};

// 3. Tạo Custom Hook (để dễ sử dụng)
// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = () => {
    return useContext(NotificationContext);
};