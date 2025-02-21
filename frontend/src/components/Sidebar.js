import React, { useState, useRef, useEffect } from "react";
import "./styles.css";
import Calendar from "./Calendar";
import EquipmentList from "./EquipmentList";

const Sidebar = ({ toggleShift }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activePopup, setActivePopup] = useState(null); // Управляем открытыми окнами
    const popupRefs = useRef({}); // Храним ссылки на все попапы

    // Закрытие всплывающего окна при клике вне его области
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                activePopup &&
                popupRefs.current[activePopup] &&
                !popupRefs.current[activePopup].contains(event.target)
            ) {
                setActivePopup(null);
            }
        };

        if (activePopup) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [activePopup]);

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
                {isOpen ? "<" : ">"}
            </button>

            <div className="sidebar-buttons">
                {/* Кнопка "Дата аренды" */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setActivePopup(activePopup === "date" ? null : "date");
                    }}
                >
                    Дата аренды
                </button>

                {/* Кнопка "Фильтры" */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setActivePopup(activePopup === "filters" ? null : "filters");
                    }}
                >
                    Фильтры
                </button>
            </div>

            <h3>Фильтры</h3>

            <div className="sidebar-content">
                {/* Всплывающее окно "Дата аренды" */}
                {activePopup === "date" && (
                    <div 
                        className="popup" 
                        ref={(el) => (popupRefs.current["date"] = el)}
                    >
                        <button className="close-btn" onClick={() => setActivePopup(null)}>×</button>
                        <Calendar />
                    </div>
                )}

                {/* Всплывающее окно "Фильтры" */}
                {activePopup === "filters" && (
                    <div 
                        className="popup" 
                        ref={(el) => (popupRefs.current["filters"] = el)}
                    >
                        <button className="close-btn" onClick={() => setActivePopup(null)}>×</button>
                        <EquipmentList />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;