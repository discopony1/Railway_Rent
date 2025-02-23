import React, { useState, useEffect } from "react";
import RentalRow from "./RentalRow";

const RentalsTable = () => {
    const [bookings, setBookings] = useState([]);

    // Загружаем бронирования при монтировании
    useEffect(() => {
        fetch("/api/bookings")
            .then((res) => res.json())
            .then((data) => setBookings(data))
            .catch((error) => console.error("Ошибка загрузки бронирований:", error));
    }, []);

    // Функция для обновления записи
    const handleUpdate = (id, updatedRental) => {
        setBookings((prevBookings) =>
            prevBookings.map((booking) => (booking.id === id ? updatedRental : booking))
        );

        // Отправляем изменения на сервер
        fetch(`/api/bookings/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedRental),
        })
        .then((res) => res.json())
        .then((data) => console.log("Бронирование обновлено:", data))
        .catch((error) => console.error("Ошибка обновления:", error));
    };

    // Функция для добавления нового бронирования
    const handleAddRental = () => {
        const newRental = {
            id: Date.now(), // Временный ID, заменится на серверный
            start_date: "",
            end_date: "",
            renter: "",
            equipment: "",
            issuer: "",
            receiver: "",
            status: "Бронь",
            notes: ""
        };

        setBookings([...bookings, newRental]);

        // Отправляем на сервер
        fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newRental),
        })
        .then((res) => res.json())
        .then((data) => {
            setBookings((prev) =>
                prev.map((r) => (r.id === newRental.id ? { ...r, id: data.id } : r))
            );
        })
        .catch((error) => console.error("Ошибка при добавлении аренды:", error));
    };

    return (
        <div>
            <button onClick={handleAddRental}>Добавить аренду</button>
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
                    </tr>
                </thead>
                <tbody>
                    {bookings.map((booking) => (
                        <RentalRow key={booking.id} booking={booking} onUpdate={handleUpdate} />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RentalsTable;
