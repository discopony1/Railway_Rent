import React, { useState } from "react";
import EquipmentList from "./EquipmentList";
import StatusSelect from "./StatusSelect";

const RentalRow = ({ booking, onUpdate = () => {}, onDelete = () => {} }) => {
    const [rental, setRental] = useState(booking);
    const [showEquipmentList, setShowEquipmentList] = useState(false);

    // Обновление значений аренды
    const handleChange = (e) => {
        const updatedRental = { ...rental, [e.target.name]: e.target.value };
        setRental(updatedRental);
    };

    // Сохранение при потере фокуса
    const handleBlur = () => {
        onUpdate(rental.id, rental);
    };

    return (
        <>
            <tr>
                {/* Даты аренды */}
                <td>
                    <input
                        type="datetime-local"
                        name="start_date"
                        value={rental.start_date ? rental.start_date.slice(0, 16) : ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />
                    {" - "}
                    <input
                        type="datetime-local"
                        name="end_date"
                        value={rental.end_date ? rental.end_date.slice(0, 16) : ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />
                </td>

                {/* Поля ввода */}
                <td><input type="text" name="renter" value={rental.renter} onChange={handleChange} onBlur={handleBlur} /></td>
                <td><input type="text" name="issuer" value={rental.issuer} onChange={handleChange} onBlur={handleBlur} /></td>
                <td><input type="text" name="receiver" value={rental.receiver} onChange={handleChange} onBlur={handleBlur} /></td>

                {/* Кнопка выбора оборудования */}
                <td>
                    <button onClick={() => setShowEquipmentList(true)} autoFocus>
                        {rental.equipment ? rental.equipment : "Выбрать оборудование"}
                    </button>
                </td>

                <td><input type="text" name="notes" value={rental.notes} onChange={handleChange} onBlur={handleBlur} /></td>

                {/* Выбор статуса */}
                <td>
                    <StatusSelect
                        value={rental.status}
                        onChange={(status) => {
                            const updatedRental = { ...rental, status };
                            setRental(updatedRental);
                            onUpdate(rental.id, updatedRental);
                        }}
                    />
                </td>

                {/* Колонка "Конфликты" (заглушка) */}
                <td>⚠️</td>

                {/* Кнопка удаления */}
                <td>
                    <button onClick={() => onDelete(rental.id)}>❌</button>
                </td>
            </tr>

            {/* Всплывающий список оборудования */}
            {showEquipmentList && (
                <EquipmentList
                    onSelect={(equipment) => {
                        const updatedRental = { ...rental, equipment };
                        setRental(updatedRental);
                        onUpdate(rental.id, updatedRental);
                        setShowEquipmentList(false);
                    }}
                    onClose={() => setShowEquipmentList(false)}
                />
            )}
        </>
    );
};

export default RentalRow;
