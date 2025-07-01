import React, { useState, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import Table from "./components/Table";
import DebugToggle from "./components/DebugToggle";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom"; // Импортируем Link и Router
import Inventory from "./components/Inventory"; // Импортируем страницу инвентаря
import "./components/styles.css";

const App = () => {
    const [isShifted, setIsShifted] = useState(false);
    const [debugMode, setDebugMode] = useState(() => {
        return JSON.parse(localStorage.getItem("debugMode")) || false;
    });

    const toggleDebug = useCallback(() => {
        setDebugMode((prev) => {
            const newDebugMode = !prev;
            localStorage.setItem("debugMode", JSON.stringify(newDebugMode));
            return newDebugMode;
        });
    }, []);

    return (
        <Router>  {/* Оборачиваем в Router */}
            <div className={`content ${isShifted ? "shifted" : ""}`}>
                <Sidebar toggleShift={setIsShifted} />
                {/* Добавляем верхнее меню с кнопкой перехода */}
                <div className="header">
                    <Link to="/" className="nav-link">Таблица аренды</Link>
                    <Link to="/inventory" className="nav-link">Инвентарь</Link> {/* Ссылка на инвентарь */}
                </div>

                <Routes>
                    <Route path="/" element={<Table debugMode={debugMode} />} />
                    <Route path="/inventory" element={<Inventory />} />  {/* Страница инвентаря */}
                </Routes>
            </div>
        </Router>
    );
};

export default App;
