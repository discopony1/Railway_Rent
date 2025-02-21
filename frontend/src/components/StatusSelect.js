import React from "react";
import "./styles.css";

function StatusSelect({ status, onChange }) {
  return (
    <select value={status} onChange={(e) => onChange(e.target.value)}>
      <option value="Бронь">Бронь</option>
      <option value="Выдано">Выдано</option>
      <option value="Возвращено">Возвращено</option>
    </select>
  );
}

export default StatusSelect;
