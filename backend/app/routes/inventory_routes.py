from flask import Blueprint, request, jsonify
from app.database import get_db_connection

bp = Blueprint("inventory", __name__)

@bp.route("/inventory", methods=["GET"])
def get_inventory():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inventory;")
    inventory = cursor.fetchall()
    conn.close()

    return jsonify([{
        "id": row[0], "name": row[1],
        "total": row[2], "rented": row[3]
    } for row in inventory])
