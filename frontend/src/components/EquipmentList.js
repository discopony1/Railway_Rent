import React, { useEffect, useState } from "react";
import API_BASE_URL from "../config";  // Импортируем базовый URL

const EquipmentList = ({ onSelect, onClose }) => {
    const [equipment, setEquipment] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE_URL}/inventory`)  // Используем переменную вместо жесткой ссылки
            .then((res) => res.json())
            .then((data) => {
                setEquipment(data);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Ошибка загрузки оборудования:", error);
                setLoading(false);
            });
    }, []);

    return (
        <div className="modal">
            <div className="modal-content">
                <h3>Выберите оборудование</h3>
                {loading ? (
                    <p>Загрузка...</p>
                ) : (
                    <ul>
                        {equipment.map((item) => (
                            <li key={item.id}>
                                <button onClick={() => onSelect({ id: item.id, name: item.name})}>
                                    {item.name} | {item.available > 0 ? `Доступно: ${item.available}` : "❌ Нет в наличии"}
                                    {item.next_available && ` | Освободится: ${item.next_available}`}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <button onClick={onClose}>Закрыть</button>
            </div>
        </div>
    );
};

export default EquipmentList;
