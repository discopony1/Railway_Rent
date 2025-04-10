from flask import Blueprint, request, jsonify
from datetime import datetime
from datetime import datetime, timedelta
import json
import logging
from .models import Booking
import psycopg2
DATABASE_URL = "postgresql://neondb_owner:npg_pFV8bEtTrRM5@ep-weathered-poetry-a9z80hcr-pooler.gwc.azure.neon.tech/neondb?sslmode=require"

# Логирование
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bp = Blueprint("bookings", __name__)

def get_db_connection():
    """Создает подключение к базе данных."""
    return psycopg2.connect(DATABASE_URL)

def handle_db_error(func):
    """Декоратор для обработки ошибок базы данных"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Ошибка в API: {str(e)}")
            return jsonify({"error": "Внутренняя ошибка сервера", "details": str(e)}), 500
    wrapper.__name__ = func.__name__
    return wrapper

# 🔹 Проверка работоспособности API
@bp.route("/health", methods=["GET"])
@handle_db_error
def health_check():
    return jsonify({"status": "ok", "message": "Сервис работает"}), 200

# 🔹 Получение списка всех аренд
@bp.route("/", methods=["GET"])
@handle_db_error
def get_bookings():
    bookings = Booking.get_all()
    return jsonify(bookings), 200

# 🔹 Получение аренды по ID
@bp.route("/<int:booking_id>", methods=["GET"])
@handle_db_error
def get_booking_by_id(booking_id):
    booking = Booking.get_by_id(booking_id)
    if booking:
        return jsonify(booking), 200
    return jsonify({"error": "Бронирование не найдено"}), 404

# 🔹 Создание аренды
@bp.route("/", methods=["POST"])
@handle_db_error
def create_booking():
    data = request.json
    logger.info(f"📥 Полученные данные для создания бронирования: {data}")

    if "equipment" in data and isinstance(data["equipment"], list):
        try:
            filtered_equipment = [{"name": item["name"], "quantity": item["quantity"]} for item in data["equipment"]]
            data["equipment"] = json.dumps(filtered_equipment)  # Сохраняем JSON-формат
        except (KeyError, TypeError) as e:
            logger.error(f"❌ Ошибка обработки equipment: {str(e)}")
            return jsonify({"error": "Неверный формат equipment"}), 400

    new_booking = Booking.create(data)
    return jsonify({"id": new_booking}), 201

# 🔹 Обновление аренды
@bp.route("/<int:booking_id>", methods=["PUT"])
@handle_db_error
def update_booking(booking_id):
    data = request.get_json()
    logger.info(f"📥 Обновление бронирования {booking_id}")

    # Оставляем в equipment только нужные данные
    if "equipment" in data and isinstance(data["equipment"], list):
        data["equipment"] = json.dumps([
            {"name": item["name"], "quantity": item.get("quantity", 1)}
            for item in data["equipment"]
        ])  # Конвертируем в JSON перед отправкой

    # Проверяем формат даты
    try:
        if "start_date" in data:
            data["start_date"] = datetime.strptime(data["start_date"], "%Y-%m-%d").date()
        if "end_date" in data:
            data["end_date"] = datetime.strptime(data["end_date"], "%Y-%m-%d").date()
    except ValueError as e:
        logger.error(f"❌ Ошибка формата даты: {e}")
        return jsonify({"error": "Неверный формат даты, используйте YYYY-MM-DD"}), 400

    success = Booking.update(booking_id, data)
    if success:
        return jsonify({"message": "Booking updated successfully"}), 200
    else:
        return jsonify({"error": "Failed to update booking"}), 500

# 🔹 Удаление аренды
@bp.route("/<int:booking_id>", methods=["DELETE"])
@handle_db_error
def delete_booking(booking_id):
    success = Booking.delete(booking_id)
    if success:
        return jsonify({"message": "Бронирование удалено"}), 200
    return jsonify({"error": "Бронирование не найдено"}), 404

# 🔹 Получение доступного оборудования с учетом броней
@bp.route("/available-equipment", methods=["GET"])
@handle_db_error
def get_available_equipment():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    if not start_date or not end_date:
        return jsonify({"error": "Требуются start_date и end_date"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # ✅ Получаем общее количество оборудования
        cursor.execute("SELECT id, name, category, total AS total_quantity FROM inventory")
        inventory_rows = cursor.fetchall()
        inventory = [{"id": row[0], "name": row[1], "category": row[2], "total_quantity": row[3]} for row in inventory_rows]

        # ✅ Получаем арендованные единицы за указанный период
        cursor.execute("""
            SELECT equipment->>'name' AS name, SUM((equipment->>'quantity')::int) AS rented
            FROM bookings
            WHERE (start_date <= %s AND end_date >= %s)
            GROUP BY equipment->>'name'
        """, (end_date, start_date))
        rented_rows = cursor.fetchall()

        # ✅ Преобразуем данные в словарь { name: rented_quantity }
        rented_dict = {row[0]: row[1] for row in rented_rows}

        # ✅ Добавляем доступное количество
        for item in inventory:
            rented = rented_dict.get(item["name"], 0)
            item["availableQuantity"] = max(0, item["total_quantity"] - rented)

        return jsonify(inventory), 200

    except Exception as e:
        logger.error(f"Ошибка в get_available_equipment: {str(e)}")
        return jsonify({"error": "Ошибка получения доступного оборудования"}), 500

    finally:
        cursor.close()
        conn.close()

@bp.route("/suggest-availability", methods=["POST"])
def suggest_availability():
    db = get_db_connection()
    data = request.json
    selected_equipment = data.get("equipment", [])  # [{"name": "Клавиатура", "quantity": 2}, ...]
    start_date = datetime.fromisoformat(data.get("start_date"))
    end_date = datetime.fromisoformat(data.get("end_date"))

    conflicts = {}  # Здесь будут конфликты по каждому оборудованию

    for item in selected_equipment:
        name = item["name"]

        # Запрашиваем аренды для этого оборудования в указанный диапазон
        query = """
        SELECT start_date, end_date, quantity
        FROM rent
        WHERE status != 'Возвращено' 
        AND equipment @> '[{"name": "%s"}]'::jsonb
        """ % name
        rentals = db.execute(query).fetchall()

        unavailable_periods = []
        for rental in rentals:
            rental_start = rental["start_date"]
            rental_end = rental["end_date"]

            # Проверяем, пересекается ли аренда
            if rental_start < end_date and rental_end > start_date:
                unavailable_periods.append((rental_start, rental_end))

        # Если есть пересечения, находим ближайший свободный слот
        if unavailable_periods:
            unavailable_periods.sort()  # Сортируем аренды по дате
            next_available_start = unavailable_periods[-1][1] + timedelta(minutes=1)
            conflicts[name] = next_available_start

    return jsonify({"conflicts": conflicts}), 200