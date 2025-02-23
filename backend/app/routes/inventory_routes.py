from flask import Blueprint, jsonify
from app.database import get_db_connection
from datetime import datetime

bp = Blueprint("inventory", __name__)

@bp.route("/", methods=["GET"])
def get_inventory():
    """Получаем список инвентаря с учётом броней и свободных интервалов"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Получаем все предметы из `inventory`
    cursor.execute("SELECT id, name, total FROM inventory")
    inventory_items = cursor.fetchall()

    # Получаем бронирования с активным статусом
    cursor.execute("""
        SELECT equipment, start_date, end_date 
        FROM bookings 
        WHERE status IN ('Бронь', 'Выдано')
        ORDER BY start_date
    """)
    active_bookings = cursor.fetchall()

    # Преобразуем брони в словарь {название_оборудования: [(start, end)]}
    booked_equipment = {}
    for equipment, start_date, end_date in active_bookings:
        if equipment in booked_equipment:
            booked_equipment[equipment].append((start_date, end_date))
        else:
            booked_equipment[equipment] = [(start_date, end_date)]

    # Формируем финальный список с расчётом доступности
    result = []
    for item in inventory_items:
        item_id, name, total = item
        booked_intervals = booked_equipment.get(name, [])
        booked_count = len(booked_intervals)
        available = total - booked_count

        free_interval = None
        if booked_intervals:
            # Найдём возможные окна между бронями
            free_periods = []
            for i in range(len(booked_intervals) - 1):
                current_end = booked_intervals[i][1]
                next_start = booked_intervals[i + 1][0]
                if current_end < next_start:
                    free_periods.append((current_end, next_start))

            # Формируем текст о ближайшем освобождении
            if free_periods:
                free_interval = f"{free_periods[0][0].strftime('%d.%m %H:%M')} - {free_periods[0][1].strftime('%d.%m %H:%M')}"
            else:
                last_end = booked_intervals[-1][1]
                free_interval = f"с {last_end.strftime('%d.%m %H:%M')}"

        result.append({
            "id": item_id,
            "name": name,
            "total": total,
            "rented": booked_count,
            "available": available,
            "next_available": free_interval
        })

    cursor.close()
    conn.close()
    
    return jsonify(result)
