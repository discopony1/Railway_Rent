import React, { useState, useEffect, useRef } from "react";
import ReactDOM from 'react-dom';
import API_BASE_URL from "../config";
import './EquipmentList.css';

const EquipmentList = ({ onSelect, onClose, selectedEquipment }) => {
    const listRef = useRef(null);
    const [equipment, setEquipment] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState(Array.isArray(selectedEquipment) ? selectedEquipment : []);
    const [searchTerm, setSearchTerm] = useState("");
    const modalRoot = useRef(document.createElement('div'));

    useEffect(() => {
        modalRoot.current.id = 'modal-root';
        document.body.appendChild(modalRoot.current);

        return () => {
            document.body.removeChild(modalRoot.current);
        };
    }, []);
    
    useEffect(() => {
        fetch(`${API_BASE_URL}/inventory`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                setEquipment(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Ошибка загрузки оборудования:", error);
                setLoading(false);
            });

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
                const quantity = Math.min(1, item.available);
                return [...prevSelected, { ...item, quantity }];
            }
        });
    };

    const updateQuantity = (itemId, newQuantity, maxAvailable) => {
        if (!Array.isArray(selectedItems)) return;
        const quantity = Math.min(Math.max(1, newQuantity), maxAvailable);
        setSelectedItems(selectedItems.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
        ));
    };

    const handleConfirm = () => {
        onSelect(Array.isArray(selectedItems) ? selectedItems : []);
        onClose();
    };

    const filteredEquipment = equipment.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const modalContent = (
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
                            const selectedItem = Array.isArray(selectedItems) ? 
                                selectedItems.find(selected => selected.id === item.id) : null;
                            const isAvailable = item.available > 0;

                            return (
                                <li key={item.id} className="equipment-item">
                                    <div className="equipment-controls">
                                        {selectedItem && (
                                            <div className="quantity-control">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateQuantity(item.id, selectedItem.quantity - 1, item.available);
                                                    }}
                                                    className="quantity-button"
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    value={selectedItem.quantity}
                                                    onChange={(e) => updateQuantity(
                                                        item.id,
                                                        parseInt(e.target.value) || 1,
                                                        item.available
                                                    )}
                                                    className="quantity-input"
                                                />
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateQuantity(item.id, selectedItem.quantity + 1, item.available);
                                                    }}
                                                    className="quantity-button"
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
                                                disabled={!isAvailable && !selectedItem}
                                            />
                                            <span>{item.name}</span>
                                        </label>
                                    </div>
                                    <div className={`availability ${isAvailable ? 'available' : 'unavailable'}`}>
                                        {isAvailable ? `Доступно: ${item.available}` : "Нет в наличии"}
                                        {item.next_available && 
                                            <div className="next-available">
                                                Освободится: {item.next_available}
                                            </div>
                                        }
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
        </div>
    );

    return ReactDOM.createPortal(modalContent, modalRoot.current);
};

export default EquipmentList;