from flask import Blueprint, request, jsonify
from app.database import get_db_connection
from datetime import datetime
import logging
import psycopg2
from psycopg2 import OperationalError, InterfaceError

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bp = Blueprint("bookings", __name__)

def handle_db_error(func):
    """Декоратор для обработки ошибок базы данных"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except (OperationalError, InterfaceError) as e:
            logger.error(f"Database connection error: {str(e)}")
            return jsonify({
                "error": "Ошибка подключения к базе данных",
                "details": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }), 500
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return jsonify({
                "error": "Внутренняя ошибка сервера",
                "details": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }), 500
    wrapper.__name__ = func.__name__
    return wrapper

@bp.route("/health", methods=["GET"])
@handle_db_error
def health_check():
    """Проверка работоспособности API и подключения к БД"""
    conn = get_db_connection()
    if not conn:
        return jsonify({
            "status": "error",
            "message": "Нет подключения к базе данных",
            "timestamp": datetime.utcnow().isoformat()
        }), 500

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        return jsonify({
            "status": "ok",
            "message": "Сервис работает",
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500

@bp.route("/", methods=["GET"])
@handle_db_error
def get_bookings():
    """Получение всех бронирований"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM bookings
            ORDER BY start_date DESC
        """)
        bookings = cursor.fetchall()
        
        result = [
            {
                "id": b[0],
                "start_date": b[1].isoformat() if b[1] else None,
                "end_date": b[2].isoformat() if b[2] else None,
                "renter": b[3],
                "equipment": b[4],  # Используем equipment вместо equipment_id
                "issuer": b[5],
                "receiver": b[6],
                "status": b[7],
                "notes": b[8]
            }
            for b in bookings
        ]
        
        return jsonify(result)
    finally:
        cursor.close()
        conn.close()

@bp.route("/", methods=["POST"])
@handle_db_error
def create_booking():
    """Создание нового бронирования"""
    data = request.json
    
    try:
        start_date = datetime.strptime(data["start_date"], "%Y-%m-%d %H:%M")
        end_date = datetime.strptime(data["end_date"], "%Y-%m-%d %H:%M")
        if end_date <= start_date:
            return jsonify({"error": "Дата окончания должна быть позже даты начала"}), 400
    except (KeyError, ValueError):
        return jsonify({"error": "Некорректный формат дат"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Проверка доступности оборудования
        cursor.execute("""
            SELECT name, available 
            FROM inventory 
            WHERE name = %s AND available > 0
        """, (data["equipment"],))  # Используем equipment вместо equipment_id
        
        item = cursor.fetchone()
        if not item:
            return jsonify({"error": "Оборудование недоступно"}), 400

        # Проверка пересечения броней
        cursor.execute("""
            SELECT COUNT(*) FROM bookings 
            WHERE equipment = %s 
            AND status != 'Возвращено'
            AND (
                (start_date <= %s AND end_date >= %s)
                OR (start_date <= %s AND end_date >= %s)
                OR (start_date >= %s AND end_date <= %s)
            )
        """, (data["equipment"], start_date, start_date, 
              end_date, end_date, start_date, end_date))
        
        if cursor.fetchone()[0] > 0:
            return jsonify({"error": "Выбранный период пересекается с существующей бронью"}), 400

        # Создание брони
        cursor.execute("""
            INSERT INTO bookings (
                start_date, end_date, renter, equipment, 
                issuer, receiver, status, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            start_date, end_date, data["renter"], data["equipment"],
            data.get("issuer"), data.get("receiver"), "Бронь", data.get("notes")
        ))
        
        new_booking_id = cursor.fetchone()[0]

        # Обновление доступного количества
        cursor.execute("""
            UPDATE inventory 
            SET available = available - 1 
            WHERE name = %s
        """, (data["equipment"],))

        conn.commit()
        return jsonify({
            "message": "Бронирование создано",
            "booking_id": new_booking_id
        }), 201

    finally:
        cursor.close()
        conn.close()

@bp.route("/<int:booking_id>", methods=["PUT"])
@handle_db_error
def update_booking(booking_id):
    """Обновление статуса бронирования"""
    data = request.json
    if "status" not in data:
        return jsonify({"error": "Не указан статус"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Проверка существования брони
        cursor.execute("""
            SELECT status, equipment 
            FROM bookings 
            WHERE id = %s
        """, (booking_id,))
        
        booking = cursor.fetchone()
        if not booking:
            return jsonify({"error": "Бронирование не найдено"}), 404

        old_status, equipment = booking

        # Обновление количества доступного оборудования
        if old_status != "Возвращено" and data["status"] == "Возвращено":
            cursor.execute("""
                UPDATE inventory 
                SET available = available + 1 
                WHERE name = %s
            """, (equipment,))

        # Обновление статуса
        cursor.execute("""
            UPDATE bookings 
            SET status = %s
            WHERE id = %s
        """, (data["status"], booking_id))

        conn.commit()
        return jsonify({"message": "Статус обновлён"})

    finally:
        cursor.close()
        conn.close()

@bp.route("/archive", methods=["POST"])
@handle_db_error
def archive_bookings():
    """Архивация завершённых бронирований"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Архивация завершённых броней
        cursor.execute("""
            WITH archived AS (
                DELETE FROM bookings 
                WHERE status = 'Возвращено'
                RETURNING *
            )
            SELECT COUNT(*) FROM archived
        """)
        
        deleted_count = cursor.fetchone()[0]
        conn.commit()
        
        return jsonify({
            "message": f"Архивировано {deleted_count} записей",
            "timestamp": datetime.utcnow().isoformat()
        }), 200

    finally:
        cursor.close()
        conn.close()