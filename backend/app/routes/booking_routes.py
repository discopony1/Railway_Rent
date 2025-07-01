from flask import Blueprint, request, jsonify
from datetime import datetime
import json
import logging
from .models import Booking
import psycopg2

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

@bp.route("/health", methods=["GET"])
@handle_db_error
def health_check():
    return jsonify({"status": "ok", "message": "Сервис работает"}), 200

@bp.route("/", methods=["GET"])
@handle_db_error
def get_bookings():
    bookings = Booking.get_all()
    return jsonify(bookings), 200

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

    if "equipment" in data and isinstance(data["equipment"], list):
        try:
            filtered_equipment = [{"name": item["name"], "quantity": item["quantity"]} for item in data["equipment"]]
            data["equipment"] = json.dumps(filtered_equipment)  # Сохраняем JSON-формат
        except (KeyError, TypeError) as e:
            logger.error(f"❌ Ошибка обработки equipment: {str(e)}")
            return jsonify({"error": "Неверный формат equipment"}), 400

    # Добавляем "where" в данные
    where = data.get("where", "в студии")  # По умолчанию "в студии"
    new_booking = Booking.create(data, where)
    return jsonify({"id": new_booking}), 201

@bp.route("/<int:booking_id>", methods=["PUT"])
@handle_db_error
def update_booking(booking_id):
    data = request.get_json()
    logger.info(f"📥 Обновление бронирования {booking_id}")

    if "equipment" in data and isinstance(data["equipment"], list):
        data["equipment"] = json.dumps([
            {"name": item["name"], "quantity": item.get("quantity", 1)}
            for item in data["equipment"]
        ])

    where = data.get("where", "в студии")

    try:
        if "start_date" in data:
            data["start_date"] = datetime.strptime(data["start_date"], "%Y-%m-%d").date()
        if "end_date" in data:
            data["end_date"] = datetime.strptime(data["end_date"], "%Y-%m-%d").date()
    except ValueError as e:
        logger.error(f"❌ Ошибка формата даты: {e}")
        return jsonify({"error": "Неверный формат даты, используйте YYYY-MM-DD"}), 400

    success = Booking.update(booking_id, data, where)
    if success:
        return jsonify({"message": "Booking updated successfully"}), 200
    else:
        return jsonify({"error": "Failed to update booking"}), 500

@bp.route("/<int:booking_id>", methods=["DELETE"])
@handle_db_error
def delete_booking(booking_id):
    success = Booking.delete(booking_id)
    if success:
        return jsonify({"message": "Бронирование удалено"}), 200
    return jsonify({"error": "Бронирование не найдено"}), 404
