import React, { useState, useEffect } from "react";
import RentalRow from "./RentalRow";
import API_BASE_URL from "../config";
import './Table.css';

const Table = () => {
    const [bookings, setBookings] = useState([]);
    const [inventory, setInventory] = useState([]); // ✅ Добавил инвентарь
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchBookings();
        fetchInventory(); // ✅ Загружаем инвентарь
    }, []);

    const fetchBookings = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/bookings`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            setBookings(Array.isArray(data) ? 
                data.map(booking => ({
                    ...booking,
                    equipment: Array.isArray(booking.equipment) ? booking.equipment : []
                })) 
                : []
            );
        } catch (err) {
            console.error("Error loading bookings:", err);
            setError(err.message);
        }
    };

    const fetchInventory = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/inventory`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            setInventory(Array.isArray(data) ? data : []); // ✅ Проверка на массив
        } catch (err) {
            console.error("Error loading inventory:", err);
            setError(err.message);
        }
    };

    const addRental = async () => {
        try {
            console.log("Создание аренды...");
            const response = await fetch(`${API_BASE_URL}/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) 
            });
    
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка ${response.status}: ${errorText}`);
            }
    
            const savedRental = await response.json();
            console.log("Успешно создано:", savedRental);
    
            setBookings(prevBookings => [
                ...prevBookings,
                {
                    id: savedRental.id,
                    equipment: [],
                    name: "",         // 👈 Добавляем имя арендатора
                    issued_by: "",    // 👈 Кто выдал
                    received_by: "",  // 👈 Кто принял
                    notes: ""         // 👈 Примечания
                }
            ]);
        } catch (error) {
            console.error("Ошибка создания аренды:", error);
            setError(error.message || "Не удалось создать бронирование");
        }
    };

    const updateRental = async (id, updatedRental) => {
        try {
            const rentalToUpdate = {
                ...updatedRental,
                equipment: updatedRental.equipment || [], // ✅ Передаём как массив, без JSON.stringify()
                start_date: updatedRental.start_date || "",
                end_date: updatedRental.end_date || ""
            };

            const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rentalToUpdate)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            setBookings(prevBookings =>
                prevBookings.map(booking =>
                    booking.id === id ? { ...rentalToUpdate, id } : booking
                )
            );
        } catch (error) {
            console.error("Ошибка обновления:", error);
            setError(error.message || "Не удалось обновить бронирование");
        }
    };

    const handleDelete = async (id) => {
        if (!id) {
            console.error("ID не указан для удаления");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            setBookings(prevBookings => prevBookings.filter(booking => booking.id !== id));
        } catch (error) {
            console.error("Ошибка удаления:", error);
            setError(error.message || "Не удалось удалить бронирование");
        }
    };

    return (
        <div>
            <h2>📋 Таблица аренды</h2>
            {error && <p className="error-message">{error}</p>}
            <button onClick={addRental} className="add-button">➕ Добавить аренду</button>
            <table className="rental-table">
                <thead>
                    <tr>
                        <th className="table-header">Дата аренды</th>
                        <th className="table-header">Имя</th>
                        <th className="table-header">Кто выдал</th>
                        <th className="table-header">Кто принял</th>
                        <th className="table-header">Оборудование</th>
                        <th className="table-header">Примечания</th>
                        <th className="table-header">Статус</th>
                        <th className="table-header">Конфликты</th>
                        <th className="table-header">Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {bookings.map((booking) => (
                        <RentalRow 
                            key={booking.id}
                            booking={booking}
                            inventory={inventory} // ✅ Передаем inventory в RentalRow
                            onUpdate={updateRental}
                            onDelete={() => handleDelete(booking.id)}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Table;
