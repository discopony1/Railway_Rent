import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import StatusSelect from "./StatusSelect";
import "./styles.css";

function Table() {
  const [rentals, setRentals] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [equipmentModal, setEquipmentModal] = useState(null); // Открытая строка

  useEffect(() => {
    fetch("/equipment") // Загружаем список оборудования
      .then((res) => res.json())
      .then((data) => setEquipmentList(data))
      .catch((err) => console.error("Ошибка загрузки оборудования:", err));
  }, []);

  const addRental = () => {
    setRentals([
      ...rentals,
      {
        id: rentals.length + 1,
        startDate: null,
        endDate: null,
        renter: "",
        equipment: "",
        issuer: "",
        receiver: "",
        status: "Бронь",
        notes: "",
      },
    ]);
  };

  const handleDateChange = (rowId, type, date) => {
    let newRentals = [...rentals];
    newRentals[rowId][type] = date;
    setRentals(newRentals);
  };

  const selectEquipment = (rowId) => {
    setEquipmentModal(rowId);
  };

  const handleEquipmentSelect = (rowId, equipment) => {
    let newRentals = [...rentals];
    newRentals[rowId].equipment = equipment.name;
    setRentals(newRentals);
    setEquipmentModal(null);
  };

  return (
    <div className="table-container">
      <button onClick={addRental}>+ Добавить аренду</button>
      <table>
        <thead>
          <tr>
            <th>Дата аренды</th>
            <th>Кто берет</th>
            <th>Оборудование</th>
            <th>Кто выдал</th>
            <th>Кто принял</th>
            <th>Статус</th>
            <th>Примечания</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map((rental, index) => (
            <tr key={index}>
              <td className="date-cell">
                <div className="date-block">
                  <span>С</span>
                  <DatePicker
                    selected={rental.startDate}
                    onChange={(date) => handleDateChange(index, "startDate", date)}
                    showTimeSelect
                    dateFormat="dd/MM/yy HH:mm"
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    placeholderText="Выбрать"
                    className="date-picker"
                  />
                </div>
                <div className="date-block">
                  <span>По</span>
                  <DatePicker
                    selected={rental.endDate}
                    onChange={(date) => handleDateChange(index, "endDate", date)}
                    showTimeSelect
                    dateFormat="dd/MM/yy HH:mm"
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    placeholderText="Выбрать"
                    className="date-picker"
                  />
                </div>
              </td>

              <td>
                <input
                  type="text"
                  value={rental.renter}
                  onChange={(e) => {
                    let newRentals = [...rentals];
                    newRentals[index].renter = e.target.value;
                    setRentals(newRentals);
                  }}
                />
              </td>
              <td onClick={() => selectEquipment(index)}>
                {rental.equipment || "Выбрать"}
              </td>
              <td>
                <input
                  type="text"
                  value={rental.issuer}
                  onChange={(e) => {
                    let newRentals = [...rentals];
                    newRentals[index].issuer = e.target.value;
                    setRentals(newRentals);
                  }}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={rental.receiver}
                  onChange={(e) => {
                    let newRentals = [...rentals];
                    newRentals[index].receiver = e.target.value;
                    setRentals(newRentals);
                  }}
                />
              </td>
              <td>
                <StatusSelect
                  status={rental.status}
                  onChange={(status) => {
                    let newRentals = [...rentals];
                    newRentals[index].status = status;
                    setRentals(newRentals);
                  }}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={rental.notes}
                  onChange={(e) => {
                    let newRentals = [...rentals];
                    newRentals[index].notes = e.target.value;
                    setRentals(newRentals);
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {equipmentModal !== null && (
        <div className="modal">
          <h3>Выберите оборудование</h3>
          <ul>
            {equipmentList.map((item) => (
              <li key={item.id} onClick={() => handleEquipmentSelect(equipmentModal, item)}>
                {item.name}
              </li>
            ))}
          </ul>
          <button onClick={() => setEquipmentModal(null)}>Закрыть</button>
        </div>
      )}
    </div>
  );
}

export default Table;
