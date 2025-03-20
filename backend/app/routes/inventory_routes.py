from flask import Blueprint, jsonify
import logging
from .models import Inventory  # Используем модель Inventory

# Логирование
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bp = Blueprint("inventory", __name__)

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
    inventory_list = Inventory.get_all()
    return jsonify(inventory_list), 200