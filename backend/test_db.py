import psycopg
from config import DATABASE_URL

try:
    conn = psycopg.connect(DATABASE_URL)
    print("✅ Успешное подключение к PostgreSQL!")
    conn.close()
except Exception as e:
    print(f"❌ Ошибка подключения: {e}")

create_table_query = """
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    total INTEGER NOT NULL,
    rented INTEGER DEFAULT 0,
    available INTEGER GENERATED ALWAYS AS (total - rented) STORED
);
"""

try:
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(create_table_query)
            conn.commit()
    print("✅ Таблица inventory успешно создана!")
except Exception as e:
    print(f"❌ Ошибка при создании таблицы: {e}")