import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./styles.css";

const Sidebar = ({ toggleShift }) => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const handleToggle = () => {
        setIsOpen(!isOpen);
        toggleShift(!isOpen);
    };

    return (
        <div className={`sidebar ${isOpen ? "open" : ""}`}>
            <button 
                className={`sidebar-toggle ${isOpen ? "rotated" : ""}`} 
                onClick={handleToggle}
            >
                {isOpen ? "◀" : "▶"}
            </button>

            {isOpen && (
                <div className="sidebar-content">
                    <h3>Навигация</h3>
                    <nav className="sidebar-nav">
                        <Link 
                            to="/" 
                            className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
                        >
                            📋 Таблица аренды
                        </Link>
                        <Link 
                            to="/inventory" 
                            className={`nav-item ${location.pathname === '/inventory' ? 'active' : ''}`}
                        >
                            📦 Инвентарь
                        </Link>
                    </nav>
                    
                    <h3>Действия</h3>
                    <div className="sidebar-actions">
                        <button className="action-item disabled">
                            ⚙️ Настройки
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;