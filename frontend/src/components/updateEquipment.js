const updateEquipment = async (rentalData) => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/update-rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rentals: rentalData }),
      });
  
      const result = await response.json();
      if (response.ok) {
        console.log("✅ Оборудование успешно обновлено:", result);
      } else {
        console.error("❌ Ошибка обновления оборудования:", result);
      }
    } catch (error) {
      console.error("🚨 Ошибка соединения с сервером:", error);
    }
  };
  
  export default updateEquipment;
  