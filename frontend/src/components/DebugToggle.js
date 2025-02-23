import React, { useState, useEffect } from "react";

function DebugToggle({ onToggle }) {
  const [debugMode, setDebugMode] = useState(() => {
    return JSON.parse(localStorage.getItem("debugMode")) || false;
  });

  useEffect(() => {
    onToggle(debugMode);
  }, [debugMode, onToggle]);

  const toggleDebug = () => {
    setDebugMode((prevMode) => {
      const newDebugMode = !prevMode;
      localStorage.setItem("debugMode", JSON.stringify(newDebugMode));
      return newDebugMode;
    });
  };

  return (
    <button onClick={toggleDebug} style={{ marginBottom: "10px" }}>
      {debugMode ? "🔧 Debug ON" : "⚙️ Debug OFF"}
    </button>
  );
}

export default DebugToggle;
