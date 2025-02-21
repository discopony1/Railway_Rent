from flask import Blueprint, jsonify, request
from models import get_inventory, create_booking

bp = Blueprint("routes", __name__)

@bp.route("/inventory", methods=["GET"])
def inventory():
    items = get_inventory()
    return jsonify(items)

@bp.route("/book", methods=["POST"])
def book():
    data = request.json
    create_booking(data["name"], data["equipment"], data["start_date"], data["end_date"])
    return jsonify({"message": "Бронь создана"})