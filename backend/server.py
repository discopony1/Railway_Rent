from flask import Flask
from flask_cors import CORS
from app.routes.booking_routes import bp as booking_bp
from app.routes.inventory_routes import bp as inventory_bp

# Список разрешенных источников (фронт на порту 3000)
ALLOWED_ORIGINS = ["http://localhost:3000"]

app = Flask(__name__)

# Настроим CORS для всех API запросов, чтобы они могли работать с фронтэндами
CORS(app, resources={
    r"/api/*": {
        "origins": ALLOWED_ORIGINS,  # Разрешаем доступ с указанных источников
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Разрешаем эти методы
        "allow_headers": ["Content-Type"],  # Разрешаем заголовок Content-Type
        "supports_credentials": True,  # Поддержка cookie
        "expose_headers": ["Content-Type"]  # Экспонируем Content-Type в заголовках ответа
    }
})

# Отключаем автоматический редирект слешей
app.url_map.strict_slashes = False

# Настройка обработки ошибок
@app.errorhandler(400)
def bad_request(error):
    return {"error": "Bad Request", "message": str(error)}, 400

# Загружаем конфигурацию приложения
app.config.from_object("app.config")

# Регистрируем блюпринты
app.register_blueprint(booking_bp, url_prefix="/api/bookings")
app.register_blueprint(inventory_bp, url_prefix="/api/inventory")

# Запуск сервера на порту 5000
if __name__ == "__main__":
    try:
        app.run(debug=True, host="0.0.0.0", port=5000)
    except Exception as e:
        print(f"❌ Ошибка при запуске сервера: {e}")
