import React, { useState, useEffect, useCallback, useRef } from "react";
import EquipmentModal from "./EquipmentModal";
import StatusSelect from "./StatusSelect";
import API_BASE_URL from "../config";
import { getCategoryColor } from "../utils/categoryColors";
import "./RentalRow.css";

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

const RentalRow = ({ booking, onUpdate, onDelete, allRentals = [], inventory = [], isSelected, onSelect }) => {
    const [rental, setRental] = useState({
        ...booking,
        equipment: typeof booking.equipment === "string"
            ? JSON.parse(booking.equipment)
            : Array.isArray(booking.equipment)
                ? booking.equipment
                : []
    });
    const [showEquipmentModal, setShowEquipmentModal] = useState(false);
    const [conflicts, setConflicts] = useState([]);
    const [hoveredConflict, setHoveredConflict] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [equipmentWithCategories, setEquipmentWithCategories] = useState({}); // Для хранения категорий оборудования
    const [categoriesLoaded, setCategoriesLoaded] = useState(false); // Флаг загрузки категорий

    // Функция для проверки и обновления конфликтов
    const updateConflictsAndAvailability = useCallback(() => {
        const newConflicts = checkConflicts(rental.start_date, rental.end_date, rental.status);
        setConflicts(newConflicts);
    }, [rental.start_date, rental.end_date, rental.status]);

    useEffect(() => {
        updateConflictsAndAvailability();
    }, [rental.start_date, rental.end_date, rental.status]);

    // Загружаем информацию о категориях оборудования
    useEffect(() => {
        const fetchEquipmentCategories = async () => {
            try {
                const response = await fetch('http://127.0.0.1:5000/api/inventory');
                const equipmentData = await response.json();
                
                const categoriesMap = {};
                equipmentData.forEach(item => {
                    categoriesMap[item.name] = item.category;
                });
                
                setEquipmentWithCategories(categoriesMap);
                setCategoriesLoaded(true);
            } catch (error) {
                console.error("Ошибка загрузки категорий оборудования:", error);
                setCategoriesLoaded(true); // Устанавливаем флаг даже при ошибке
            }
        };

        // Загружаем сразу при монтировании компонента
        fetchEquipmentCategories();
    }, []);



    // Обработчик изменения данных в таблице (только локальное обновление)
    const handleChange = (e) => {
        const { name, value } = e.target;
        const updatedRental = { ...rental, [name]: value };
        setRental(updatedRental);
    };

    // Обработчик отправки данных на сервер при потере фокуса
    const handleBlur = (e) => {
        const { name, value } = e.target;
        const updatedRental = { ...rental, [name]: value };
        
        // Отправляем изменения на сервер только при потере фокуса
        const { id, ...rentalData } = updatedRental;
        onUpdate(rental.id, {
            ...rentalData,
            start_date: updatedRental.start_date || null,
            end_date: updatedRental.end_date || null,
            equipment: updatedRental.equipment ?? []
        });
    };

    const handleStatusChange = (status) => {
        const updatedRental = { ...rental, status };
        setRental(updatedRental);
        const { id, ...rentalData } = updatedRental;
        onUpdate(rental.id, rentalData);
    };

    const handleEquipmentChange = (selectedEquipment) => {
        const updatedRental = { ...rental, equipment: selectedEquipment };
        setRental(updatedRental);
        const { id, ...rentalData } = updatedRental;
        onUpdate(rental.id, rentalData);
    };

    const handleEquipmentButtonClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowEquipmentModal(true);
    };

    const handleRemoveEquipment = (equipmentIndex) => {
        const updatedEquipment = rental.equipment.filter((item, index) => index !== equipmentIndex);
        const updatedRental = { ...rental, equipment: updatedEquipment };
        setRental(updatedRental);
        const { id, ...rentalData } = updatedRental;
        onUpdate(rental.id, rentalData);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${day}.${month} ${hours}:${minutes}`;
    };

    // Функция для корректного форматирования даты для input type="date"
    const formatDateForDateInput = (dateString) => {
        if (!dateString) return "";
        
        // Создаем дату из строки
        const date = new Date(dateString);
        
        // Получаем компоненты даты в местном времени
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        
        return `${year}-${month}-${day}`;
    };

    // Функция для округления времени до ближайших 15 минут
    const roundToNearestQuarter = (dateTimeValue) => {
        const date = new Date(dateTimeValue);
        const minutes = date.getMinutes();
        const roundedMinutes = Math.round(minutes / 15) * 15;
        date.setMinutes(roundedMinutes);
        date.setSeconds(0);
        return date.toISOString().slice(0, 16);
    };

    // Функция для извлечения времени из даты для input type="time"
    const formatTimeForInput = (dateString) => {
        if (!dateString) return "09:00"; // По умолчанию 9:00
        
        const date = new Date(dateString);
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    };

    // Обработчик изменения времени
    const handleTimeChange = (e) => {
        const { name, value } = e.target;
        const isStartTime = name === "start_time";
        const dateName = isStartTime ? "start_date" : "end_date";
        const currentDate = rental[dateName];
        
        if (currentDate) {
            const date = new Date(currentDate);
            const [hours, minutes] = value.split(":");
            date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            const updatedRental = { ...rental, [dateName]: date.toISOString() };
            setRental(updatedRental);
        }
    };

    // Обработчик потери фокуса для времени
    const handleTimeBlur = (e) => {
        const { name, value } = e.target;
        const isStartTime = name === "start_time";
        const dateName = isStartTime ? "start_date" : "end_date";
        const currentDate = rental[dateName];
        
        if (currentDate) {
            const date = new Date(currentDate);
            const [hours, minutes] = value.split(":");
            date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            const updatedRental = { ...rental, [dateName]: date.toISOString() };
            setRental(updatedRental);
            
            // Отправляем изменения на сервер
            const { id, ...rentalData } = updatedRental;
            onUpdate(rental.id, {
                ...rentalData,
                start_date: updatedRental.start_date || null,
                end_date: updatedRental.end_date || null,
                equipment: updatedRental.equipment ?? []
            });
        }
    };

    return (
        <>
        <tr className={isSelected ? 'selected-row' : ''}>
            {/* Чекбокс для выделения */}
            <td style={{ textAlign: "center", width: "30px" }}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelect(e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                />
            </td>

            {/* Дата аренды */}
            <td style={{ textAlign: "center" }}>
                <div className="date-inputs-container">
                    <div className="date-input-group">
                        <label>С:</label>
                        <input
                            type="date"
                            name="start_date"
                            value={formatDateForDateInput(rental.start_date)}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            style={{ width: "85px", fontSize: "12px" }}
                        />
                        <input
                            type="time"
                            name="start_time"
                            value={formatTimeForInput(rental.start_date)}
                            step="900"
                            onChange={handleTimeChange}
                            onBlur={handleTimeBlur}
                            style={{ width: "60px", fontSize: "12px" }}
                        />
                    </div>
                    <div className="date-separator">↓</div>
                    <div className="date-input-group">
                        <label>По:</label>
                        <input
                            type="date"
                            name="end_date"
                            value={formatDateForDateInput(rental.end_date)}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            style={{ width: "85px", fontSize: "12px" }}
                        />
                        <input
                            type="time"
                            name="end_time"
                            value={formatTimeForInput(rental.end_date)}
                            step="900"
                            onChange={handleTimeChange}
                            onBlur={handleTimeBlur}
                            style={{ width: "60px", fontSize: "12px" }}
                        />
                    </div>
                </div>
            </td>

            {/* Имя арендатора */}
            <td style={{ textAlign: "center" }}>
                <input
                    type="text"
                    name="renter"
                    value={rental.renter || ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Имя арендатора"
                />
            </td>

            {/* Кто выдал */}
            <td style={{ textAlign: "center" }}>
                <input
                    type="text"
                    name="issuer"
                    value={rental.issuer || ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Кто выдаст"
                />
            </td>

            {/* Кто принял */}
            <td style={{ textAlign: "center" }}>
                <input
                    type="text"
                    name="receiver"
                    value={rental.receiver || ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Кто принял"
                />
            </td>

            {/* Оборудование */}
            <td style={{ textAlign: "center" }}>
                <div className="equipment-container">
                    {rental.equipment?.map((eq, index) => {
                        const category = equipmentWithCategories[eq.name];
                        const backgroundColor = categoriesLoaded ? getCategoryColor(category) : '#95a5a6';
                        
                        return (
                            <span 
                                key={index}
                                className={`equipment-tag ${!categoriesLoaded ? 'loading' : ''}`}
                                style={{ backgroundColor }}
                                title={categoriesLoaded ? `Категория: ${category || 'Неизвестно'}` : 'Загрузка категории...'}
                            >
                                <span className="equipment-tag-content">
                                    {eq.name} × {eq.quantity || 1}
                                </span>
                                <span 
                                    className="equipment-tag-remove"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveEquipment(index);
                                    }}
                                >
                                    ×
                                </span>
                            </span>
                        );
                    })}
                    <button 
                        type="button"
                        onClick={handleEquipmentButtonClick} 
                        className="equipment-button"
                    >
                        Выбрать оборудование
                    </button>
                </div>

                <EquipmentModal
                    isOpen={showEquipmentModal}
                    onClose={() => setShowEquipmentModal(false)}
                    booking={rental}
                    onUpdate={onUpdate}
                    selectedEquipment={rental.equipment}
                    onEquipmentChange={handleEquipmentChange}
                    onDelete={(id) => {
                        setShowEquipmentModal(false);
                        onDelete(id);
                    }}
                />
            </td>

            {/* Примечания */}
            <td style={{ textAlign: "center" }}>
                <textarea
                    name="notes"
                    value={rental.notes || ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Примечания..."
                    rows="1"
                    onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                />
            </td>

            {/* Где */}
            <td style={{ textAlign: "center" }}>
                <select
                    value={rental.where}
                    onChange={e => {
                        const updatedRental = { ...rental, where: e.target.value };
                        setRental(updatedRental);
                        const { id, ...rentalData } = updatedRental;
                        onUpdate(rental.id, rentalData);
                    }}
                    className={`where-select where-${rental.where?.replace(/\s+/g, '-').toLowerCase()}`}
                >
                    <option value="в студии">В студии</option>
                    <option value="на вынос">На вынос</option>
                </select>
            </td>

            {/* Статус */}
            <td style={{ textAlign: "center" }}>
                <StatusSelect
                    value={rental.status}
                    onChange={handleStatusChange}
                />
            </td>

            {/* Конфликты */}
            <td style={{ textAlign: "center" }}>
                {conflicts.length > 0 ? (
                    <span 
                        className={`conflict-icon warning`}
                        onMouseEnter={(e) => {
                            const rect = e.target.getBoundingClientRect();
                            setTooltipPosition({
                                x: rect.left + rect.width / 2,
                                y: rect.top - 10
                            });
                            setHoveredConflict(true);
                        }} 
                        onMouseLeave={() => setHoveredConflict(false)}
                    >
                        ⚠️
                    </span>
                ) : (
                    <span className="no-conflict">✅</span>
                )}
            </td>

            {/* Удалить */}
            <td style={{ textAlign: "center" }}>
                <button onClick={() => onDelete(rental.id)} className="delete-button">✕</button>
            </td>
        </tr>
        
        {/* Тултип для конфликтов */}
        {hoveredConflict && conflicts.length > 0 && (
            <div 
                className="conflict-tooltip"
                style={{
                    left: tooltipPosition.x,
                    top: tooltipPosition.y
                }}
            >
                <div className="conflict-header">Обнаружены конфликты:</div>
                {conflicts.map((conflict, index) => (
                    <div key={index} className={`conflict-item ${conflict.severity}`}>
                        {conflict.message}
                    </div>
                ))}
            </div>
        )}
        </>
    );
};

export default RentalRow;
