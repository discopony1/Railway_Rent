import React, { useState, useEffect, useCallback } from 'react';
import './NotificationSystem.css';

let notificationId = 0;

const NotificationSystem = () => {
    const [notifications, setNotifications] = useState([]);

    // Функция для добавления нотификации
    const addNotification = useCallback((message, type = 'success') => {
        const id = ++notificationId;
        const notification = {
            id,
            message,
            type, // 'success', 'error', 'warning'
            timestamp: Date.now()
        };

        setNotifications(prev => {
            const newNotifications = [notification, ...prev];
            // Ограничиваем максимум 3 нотификации
            return newNotifications.slice(0, 3);
        });

        // Автоматическое удаление через 6 секунд
        setTimeout(() => {
            removeNotification(id);
        }, 6000);

        return id;
    }, []);

    // Функция для удаления нотификации
    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, []);

    // Экспорт функций для использования в других компонентах
    useEffect(() => {
        window.showNotification = addNotification;
        return () => {
            delete window.showNotification;
        };
    }, [addNotification]);

    return (
        <div className="notification-container">
            {notifications.map((notification, index) => (
                <div
                    key={notification.id}
                    className={`notification notification-${notification.type}`}
                    style={{
                        bottom: `${20 + index * 70}px`,
                        animationDelay: `${index * 100}ms`
                    }}
                    onClick={() => removeNotification(notification.id)}
                >
                    <div className="notification-content">
                        <div className="notification-icon">
                            {notification.type === 'success' && '✓'}
                            {notification.type === 'error' && '✕'}
                            {notification.type === 'warning' && '⚠'}
                        </div>
                        <div className="notification-message">
                            {notification.message}
                        </div>
                    </div>
                    <div className="notification-close">×</div>
                </div>
            ))}
        </div>
    );
};

export default NotificationSystem;

// Утилитарные функции для использования в других компонентах
export const showSuccess = (message) => {
    if (window.showNotification) {
        window.showNotification(message, 'success');
    }
};

export const showError = (message) => {
    if (window.showNotification) {
        window.showNotification(message, 'error');
    }
};

export const showWarning = (message) => {
    if (window.showNotification) {
        window.showNotification(message, 'warning');
    }
};
