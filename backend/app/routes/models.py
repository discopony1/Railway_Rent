import psycopg2
import json
import logging

DATABASE_URL = "postgresql://neondb_owner:npg_pFV8bEtTrRM5@ep-weathered-poetry-a9z80hcr-pooler.gwc.azure.neon.tech/neondb?sslmode=require"

# Логирование
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_db_connection():
    """Создает подключение к базе данных."""
    return psycopg2.connect(DATABASE_URL)

def execute_query(query, params=None, fetch=True):
    """Общая функция для выполнения SQL-запросов."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(query, params)
        if fetch:
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
        conn.commit()
        return cursor.rowcount
    except Exception as e:
        conn.rollback()
        logger.error(f"Ошибка выполнения запроса: {str(e)}")
        raise
    finally:
        cursor.close()
        conn.close()

class Booking:
    """Класс для работы с арендами."""

    @staticmethod
    def create(data, where):
        """Создает новую аренду и возвращает ее ID."""
        query = """
            INSERT INTO bookings (start_date, end_date, renter, issuer, receiver, status, notes, equipment, "where")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        equipment = json.dumps(data.get("equipment", []))
        params = (
            data.get("start_date"),
            data.get("end_date"),
            data.get("renter", ""),
            data.get("issuer", ""),
            data.get("receiver", ""),
            data.get("status", "Бронь"),
            data.get("notes", ""),
            equipment,
            where
        )
        result = execute_query(query, params, fetch=True)
        return result[0]["id"] if result else None

    @staticmethod
    def update(booking_id, data, where):
        """Обновляет аренду по ID."""
        query = """
            UPDATE bookings
            SET start_date = %s, 
                end_date = %s, 
                renter = %s, 
                issuer = %s, 
                receiver = %s, 
                status = %s, 
                notes = %s, 
                equipment = %s,
                "where" = %s
            WHERE id = %s
        """
        equipment = json.dumps(data.get("equipment", []))
        params = (
            data.get("start_date"),
            data.get("end_date"),
            data.get("renter", ""),
            data.get("issuer", ""),
            data.get("receiver", ""),
            data.get("status", "Бронь"),
            data.get("notes", ""),
            equipment,
            where,
            booking_id
        )
        return execute_query(query, params, fetch=False)

    @staticmethod
    def get_all():
        """Возвращает список всех аренд."""
        query = "SELECT * FROM bookings"
        return execute_query(query, fetch=True)

    @staticmethod
    def get_by_id(booking_id):
        """Получает аренду по ID и возвращает словарь."""
        query = "SELECT * FROM bookings WHERE id = %s"
        params = (booking_id,)
        result = execute_query(query, params, fetch=True)
        return result[0] if result else None

    @staticmethod
    def delete(booking_id):
        """Удаляет аренду по ID."""
        query = "DELETE FROM bookings WHERE id = %s"
        params = (booking_id,)
        return execute_query(query, params, fetch=False)

class Inventory:
    """Класс для работы с инвентарем."""

    @staticmethod
    def get_all():
        """Получает список всего оборудования без учета брони."""
        query = """
            SELECT id, name, category, subcategory, model, serial_number, notes, status, total, belongs_to
            FROM inventory
        """
        return execute_query(query, fetch=True)

    @staticmethod
    def get_by_id(equipment_id):
        """Получает оборудование по ID и возвращает словарь."""
        query = """
            SELECT id, name, category, subcategory, model, serial_number, notes, status, total, belongs_to
            FROM inventory WHERE id = %s
        """
        params = (equipment_id,)
        result = execute_query(query, params, fetch=True)
        return result[0] if result else None

    @staticmethod
    def update_rented(equipment_id, rented_count):
        """Обновляет количество арендованного оборудования."""
        query = "UPDATE inventory SET rented = %s WHERE id = %s"
        params = (rented_count, equipment_id)
        return execute_query(query, params, fetch=False)
    
    @staticmethod
    def create_item(name, category, subcategory, model, serial_number, notes, status, total, belongs_to):
        """Создает новое оборудование."""
        query = """
            INSERT INTO inventory (name, category, subcategory, model, serial_number, notes, status, total, belongs_to)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        params = (name, category, subcategory, model, serial_number, notes, status, total, belongs_to)
        result = execute_query(query, params, fetch=True)
        return result[0]["id"] if result else None

    @staticmethod
    def update_item(equipment_id, name, category, subcategory, model, serial_number, notes, status, total, belongs_to):
        """Обновляет оборудование по ID."""
        query = """
            UPDATE inventory
            SET name = %s, 
                category = %s, 
                subcategory = %s, 
                model = %s,
                serial_number = %s,
                notes = %s, 
                status = %s, 
                total = %s,
                belongs_to = %s
            WHERE id = %s
        """
        params = (name, category, subcategory, model, serial_number, notes, status, total, belongs_to, equipment_id)
        return execute_query(query, params, fetch=False)
