from flask import Flask
from flask_cors import CORS
from app.routes.booking_routes import bp as booking_bp
from app.routes.inventory_routes import bp as inventory_bp

ALLOWED_ORIGINS = ["http://localhost:3000", "https://твоя-прод-страница.com"]
app = Flask(__name__)

CORS(app, resources={
    r"/api/*": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True,
        "expose_headers": ["Content-Type"]
    }
})
CORS(app) 
# Отключаем автоматический редирект слешей
app.url_map.strict_slashes = False

# Настройка обработки ошибок
@app.errorhandler(400)
def bad_request(error):
    return {"error": "Bad Request", "message": str(error)}, 400

app.config.from_object("app.config")

app.register_blueprint(booking_bp, url_prefix="/api/bookings")
app.register_blueprint(inventory_bp, url_prefix="/api/inventory")

if __name__ == "__main__":
    try:
        app.run(debug=True, host="0.0.0.0", port=5000)
    except Exception as e:
        print(f"❌ Ошибка при запуске сервера: {e}")