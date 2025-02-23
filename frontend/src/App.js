import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Table from "./components/Table";
import DebugToggle from "./components/DebugToggle";
import "./components/styles.css";

const App = () => {
    const [isShifted, setIsShifted] = useState(false);
    const [debugMode, setDebugMode] = useState(() => {
        return JSON.parse(localStorage.getItem("debugMode")) || false;
    });

    const toggleDebug = () => {
        setDebugMode((prev) => {
            const newDebugMode = !prev;
            localStorage.setItem("debugMode", JSON.stringify(newDebugMode));
            return newDebugMode;
        });
    };

    return (
        <div className={`content ${isShifted ? "shifted" : ""}`}>
            <Sidebar toggleShift={setIsShifted} />
            
            {/* Исправлено: передаем onToggle вместо toggleDebug */}
            <DebugToggle onToggle={toggleDebug} debugMode={debugMode} />

            <Table debugMode={debugMode} />
        </div>
    );
};

export default App;
