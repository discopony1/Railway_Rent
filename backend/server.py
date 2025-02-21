from flask import Flask
from app.database import init_db
from app.routes import booking_routes, inventory_routes

app = Flask(__name__)
app.config.from_pyfile("config.py")

# Подключаем маршруты
app.register_blueprint(booking_routes.bp)
app.register_blueprint(inventory_routes.bp)

if __name__ == "__main__":
    init_db()
    app.run(debug=True)
