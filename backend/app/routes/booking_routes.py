from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from datetime import datetime

bp = Blueprint("bookings", __name__)

@bp.route("/", methods=["GET"])
def status():
    """Проверка работы API."""
    return jsonify({"message": "Маршрут /api/bookings работает!"})

# Получение всех бронирований
@bp.route("/", methods=["GET"])
def get_bookings():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Нет соединения с БД"}), 500

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM bookings")
    bookings = cursor.fetchall()

    cursor.close()
    conn.close()
    
    result = [
        {
            "id": b[0],
            "start_date": b[1],
            "end_date": b[2],
            "renter": b[3],
            "equipment": b[4],
            "issuer": b[5],
            "receiver": b[6],
            "status": b[7],
            "notes": b[8]
        }
        for b in bookings
    ]
    
    return jsonify(result)

# Добавление нового бронирования
@bp.route("/", methods=["POST"])
def create_booking():
    data = request.json

    try:
        start_date = datetime.strptime(data["start_date"], "%Y-%m-%d %H:%M")
        end_date = datetime.strptime(data["end_date"], "%Y-%m-%d %H:%M")
    except (KeyError, ValueError):
        return jsonify({"error": "Некорректные даты"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO bookings (start_date, end_date, renter, equipment, issuer, receiver, status, notes) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (start_date, end_date, data["renter"], data["equipment"], 
          data.get("issuer"), data.get("receiver"), "Бронь", data.get("notes")))

    conn.commit()

    cursor.close()
    conn.close()
    return jsonify({"message": "Бронирование добавлено!"}), 201

@bp.route("/", methods=["POST"])
def create_booking():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()

    # Проверяем наличие оборудования
    cursor.execute("SELECT available FROM inventory WHERE id = %s", (data["equipment_id"],))
    item = cursor.fetchone()
    if not item or item[0] <= 0:
        return jsonify({"error": "Оборудование недоступно"}), 400

    # Создаем бронь
    cursor.execute("""
        INSERT INTO bookings (start_date, end_date, renter, equipment_id, issuer, receiver, status, notes) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (data["start_date"], data["end_date"], data["renter"], data["equipment_id"], 
          data.get("issuer"), data.get("receiver"), "Бронь", data.get("notes")))

    # Обновляем количество в inventory
    cursor.execute("UPDATE inventory SET available = available - 1 WHERE id = %s", (data["equipment_id"],))

    conn.commit()
    cursor.close()
    conn.close()
    
    return jsonify({"message": "Бронирование добавлено!"}), 201

# Обновление статуса бронирования
@bp.route("/<int:booking_id>", methods=["PUT"])
def update_booking(booking_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()

    # Проверяем текущее состояние брони
    cursor.execute("SELECT status, equipment_id FROM bookings WHERE id = %s", (booking_id,))
    booking = cursor.fetchone()
    if not booking:
        return jsonify({"error": "Бронирование не найдено"}), 404

    old_status, equipment_id = booking

    # Если статус меняется на "Возвращено", увеличиваем количество
    if old_status != "Возвращено" and data["status"] == "Возвращено":
        cursor.execute("UPDATE inventory SET available = available + 1 WHERE id = %s", (equipment_id,))

    cursor.execute("UPDATE bookings SET status = %s WHERE id = %s", (data["status"], booking_id))
    conn.commit()
    
    cursor.close()
    conn.close()
    return jsonify({"message": "Статус обновлён!"})

# Архивация завершённых бронирований
@bp.route("/archive", methods=["POST"])
def archive_bookings():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Удаляем записи со статусом "Возвращено"
    cursor.execute("DELETE FROM bookings WHERE status = 'Возвращено'")
    deleted_count = cursor.rowcount
    
    conn.commit()

    cursor.close()
    conn.close()
    return jsonify({"message": f"Архивировано {deleted_count} записей"}), 200
