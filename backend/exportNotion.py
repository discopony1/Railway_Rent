import requests
import psycopg2
import json
from datetime import datetime

# Замените на ваш URL подключения к Neon
NEON_DATABASE_URL = "postgresql://neondb_owner:npg_pFV8bEtTrRM5@ep-weathered-poetry-a9z80hcr-pooler.gwc.azure.neon.tech/neondb?sslmode=require"

NOTION_TOKEN = "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"
DATABASE_ID = "aa4025819d9d443584376acbd0408144"

HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28"
}

def connect_db():
    """Устанавливает соединение с Neon"""
    try:
        conn = psycopg2.connect(NEON_DATABASE_URL)
        print("✅ Успешное подключение к Neon")
        return conn
    except Exception as e:
        print(f"❌ Ошибка подключения к Neon: {e}")
        return None

def create_table_structure():
    """Создает таблицу inventory в Neon"""
    conn = connect_db()
    if not conn:
        return

    cursor = conn.cursor()

    # Создаем таблицу с нуля
    create_table_query = """
    CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        category TEXT DEFAULT '',
        subcategory TEXT DEFAULT '',
        model TEXT DEFAULT '',
        serial_number TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        status TEXT DEFAULT '',
        total INTEGER DEFAULT 0,
        rented INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """

    try:
        cursor.execute(create_table_query)
        conn.commit()
        print("✅ Таблица inventory создана в Neon")
    except Exception as e:
        print(f"❌ Ошибка создания таблицы: {e}")
    finally:
        cursor.close()
        conn.close()

def fetch_notion_data():
    """Получает данные из базы Notion"""
    url = f"https://api.notion.com/v1/databases/{DATABASE_ID}/query"
    results = []
    payload = {}

    while True:
        response = requests.post(url, headers=HEADERS, json=payload)
        if response.status_code != 200:
            print(f"❌ Ошибка запроса к Notion: {response.json()}")
            return []
        
        data = response.json()
        results.extend(data.get("results", []))
        
        if not data.get("has_more"):
            break
        payload["start_cursor"] = data["next_cursor"]

    print(f"✅ Получено {len(results)} записей из Notion")
    return results

def insert_data_into_neon(data):
    """Добавляет или обновляет данные в Neon"""
    conn = connect_db()
    if not conn:
        return

    cursor = conn.cursor()

    for entry in data:
        props = entry.get("properties", {})

        def get_text_value(prop, key):
            return prop.get(key, {}).get("rich_text", [{}])[0].get("text", {}).get("content", "") if prop.get(key, {}).get("rich_text") else ""

        name = props.get("Наименование", {}).get("title", [{}])[0].get("text", {}).get("content", "").strip() or ""
        category = props.get("Категория", {}).get("select", {}).get("name", "") or ""
        subcategory = props.get("Под категория", {}).get("select", {}).get("name", "") or ""
        model = get_text_value(props, "Модель")
        serial_number = get_text_value(props, "Серийный номер")
        notes = get_text_value(props, "Примечание")
        status = props.get("Состояние", {}).get("status", {}).get("name", "") or ""
        total = props.get("Всего", {}).get("number", 0) or 0

        try:
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
        except Exception as e:
            print(f"❌ Ошибка при добавлении записи {name}: {e}")
            conn.rollback()

    cursor.close()
    conn.close()
    print("✅ Данные успешно загружены в Neon")

def main():
    print("🚀 Начало миграции данных в Neon...")
    create_table_structure()  # Создаем таблицу
    notion_data = fetch_notion_data()
    if notion_data:
        insert_data_into_neon(notion_data)
    print("✅ Миграция завершена!")

if __name__ == "__main__":
    main()