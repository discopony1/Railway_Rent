import React, { useState, useEffect, useCallback, useRef } from "react";
import EquipmentDropdown from "./EquipmentDropdown";
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

const RentalRow = ({ booking, onUpdate, onDelete, allRentals = [], inventory = [], isEditingRow, setIsEditingRow }) => {
    const [rental, setRental] = useState({
        ...booking,
        equipment: typeof booking.equipment === "string"
            ? JSON.parse(booking.equipment)
            : Array.isArray(booking.equipment)
                ? booking.equipment
                : []
    });
    const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const [conflicts, setConflicts] = useState([]);
    const [hoveredConflict, setHoveredConflict] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [editingField, setEditingField] = useState(null); // Для отслеживания редактируемого поля
    const [initialValues, setInitialValues] = useState({}); // Для хранения начальных значений полей
    const [equipmentWithCategories, setEquipmentWithCategories] = useState({}); // Для хранения категорий оборудования
    const [categoriesLoaded, setCategoriesLoaded] = useState(false); // Флаг загрузки категорий
    const rowRef = useRef(null); // Ссылка на строку для отслеживания кликов вне
    const equipmentButtonRef = useRef(null); // Ссылка на кнопку выбора оборудования

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

    // Обработка кликов вне строки для выключения редактирования
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (rowRef.current && !rowRef.current.contains(event.target) && isEditingRow === rental.id) {
                // Проверяем, что клик не по выпадающему списку оборудования
                const isDropdownClick = event.target.closest('.equipment-dropdown');
                                   
                if (!isDropdownClick) {
                    // Если клик вне строки и не по выпадающему списку, выключаем редактирование
                    setIsEditingRow(null);
                }
            }
        };

        // Добавляем обработчик только если строка в режиме редактирования
        if (isEditingRow === rental.id) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isEditingRow, rental.id, setIsEditingRow]);

    // Сохранение начальных значений при начале редактирования
    const handleClickEdit = () => {
        setIsEditingRow(rental.id); // Устанавливаем текущую строку как редактируемую
        setInitialValues({
            ...rental,  // Сохраняем начальные значения
        });
    };

    // Обработчик изменения данных в таблице
    const handleChange = (e) => {
        const { name, value } = e.target;
        setRental(prev => ({ ...prev, [name]: value }));
    };

    const handleBlur = () => {
        // Сравниваем старые и новые значения
        const changedFields = Object.keys(rental).filter(key => rental[key] !== initialValues[key]);

        // Если есть изменения, отправляем на сервер
        if (changedFields.length > 0) {
            const { id, ...rentalData } = rental;
            onUpdate(rental.id, {
                ...rentalData,
                start_date: rental.start_date || null,
                end_date: rental.end_date || null,
                equipment: rental.equipment ?? []
            });
        }

        setEditingField(null); // Снимаем редактируемое поле
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
        
        if (!showEquipmentDropdown) {
            const rect = e.target.getBoundingClientRect();
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            setDropdownPosition({
                top: rect.bottom + scrollTop + 5,
                left: rect.left + scrollLeft
            });
            setShowEquipmentDropdown(true);
        }
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

    // Функция для корректного форматирования даты для input datetime-local
    const formatDateForInput = (dateString) => {
        if (!dateString) return "";
        
        // Создаем дату из строки и корректируем часовой пояс
        const date = new Date(dateString);
        
        // Получаем компоненты даты в местном времени
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
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

    return (
        <>
        <tr ref={rowRef} onClick={handleClickEdit}>
            {/* Дата аренды */}
            <td style={{ textAlign: "center" }}>
                {isEditingRow === rental.id ? (
                    <>
                        С <input
                            type="datetime-local"
                            name="start_date"
                            value={formatDateForInput(rental.start_date)}
                            onChange={(e) => {
                                const roundedValue = roundToNearestQuarter(e.target.value);
                                handleChange({
                                    target: {
                                        name: e.target.name,
                                        value: roundedValue
                                    }
                                });
                            }}
                            onBlur={handleBlur}
                            step="900"
                        />
                        <div>---</div>
                        По <input
                            type="datetime-local"
                            name="end_date"
                            value={formatDateForInput(rental.end_date)}
                            onChange={(e) => {
                                const roundedValue = roundToNearestQuarter(e.target.value);
                                handleChange({
                                    target: {
                                        name: e.target.name,
                                        value: roundedValue
                                    }
                                });
                            }}
                            onBlur={handleBlur}
                            step="900"
                        />
                    </>
                ) : (
                    <>
                        С <span>{rental.start_date && formatDate(rental.start_date)}</span>
                        <div>---</div>
                        По <span>{rental.end_date && formatDate(rental.end_date)}</span>
                    </>
                )}
            </td>

            {/* Имя арендатора */}
            <td style={{ textAlign: "center" }}>
                {isEditingRow === rental.id ? (
                    <input
                        type="text"
                        name="renter"
                        value={rental.renter || ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Имя арендатора"
                    />
                ) : (
                    <span>{rental.renter}</span>
                )}
            </td>

            {/* Кто выдал */}
            <td style={{ textAlign: "center" }}>
                {isEditingRow === rental.id ? (
                    <input
                        type="text"
                        name="issuer"
                        value={rental.issuer || ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Кто выдаст"
                    />
                ) : (
                    <span>{rental.issuer}</span>
                )}
            </td>

            {/* Кто принял */}
            <td style={{ textAlign: "center" }}>
                {isEditingRow === rental.id ? (
                    <input
                        type="text"
                        name="receiver"
                        value={rental.receiver || ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Кто принял"
                    />
                ) : (
                    <span>{rental.receiver}</span>
                )}
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
                        ref={equipmentButtonRef}
                        type="button"
                        onClick={handleEquipmentButtonClick} 
                        className="equipment-button"
                    >
                        Выбрать оборудование
                    </button>
                </div>

                <EquipmentDropdown
                    isOpen={showEquipmentDropdown}
                    onClose={() => setShowEquipmentDropdown(false)}
                    onSelect={handleEquipmentChange}
                    selectedEquipment={rental.equipment}
                    startDate={rental.start_date}
                    endDate={rental.end_date}
                    bookingId={rental.id}
                    position={dropdownPosition}
                    triggerRef={equipmentButtonRef}
                />
            </td>

            {/* Примечания */}
            <td style={{ textAlign: "center" }}>
                {isEditingRow === rental.id ? (
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
                ) : (
                    <span>{rental.notes}</span>
                )}
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
