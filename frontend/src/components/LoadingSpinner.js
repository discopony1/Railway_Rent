import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', message = 'Загрузка...', overlay = false }) => {
    const sizeClass = `spinner-${size}`;
    
    const spinnerContent = (
        <div className={`loading-spinner ${sizeClass}`}>
            <div className="spinner-container">
                <div className="spinner-circle"></div>
                <div className="spinner-circle"></div>
                <div className="spinner-circle"></div>
            </div>
            {message && <p className="loading-message">{message}</p>}
        </div>
    );

    if (overlay) {
        return (
            <div className="loading-overlay">
                {spinnerContent}
            </div>
        );
    }

    return spinnerContent;
};

export default LoadingSpinner;
