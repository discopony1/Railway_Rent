import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import API_BASE_URL from "../config";
import LoadingSpinner from "./LoadingSpinner";
import { getCategoryColor } from "../utils/categoryColors";
import "./EquipmentList.css";

const modalRoot = document.getElementById("modal-root") || (() => {
    const el = document.createElement("div");
    el.id = "modal-root";
    document.body.appendChild(el);
    return el;
})();

const EquipmentList = ({ onSelect, onClose, selectedEquipment, bookingsInfo, startDate, endDate, bookingId }) => {
    const listRef = useRef(null);
    const [equipment, setEquipment] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState(Array.isArray(selectedEquipment) ? selectedEquipment : []);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedCategories, setExpandedCategories] = useState({});

    // Синхронизация с внешним selectedEquipment
    useEffect(() => {
        if (Array.isArray(selectedEquipment)) {
            setSelectedItems(selectedEquipment);
        }
    }, [selectedEquipment]);

    useEffect(() => {
        const fetchEquipment = async () => {
            try {
                let url = `${API_BASE_URL}/inventory`;
                
                // Если указаны даты аренды, используем новый API endpoint для расчета доступности
                if (startDate && endDate) {
                    const params = new URLSearchParams({
                        start_date: startDate,
                        end_date: endDate,
                    });
                    
                    if (bookingId) {
                        params.append('exclude_booking_id', bookingId);
                    }
                    
                    // Передаем текущее оборудование для корректного расчета доступности
                    if (selectedEquipment && selectedEquipment.length > 0) {
                        const currentEquipmentJson = JSON.stringify(selectedEquipment);
                        params.append('current_equipment', currentEquipmentJson);
                    }
                    
                    url = `${API_BASE_URL}/inventory/available?${params.toString()}`;
                }

                const response = await fetch(url);
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
    }, [onClose, startDate, endDate, bookingId]);

    const updateQuantity = (itemId, newQuantity) => {
        setSelectedItems((prevSelected) =>
            prevSelected.map((item) => {
                if (item.id === itemId) {
                    // Находим оригинальное оборудование для получения максимального количества
                    const originalItem = equipment.find(eq => eq.id === itemId);
                    const maxAvailable = originalItem ? 
                        (originalItem.available !== undefined ? originalItem.available : originalItem.total - (originalItem.rented || 0)) 
                        : item.total;
                    
                    const finalQuantity = Math.max(1, Math.min(newQuantity || 1, maxAvailable));
                    return { ...item, quantity: finalQuantity };
                }
                return item;
            })
        );
    };
    
    // Функция для расчета реально доступного количества с учетом текущего выбора
    const getAvailableQuantity = (item) => {
        // Считаем общее количество выбранного оборудования с данным ID
        const selectedQuantity = selectedItems
            .filter(selected => selected.id === item.id)
            .reduce((sum, selected) => sum + (selected.quantity || 0), 0);
        
        // Backend уже учитывает current_usage в available, поэтому используем его напрямую
        // и вычитаем только дополнительно выбранное количество в текущей сессии
        const baseAvailable = item.available !== undefined 
            ? item.available 
            : item.total - (item.rented || 0);
        
        // Вычитаем количество из current_usage, так как оно уже учтено в available
        const currentUsage = item.current_usage || 0;
        const additionalSelected = Math.max(0, selectedQuantity - currentUsage);
            
        return Math.max(0, baseAvailable - additionalSelected);
    };

    const removeItem = (itemId, index) => {
        setSelectedItems((prevSelected) => 
            prevSelected.filter((item, idx) => !(item.id === itemId && idx === index))
        );
    };

    const toggleSelection = (item) => {
        setSelectedItems((prevSelected) => {
            if (!Array.isArray(prevSelected)) prevSelected = [];

            const existingItems = prevSelected.filter((selected) => selected.id === item.id);
            if (existingItems.length > 0) {
                // Если есть элементы с таким ID, удаляем все
                return prevSelected.filter((selected) => selected.id !== item.id);
            } else {
                // Если нет, добавляем новый элемент
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
        <>
            <div className="equipment-modal-overlay" />
            <div className="equipment-modal" ref={listRef}>
                <div className="equipment-modal-header">
                    <h3 className="equipment-modal-title">📦 Выберите оборудование</h3>
                    <button onClick={onClose} className="equipment-modal-close">×</button>
                </div>
                <div className="equipment-modal-content">

                {/* Отображение выбранного оборудования в виде блоков */}
                <div className="selected-equipment">
                    {selectedItems.map((selectedItem, index) => {
                        // Пытаемся найти категорию из текущего списка оборудования
                        const equipmentItem = equipment.find(eq => eq.id === selectedItem.id);
                        const category = equipmentItem ? equipmentItem.category : selectedItem.category;
                        const backgroundColor = getCategoryColor(category);
                        return (
                            <div 
                                key={`selected-${selectedItem.id}-${index}`} 
                                className="selected-item"
                                style={{ background: backgroundColor }}
                            >
                                <span className="remove-item" onClick={() => removeItem(selectedItem.id, index)}>×</span>
                                <span>{selectedItem.name} ×</span>
                                <input
                                    type="number"
                                    value={selectedItem.quantity || 1}
                                    onChange={(e) => updateQuantity(selectedItem.id, parseInt(e.target.value) || 1)}
                                    min="1"
                                    max={selectedItem.available !== undefined ? selectedItem.available : 
                                        (typeof selectedItem.total === 'number' ? selectedItem.total : 0) -
                                        (typeof selectedItem.rented === 'number' ? selectedItem.rented : 0)
                                    }
                                    className="selected-quantity"
                                />
                            </div>
                        );
                    })}
                </div>

                <input
                    type="text"
                    placeholder="Поиск..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="equipment-search"
                />

                {loading ? (
                    <LoadingSpinner message="Загрузка оборудования..." />
                ) : (
                    <div className="equipment-list">
                        {isSearching ? (
                            filteredEquipment.map((item) => {
                                const selectedItemsCount = selectedItems.filter(selected => selected.id === item.id).length;
                                const availableQuantity = getAvailableQuantity(item);
                                const isAvailable = availableQuantity > 0;

                                return (
                                    <li key={item.id} className="equipment-item">
                                        <label className="equipment-label">
                                            <input
                                                type="checkbox"
                                                checked={selectedItemsCount > 0}
                                                onChange={() => toggleSelection(item)}
                                                disabled={!isAvailable && selectedItemsCount === 0}
                                            />
                                            <span>{item.name}</span>
                                        </label>
                                        <div className={`availability ${isAvailable ? "available" : "unavailable"}`}>
                                            {isAvailable ? `Доступно: ${availableQuantity}` : "Нет в наличии"}
                                            <div className="total-info">
                                                Всего: {item.total || 0} ед.
                                            </div>
                                            {item.occupied && item.occupied > 0 && (
                                                <div className="occupied-info">
                                                    Занято: {item.occupied} из {item.total}
                                                </div>
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
                                                const selectedItemsCount = selectedItems.filter(selected => selected.id === item.id).length;
                                                const availableQuantity = getAvailableQuantity(item);
                                                const isAvailable = availableQuantity > 0;

                                                return (
                                                    <li key={item.id} className="equipment-item">
                                                        <label className="equipment-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedItemsCount > 0}
                                                                onChange={() => toggleSelection(item)}
                                                                disabled={!isAvailable && selectedItemsCount === 0}
                                                            />
                                                            <span>{item.name}</span>
                                                        </label>
                                                        <div className={`availability ${isAvailable ? "available" : "unavailable"}`}>
                                                            {isAvailable ? `Доступно: ${availableQuantity}` : "Нет в наличии"}
                                                            <div className="total-info">
                                                                Всего: {item.total || 0} ед.
                                                            </div>
                                                            {item.occupied && item.occupied > 0 && (
                                                                <div className="occupied-info">
                                                                    Занято: {item.occupied} из {item.total}
                                                                </div>
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
            </div>
        </>,
        modalRoot
    );
};

export default EquipmentList;
