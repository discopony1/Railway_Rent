import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import API_BASE_URL from "../config";
import "./EquipmentList.css";

const modalRoot = document.getElementById("modal-root") || (() => {
    const el = document.createElement("div");
    el.id = "modal-root";
    document.body.appendChild(el);
    return el;
})();

const EquipmentList = ({ onSelect, onClose, selectedEquipment }) => {
    const listRef = useRef(null);
    const [equipment, setEquipment] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState(Array.isArray(selectedEquipment) ? selectedEquipment : []);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchEquipment = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/inventory`);
                if (!response.ok) {
                    throw new Error(`Ошибка загрузки: ${response.status}`);
                }
                const data = await response.json();
                setEquipment(data);
            } catch (error) {
                console.error("Ошибка загрузки оборудования:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEquipment();

        const handleClickOutside = (event) => {
            if (listRef.current && !listRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);

    const toggleSelection = (item) => {
        setSelectedItems((prevSelected) => {
            if (!Array.isArray(prevSelected)) prevSelected = [];

            const existingItem = prevSelected.find((selected) => selected.id === item.id);
            if (existingItem) {
                return prevSelected.filter((selected) => selected.id !== item.id);
            } else {
                return [...prevSelected, { ...item, quantity: 1 }];
            }
        });
    };

    const updateQuantity = (itemId, newQuantity) => {
        setSelectedItems((prevSelected) => {
            return prevSelected.map((item) =>
                item.id === itemId
                    ? { ...item, quantity: Math.min(Math.max(1, newQuantity || 1), item.quantity) }
                    : item
            );
        });
    };

    const handleConfirm = () => {
        onSelect(Array.isArray(selectedItems) ? selectedItems : []);
        onClose();
    };

    const filteredEquipment = equipment.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return ReactDOM.createPortal(
        <div className="equipment-modal" ref={listRef}>
            <div className="equipment-modal-content">
                <h3>Выберите оборудование</h3>
                <input
                    type="text"
                    placeholder="Поиск..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="equipment-search"
                />
                {loading ? (
                    <p>Загрузка...</p>
                ) : (
                    <ul className="equipment-list">
                        {filteredEquipment.map((item) => {
                            const selectedItem = selectedItems.find((selected) => selected.id === item.id);
                            const isAvailable = item.quantity > 0;

                            return (
                                <li key={item.id} className="equipment-item">
                                    <div className="equipment-controls">
                                        {selectedItem && (
                                            <div className="quantity-control">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateQuantity(item.id, selectedItem.quantity - 1);
                                                    }}
                                                    className="quantity-button"
                                                    disabled={selectedItem.quantity <= 1}
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    value={selectedItem.quantity}
                                                    onChange={(e) =>
                                                        updateQuantity(item.id, parseInt(e.target.value) || 1)
                                                    }
                                                    className="quantity-input"
                                                    min="1"
                                                    max={item.quantity}
                                                />
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateQuantity(item.id, selectedItem.quantity + 1);
                                                    }}
                                                    className="quantity-button"
                                                    disabled={selectedItem.quantity >= item.quantity}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        )}
                                        <label className="equipment-label">
                                            <input
                                                type="checkbox"
                                                checked={!!selectedItem}
                                                onChange={() => toggleSelection(item)}
                                            />
                                            <span>{item.name}</span>
                                        </label>
                                    </div>
                                    <div className={`availability ${isAvailable ? "available" : "unavailable"}`}>
                                        {isAvailable ? `Доступно: ${item.quantity}` : "Нет в наличии"}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <div className="modal-buttons">
                    <button onClick={onClose} className="button button-cancel">
                        Отмена
                    </button>
                    <button onClick={handleConfirm} className="button button-confirm">
                        Готово
                    </button>
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default EquipmentList;
