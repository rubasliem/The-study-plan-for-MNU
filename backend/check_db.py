import sqlite3

def check():
    conn = sqlite3.connect('mnu_system.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(study_plan_items)")
    columns = [row[1] for row in cursor.fetchall()]
    print("Columns:", columns)

if __name__ == "__main__":
    check()
