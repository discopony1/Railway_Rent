from flask import Blueprint, request, jsonify
from datetime import datetime
import json
import logging
from .models import Booking

# Логирование
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bp = Blueprint("bookings", __name__)

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

@bp.route("/", methods=["POST"])
@handle_db_error
def create_booking():
    data = request.json
    logger.info(f"📥 Полученные данные для создания бронирования: {data}")

    if "equipment" in data:
        try:
            equipment_list = json.loads(data["equipment"]) if isinstance(data["equipment"], str) else data["equipment"]
            filtered_equipment = [{"name": item["name"], "quantity": item["quantity"]} for item in equipment_list]
            data["equipment"] = json.dumps(filtered_equipment)
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.error(f"❌ Ошибка обработки equipment: {str(e)}")
            return jsonify({"error": "Неверный формат equipment"}), 400

    new_booking = Booking.create(data)  # <--- Убедись, что в models.py метод create() принимает аргумент data
    return jsonify(new_booking), 201

@bp.route("/<int:booking_id>", methods=["PUT"])
def update_booking(booking_id):
    data = request.get_json()
    print(f"📥 Обновление бронирования {booking_id}: {data}")

    try:
        if isinstance(data["equipment"], str):
            data["equipment"] = json.loads(data["equipment"])
    except json.JSONDecodeError as e:
        logger.error(f"❌ Ошибка декодирования equipment: {e}")
        return jsonify({"error": "Invalid equipment format"}), 400

    # Обновляем данные в базе
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