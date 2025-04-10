import React, { useState, useEffect, useReducer } from "react";
import RentalRow from "./RentalRow";
import API_BASE_URL from "../config";
import logo from '../logo.jpg'
import './Table.css';

// Компонент для отображения ошибок
const ErrorNotification = ({ message, onClose }) => (
    <div className="error-notification">
        <span>{message}</span>
        <button onClick={onClose}>Закрыть</button>
    </div>
);

// Состояния для работы с бронированиями
const bookingsReducer = (state, action) => {
    switch (action.type) {
        case 'SET_BOOKINGS':
            return action.payload;
        case 'ADD_BOOKING':
            return [action.payload, ...state];
        case 'DELETE_BOOKING':
            return state.filter((booking) => booking.id !== action.payload);
        default:
            return state;
    }
};

const Table = () => {
    const [bookings, setBookings] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchBookings();
    }, []);

    const formatDateForAPI = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toISOString().split("T")[0]; // Формат YYYY-MM-DD
    };

    // Загрузка бронирований
    const fetchBookings = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/bookings`);
            const data = await response.json();
            setError(null);
            setBookings(sortBookings(data || []));
        } catch (err) {
            console.error("Ошибка загрузки бронирований:", err);
            setError(err.message);
        }
    };

    // Функция сортировки
    const sortBookings = (bookingsList) => {
        return [...bookingsList].sort((a, b) => {
            if (!a.start_date && !b.start_date) return 0;
            if (!a.start_date) return -1;
            if (!b.start_date) return 1;
            return new Date(b.start_date) - new Date(a.start_date);
        });
    };

    // Добавление новой аренды
    const addRental = async () => {
        try {
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
            setBookings(prevBookings => sortBookings([savedRental, ...prevBookings])); // ✅ Добавляем вверх + сортируем
        } catch (error) {
            console.error("Ошибка создания аренды:", error);
            setError(error.message || "Не удалось создать бронирование");
        }
    };

    // Обновление аренды
    const updateRental = async (id, updatedData) => {
        const formattedData = {
            ...updatedData,
            start_date: updatedData.start_date ? formatDateForAPI(updatedData.start_date) : undefined, 
            end_date: updatedData.end_date ? formatDateForAPI(updatedData.end_date) : undefined, 
            equipment: updatedData.equipment.map(({ name, quantity }) => ({ name, quantity })) 
        };
    
        console.log("📤 Отправляем в API:", formattedData); // Проверяем данные перед отправкой
    
        try {
            const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formattedData)
            });
    
            if (!response.ok) {
                throw new Error(`Ошибка ${response.status}`);
            }
    
            console.log("✅ Успешно обновлено!");
        } catch (error) {
            console.error("Ошибка обновления:", error);
        }
    };
    

    // Удаление аренды
    const handleDelete = async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/bookings/${id}`, { method: 'DELETE' });

            if (!response.ok) {
                throw new Error(`Ошибка ${response.status}`);
            }

            setBookings(prevBookings => sortBookings(prevBookings.filter(booking => booking.id !== id)));
        } catch (error) {
            console.error("Ошибка удаления:", error);
            setError(error.message || "Не удалось удалить бронирование");
        }
    };

    return (
        <div>
            <div className="table-header-container">
                {/* Добавляем лого рядом с заголовком */}
                <button onClick={addRental} className="add-button">➕ Добавить аренду</button>
                <h2>📋 Таблица аренды</h2>
                <img src={logo} alt="Logo" className="logo" /> 
               
                
            </div>
            
            {error && <p className="error-message">{error}</p>}
            <table className="rental-table">
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
                            key={booking.id || `new-${Math.random()}`}
                            booking={booking}
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