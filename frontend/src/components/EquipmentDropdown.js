import React, { useState, useEffect, useRef } from "react";
import API_BASE_URL from "../config";
import LoadingSpinner from "./LoadingSpinner";
import { getCategoryColor } from "../utils/categoryColors";
import "./EquipmentDropdown.css";

const EquipmentDropdown = ({ 
    isOpen, 
    onClose, 
    onSelect, 
    selectedEquipment, 
    startDate, 
    endDate, 
    bookingId,
    position,
    triggerRef
}) => {
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);
    const [equipment, setEquipment] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Загрузка оборудования
    useEffect(() => {
        if (!isOpen) return;

        const fetchEquipment = async () => {
            try {
                let url = `${API_BASE_URL}/inventory`;
                
                if (startDate && endDate) {
                    const params = new URLSearchParams({
                        start_date: startDate,
                        end_date: endDate,
                    });
                    
                    if (bookingId) {
                        params.append('exclude_booking_id', bookingId);
                    }
                    
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
    }, [isOpen, startDate, endDate, bookingId, selectedEquipment]);

    // Фокус на поиске при открытии (без автоматического скролла)
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current.focus({ preventScroll: true });
            }, 100);
        }
    }, [isOpen]);

    // Блокировка скролла и обработка кликов вне выпадающего списка
    useEffect(() => {
        if (isOpen) {
            // Простая блокировка скролла
            document.body.classList.add('equipment-dropdown-open');
            
            const handleClickOutside = (event) => {
                const clickedInsideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
                const clickedOnTrigger = triggerRef && triggerRef.current && triggerRef.current.contains(event.target);
                
                if (!clickedInsideDropdown && !clickedOnTrigger) {
                    onClose();
                }
            };

            // Используем setTimeout чтобы избежать немедленного закрытия
            const timeoutId = setTimeout(() => {
                document.addEventListener("mousedown", handleClickOutside);
            }, 100);

            return () => {
                // Восстанавливаем состояние
                document.body.classList.remove('equipment-dropdown-open');
                clearTimeout(timeoutId);
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }
    }, [isOpen, onClose]);

    const handleEquipmentSelect = (item, event) => {
        const availableQuantity = getAvailableQuantity(item);
        
        // Считаем общее количество уже выбранного оборудования с таким ID
        const totalSelected = selectedEquipment
            .filter(eq => eq.id === item.id)
            .reduce((sum, eq) => sum + (eq.quantity || 0), 0);
            
        // Проверяем, можем ли мы добавить еще одну единицу
        const totalAvailable = item.total || 0;
        const occupied = item.occupied || 0;
        const reallyAvailable = totalAvailable - occupied;
        
        if (totalSelected < reallyAvailable) {
            // Если зажат Ctrl/Cmd, добавляем дубликат, иначе увеличиваем количество
            const addDuplicate = event?.ctrlKey || event?.metaKey;
            
            const existingItems = selectedEquipment.filter(eq => eq.id === item.id);
            
            if (existingItems.length > 0 && !addDuplicate) {
                // Увеличиваем количество первого найденного элемента
                const updatedEquipment = selectedEquipment.map(eq => {
                    if (eq.id === item.id && eq === existingItems[0]) {
                        const newQuantity = (eq.quantity || 1) + 1;
                        return { ...eq, quantity: newQuantity };
                    }
                    return eq;
                });
                onSelect(updatedEquipment);
            } else {
                // Добавляем новый элемент
                onSelect([...selectedEquipment, { ...item, quantity: 1 }]);
            }
        }
        
        // Не закрываем сразу, чтобы можно было выбрать несколько элементов
        setSearchTerm(""); // Очищаем поиск для следующего выбора
    };

    const getAvailableQuantity = (item) => {
        const selectedQuantity = selectedEquipment
            .filter(selected => selected.id === item.id)
            .reduce((sum, selected) => sum + (selected.quantity || 0), 0);
        
        const baseAvailable = item.available !== undefined 
            ? item.available 
            : item.total - (item.rented || 0);
        
        const currentUsage = item.current_usage || 0;
        const additionalSelected = Math.max(0, selectedQuantity - currentUsage);
            
        return Math.max(0, baseAvailable - additionalSelected);
    };

    const filteredEquipment = equipment.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    // Расчет адаптивной позиции и высоты
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const dropdownMaxHeight = Math.min(500, viewportHeight - 40); // 500px или высота экрана минус отступы
    const spaceBelow = viewportHeight - (position?.top || 0);
    const spaceAbove = (position?.top || 0);
    
    // Решаем, показывать ли dropdown вверх или вниз
    const showAbove = spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow;
    const finalTop = showAbove 
        ? Math.max(20, (position?.top || 0) - dropdownMaxHeight - 10)
        : (position?.top || 0);
        
    // Проверяем, чтобы dropdown не выходил за края экрана
    const finalLeft = Math.min((position?.left || 0), viewportWidth - 370); // 370 = ширина dropdown + отступ

    return (
        <div>
            <div 
                className="equipment-dropdown-overlay"
                onClick={onClose}
            />
            
            <div 
                className="equipment-dropdown"
                ref={dropdownRef}
                style={{
                    position: 'fixed',
                    top: `${finalTop}px`,
                    left: `${finalLeft}px`,
                    zIndex: 100000,
                    maxHeight: `${dropdownMaxHeight}px`
                }}
            >
            <div className="equipment-dropdown-header">
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Поиск оборудования..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="equipment-search-input"
                />
                <button onClick={onClose} className="dropdown-close">×</button>
            </div>

            <div className="equipment-dropdown-content">
                {loading ? (
                    <LoadingSpinner message="Загрузка..." />
                ) : (
                    <div className="equipment-list">
                        {filteredEquipment.length > 0 ? (
                            filteredEquipment.map((item) => {
                                const availableQuantity = getAvailableQuantity(item);
                                const isAvailable = availableQuantity > 0;
                                const backgroundColor = getCategoryColor(item.category);
                                
                                const selectedQuantity = selectedEquipment
                                    .filter(eq => eq.id === item.id)
                                    .reduce((sum, eq) => sum + (eq.quantity || 0), 0);
                                
                                return (
                                    <div
                                        key={item.id}
                                        className={`equipment-item ${isAvailable ? 'available' : 'unavailable'} ${selectedQuantity > 0 ? 'selected' : ''}`}
                                        onClick={(e) => handleEquipmentSelect(item, e)}
                                    >
                                        <div 
                                            className="equipment-color-indicator"
                                            style={{ backgroundColor: backgroundColor }}
                                        ></div>
                                        <div className="equipment-info">
                                            <div className="equipment-name">{item.name}</div>
                                            <div className="equipment-stats">
                                                <span className="stat available-stat">
                                                    Доступно: {availableQuantity}
                                                </span>
                                                <span className="stat total-stat">
                                                    Всего: {item.total || 0}
                                                </span>
                                                {selectedQuantity > 0 && (
                                                    <span className="stat selected-stat">
                                                        Выбрано: {selectedQuantity}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {selectedQuantity > 0 && (
                                            <div className="selection-indicator">✓</div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="no-results">
                                {searchTerm ? 'Оборудование не найдено' : 'Нет доступного оборудования'}
                            </div>
                        )}
                    </div>
                )}
            </div>
            </div>
        </div>
    );
};

export default EquipmentDropdown;
