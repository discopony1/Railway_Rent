import React, { useState, useEffect } from "react";
import RentalRow from "./RentalRow";
import LoadingSpinner from "./LoadingSpinner";
import API_BASE_URL from "../config";
import { showSuccess, showError } from "./NotificationSystem";
import logo from '../logo.png'
import './Table.css';

const Table = () => {
    const [bookings, setBookings] = useState([]);
    const [error, setError] = useState(null);
    const [selectedRows, setSelectedRows] = useState(new Set());


    useEffect(() => {
        fetchBookings();
    }, []);

    // Обработка нажатия клавиши Delete
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Delete' && selectedRows.size > 0) {
                handleDeleteSelected();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedRows]);

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
            showError("Не удалось загрузить данные аренды");
        }
    };

    // Функция сортировки
    const sortBookings = (bookingsList) => {
        // Фильтруем null элементы перед сортировкой
        const validBookings = bookingsList.filter(booking => booking !== null && booking !== undefined);
        
        return [...validBookings].sort((a, b) => {
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
                body: JSON.stringify({
                    renter: "",
                    issuer: "",
                    receiver: "",
                    status: "Бронь",
                    notes: "",
                    equipment: [],
                    where: "в студии"
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка ${response.status}: ${errorText}`);
            }

            const savedRental = await response.json();
            console.log("📥 Созданная аренда:", savedRental);
            
            if (savedRental && typeof savedRental === 'object') {
                setBookings(prevBookings => sortBookings([savedRental, ...prevBookings])); // ✅ Добавляем вверх + сортируем
                showSuccess("Аренда создана");
            } else {
                console.error("❌ API вернул некорректные данные:", savedRental);
                showError("Не удалось создать бронирование - некорректный ответ сервера");
            }
        } catch (error) {
            console.error("Ошибка создания аренды:", error);
            showError(error.message || "Не удалось создать бронирование");
        }
    };

    // Обновление аренды
    const updateRental = async (id, updatedData) => {
        const formattedData = {
            ...updatedData,
            start_date: updatedData.start_date ? formatDateForAPI(updatedData.start_date) : undefined, 
            end_date: updatedData.end_date ? formatDateForAPI(updatedData.end_date) : undefined, 
            equipment: updatedData.equipment.map(({ name, quantity }) => ({ name, quantity })), 
            where: updatedData.where || "в студии" // Устанавливаем значение по умолчанию
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
            showSuccess("Аренда обновлена");
        } catch (error) {
            console.error("Ошибка обновления:", error);
            showError("Не удалось обновить аренду");
        }
    };

    // Обработка выделения строк
    const handleRowSelect = (id, isSelected) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(id);
            } else {
                newSet.delete(id);
            }
            return newSet;
        });
    };

    // Выделить все/снять выделение со всех
    const handleSelectAll = (isSelected) => {
        if (isSelected) {
            setSelectedRows(new Set(bookings.map(booking => booking.id)));
        } else {
            setSelectedRows(new Set());
        }
    };

    // Удаление выбранных строк
    const handleDeleteSelected = async () => {
        if (selectedRows.size === 0) return;
        
        const confirmed = window.confirm(`Удалить ${selectedRows.size} выбранных аренд?`);
        if (!confirmed) return;

        try {
            const deletePromises = Array.from(selectedRows).map(id =>
                fetch(`${API_BASE_URL}/bookings/${id}`, { method: "DELETE" })
            );
            
            await Promise.all(deletePromises);
            
            setBookings(prevBookings => sortBookings(prevBookings.filter(booking => !selectedRows.has(booking.id))));
            setSelectedRows(new Set());
            showSuccess(`Успешно удалено ${selectedRows.size} аренд`);
        } catch (error) {
            console.error("Ошибка массового удаления:", error);
            showError("Не удалось удалить выбранные аренды");
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
            setSelectedRows(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
            showSuccess("Аренда удалена");
        } catch (error) {
            console.error("Ошибка удаления:", error);
            showError(error.message || "Не удалось удалить бронирование");
        }
    };

    // Функция для включения редактирования
    const handleClickEdit = (id) => {
        if (isEditingRow === id) {
            setIsEditingRow(null); // Если редактируемая строка та же, что уже редактируется, отменяем редактирование
        } else {
            setIsEditingRow(id); // Включаем редактирование для выбранной строки
        }
    };

    return (
        <div className="page-container">
            <div className="rental-table-header-container">
                <div className="rental-table-header">
                    <div className="header-left">
                        <button onClick={addRental} className="add-button">➕ Добавить аренду</button>
                        {selectedRows.size > 0 && (
                            <button onClick={handleDeleteSelected} className="delete-selected-button">
                                🗑️ Удалить выбранные ({selectedRows.size})
                            </button>
                        )}
                    </div>
                    <h2>📋 Таблица аренды</h2>
                    <img src={logo} alt="Logo" className="logo" /> 
                </div>
            </div>
            
            <div className="rental-table-container">
                <div className="rental-table-scroll-container">
                    {error && <p className="error-message">{error}</p>}
                    <table className="rental-table">
                        <thead>
                            <tr>
                                <th style={{ width: '30px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.size === bookings.length && bookings.length > 0}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        style={{ transform: 'scale(1.2)' }}
                                    />
                                </th>
                                <th>Дата аренды</th>
                                <th>Имя</th>
                                <th>Кто выдал</th>
                                <th>Кто принял</th>
                                <th>Оборудование</th>
                                <th>Примечания</th>
                                <th>Где</th> 
                                <th>Статус</th>
                                <th></th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map((booking) => (
                                <RentalRow 
                                    key={booking.id || `new-${Math.random()}`}
                                    booking={booking}
                                    onUpdate={updateRental}
                                    onDelete={() => handleDelete(booking.id)}
                                    isSelected={selectedRows.has(booking.id)}
                                    onSelect={(isSelected) => handleRowSelect(booking.id, isSelected)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Table;
