import React, { useState, useEffect } from "react";
import EquipmentList from "./EquipmentList";
import StatusSelect from "./StatusSelect";
import './RentalRow.css';

const RentalRow = ({ booking, onUpdate, onSave, onDelete }) => {
    const [rental, setRental] = useState(booking);
    const [showEquipmentList, setShowEquipmentList] = useState(false);
    const [conflicts, setConflicts] = useState([]);

    useEffect(() => {
        setRental(booking);
    }, [booking]);

    useEffect(() => {
        checkConflicts();
    }, [rental.start_date, rental.end_date, rental.status]);

    const checkConflicts = () => {
        const newConflicts = [];
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Almaty' }));

        if (!rental.start_date || !rental.end_date) {
            newConflicts.push({ message: "❌ Укажите дату и время", severity: "error" });
            setConflicts(newConflicts);
            return;
        }

        try {
            const startDateTime = new Date(rental.start_date);
            const endDateTime = new Date(rental.end_date);

            if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
                newConflicts.push({ message: "❌ Некорректный формат даты/времени", severity: "error" });
            }

            if (startDateTime <= now && rental.status === "Бронь") {
                newConflicts.push({ 
                    message: "⚠️ Дата начала наступила, но статус не 'Выдано'", 
                    severity: "warning" 
                });
            }

            if (endDateTime <= now && rental.status !== "Возвращено") {
                newConflicts.push({ 
                    message: "⚠️ Дата окончания прошла, но статус не 'Возвращено'", 
                    severity: "warning" 
                });
            }

            if (startDateTime >= endDateTime) {
                newConflicts.push({ message: "⚠️ Дата/время начала позже конца!", severity: "error" });
            }

            setConflicts(newConflicts);
        } catch (error) {
            setConflicts([{ message: "❌ Ошибка проверки дат", severity: "error" }]);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        const updatedRental = { ...rental, [name]: value };
        setRental(updatedRental);
        if (onUpdate) {
            onUpdate(rental.id, updatedRental);
        }
    };

    const handleSave = async () => {
        if (onSave) {
            const success = await onSave(rental.id, rental);
            if (success) {
                // Можно добавить уведомление об успешном сохранении
                console.log("Бронирование успешно сохранено");
            }
        }
    };

    return (
        <tr>
            <td className="rental-date-cell">
                <input
                    type="datetime-local"
                    name="start_date"
                    value={rental.start_date ? rental.start_date.slice(0, 16) : ""}
                    onChange={handleChange}
                    step="900"
                    className="rental-date-input"
                />
                <span className="rental-date-separator">-</span>
                <input
                    type="datetime-local"
                    name="end_date"
                    value={rental.end_date ? rental.end_date.slice(0, 16) : ""}
                    onChange={handleChange}
                    step="900"
                    className="rental-date-input"
                />
            </td>

            <td>
                <input 
                    type="text" 
                    name="renter" 
                    value={rental.renter || ''} 
                    onChange={handleChange}
                />
            </td>

            <td>
                <input 
                    type="text" 
                    name="issuer" 
                    value={rental.issuer || ''} 
                    onChange={handleChange}
                />
            </td>

            <td>
                <input 
                    type="text" 
                    name="receiver" 
                    value={rental.receiver || ''} 
                    onChange={handleChange}
                />
            </td>

            <td>
                <button 
                    onClick={() => setShowEquipmentList(true)} 
                    className="equipment-button"
                >
                    {rental.equipment && rental.equipment.length > 0
                        ? rental.equipment.map((eq) => (
                            <span
                                key={eq.id}
                                className="equipment-tag"
                            >
                                {eq.name} × {eq.quantity || 1}
                            </span>
                          ))
                        : "Выбрать оборудование"}
                </button>
                {showEquipmentList && (
                    <EquipmentList
                        selectedEquipment={rental.equipment}
                        onSelect={(selectedEquipment) => {
                            const updatedRental = { ...rental, equipment: selectedEquipment };
                            setRental(updatedRental);
                            if (onUpdate) {
                                onUpdate(rental.id, updatedRental);
                            }
                            setShowEquipmentList(false);
                        }}
                        onClose={() => setShowEquipmentList(false)}
                    />
                )}
            </td>

            <td>
                <input 
                    type="text" 
                    name="notes" 
                    value={rental.notes || ''} 
                    onChange={handleChange}
                />
            </td>

            <td>
                <StatusSelect
                    value={rental.status}
                    onChange={(status) => {
                        const updatedRental = { ...rental, status };
                        setRental(updatedRental);
                        if (onUpdate) {
                            onUpdate(rental.id, updatedRental);
                        }
                    }}
                />
            </td>

            <td className="conflicts-cell">
                {conflicts.length > 0 ? (
                    <div className="conflicts-list">
                        {conflicts.map((conflict, index) => (
                            <div 
                                key={index} 
                                className={`conflict-item conflict-${conflict.severity}`}
                            >
                                {conflict.message}
                            </div>
                        ))}
                    </div>
                ) : (
                    <span className="no-conflicts">✓</span>
                )}
            </td>

            <td>
                <div className="action-buttons">
                    <button 
                        onClick={handleSave}
                        className="confirm-button"
                        title="Сохранить"
                    >
                        ✓
                    </button>
                    {" / "}
                    <button 
                        onClick={() => onDelete(rental.id)}
                        className="delete-button"
                        title="Удалить"
                    >
                        ✕
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default RentalRow;