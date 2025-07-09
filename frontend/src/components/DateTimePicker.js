import React from "react";

const DateTimePicker = ({ label, value, onChange }) => {
  return (
    <div className="datetime-row">
      <label className="datetime-label">{label}</label>
      <div className="datetime-group">
        <input
          type="date"
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
        />
        <input
          type="time"
          value={value.time}
          step="900"
          onChange={(e) => onChange({ ...value, time: e.target.value })}
        />
      </div>
    </div>
  );
};

export default DateTimePicker;