import React, { useState } from "react";
import DateTimePicker from "./DateTimePicker";

const RentalForm = () => {
  const [rentalStart, setRentalStart] = useState({ date: "", time: "" });
  const [rentalEnd, setRentalEnd] = useState({ date: "", time: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Начало аренды:", rentalStart);
    console.log("Конец аренды:", rentalEnd);
  };

  return (
    <form className="rental-form" onSubmit={handleSubmit}>
      <DateTimePicker
        label="Начало аренды"
        value={rentalStart}
        onChange={setRentalStart}
      />
      <DateTimePicker
        label="Конец аренды"
        value={rentalEnd}
        onChange={setRentalEnd}
      />
      <button type="submit">Забронировать</button>
    </form>
  );
};

export default RentalForm;
