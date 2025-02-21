import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function Calendar({ onClose, onDateSelect }) {
  const handleDateChange = (selectedDate) => {
    if (onDateSelect) {
      onDateSelect(selectedDate);
      onClose(); // Закрываем календарь после выбора
    }
  };

  return (
    <div className="calendar-container">
      <DatePicker
        selected={null}
        onChange={handleDateChange}
        dateFormat="dd.MM.yyyy"
        inline
      />
    </div>
  );
}

export default Calendar;
