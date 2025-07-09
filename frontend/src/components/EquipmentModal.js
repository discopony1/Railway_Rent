import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import API_BASE_URL from "../config";
import LoadingSpinner from "./LoadingSpinner";
import { getCategoryColor } from "../utils/categoryColors";
import "./EquipmentModal.css";

// Вспомогательная функция для проверки конфликтов
const checkConflicts = (start_date, end_date, status) => {
    const now = new Date();
    const newConflicts = [];

    if (!start_date || !end_date) {
        newConflicts.push({ 
            message: "❌ Укажите дату начала и окончания аренды", 
            severity: "error" 
        });
        return newConflicts;
    }

    const startDateTime = new Date(start_date);
    const endDateTime = new Date(end_date);

    // Конфликт 3: Дата возврата раньше даты выдачи
    if (startDateTime >= endDateTime) {
        newConflicts.push({ 
            message: "❌ Дата возврата не может быть раньше даты выдачи!", 
            severity: "error" 
        });
    }

    // Конфликт 1: Дата выдачи прошла, но статус "Бронь"
    if (startDateTime <= now && status === "Бронь") {
        newConflicts.push({
            message: "⚠️ Время выдачи уже прошло, но оборудование еще не выдано",
            severity: "warning"
        });
    }

    // Конфликт 2: Дата возврата прошла, но статус не "Возвращено"
    if (endDateTime <= now && (status === "Бронь" || status === "Выдано")) {
        newConflicts.push({
            message: "⚠️ Время возврата прошло, но оборудование еще не возвращено",
            severity: "warning"
        });
    }

    return newConflicts;
};

