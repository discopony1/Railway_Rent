import React, { useState, useEffect } from "react";

function DebugToggle({ onToggle }) {
  const [debugMode, setDebugMode] = useState(() => {
    return JSON.parse(localStorage.getItem("debugMode")) || false;
  });

  // Save debug mode status in localStorage
  useEffect(() => {
    onToggle(debugMode);
    if (debugMode) {
      addColumnResizing();  // Enable column resizing if debug mode is on
    } else {
      resetColumnResizing();  // Disable column resizing if debug mode is off
    }
  }, [debugMode, onToggle]);

  // Function to toggle debug mode
  const toggleDebug = () => {
    setDebugMode((prevMode) => {
      const newDebugMode = !prevMode;
      localStorage.setItem("debugMode", JSON.stringify(newDebugMode));
      return newDebugMode;
    });
  };

  // Column resizing logic
  const addColumnResizing = () => {
    const columns = document.querySelectorAll('.rental-table th');
    columns.forEach((col, index) => {
      const resizer = document.createElement('div');
      resizer.classList.add('resizer');
      col.appendChild(resizer);

      // Apply saved widths if available
      const savedWidth = localStorage.getItem(`column-${index}-width`);
      if (savedWidth) {
        col.style.width = savedWidth;
      }

      resizer.addEventListener('mousedown', (e) => {
        const startX = e.clientX;
        const startWidth = col.offsetWidth;

        const onMouseMove = (moveEvent) => {
          const newWidth = startWidth + (moveEvent.clientX - startX);
          col.style.width = `${newWidth}px`;
        };

        const onMouseUp = () => {
          // Save column width to localStorage
          localStorage.setItem(`column-${index}-width`, col.style.width);

          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    });
  };

  // Reset the resizing logic by removing resizer elements
  const resetColumnResizing = () => {
    const columns = document.querySelectorAll('.rental-table th');
    columns.forEach((col) => {
      const resizer = col.querySelector('.resizer');
      if (resizer) {
        resizer.remove(); // Remove the resizer div
      }
    });
  };

  return (
    <button 
      onClick={toggleDebug} 
      style={{ 
        marginBottom: "10px", 
        padding: "8px 16px", 
        backgroundColor: debugMode ? "#007bff" : "#f44336", 
        color: "white", 
        border: "none", 
        borderRadius: "6px", 
        cursor: "pointer" 
      }}
    >
      {debugMode ? "🔧 Debug ON" : "⚙️ Debug OFF"}
    </button>
  );
}

export default DebugToggle;
