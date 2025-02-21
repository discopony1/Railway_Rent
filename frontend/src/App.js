import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Table from "./components/Table";
import "./components/styles.css";

const App = () => {
    const [isShifted, setIsShifted] = useState(false);

    return (
        <div className={`content ${isShifted ? "shifted" : ""}`}>
            <Sidebar toggleShift={setIsShifted} />
            
            <Table />
        </div>
    );
};

export default App;
