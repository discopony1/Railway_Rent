import React, { useState, useEffect } from "react";
import RentalRow from "./RentalRow";
import "./styles.css"; // Если нужен стиль

const Table = () => {
    const [bookings, setBookings] = useState([]);

    // Загружаем данные с сервера
    useEffect(() => {
        fetch("/api/bookings")
            .then((res) => res.json())
            .then((data) => setBookings(data))
            .catch((err) => console.error("Ошибка загрузки:", err));
    }, []);

    // Функция для добавления новой аренды
    const addRental = () => {
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
    };

    return (
        <div>
            <h2>📋 Таблица аренды</h2>
            <button onClick={addRental}>➕ Добавить аренду</button>
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
                        <RentalRow key={booking.id} booking={booking} />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Table;
