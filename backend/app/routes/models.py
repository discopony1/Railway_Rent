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
            conn.commit()  # Коммитим и для fetch=True
            return [dict(zip(columns, row)) for row in rows]
        conn.commit()
        rowcount = cursor.rowcount
        logger.info(f"🔍 SQL rowcount: {rowcount}")
        return rowcount
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Ошибка выполнения SQL запроса: {str(e)}")
        logger.error(f"❌ SQL: {query}")
        logger.error(f"❌ Params: {params}")
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
        equipment_data = data.get("equipment", [])
        if isinstance(equipment_data, str):
            equipment = equipment_data  # Уже JSON строка
        else:
            equipment = json.dumps(equipment_data)  # Преобразуем в JSON
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
        logger.info(f"🔍 CREATE SQL params: {params}")
        result = execute_query(query, params, fetch=True)
        logger.info(f"🔍 CREATE result: {result}")
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
        equipment_data = data.get("equipment", [])
        if isinstance(equipment_data, str):
            equipment = equipment_data  # Уже JSON строка
        else:
            equipment = json.dumps(equipment_data)  # Преобразуем в JSON
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
        logger.info(f"🔍 SQL params: {params}")
        result = execute_query(query, params, fetch=False)
        logger.info(f"🔍 Updated rows count: {result}")
        return result > 0  # Возвращаем True если обновлена хотя бы одна строка

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

    @staticmethod
    def delete_item(equipment_id):
        """Удаляет оборудование по ID."""
        query = "DELETE FROM inventory WHERE id = %s"
        params = (equipment_id,)
        return execute_query(query, params, fetch=False)

    @staticmethod
    def get_available_equipment(start_date, end_date, exclude_booking_id=None, current_equipment=None):
        """
        Возвращает список оборудования с доступным количеством для указанного периода.
        
        Args:
            start_date: Дата начала аренды
            end_date: Дата окончания аренды
            exclude_booking_id: ID бронирования, которое нужно исключить из расчета (для редактирования)
        """
        # Получаем весь инвентарь
        inventory_query = """
            SELECT id, name, category, subcategory, model, serial_number, notes, status, total, belongs_to
            FROM inventory
        """
        inventory = execute_query(inventory_query, fetch=True)
        
        # Получаем все активные бронирования в указанном периоде
        bookings_query = """
            SELECT equipment, start_date, end_date, status
            FROM bookings 
            WHERE start_date IS NOT NULL 
            AND end_date IS NOT NULL
            AND status IN ('Бронь', 'Выдано')
            AND start_date < %s AND end_date > %s
        """
        params = [end_date, start_date]
        
        if exclude_booking_id:
            bookings_query += " AND id != %s"
            params.append(exclude_booking_id)
            
        bookings = execute_query(bookings_query, params, fetch=True)
        
        # Подсчитываем занятое оборудование по именам
        occupied_equipment = {}
        
        for booking in bookings:
            try:
                equipment_data = booking['equipment']
                if isinstance(equipment_data, str):
                    equipment_list = json.loads(equipment_data) if equipment_data else []
                elif isinstance(equipment_data, list):
                    equipment_list = equipment_data  # Уже список
                else:
                    equipment_list = []
                    
                for item in equipment_list:
                    equipment_name = item.get('name', '')
                    quantity = item.get('quantity', 0)
                    
                    # Обрабатываем null/None значения
                    if quantity is None:
                        quantity = 1  # По умолчанию 1 штука
                    else:
                        quantity = int(quantity)
                    
                    if equipment_name and quantity > 0:
                        if equipment_name not in occupied_equipment:
                            occupied_equipment[equipment_name] = 0
                        occupied_equipment[equipment_name] += quantity
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"Ошибка парсинга equipment в бронировании: {e}")
                continue
        
        # Обработка текущего оборудования, которое уже выбрано в редактируемой записи
        current_equipment_count = {}
        if current_equipment:
            try:
                current_list = json.loads(current_equipment) if isinstance(current_equipment, str) else current_equipment
                for item in current_list:
                    equipment_name = item.get('name', '')
                    quantity = item.get('quantity', 0)
                    if quantity is None:
                        quantity = 1
                    else:
                        quantity = int(quantity)
                    
                    if equipment_name and quantity > 0:
                        current_equipment_count[equipment_name] = quantity
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"Ошибка парсинга current_equipment: {e}")

        # Добавляем информацию о доступности к инвентарю
        for item in inventory:
            item_name = item['name']
            total_quantity = item['total'] or 0
            occupied_quantity = occupied_equipment.get(item_name, 0)
            current_usage = current_equipment_count.get(item_name, 0)
            
            # Рассчитываем доступность: общее количество минус занятое другими бронированиями
            # (occupied_quantity уже включает current_usage, поэтому вычитаем его чтобы не учитывать дважды)
            truly_occupied = occupied_quantity - current_usage
            available_quantity = max(0, total_quantity - truly_occupied)
            
            item['available'] = available_quantity
            item['occupied'] = truly_occupied
            item['current_usage'] = current_usage
            
        return inventory
    
    @staticmethod
    def reindex_items(items):
        """Переназначает ID всех записей согласно новому порядку."""
        try:
            # Получаем все данные в правильном порядке
            ordered_data = []
            for item in items:
                query = """
                    SELECT name, category, subcategory, model, serial_number, notes, status, total, belongs_to
                    FROM inventory WHERE id = %s
                """
                result = execute_query(query, (item['old_id'],), fetch=True)
                if result:
                    ordered_data.append(result[0])
            
            # Удаляем все записи из таблицы
            execute_query("DELETE FROM inventory", fetch=False)
            
            # Сбрасываем последовательность
            execute_query("ALTER SEQUENCE inventory_id_seq RESTART WITH 1", fetch=False)
            
            # Вставляем данные в новом порядке
            for data in ordered_data:
                query = """
                    INSERT INTO inventory (name, category, subcategory, model, serial_number, notes, status, total, belongs_to)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                params = (
                    data['name'], 
                    data['category'], 
                    data['subcategory'], 
                    data['model'], 
                    data['serial_number'], 
                    data['notes'], 
                    data['status'], 
                    data['total'], 
                    data['belongs_to']
                )
                execute_query(query, params, fetch=False)
            
            logger.info(f"Successfully reindexed {len(items)} inventory items")
            return True
            
        except Exception as e:
            logger.error(f"Error during reindexing: {str(e)}")
            raise
