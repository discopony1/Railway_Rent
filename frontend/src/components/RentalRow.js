import React, { useState, useEffect } from "react";
import EquipmentList from "./EquipmentList";
import StatusSelect from "./StatusSelect";
import './RentalRow.css';

const RentalRow = ({ booking, inventory, bookings, onUpdate, onDelete }) => {
    const [rental, setRental] = useState({
        ...booking,
        equipment: Array.isArray(booking.equipment) ? booking.equipment : []
    });

    const [showEquipmentList, setShowEquipmentList] = useState(false);
    const [conflicts, setConflicts] = useState([]);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        let parsedEquipment = [];
        try {
            if (typeof booking.equipment === "string") {
                parsedEquipment = JSON.parse(booking.equipment);
                if (typeof parsedEquipment === "string") {
                    parsedEquipment = JSON.parse(parsedEquipment);
                }
            } else if (Array.isArray(booking.equipment)) {
                parsedEquipment = booking.equipment;
            }
        } catch (error) {
            console.error("Ошибка обработки equipment:", error, booking.equipment);
        }

        setRental(prevRental => {
            if (JSON.stringify(prevRental.equipment) !== JSON.stringify(parsedEquipment)) {
                return { ...prevRental, equipment: parsedEquipment };
            }
            return prevRental;
        });

    }, [booking.equipment]);

    useEffect(() => {
        if (!isEditing) {
            checkConflicts();
        }
    }, [rental.start_date, rental.end_date, rental.status, isEditing]);

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

            if (startDateTime > now && (rental.status === "Выдано" || rental.status === "Возвращено")) {
                newConflicts.push({ 
                    message: "⚠️ Аренда выдана или возвращена, но даты еще не наступили", 
                    severity: "warning" 
                });
            }

            setConflicts(newConflicts);
        } catch (error) {
            setConflicts([{ message: "❌ Ошибка проверки дат", severity: "error" }]);
        }
    };

    const calculateRented = (equipmentId, startDate, endDate) => {
        if (!startDate || !endDate || !Array.isArray(bookings)) return 0;
    
        return bookings.reduce((totalRented, booking) => {
            if (!booking || !Array.isArray(booking.equipment)) return totalRented;
            if (!booking.start_date || !booking.end_date) return totalRented;
    
            const startBooking = new Date(booking.start_date);
            const endBooking = new Date(booking.end_date);
    
            if (startBooking <= new Date(endDate) && endBooking >= new Date(startDate)) {
                const rentedCount = booking.equipment.find(eq => eq.id === equipmentId)?.quantity || 0;
                return totalRented + rentedCount;
            }
    
            return totalRented;
        }, 0);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setIsEditing(true);
        setRental(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleBlur = () => {
        setIsEditing(false);
        const updatedRental = {
            ...rental,
            equipment: JSON.stringify(rental.equipment)  // Преобразуем в строку перед отправкой
        };
        onUpdate(rental.id, updatedRental);
    };
    
    return (
        <tr>
            {/* Дата аренды */}
            <td className="rental-date-cell">
                <input
                    type="datetime-local"
                    name="start_date"
                    value={rental.start_date ? new Date(rental.start_date).toISOString().slice(0, 16) : ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    step="900"
                    className="rental-date-input"
                />
                <span className="rental-date-separator">-</span>
                <input
                    type="datetime-local"
                    name="end_date"
                    value={rental.end_date ? new Date(rental.end_date).toISOString().slice(0, 16) : ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    step="900"
                    className="rental-date-input"
                />
            </td>
    
            {/* Поля с информацией */}
            <td>
                <input
                    type="text"
                    name="renter"
                    value={rental.renter || ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Имя арендатора"
                    className="rental-input"
                />
            </td>
            <td>
                <input
                    type="text"
                    name="issuer"
                    value={rental.issuer || ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Кто выдал"
                    className="rental-input"
                />
            </td>
            <td>
                <input
                    type="text"
                    name="receiver"
                    value={rental.receiver || ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Кто принял"
                    className="rental-input"
                />
            </td>
                        {/* Список оборудования */}
                        <td>
                <button 
                    onClick={() => setShowEquipmentList(true)} 
                    className="equipment-button"
                >
                    {rental.equipment.length > 0
                        ? rental.equipment.map((eq, index) => {
                            if (!Array.isArray(inventory)) {
                                console.error("Ошибка: inventory не является массивом", inventory);
                                return null;
                            }
    
                            const total = inventory.find(item => item.id === eq.id)?.total || 0;
                            const rented = calculateRented(eq.id, rental.start_date, rental.end_date);
                            const available = total - rented;
    
                            return (
                                <span key={index} className="equipment-tag">
                                    {eq.name} × {eq.quantity || 1} (Доступно: {available} / {total})
                                </span>
                            );
                        })
                        : "Выбрать оборудование"}
                </button>
                {showEquipmentList && (
                    <EquipmentList
                        selectedEquipment={rental.equipment}
                        onSelect={(selectedEquipment) => {
                            setRental(prevRental => {
                                const updatedRental = { ...prevRental, equipment: selectedEquipment };
                                onUpdate(prevRental.id, updatedRental);
                                return updatedRental;
                            });
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
                    value={rental.notes || ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Примечания"
                    className="rental-input"
                />
            </td>
    
            {/* Статус аренды */}
            <td>
                <StatusSelect
                    value={rental.status}
                    onChange={(status) => {
                        setRental(prevRental => {
                            const updatedRental = { ...prevRental, status };
                            onUpdate(prevRental.id, updatedRental);
                            return updatedRental;
                        });
                    }}
                />
            </td>
    
            {/* Конфликты */}
            <td className="conflicts-cell">
                {conflicts.length > 0 ? (
                    <div className="conflicts-list">
                        {conflicts.map((conflict, index) => (
                            <div key={index} className={`conflict-item conflict-${conflict.severity}`}>
                                {conflict.message}
                            </div>
                        ))}
                    </div>
                ) : (
                    <span className="no-conflicts">✓</span>
                )}
            </td>
    
            {/* Удаление аренды */}
            <td>
                <button 
                    onClick={() => onDelete(rental.id)}
                    className="delete-button"
                    title="Удалить"
                >
                    ✕
                </button>
            </td>
        </tr>
    );
}

export default RentalRow;