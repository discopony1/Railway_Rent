import React from "react";
import "./styles.css";

const StatusSelect = ({ status, onChange }) => {
  const statusOptions = ['Бронь', 'Выдано', 'Возвращено'];

  return (
    <select value={status} onChange={(e) => onChange(e.target.value)}>
      {statusOptions.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
};

export default StatusSelect;