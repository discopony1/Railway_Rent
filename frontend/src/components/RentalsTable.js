import React, { useState, useEffect } from "react";
import RentalRow from "./RentalRow";
import API_BASE_URL from "../config"; // URL API

const RentalsTable = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Загружаем бронирования при монтировании
    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/bookings`);
                if (!response.ok) throw new Error(`Ошибка загрузки: ${response.status}`);
                const data = await response.json();
                setBookings(data);
            } catch (error) {
                console.error("Ошибка загрузки бронирований:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, []);

    // Функция для обновления аренды
    const handleUpdate = async (id, updatedRental) => {
        setBookings((prev) =>
            prev.map((booking) => (booking.id === id ? updatedRental : booking))
        );

        try {
            const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedRental),
            });

            if (!response.ok) throw new Error(`Ошибка обновления: ${response.status}`);

            const updatedData = await response.json();

            setBookings((prev) =>
                prev.map((booking) => (booking.id === id ? updatedData : booking))
            );

            console.log("Бронирование обновлено:", updatedData);
        } catch (error) {
            console.error("Ошибка обновления аренды:", error);
        }
    };

    // Функция для добавления нового бронирования
    const handleAddRental = async () => {
        const newRental = {
            start_date: "",
            end_date: "",
            renter: "",
            equipment: [],
            issuer: "",
            receiver: "",
            status: "Бронь",
            notes: ""
        };

        try {
            const response = await fetch(`${API_BASE_URL}/bookings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newRental),
            });

            if (!response.ok) throw new Error(`Ошибка добавления: ${response.status}`);

            const savedRental = await response.json();
            setBookings((prev) => [...prev, savedRental]); // Обновляем ID из сервера
        } catch (error) {
            console.error("Ошибка при добавлении аренды:", error);
        }
    };

    // Функция для удаления бронирования
    const handleDelete = async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
                method: "DELETE"
            });

            if (!response.ok) throw new Error(`Ошибка удаления: ${response.status}`);

            setBookings((prev) => prev.filter((booking) => booking.id !== id));
        } catch (error) {
            console.error("Ошибка при удалении бронирования:", error);
        }
    };

    return (
        <div>
            <button onClick={handleAddRental}>Добавить аренду</button>

            {loading ? (
                <p>Загрузка...</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Дата аренды</th>
                            <th>Имя</th>
                            <th>Кто выдал</th>
                            <th>Кто принял</th>
                            <th>Оборудование</th>
                            <th>Примечания</th>
                            <th>Статус</th>
                            <th>Конфликты</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.map((booking) => (
                            <RentalRow
                                key={booking.id}
                                booking={booking}
                                onUpdate={handleUpdate}
                                onDelete={handleDelete}
                            />
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default RentalsTable;
