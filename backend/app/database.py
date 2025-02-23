import psycopg2
from app.config import DATABASE_URL

def get_db_connection():
    """Устанавливает соединение с PostgreSQL и возвращает объект подключения."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("✅ Успешное подключение к базе")
        return conn
    except Exception as e:
        print(f"❌ Ошибка подключения к базе: {e}")
        return None

def init_db():
    """Создаёт таблицы, если они не существуют."""
    conn = get_db_connection()
    if conn is None:
        return  # Если подключения нет, просто выходим

    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                total INTEGER NOT NULL CHECK (total >= 0),
                rented INTEGER DEFAULT 0 CHECK (rented >= 0)
            );

            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP NOT NULL,
                renter TEXT NOT NULL,
                equipment TEXT NOT NULL,
                issuer TEXT,
                receiver TEXT,
                status TEXT CHECK (status IN ('Бронь', 'Выдано', 'Возвращено')),
                notes TEXT
            );
        """)
        conn.commit()
        print("✅ Таблицы успешно созданы или уже существуют")
    except Exception as e:
        print(f"❌ Ошибка при создании таблиц: {e}")
    finally:
        cursor.close()
        conn.close()
