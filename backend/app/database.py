import psycopg2
from app.config import DATABASE_URL

def get_db_connection():
    """Устанавливает соединение с PostgreSQL и возвращает объект подключения."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print(f"✅ Успешное подключение к базе: {DATABASE_URL}")
        return conn
    except Exception as e:
        print(f"❌ Ошибка подключения к базе {DATABASE_URL}: {e}")
        return None
