import React, { useState, useEffect } from "react";
import "./styles.css";

function EquipmentSelect({ onSelect, onClose }) {
  const [equipmentList, setEquipmentList] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  console.log("Компонент EquipmentSelect ререндерится");

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/inventory") // Убедись, что сервер доступен
      .then((res) => {
        console.log("Статус ответа:", res.status);
        return res.json(); // Преобразуем в JSON
      })
      .then((data) => {
        console.log("Загруженные данные:", data);
        setEquipmentList(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Ошибка загрузки оборудования:", err));
  }, []); // ✅ Пустой массив предотвращает бесконечный ререндер

  const toggleSelection = (itemName) => {
    setSelectedItems((prevSelected) =>
      prevSelected.includes(itemName)
        ? prevSelected.filter((item) => item !== itemName)
        : [...prevSelected, itemName]
    );
  };

  return (
    <div className="modal">
      <h3>Выберите оборудование</h3>
      <ul className="equipment-list">
        {equipmentList.length > 0 ? (
          equipmentList.map((item) => (
            <li key={item.id} className="equipment-item">
              <label>
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.name)}
                  onChange={() => toggleSelection(item.name)}
                />
                {item.name} (Доступно: {item.total - item.rented})
              </label>
            </li>
          ))
        ) : (
          <p>Загрузка...</p>
        )}
      </ul>
      <button onClick={() => onSelect(selectedItems)}>Готово</button>
      <button onClick={onClose}>Отмена</button>
    </div>
  );
}

export default EquipmentSelect;