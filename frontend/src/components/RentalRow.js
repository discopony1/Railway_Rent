import React, { useState, useEffect, useCallback } from "react";
import EquipmentList from "./EquipmentList";
import StatusSelect from "./StatusSelect";
import "./RentalRow.css";

// Вспомогательная функция для проверки конфликтов
const checkConflicts = (start_date, end_date, status) => {
    const now = new Date();
    const newConflicts = [];

    if (!start_date || !end_date) {
        newConflicts.push({ message: "❌ Укажите дату и время", severity: "error" });
    } else {
        const startDateTime = new Date(start_date);
        const endDateTime = new Date(end_date);

        if (startDateTime >= endDateTime) {
            newConflicts.push({ message: "⚠️ Дата/время начала позже конца!", severity: "error" });
        }

        if (startDateTime <= now && status === "Бронь") {
            newConflicts.push({
                message: "⚠️ Дата начала наступила, но статус не 'Выдано'",
                severity: "warning"
            });
        }

        if (endDateTime <= now && status !== "Возвращено") {
            newConflicts.push({
                message: "⚠️ Дата окончания прошла, но статус не 'Возвращено'",
                severity: "warning"
            });
        }
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
    const [showEquipmentList, setShowEquipmentList] = useState(false);
    const [conflicts, setConflicts] = useState([]);
    const [hoveredConflict, setHoveredConflict] = useState(false);
    const [editingField, setEditingField] = useState(null); // Для отслеживания редактируемого поля
    const [initialValues, setInitialValues] = useState({}); // Для хранения начальных значений полей

    // Функция для проверки и обновления конфликтов
    const updateConflictsAndAvailability = useCallback(() => {
        const newConflicts = checkConflicts(rental.start_date, rental.end_date, rental.status);
        setConflicts(newConflicts);
    }, [rental.start_date, rental.end_date, rental.status]);

    useEffect(() => {
        updateConflictsAndAvailability();
    }, [rental.start_date, rental.end_date, rental.status]);

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
            onUpdate(rental.id, {
                ...rental,
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
        onUpdate(rental.id, updatedRental);
    };

    const handleEquipmentChange = (selectedEquipment) => {
        const updatedRental = { ...rental, equipment: selectedEquipment };
        setRental(updatedRental);
        onUpdate(rental.id, updatedRental);
        setShowEquipmentList(false);
    };

    const handleRemoveEquipment = (equipmentName) => {
        const updatedEquipment = rental.equipment.filter(item => item.name !== equipmentName);
        setRental({ ...rental, equipment: updatedEquipment });
        onUpdate(rental.id, { ...rental, equipment: updatedEquipment });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${day}.${month} ${hours}:${minutes}`;
    };

    return (
        <tr onClick={handleClickEdit}>
            {/* Дата аренды */}
            <td style={{ textAlign: "center" }}>
                {isEditingRow === rental.id ? (
                    <>
                        С <input
                            type="datetime-local"
                            name="start_date"
                            value={rental.start_date ? new Date(rental.start_date).toISOString().slice(0, 16) : ""}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                        <div>---</div>
                        По <input
                            type="datetime-local"
                            name="end_date"
                            value={rental.end_date ? new Date(rental.end_date).toISOString().slice(0, 16) : ""}
                            onChange={handleChange}
                            onBlur={handleBlur}
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
                    />
                ) : (
                    <span>{rental.receiver}</span>
                )}
            </td>

            {/* Оборудование */}
            <td style={{ textAlign: "center" }}>
                <div className="equipment-container">
                    {rental.equipment?.map((eq, index) => (
                        <div key={index} className="equipment-tag-container">
                            <span className="equipment-tag">
                                {eq.name} × {eq.quantity || 1}
                            </span>
                            <button 
                                className="remove-equipment-button" 
                                onClick={() => handleRemoveEquipment(eq.name)}
                            >
                                ✖
                            </button>
                        </div>
                    ))}
                    <button 
                        onClick={() => setShowEquipmentList(true)} 
                        className="equipment-button"
                    >
                        Выбрать оборудование
                    </button>
                </div>

                {showEquipmentList && (
                    <EquipmentList
                        selectedEquipment={rental.equipment}
                        onSelect={handleEquipmentChange}
                        onClose={() => setShowEquipmentList(false)}
                    />
                )}
            </td>

            {/* Примечания */}
            <td style={{ textAlign: "center" }}>
                {isEditingRow === rental.id ? (
                    <input
                        type="text"
                        name="notes"
                        value={rental.notes || ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
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
                        onUpdate(rental.id, updatedRental);
                    }}
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
                        className="conflict-icon"
                        onMouseEnter={() => setHoveredConflict(true)} 
                        onMouseLeave={() => setHoveredConflict(false)} // При уходе с иконки скрыть всплывающее окно
                    >
                        ⚠️
                        {hoveredConflict && (
                            <div className="conflict-tooltip">
                                {conflicts[0]?.message}
                            </div>
                        )}
                    </span>
                ) : (
                    <span>✓</span>
                )}
            </td>

            {/* Удалить */}
            <td style={{ textAlign: "center" }}>
                <button onClick={() => onDelete(rental.id)} className="delete-button">✕</button>
            </td>
        </tr>
    );
};

export default RentalRow;
