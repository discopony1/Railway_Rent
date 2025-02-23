import React from "react";

function ConflictsColumn({ startDate, startTime, endDate, endTime }) {
  let conflictMessage = "";

  if (!startDate || !startTime || !endDate || !endTime) {
    conflictMessage = "❌ Укажите дату и время";
  } else {
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    if (startDateTime >= endDateTime) {
      conflictMessage = "⚠️ Дата/время начала позже конца!";
    }
  }

  return <span>{conflictMessage}</span>;
}

export default ConflictsColumn;
