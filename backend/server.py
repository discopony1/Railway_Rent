from flask import Flask
from flask_cors import CORS
from app.routes.booking_routes import bp as booking_bp
from app.routes.inventory_routes import bp as inventory_bp

app = Flask(__name__)

# Отключаем автоматический редирект слешей
app.url_map.strict_slashes = False

CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True,
        "expose_headers": ["Content-Type"]  # Добавляем expose_headers
    }
})

# Настройка обработки ошибок
@app.errorhandler(400)
def bad_request(error):
    return {"error": "Bad Request", "message": str(error)}, 400

app.config.from_object("app.config")

app.register_blueprint(booking_bp, url_prefix="/api/bookings")
app.register_blueprint(inventory_bp, url_prefix="/api/inventory")

if __name__ == "__main__":
    try:
        print("🚀 Сервер запущен на порту 5000")
        app.run(debug=True, host="0.0.0.0", port=5000)
    except Exception as e:
        print(f"❌ Ошибка при запуске сервера: {e}")