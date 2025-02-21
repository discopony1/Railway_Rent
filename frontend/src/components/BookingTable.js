import React from "react";
import "./styles.css";

function BookingTable({ bookings }) {
    return (
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
                {bookings.map((booking) => (
                    <tr key={booking.id}>
                        <td>{booking.start_date} - {booking.end_date}</td>
                        <td>{booking.renter}</td>
                        <td>{booking.equipment}</td>
                        <td>{booking.issuer}</td>
                        <td>{booking.receiver}</td>
                        <td>{booking.status}</td>
                        <td>{booking.notes}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default BookingTable;
