import psycopg2
from config import DATABASE_URL

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inventory (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            total INTEGER NOT NULL,
            rented INTEGER DEFAULT 0
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
    conn.close()