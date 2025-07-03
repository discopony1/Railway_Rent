import React, { useState, useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';
import './Inventory.css';
import logo from '../inventory_logo.png'

const InventoryTable = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scrolling, setScrolling] = useState(false); // Состояние для отслеживания прокрутки
    const [sortColumns, setSortColumns] = useState([{ column: 'category', order: 'asc' }, { column: 'name', order: 'asc' }]);
    const [editingItem, setEditingItem] = useState(null);
    const [updatedData, setUpdatedData] = useState({});
    const [notification, setNotification] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const tableRef = useRef(null);

    // Загрузка данных с сервера
    useEffect(() => {
        const fetchInventory = async () => {
            try {
                const response = await fetch("http://localhost:5000/api/inventory");
                if (!response.ok) {
                    throw new Error(`Ошибка загрузки: ${response.status}`);
                }
                const data = await response.json();
                setInventory(data);
            } catch (error) {
                console.error('Ошибка загрузки инвентаря:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInventory();

        // Слушаем событие прокрутки
        const handleScroll = () => {
            if (window.scrollY > 100) {
                setScrolling(true); // Скрываем шапку сайта
            } else {
                setScrolling(false); // Показываем шапку
            }
        };

        // Добавляем слушателя прокрутки
        window.addEventListener('scroll', handleScroll);

        // Убираем слушателя при размонтировании
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Обработка кликов вне таблицы для выключения редактирования
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (tableRef.current && !tableRef.current.contains(event.target) && editingItem !== null) {
                // Если клик вне таблицы и есть редактируемый элемент, выключаем редактирование
                setEditingItem(null);
                setUpdatedData({});
            }
        };

        // Добавляем обработчик только если есть редактируемый элемент
        if (editingItem !== null) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [editingItem]);

    // Удаление оборудования
    const deleteEquipment = async (itemId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/inventory/${itemId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Ошибка ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                // Удаляем элемент из состояния
                setInventory(prevInventory => prevInventory.filter(item => item.id !== itemId));
                setEditingItem(null); // Выходим из режима редактирования
                setNotification({ message: "Оборудование удалено", type: "success" });
                
                // Убираем уведомление через 3 секунды
                setTimeout(() => setNotification(null), 3000);
            }
        } catch (error) {
            console.error("Ошибка удаления оборудования:", error);
            setNotification({ message: "Ошибка при удалении оборудования", type: "error" });
            setTimeout(() => setNotification(null), 3000);
        }
    };

    // Добавление нового оборудования
    const addEquipment = async () => {
        try {
            const newItem = {
                name: "Новое оборудование",
                category: "Прочее",
                subcategory: "",
                model: "",
                serial_number: "",
                notes: "",
                status: "",
                total: 1,
                belongs_to: "МШ"
            };

            const response = await fetch("http://localhost:5000/api/inventory/create", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });

            if (!response.ok) {
                throw new Error(`Ошибка ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.id) {
                // Создаем новый объект с полученным ID
                const newEquipment = { ...newItem, id: result.id };
                setInventory(prevInventory => [newEquipment, ...prevInventory]);
                setEditingItem(result.id); // Сразу переводим в режим редактирования
                setNotification({ message: "Новое оборудование добавлено", type: "success" });
                
                // Убираем уведомление через 3 секунды
                setTimeout(() => setNotification(null), 3000);
            }
        } catch (error) {
            console.error("Ошибка создания оборудования:", error);
            setNotification({ message: "Ошибка при создании оборудования", type: "error" });
            setTimeout(() => setNotification(null), 3000);
        }
    };

    // Обработчик изменения данных в таблице
    const handleInputChange = (e, field, id) => {
        const value = e.target.value;

        setInventory(prevInventory =>
            prevInventory.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );

        setUpdatedData(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value,
            },
        }));
    };

    // Сохранение изменений
    const handleSave = async (id) => {
        if (isProcessing) return;
        setIsProcessing(true);

        const updatedItem = inventory.find((item) => item.id === id);
        const updatedFields = updatedData[id] || {};

        const updatedDataForAPI = { ...updatedItem, ...updatedFields };
        const hasChanges = Object.keys(updatedFields).length > 0;

        if (!hasChanges) {
            setIsProcessing(false);
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/inventory/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedDataForAPI),
            });

            if (response.ok) {
                setNotification({ message: "Инвентарь обновлен", type: "success" });
            } else {
                setNotification({ message: "Ошибка при сохранении изменений", type: "error" });
            }
        } catch (error) {
            console.error('Ошибка при обновлении инвентаря:', error);
            setNotification({ message: "Ошибка при сохранении изменений", type: "error" });
        } finally {
            setIsProcessing(false);
        }
    };

    // Обработчик клика по строке для начала редактирования
    const handleClickEdit = (itemId) => {
        setEditingItem(itemId);
    };

    // Сортировка
    const handleSort = (column) => {
        const newSortColumns = [...sortColumns];
        const columnIndex = newSortColumns.findIndex((sort) => sort.column === column);

        if (columnIndex !== -1) {
            const currentOrder = newSortColumns[columnIndex].order;
            const newOrder = currentOrder === 'asc' ? 'desc' : currentOrder === 'desc' ? 'none' : 'asc';

            if (newOrder === 'none') {
                newSortColumns.splice(columnIndex, 1);
            } else {
                newSortColumns[columnIndex].order = newOrder;
            }
        } else {
            newSortColumns.push({ column, order: 'asc' });
        }

        setSortColumns(newSortColumns);

        const sortedData = [...inventory].sort((a, b) => {
            for (let sort of newSortColumns) {
                if (a[sort.column] < b[sort.column]) return sort.order === 'asc' ? -1 : 1;
                if (a[sort.column] > b[sort.column]) return sort.order === 'asc' ? 1 : -1;
            }
            return 0;
        });

        setInventory(sortedData);
    };

    // Функция для отображения стрелочек сортировки
    const renderSortIcon = (column) => {
        const currentSort = sortColumns.find(sort => sort.column === column);
        if (!currentSort) return null;

        return currentSort.order === 'asc' ? '↑' : currentSort.order === 'desc' ? '↓' : '↕';
    };

    // Отображение строки инвентаря
    const renderRow = (item) => {
        if (editingItem === item.id) {
            return (
                <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>
                        <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleInputChange(e, 'name', item.id)}
                            onBlur={() => handleSave(item.id)}
                        />
                    </td>
                    <td>
                        <input
                            type="text"
                            value={item.category}
                            onChange={(e) => handleInputChange(e, 'category', item.id)}
                            onBlur={() => handleSave(item.id)}
                        />
                    </td>
                    <td>
                        <input
                            type="text"
                            value={item.subcategory}
                            onChange={(e) => handleInputChange(e, 'subcategory', item.id)}
                            onBlur={() => handleSave(item.id)}
                        />
                    </td>
                    <td>
                        <input
                            type="text"
                            value={item.model}
                            onChange={(e) => handleInputChange(e, 'model', item.id)}
                            onBlur={() => handleSave(item.id)}
                        />
                    </td>
                    <td>
                        <input
                            type="text"
                            value={item.serial_number}
                            onChange={(e) => handleInputChange(e, 'serial_number', item.id)}
                            onBlur={() => handleSave(item.id)}
                        />
                    </td>
                    <td>
                        <input
                            type="text"
                            value={item.notes}
                            onChange={(e) => handleInputChange(e, 'notes', item.id)}
                            onBlur={() => handleSave(item.id)}
                        />
                    </td>
                    <td>
                        <input
                            type="text"
                            value={item.status}
                            onChange={(e) => handleInputChange(e, 'status', item.id)}
                            onBlur={() => handleSave(item.id)}
                        />
                    </td>
                    <td>
                        <input
                            type="number"
                            value={item.total}
                            onChange={(e) => handleInputChange(e, 'total', item.id)}
                            onBlur={() => handleSave(item.id)}
                        />
                    </td>
                    <td>
                        <input
                            type="text"
                            value={item.belongs_to}
                            onChange={(e) => handleInputChange(e, 'belongs_to', item.id)}
                            onBlur={() => handleSave(item.id)}
                        />
                    </td>
                    <td>
                        <button onClick={() => handleSave(item.id)} className="save-button">Сохранить</button>
                        <button onClick={() => setEditingItem(null)} className="cancel-button">Отменить</button>
                        <button onClick={() => deleteEquipment(item.id)} className="delete-button">Удалить запись</button>
                    </td>
                </tr>
            );
        } else {
            return (
                <tr key={item.id} onClick={() => handleClickEdit(item.id)}>
                    <td>{item.id}</td>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.subcategory}</td>
                    <td>{item.model}</td>
                    <td>{item.serial_number}</td>
                    <td>{item.notes}</td>
                    <td>{item.status}</td>
                    <td>{item.total}</td>
                    <td>{item.belongs_to}</td>
                    <td>
                        <button>Редактировать</button>
                    </td>
                </tr>
            );
        }
    };

    return (
        <div className="page-container">
            <div className="table-header-container">
                <div className="table-header">
                    <button onClick={addEquipment} className="add-button">➕ Добавить оборудование</button>
                    <h2>📋 Инвентарь</h2>
                    <img src={logo} alt="Logo" className="logo" /> 
                </div>
            </div>
            
            <div className="table-container">
                <div className="table-scroll-container">
                    {loading ? (
                        <LoadingSpinner message="Загрузка инвентаря..." size="large" />
                    ) : (
                        <table ref={tableRef} className="inventory-table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('id')}>ID {renderSortIcon('id')}</th>
                                    <th onClick={() => handleSort('name')}>Название {renderSortIcon('name')}</th>
                                    <th onClick={() => handleSort('category')}>Категория {renderSortIcon('category')}</th>
                                    <th onClick={() => handleSort('subcategory')}>Подкатегория {renderSortIcon('subcategory')}</th>
                                    <th onClick={() => handleSort('model')}>Модель {renderSortIcon('model')}</th>
                                    <th onClick={() => handleSort('serial_number')}>Серийный номер {renderSortIcon('serial_number')}</th>
                                    <th onClick={() => handleSort('notes')}>Примечания {renderSortIcon('notes')}</th>
                                    <th onClick={() => handleSort('status')}>Статус {renderSortIcon('status')}</th>
                                    <th onClick={() => handleSort('total')}>Общее количество {renderSortIcon('total')}</th>
                                    <th onClick={() => handleSort('belongs_to')}>Кому принадлежит {renderSortIcon('belongs_to')}</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inventory.map(renderRow)}
                            </tbody>
                        </table>
                    )}
                    {notification && (
                        <div className={`notification ${notification.type}`}>
                            {notification.message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InventoryTable;
