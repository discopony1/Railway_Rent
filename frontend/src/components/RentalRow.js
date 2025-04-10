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

// Вспомогательная функция для обработки доступности оборудования
const checkAvailability = (rental, inventory, allRentals) => {
    if (!rental.start_date || !rental.end_date) {
        return {};
    }

    const startDate = new Date(rental.start_date);
    const endDate = new Date(rental.end_date);

    const updatedAvailability = {};

    inventory.forEach(item => {
        let totalAvailable = item.total;
        let upcomingReturns = [];

        allRentals?.forEach(rent => {
            if (rent.status === "Возвращено") return;

            (rent.equipment ?? []).forEach(eq => {
                if (eq.name === item.name) {
                    const rentStart = new Date(rent.start_date);
                    const rentEnd = new Date(rent.end_date);

                    if ((rentStart <= endDate && rentEnd >= startDate)) {
                        totalAvailable -= eq.quantity;
                    }

                    if (rentEnd > startDate && rentEnd < endDate) {
                        upcomingReturns.push({ quantity: eq.quantity, returnDate: rentEnd });
                    }
                }
            });
        });

        updatedAvailability[item.name] = {
            available: Math.max(0, totalAvailable),
            upcomingReturns: upcomingReturns.sort((a, b) => a.returnDate - b.returnDate)
        };
    });

    return updatedAvailability;
};

const RentalRow = ({ booking, onUpdate, onDelete, allRentals = [], inventory = [] }) => {
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
    const [availableEquipment, setAvailableEquipment] = useState({});

    // 🔹 Функция для проверки и обновления конфликтов
    const updateConflictsAndAvailability = useCallback(() => {
        const newConflicts = checkConflicts(rental.start_date, rental.end_date, rental.status);
        const updatedAvailability = checkAvailability(rental, inventory, allRentals);

        // Обновляем состояние только в случае изменений
        setConflicts(prevConflicts => {
            if (JSON.stringify(prevConflicts) !== JSON.stringify(newConflicts)) {
                return newConflicts;
            }
            return prevConflicts;
        });

        setAvailableEquipment(prevAvailability => {
            if (JSON.stringify(prevAvailability) !== JSON.stringify(updatedAvailability)) {
                return updatedAvailability;
            }
            return prevAvailability;
        });
    }, [rental, inventory, allRentals]);

    useEffect(() => {
        updateConflictsAndAvailability();
    }, [rental.start_date, rental.end_date, rental.status, inventory, allRentals, updateConflictsAndAvailability]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setRental(prev => ({ ...prev, [name]: value }));
    };

    const handleBlur = () => {
        onUpdate(rental.id, {
            ...rental,
            start_date: rental.start_date || null,  // Если пусто → null
            end_date: rental.end_date || null,
            equipment: rental.equipment ?? []      // Гарантируем, что это массив
        });
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

    return (
        <tr>
            <td>
                <input
                    type="datetime-local"
                    name="start_date"
                    value={rental.start_date ? new Date(rental.start_date).toISOString().slice(0, 16) : ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    step="900"
                />
                <input
                    type="datetime-local"
                    name="end_date"
                    value={rental.end_date ? new Date(rental.end_date).toISOString().slice(0, 16) : ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    step="900"
                />
            </td>

            <td><input type="text" name="renter" value={rental.renter || ""} onChange={handleChange} onBlur={handleBlur} /></td>
            <td><input type="text" name="issuer" value={rental.issuer || ""} onChange={handleChange} onBlur={handleBlur} /></td>
            <td><input type="text" name="receiver" value={rental.receiver || ""} onChange={handleChange} onBlur={handleBlur} /></td>

            <td>
                <div className="equipment-container">
                    {rental.equipment?.map((eq, index) => (
                        <div key={index} className="equipment-tag-container">
                            <span className="equipment-tag">
                                {eq.name} × {eq.quantity || 1}
                                {availableEquipment[eq.name]?.upcomingReturns.length > 0 && (
                                    <span className="availability-info">
                                        (🔄 {availableEquipment[eq.name].upcomingReturns[0].quantity} ед. освободи  тся {availableEquipment[eq.name].upcomingReturns[0].returnDate.toLocaleString()} )
                                    </span>
                                )}
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
                        className="equipment-button full-width"
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

            <td><input type="text" name="notes" value={rental.notes || ""} onChange={handleChange} onBlur={handleBlur} /></td>

            <td>
                <StatusSelect
                    value={rental.status}
                    onChange={handleStatusChange}
                />
            </td>

            <td>
                {conflicts.length > 0 ? conflicts.map((conflict, index) => (
                    <div key={index} className={`conflict-${conflict.severity}`}>
                        {conflict.message}
                    </div>
                )) : "✓"}
            </td>

            <td>
                <button onClick={() => onDelete(rental.id)} className="delete-button">✕</button>
            </td>
        </tr>
    );
};

export default RentalRow;
