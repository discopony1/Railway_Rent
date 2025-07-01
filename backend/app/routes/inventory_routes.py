from flask import Blueprint, jsonify, request
import logging
from .models import Inventory  # Используем модель Inventory

# Логирование
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bp = Blueprint("inventory", __name__, url_prefix="/api/inventory")  # Указываем префикс для всех маршрутов этого Blueprint

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

# 🔹 Получение списка оборудования с учётом брони
@bp.route("/", methods=["GET"])
@handle_db_error
def get_inventory():
    try:
        inventory_list = Inventory.get_all()
        return jsonify(inventory_list), 200
    except Exception as e:
        logger.error(f"Ошибка при получении инвентаря: {str(e)}")
        return jsonify({"error": "Не удалось получить инвентарь"}), 500

# 🔹 Получение оборудования по ID
@bp.route("/<int:item_id>", methods=["GET"])
@handle_db_error
def get_inventory_item(item_id):
    item = Inventory.get_by_id(item_id)
    if item:
        return jsonify(item), 200
    return jsonify({"error": "Оборудование не найдено"}), 404

# 🔹 Обновление инвентаря по ID
@bp.route("/<int:item_id>", methods=["PUT"])
@handle_db_error
def update_inventory_item(item_id):
    data = request.json
    logger.info(f"Received data for update: {data}")  # Логируем полученные данные

    updated = Inventory.update_item(
        item_id, 
        name=data.get('name'),
        category=data.get('category'),
        subcategory=data.get('subcategory'),
        model=data.get('model'),
        serial_number=data.get('serial_number'),
        notes=data.get('notes'),
        status=data.get('status'),
        total=data.get('total'),
        belongs_to=data.get('belongs_to')
    )
    
    if updated:
        logger.info(f"Item {item_id} updated successfully")  # Логируем успешное обновление
        return jsonify({"success": True}), 200
    else:
        logger.error(f"Failed to update item {item_id}")  # Логируем ошибку
        return jsonify({"error": "Не удалось обновить оборудование"}), 500
    
# 🔹 Создание нового оборудования
@bp.route("/create", methods=["POST"])
@handle_db_error
def create_inventory_item():
    data = request.json
    name = data.get('name')
    category = data.get('category')
    subcategory = data.get('subcategory')
    model = data.get('model')      
    serial_number = data.get('serial_number')
    notes = data.get('notes')
    status = data.get('status')
    total = data.get('total')
    belongs_to = data.get('belongs_to')


    if not all([name, category, subcategory, model, serial_number, status, notes, total, belongs_to]):
        return jsonify({"error": "Все поля должны быть заполнены"}), 400

    new_item_id = Inventory.create_item(name, category, subcategory, model, serial_number, status, notes, total, belongs_to)
    if new_item_id:
        return jsonify({"success": True, "id": new_item_id}), 201
    else:
        return jsonify({"error": "Не удалось создать оборудование"}), 500