const EquipmentModal = ({ 
    isOpen, 
    onClose, 
    booking,
    onUpdate,
    selectedEquipment, 
    onEquipmentChange,
    onDelete
}) => {
    const [equipment, setEquipment] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [localSelectedEquipment, setLocalSelectedEquipment] = useState([]);
    const [allBookings, setAllBookings] = useState([]);
    const [rentalData, setRentalData] = useState({
        start_date: "",
        end_date: "",
        renter: "",
        issuer: "", 
        receiver: "",
        where: "в студии",
        status: "Бронь",
        notes: ""
    });

    // Инициализация данных аренды при открытии модального окна
    useEffect(() => {
        if (isOpen && booking) {
            setRentalData({
                start_date: booking.start_date || "",
                end_date: booking.end_date || "",
                renter: booking.renter || "",
                issuer: booking.issuer || "",
                receiver: booking.receiver || "",
                where: booking.where || "в студии",
                status: booking.status || "Бронь",
                notes: booking.notes || ""
            });
            // Инициализируем локальное выбранное оборудование
            setLocalSelectedEquipment([...(selectedEquipment || [])]);
        }
    }, [isOpen, booking, selectedEquipment]);

    // Загрузка оборудования
    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                
                // Загружаем оборудование
                let equipmentUrl = `${API_BASE_URL}/inventory`;
                
                if (rentalData.start_date && rentalData.end_date) {
                    const params = new URLSearchParams({
                        start_date: rentalData.start_date,
                        end_date: rentalData.end_date,
                    });
                    
                    if (booking?.id) {
                        params.append('exclude_booking_id', booking.id);
                    }
                    
                    // Всегда передаем текущее оборудование для правильного расчета доступности
                    const currentEquipmentJson = JSON.stringify(localSelectedEquipment || []);
                    params.append('current_equipment', currentEquipmentJson);
                    
                    equipmentUrl = `${API_BASE_URL}/inventory/available?${params.toString()}`;
                }

                // Загружаем все бронирования для расчета "Освободится"
                const [equipmentResponse, bookingsResponse] = await Promise.all([
                    fetch(equipmentUrl),
                    fetch(`${API_BASE_URL}/bookings`)
                ]);

                if (!equipmentResponse.ok) {
                    throw new Error(`Ошибка загрузки оборудования: ${equipmentResponse.status}`);
                }
                if (!bookingsResponse.ok) {
                    throw new Error(`Ошибка загрузки бронирований: ${bookingsResponse.status}`);
                }

                const equipmentData = await equipmentResponse.json();
                const bookingsData = await bookingsResponse.json();
                
                setEquipment(equipmentData);
                setAllBookings(bookingsData);
            } catch (error) {
                console.error("Ошибка загрузки данных:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOpen, rentalData.start_date, rentalData.end_date, booking?.id, localSelectedEquipment]);

    // Блокировка скролла при открытии модального окна
    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-open');
            return () => {
                document.body.classList.remove('modal-open');
            };
        }
    }, [isOpen]);

    const handleRentalDataChange = (field, value) => {
        const newData = { ...rentalData, [field]: value };
        setRentalData(newData);
        // Убираем автоматическое сохранение - теперь сохраняем только при клике на "Сохранить"
    };

    // Новая логика выбора оборудования: нельзя выбрать уже добавленное оборудование повторно
    const handleEquipmentSelect = (item, event) => {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        // Если оборудование уже выбрано, не позволяем выбрать его повторно
        if (localSelectedEquipment.some(eq => eq.id === item.id)) {
            return;
        }
        const availableQuantity = getAvailableQuantity(item);
        if (availableQuantity > 0) {
            setLocalSelectedEquipment([...localSelectedEquipment, { ...item, quantity: 1 }]);
        }
        setSearchTerm(""); // Очищаем поиск для следующего выбора
    };

    const handleEquipmentRemove = (equipmentIndex) => {
        const updatedEquipment = localSelectedEquipment.filter((item, index) => index !== equipmentIndex);
        setLocalSelectedEquipment(updatedEquipment);
    };

    const handleQuantityChange = (equipmentIndex, newQuantity) => {
        if (newQuantity <= 0) {
            handleEquipmentRemove(equipmentIndex);
            return;
        }
        
        // Получаем информацию об элементе для проверки доступного количества
        const currentItem = localSelectedEquipment[equipmentIndex];
        const availableQuantity = getAvailableQuantity(currentItem);
        
        // Ограничиваем количество доступным
        const limitedQuantity = Math.min(newQuantity, availableQuantity);
        
        const updatedEquipment = localSelectedEquipment.map((item, index) => {
            if (index === equipmentIndex) {
                return { ...item, quantity: limitedQuantity };
            }
            return item;
        });
        setLocalSelectedEquipment(updatedEquipment);
    };

    const handleSaveAndClose = () => {
        // Сохраняем данные аренды при закрытии
        if (onUpdate) {
            const updatedBooking = {
                ...booking,
                ...rentalData,
                // Форматируем даты правильно для сохранения
                start_date: formatDateForSaving(rentalData.start_date),
                end_date: formatDateForSaving(rentalData.end_date),
                equipment: localSelectedEquipment
            };
            onUpdate(booking.id, updatedBooking);
        }
        // Также обновляем выбранное оборудование через колбэк
        if (onEquipmentChange) {
            onEquipmentChange(localSelectedEquipment);
        }
        onClose();
    };

    const getAvailableQuantity = (item) => {
        const selectedQuantity = localSelectedEquipment
            .filter(selected => selected.id === item.id)
            .reduce((sum, selected) => sum + (selected.quantity || 0), 0);
        
        const totalQuantity = item.total || 0;
        const occupiedQuantity = item.occupied || 0;
        const baseAvailable = totalQuantity - occupiedQuantity;
        
        return Math.max(0, baseAvailable - selectedQuantity);
    };

    const getWillBeAvailable = (item) => {
        if (!rentalData.start_date || !rentalData.end_date) return null;
        
        const rentalStart = new Date(rentalData.start_date);
        const rentalEnd = new Date(rentalData.end_date);
        
        // Находим бронирования этого оборудования, которые пересекаются с нашими датами
        const conflictingBookings = allBookings.filter(booking => {
            if (!booking.equipment || booking.id === booking?.id) return false;
            
            const hasThisEquipment = booking.equipment.some(eq => eq.id === item.id);
            if (!hasThisEquipment) return false;
            
            const bookingStart = new Date(booking.start_date);
            const bookingEnd = new Date(booking.end_date);
            
            // Проверяем пересечение дат
            return bookingStart < rentalEnd && bookingEnd > rentalStart;
        });
        
        // Находим ближайшую дату освобождения
        let nearestReleaseDate = null;
        let willBeAvailableQuantity = 0;
        
        conflictingBookings.forEach(booking => {
            const bookingEnd = new Date(booking.end_date);
            const equipmentQuantity = booking.equipment
                .filter(eq => eq.id === item.id)
                .reduce((sum, eq) => sum + (eq.quantity || 0), 0);
            
            if (!nearestReleaseDate || bookingEnd < nearestReleaseDate) {
                nearestReleaseDate = bookingEnd;
                willBeAvailableQuantity = equipmentQuantity;
            }
        });
        
        return nearestReleaseDate ? {
            date: nearestReleaseDate,
            quantity: willBeAvailableQuantity
        } : null;
    };

    const filteredEquipment = equipment.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDateForInput = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const formatDateForSaving = (dateTimeValue) => {
        if (!dateTimeValue) return "";
        const date = new Date(dateTimeValue);
        // Возвращаем дату в локальном времени без конверсии в UTC
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    // Проверяем конфликты для текущих данных аренды
    const conflicts = checkConflicts(rentalData.start_date, rentalData.end_date, rentalData.status);

    if (!isOpen) return null;

    return createPortal(
        <div className="equipment-modal-overlay" onClick={handleSaveAndClose}>
            <div className="equipment-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="equipment-modal-header">
                    <h2>Выбор оборудования для аренды</h2>
                    <button onClick={onClose} className="modal-close-button">✕</button>
                </div>

                <div className="equipment-modal-body">
                    {/* Левая панель - информация об аренде */}
                    <div className="rental-info-panel">
                        <h3>Информация об аренде</h3>
                        
                        <div className="rental-field">
                            <label>Дата начала:</label>
                            <input
                                type="datetime-local"
                                value={formatDateForInput(rentalData.start_date)}
                                onChange={(e) => handleRentalDataChange('start_date', e.target.value)}
                                step="900"
                            />
                        </div>

                        <div className="rental-field">
                            <label>Дата окончания:</label>
                            <input
                                type="datetime-local"
                                value={formatDateForInput(rentalData.end_date)}
                                onChange={(e) => handleRentalDataChange('end_date', e.target.value)}
                                step="900"
                            />
                        </div>

                        <div className="rental-field">
                            <label>Арендатор:</label>
                            <input
                                type="text"
                                value={rentalData.renter}
                                onChange={(e) => handleRentalDataChange('renter', e.target.value)}
                                placeholder="Имя арендатора"
                            />
                        </div>

                        <div className="rental-field">
                            <label>Кто выдал:</label>
                            <input
                                type="text"
                                value={rentalData.issuer}
                                onChange={(e) => handleRentalDataChange('issuer', e.target.value)}
                                placeholder="Кто выдал"
                            />
                        </div>

                        <div className="rental-field">
                            <label>Кто принял:</label>
                            <input
                                type="text"
                                value={rentalData.receiver}
                                onChange={(e) => handleRentalDataChange('receiver', e.target.value)}
                                placeholder="Кто принял"
                            />
                        </div>

                        <div className="rental-field">
                            <label>Где:</label> 
                            <select
                                value={rentalData.where}
                                onChange={(e) => handleRentalDataChange('where', e.target.value)}
                            >
                                <option value="в студии">В студии</option>
                                <option value="на вынос">На вынос</option>
                            </select>
                        </div>

                        <div className="rental-field">
                            <label>Статус:</label>
                            <select
                                value={rentalData.status}
                                onChange={(e) => handleRentalDataChange('status', e.target.value)}
                            >
                                <option value="Бронь">Бронь</option>
                                <option value="Выдано">Выдано</option>
                                <option value="Возвращено">Возвращено</option>
                            </select>
                        </div>

                        <div className="rental-field">
                            <label>Примечания:</label>
                            <textarea
                                value={rentalData.notes}
                                onChange={(e) => handleRentalDataChange('notes', e.target.value)}
                                placeholder="Дополнительные примечания"
                                rows="3"
                            />
                        </div>
                    </div>

                    {/* Центральная панель - выбранное оборудование */}
                    <div className="selected-equipment-panel">
                        <h3>Выбранное оборудование</h3>
                        <div className="selected-equipment-list">
                            {localSelectedEquipment.length === 0 ? (
                                <div className="no-equipment-message">
                                    Оборудование не выбрано
                                </div>
                            ) : (
                                localSelectedEquipment.map((eq, index) => (
                                    <div key={index} className="selected-equipment-item">
                                        <div 
                                            className="equipment-color-bar"
                                            style={{ backgroundColor: getCategoryColor(eq.category) }}
                                        />
                                        <div className="equipment-details">
                                            <div className="equipment-name">{eq.name}</div>
                                            <div className="equipment-meta">
                                                Количество: 
                                                <input 
                                                    type="number"
                                                    min="1"
                                                    max={getAvailableQuantity(eq) + (eq.quantity || 0)}
                                                    value={eq.quantity || 1}
                                                    onChange={(e) => handleQuantityChange(index, parseInt(e.target.value))}
                                                    className="quantity-input"
                                                />
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleEquipmentRemove(index)}
                                            className="remove-equipment-button"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Правая панель - выбор оборудования */}
                    <div className="equipment-selection-panel">
                        <h3>Доступное оборудование</h3>
                        
                        <div className="equipment-search">
                            <input
                                type="text"
                                placeholder="🔍 Поиск оборудования..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="equipment-search-input"
                            />
                        </div>

                        <div className="equipment-list-container">
                            {loading ? (
                                <LoadingSpinner message="Загрузка..." />
                            ) : (
                                <div className="equipment-list">
                                    {filteredEquipment.length > 0 ? (
                                        filteredEquipment.map((item) => {
                                            const availableQuantity = getAvailableQuantity(item);
                                            const isAvailable = availableQuantity > 0;
                                            const backgroundColor = getCategoryColor(item.category);
                                            
                                            const selectedQuantity = localSelectedEquipment
                                                .filter(eq => eq.id === item.id)
                                                .reduce((sum, eq) => sum + (eq.quantity || 0), 0);
                                            
                                            const willBeAvailable = getWillBeAvailable(item);
                                            
                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`equipment-item ${isAvailable ? 'available' : 'unavailable'} ${selectedQuantity > 0 ? 'selected' : ''}`}
                                                    onClick={(e) => isAvailable && handleEquipmentSelect(item, e)}
                                                >
                                                    <div 
                                                        className="equipment-color-indicator"
                                                        style={{ backgroundColor: backgroundColor }}
                                                    />
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
                                                            {willBeAvailable && (
                                                                <span className="stat release-stat">
                                                                    Освободится: {willBeAvailable.quantity} ({willBeAvailable.date.toLocaleString()})
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

                <div className="equipment-modal-footer">
                    <button 
                        onClick={() => onDelete && onDelete(booking.id)} 
                        className="delete-button"
                    >
                        Удалить запись
                    </button>
                    <div className="conflicts-indicator">
                        {conflicts.length > 0 && (
                            <div className="conflicts-display">
                                {conflicts.map((conflict, index) => (
                                    <div 
                                        key={index} 
                                        className={`conflict-item ${conflict.severity}`}
                                        title={conflict.message}
                                    >
                                        {conflict.severity === 'error' ? '❌' : '⚠️'}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={handleSaveAndClose} className="save-button">
                        Сохранить и закрыть
                    </button>
                </div>
            </div>
        </div>,
        document.body || document.documentElement
    );
};

export default EquipmentModal;
