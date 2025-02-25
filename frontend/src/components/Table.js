import React, { useState, useEffect } from "react";
import RentalRow from "./RentalRow";
import API_BASE_URL from "../config";
import './Table.css';

const Table = () => {
    const [bookings, setBookings] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/bookings`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setBookings(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error loading data:", err);
            setError(err.message);
        }
    };

    const addRental = () => {
        const newRental = {
            id: Date.now(), // Временный ID
            start_date: "",
            end_date: "",
            renter: "",
            equipment: [],
            issuer: "",
            receiver: "",
            status: "Бронь",
            notes: ""
        };

        setBookings(prevBookings => [...prevBookings, newRental]);
    };

    const saveRental = async (id, rentalData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(rentalData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const savedRental = await response.json();
            setBookings(prevBookings => 
                prevBookings.map(booking => 
                    booking.id === id ? { ...savedRental, id: savedRental.id || savedRental.booking_id } : booking
                )
            );
            return true;
        } catch (error) {
            console.error("Ошибка сохранения:", error);
            setError(error.message || "Не удалось сохранить бронирование");
            return false;
        }
    };

    const updateRental = async (id, updatedRental) => {
        try {
            const rentalToUpdate = {
                ...updatedRental,
                equipment: Array.isArray(updatedRental.equipment) ? updatedRental.equipment : [],
                start_date: updatedRental.start_date || "",
                end_date: updatedRental.end_date || ""
            };

            const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(rentalToUpdate)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            setBookings(prevBookings => 
                prevBookings.map(booking => 
                    booking.id === id ? rentalToUpdate : booking
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
                headers: {
                    'Content-Type': 'application/json',
                }
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
                            onUpdate={updateRental}
                            onSave={saveRental}
                            onDelete={() => handleDelete(booking.id)}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Table;