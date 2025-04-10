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

class Booking:
    """Класс для работы с арендами."""

    @staticmethod
    def create(data):
        """Создает новую аренду и возвращает ее ID."""
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            # Обрабатываем JSON equipment
            equipment = json.dumps(data.get("equipment", []))

            cursor.execute("""
                INSERT INTO bookings (start_date, end_date, renter, issuer, receiver, status, notes, equipment)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                data.get("start_date"),
                data.get("end_date"),
                data.get("renter", ""),
                data.get("issuer", ""),
                data.get("receiver", ""),
                data.get("status", "Бронь"),
                data.get("notes", ""),
                equipment
            ))
            booking_id = cursor.fetchone()

            if not booking_id:
                raise ValueError("❌ Не удалось создать аренду: ID не получен.")

            conn.commit()
            return booking_id[0]
        except Exception as e:
            conn.rollback()
            logger.error(f"❌ Ошибка создания аренды: {e}")
            raise  # Пробрасываем ошибку дальше
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_all():
        """Возвращает список всех аренд."""
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT * FROM bookings")
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]  # Получаем имена столбцов
            bookings = [dict(zip(columns, row)) for row in rows]  # Преобразуем в список словарей
            return bookings
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_by_id(booking_id):
        """Получает аренду по ID и возвращает словарь."""
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT * FROM bookings WHERE id = %s", (booking_id,))
            row = cursor.fetchone()
            if row:
                columns = [desc[0] for desc in cursor.description]
                return dict(zip(columns, row))
            return None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def update(booking_id, data):
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            equipment = json.dumps(data.get("equipment", []))

            cursor.execute("""
                UPDATE bookings
                SET start_date = %s, 
                    end_date = %s, 
                    renter = %s, 
                    issuer = %s, 
                    receiver = %s, 
                    status = %s, 
                    notes = %s, 
                    equipment = %s
                WHERE id = %s
            """, (
                data.get("start_date"),
                data.get("end_date"),
                data.get("renter", ""),  # ФИО арендатора
                data.get("issuer", ""),  # Кто выдал
                data.get("receiver", ""),  # Кто принял
                data.get("status", "Бронь"),  # Статус аренды
                data.get("notes", ""),  # Примечания
                equipment,
                booking_id
            ))

            conn.commit()
            return cursor.rowcount > 0
        except Exception as e:
            conn.rollback()
            logger.error(f"❌ Ошибка обновления аренды {booking_id}: {e}")
            return False
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def delete(booking_id):
        """Удаляет аренду по ID."""
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM bookings WHERE id = %s", (booking_id,))
            conn.commit()
            return cursor.rowcount > 0  # Возвращает True, если запись удалена
        finally:
            cursor.close()
            conn.close()

class Inventory:
    """Класс для работы с инвентарем."""

    @staticmethod
    def get_all():
        """Получает список всего оборудования без учета брони."""
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT id, name, total, category, subcategory, notes, serial_number, model, status, last_updated
                FROM inventory
            """)
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]  
            inventory = [dict(zip(columns, row)) for row in rows]  
            return inventory
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_by_id(equipment_id):
        """Получает оборудование по ID и возвращает словарь."""
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT id, name, total, rented FROM inventory WHERE id = %s", (equipment_id,))
            row = cursor.fetchone()
            if row:
                columns = [desc[0] for desc in cursor.description]
                return dict(zip(columns, row))
            return None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def update_rented(equipment_id, rented_count):
        """Обновляет количество арендованного оборудования."""
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("UPDATE inventory SET rented = %s WHERE id = %s", (rented_count, equipment_id))
            conn.commit()
        finally:
            cursor.close()
            conn.close()
