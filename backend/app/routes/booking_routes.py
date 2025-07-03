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
    data = request.json or {}
    logger.info(f"📥 Полученные данные для создания бронирования: {data}")

    if "equipment" in data and isinstance(data["equipment"], list):
        try:
            filtered_equipment = [{"name": item["name"], "quantity": item["quantity"]} for item in data["equipment"]]
            data["equipment"] = filtered_equipment  # Передаем список, JSON создается в модели
        except (KeyError, TypeError) as e:
            logger.error(f"❌ Ошибка обработки equipment: {str(e)}")
            return jsonify({"error": "Неверный формат equipment"}), 400

    # Добавляем "where" в данные
    where = data.get("where", "в студии")  # По умолчанию "в студии"
    
    try:
        new_booking_id = Booking.create(data, where)
        logger.info(f"📥 Созданное ID бронирования: {new_booking_id}")
        
        if new_booking_id:
            # Получаем полную запись и возвращаем её
            created_booking = Booking.get_by_id(new_booking_id)
            logger.info(f"📥 Полученная запись: {created_booking}")
            return jsonify(created_booking), 201
        else:
            logger.error("❌ Не удалось создать бронирование - ID is None")
            return jsonify({"error": "Failed to create booking"}), 500
    except Exception as e:
        logger.error(f"❌ Исключение при создании бронирования: {str(e)}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@bp.route("/<int:booking_id>", methods=["PUT"])
@handle_db_error
def update_booking(booking_id):
    data = request.get_json()
    logger.info(f"📥 Обновление бронирования {booking_id}")
    logger.info(f"📥 Полученные данные: {data}")

    where = data.get("where", "в студии")
    
    # Фильтруем только нужные поля для обновления
    allowed_fields = ['start_date', 'end_date', 'renter', 'issuer', 'receiver', 'status', 'notes', 'equipment']
    filtered_data = {key: value for key, value in data.items() if key in allowed_fields}
    
    # Оборудование обрабатывается в модели, здесь только фильтруем поля
    if "equipment" in filtered_data and isinstance(filtered_data["equipment"], list):
        filtered_data["equipment"] = [
            {"name": item["name"], "quantity": item.get("quantity", 1)}
            for item in filtered_data["equipment"]
        ]
    
    logger.info(f"📥 Отфильтрованные данные: {filtered_data}")

    try:
        if "start_date" in filtered_data:
            filtered_data["start_date"] = datetime.strptime(filtered_data["start_date"], "%Y-%m-%d").date()
        if "end_date" in filtered_data:
            filtered_data["end_date"] = datetime.strptime(filtered_data["end_date"], "%Y-%m-%d").date()
    except ValueError as e:
        logger.error(f"❌ Ошибка формата даты: {e}")
        return jsonify({"error": "Неверный формат даты, используйте YYYY-MM-DD"}), 400

    try:
        # Проверяем, существует ли запись
        existing_booking = Booking.get_by_id(booking_id)
        if not existing_booking:
            logger.error(f"❌ Бронирование {booking_id} не найдено")
            return jsonify({"error": "Booking not found"}), 404
            
        success = Booking.update(booking_id, filtered_data, where)
        if success:
            return jsonify({"message": "Booking updated successfully"}), 200
        else:
            logger.error(f"❌ Не удалось обновить бронирование {booking_id} (updated 0 rows)")
            return jsonify({"error": "Failed to update booking"}), 500
    except Exception as e:
        logger.error(f"❌ Исключение при обновлении бронирования {booking_id}: {str(e)}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@bp.route("/<int:booking_id>", methods=["DELETE"])
@handle_db_error
def delete_booking(booking_id):
    success = Booking.delete(booking_id)
    if success:
        return jsonify({"message": "Бронирование удалено"}), 200
    return jsonify({"error": "Бронирование не найдено"}), 404
