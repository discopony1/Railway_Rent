import React, { useState, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import Table from "./components/Table";
import DebugToggle from "./components/DebugToggle";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import Inventory from "./components/Inventory";
import NotificationSystem from "./components/NotificationSystem";
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
        <Router>
            <div className={`content ${isShifted ? "shifted" : ""}`}>
                <Sidebar toggleShift={setIsShifted} />
                <Routes>
                    <Route path="/" element={<Table debugMode={debugMode} />} />
                    <Route path="/inventory" element={<Inventory />} />
                </Routes>
            </div>
            <NotificationSystem />
        </Router>
    );
};

export default App;
