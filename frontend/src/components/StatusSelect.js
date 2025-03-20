import React from "react";
import './StatusSelect.css';

const StatusSelect = ({ value, onChange }) => {
    // Убедимся, что значение всегда определено
    const currentStatus = value || "Бронь";

    return (
        <select 
            value={currentStatus}
            onChange={(e) => onChange(e.target.value)}
            className={`status-select status-${currentStatus.toLowerCase()}`}
        >
            <option value="Бронь">Бронь</option>
            <option value="Выдано">Выдано</option>
            <option value="Возвращено">Возвращено</option>
        </select>
    );
};

export default StatusSelect;