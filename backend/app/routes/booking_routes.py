from flask import Blueprint, request, jsonify
from app.database import get_db_connection

bp = Blueprint("bookings", __name__)

@bp.route("/bookings", methods=["GET"])
def get_bookings():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM bookings;")
    bookings = cursor.fetchall()
    conn.close()

    return jsonify([{
        "id": row[0], "start_date": row[1], "end_date": row[2],
        "renter": row[3], "equipment": row[4],
        "issuer": row[5], "receiver": row[6],
        "status": row[7], "notes": row[8]
    } for row in bookings])
