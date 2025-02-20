import requests
import psycopg2
import json
from config import DATABASE_URL as DB_URL

NOTION_TOKEN = "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"
DATABASE_ID = "aa4025819d9d443584376acbd0408144"


HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28"
}

# 🔹 1. Функция для запроса данных из Notion
def fetch_notion_data():
    """Получает данные из базы Notion"""
    url = f"https://api.notion.com/v1/databases/{DATABASE_ID}/query"
    results = []
    payload = {}

    while True:
        response = requests.post(url, headers=HEADERS, json=payload)
        if response.status_code != 200:
            print(f"❌ Ошибка запроса: {response.json()}")
            return []
        
        data = response.json()
        results.extend(data.get("results", []))
        
        if not data.get("has_more"):
            break
        payload["start_cursor"] = data["next_cursor"]

    print(f"✅ Получено {len(results)} записей из Notion")
    return results

# 🔹 2. Подключение к PostgreSQL
def connect_db():
    """Устанавливает соединение с PostgreSQL"""
    try:
        conn = psycopg2.connect(DB_URL)
        print("✅ Успешное подключение к базе данных")
        return conn
    except Exception as e:
        print(f"❌ Ошибка подключения: {e}")
        return None

# 🔹 3. Функция обновления структуры таблицы
def update_table_structure():
    """Добавляет недостающие столбцы в таблицу inventory"""
    conn = connect_db()
    if not conn:
        return

    cursor = conn.cursor()

    alter_queries = [
        "ALTER TABLE inventory ADD COLUMN IF NOT EXISTS category TEXT DEFAULT ''",
        "ALTER TABLE inventory ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT ''",
        "ALTER TABLE inventory ADD COLUMN IF NOT EXISTS model TEXT DEFAULT ''",
        "ALTER TABLE inventory ADD COLUMN IF NOT EXISTS serial_number TEXT DEFAULT ''",
        "ALTER TABLE inventory ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''",
        "ALTER TABLE inventory ADD COLUMN IF NOT EXISTS status TEXT DEFAULT ''",
        "ALTER TABLE inventory ADD COLUMN IF NOT EXISTS total INTEGER DEFAULT 0",
        "ALTER TABLE inventory ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    ]

    for query in alter_queries:
        cursor.execute(query)

    conn.commit()
    cursor.close()
    conn.close()
    print("✅ Таблица обновлена, все столбцы на месте!")

# 🔹 4. Функция загрузки данных в PostgreSQL
def insert_data_into_postgres(data):
    """Добавляет или обновляет данные в PostgreSQL, не затрагивая аренду"""
    conn = connect_db()
    if not conn:
        return

    cursor = conn.cursor()

    for entry in data:
        props = entry.get("properties", {})

        def get_text_value(prop, key):
            """Безопасно получает текстовое значение из rich_text или оставляет пустую строку"""
            return prop.get(key, {}).get("rich_text", [{}])[0].get("text", {}).get("content", "") if prop.get(key, {}).get("rich_text") else ""

        name = props.get("Наименование", {}).get("title", [{}])[0].get("text", {}).get("content", "").strip() or ""
        category = props.get("Категория", {}).get("select", {}).get("name", "") or ""
        subcategory = props.get("Под категория", {}).get("select", {}).get("name", "") or ""
        model = get_text_value(props, "Модель")
        serial_number = get_text_value(props, "Серийный номер")
        notes = get_text_value(props, "Примечание")
        status = props.get("Состояние", {}).get("status", {}).get("name", "") or ""
        total = props.get("Всего", {}).get("number", 0) or 0

        # 👇 Проверяем, есть ли уже запись в БД
        cursor.execute("SELECT category, subcategory, model, serial_number, notes, status, total FROM inventory WHERE name = %s", (name,))
        existing = cursor.fetchone()

        if existing:
            # 👇 Записываем только пустые значения (чтобы не перезаписывать данные вручную)
            category = existing[0] if existing[0] else category
            subcategory = existing[1] if existing[1] else subcategory
            model = existing[2] if existing[2] else model
            serial_number = existing[3] if existing[3] else serial_number
            notes = existing[4] if existing[4] else notes
            status = existing[5] if existing[5] else status
            total = existing[6] if existing[6] else total

        # 👇 Обновляем данные, не затрагивая столбец rented
        cursor.execute(
            """
            INSERT INTO inventory (name, category, subcategory, model, serial_number, notes, status, total, last_updated)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (name) DO UPDATE 
            SET category = EXCLUDED.category,
                subcategory = EXCLUDED.subcategory,
                model = EXCLUDED.model,
                serial_number = EXCLUDED.serial_number,
                notes = EXCLUDED.notes,
                status = EXCLUDED.status,
                total = EXCLUDED.total,
                last_updated = NOW()
            """,
            (name, category, subcategory, model, serial_number, notes, status, total)
        )

    conn.commit()
    cursor.close()
    conn.close()
    print("✅ Данные успешно загружены в PostgreSQL")

# 🔹 5. Запуск процесса
def main():
    update_table_structure()  # Проверяем, все ли столбцы есть
    notion_data = fetch_notion_data()
    if notion_data:
        insert_data_into_postgres(notion_data)

if __name__ == "__main__":
    main()