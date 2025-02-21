import React from "react";

function EquipmentList({ onClose }) {
  return (
    <div className="equipment-popup">
      <h3>Выберите оборудование</h3>
      <button onClick={onClose}>Закрыть</button>
      {/* Тут можно будет добавить список оборудования */}
    </div>
  );
}

export default EquipmentList;
