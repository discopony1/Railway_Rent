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

const EquipmentList = ({ onSelect, onClose, selectedEquipment, bookingsInfo }) => {
    const listRef = useRef(null);
    const [equipment, setEquipment] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState(Array.isArray(selectedEquipment) ? selectedEquipment : []);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedCategories, setExpandedCategories] = useState({});

    useEffect(() => {
        const fetchEquipment = async () => {
            try {
                const params = new URLSearchParams();

                const response = await fetch(`${API_BASE_URL}/inventory?${params.toString()}`);
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

    const updateQuantity = (itemId, newQuantity) => {
        setSelectedItems((prevSelected) =>
            prevSelected.map((item) => {
                if (item.id === itemId) {
                    const availableQuantity = item.total - (item.rented || 0);
                    return { ...item, quantity: Math.max(1, Math.min(newQuantity || 1, availableQuantity)) };
                }
                return item;
            })
        );
    };

    const removeItem = (itemId) => {
        setSelectedItems((prevSelected) => prevSelected.filter((item) => item.id !== itemId));
    };

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

    const handleConfirm = () => {
        onSelect(Array.isArray(selectedItems) ? selectedItems : []);
        onClose();
    };

    const collator = new Intl.Collator("ru", { numeric: true, sensitivity: "base" });

    const groupedEquipment = equipment.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    Object.keys(groupedEquipment).forEach((category) => {
        groupedEquipment[category].sort((a, b) => collator.compare(a.name, b.name));
    });

    const toggleCategory = (category) => {
        setExpandedCategories((prev) => ({
            ...prev,
            [category]: !prev[category],
        }));
    };

    const filteredEquipment = equipment
        .filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => collator.compare(a.name, b.name));

    const isSearching = searchTerm.trim().length > 0;

    return ReactDOM.createPortal(
        <div className="equipment-modal" ref={listRef}>
            <div className="equipment-modal-content">
                <h3>Выберите оборудование</h3>

                {/* Отображение выбранного оборудования в виде блоков */}
                <div className="selected-equipment">
                    {selectedItems.map((item) => (
                        <div key={item.id} className="selected-item">
                            <span className="remove-item" onClick={() => removeItem(item.id)}>×</span>
                            <span>{item.name} ×</span>
                            <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                                min="1"
                                max={
                                    (typeof item.total === 'number' ? item.total : 0) -
                                    (typeof item.rented === 'number' ? item.rented : 0)
                                }
                                className="selected-quantity"
                            />
                        </div>
                    ))}
                </div>

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
                    <div className="equipment-list">
                        {isSearching ? (
                            filteredEquipment.map((item) => {
                                const selectedItem = selectedItems.find((selected) => selected.id === item.id);
                                const isAvailable = (item.total - (item.rented || 0)) > 0;

                                return (
                                    <li key={item.id} className="equipment-item">
                                        <label className="equipment-label">
                                            <input
                                                type="checkbox"
                                                checked={!!selectedItem}
                                                onChange={() => toggleSelection(item)}
                                            />
                                            <span>{item.name}</span>
                                        </label>
                                        <div className={`availability ${isAvailable ? "available" : "unavailable"}`}>
                                            {isAvailable ? `Доступно: ${item.total - (item.rented || 0)}` : "Нет в наличии"}
                                            {bookingsInfo && bookingsInfo[item.name] && bookingsInfo[item.name].length > 0 && (
                                                (console.log("Bookings for " + item.name + ":", bookingsInfo[item.name])),
                                                <ul>
                                                    {bookingsInfo[item.name].map((booking) => (
                                                        <li key={booking.id}>{booking.details}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                        
                                    </li>
                                );
                            })
                        ) : (
                            Object.entries(groupedEquipment).map(([category, items]) => (
                                <div key={category} className="equipment-category">
                                    <button className="category-toggle" onClick={() => toggleCategory(category)}>
                                        {expandedCategories[category] ? "▼" : "▶"} {category}
                                    </button>
                                    {expandedCategories[category] && (
                                        <ul>
                                            {items.map((item) => {
                                                const selectedItem = selectedItems.find((selected) => selected.id === item.id);
                                                const isAvailable = (item.total - (item.rented || 0)) > 0;

                                                return (
                                                    <li key={item.id} className="equipment-item">
                                                        <label className="equipment-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!selectedItem}
                                                                onChange={() => toggleSelection(item)}
                                                            />
                                                            <span>{item.name}</span>
                                                        </label>
                                                        <div className={`availability ${isAvailable ? "available" : "unavailable"}`}>
                                                            {isAvailable ? `Доступно: ${item.total - (item.rented || 0)}` : "Нет в наличии"}
                                                            {bookingsInfo && bookingsInfo[item.name] && bookingsInfo[item.name].length > 0 && (
                                                                (console.log("Bookings for " + item.name + ":", bookingsInfo[item.name])),
                                                                <ul>
                                                                    {bookingsInfo[item.name].map((booking) => (
                                                                        <li key={booking.id}>{booking.details}</li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                <div className="modal-buttons">
                    <button onClick={onClose} className="button button-cancel">Отмена</button>
                    <button onClick={handleConfirm} className="button button-confirm">Готово</button>
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default EquipmentList;
