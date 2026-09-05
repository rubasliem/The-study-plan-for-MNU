import sqlite3

def upgrade():
    conn = sqlite3.connect("backend/mnu_system.db")
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN perm_finish_plan BOOLEAN DEFAULT 0;")
        print("Column perm_finish_plan added successfully.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column already exists.")
        else:
            print("Error:", e)
    conn.commit()
    conn.close()

if __name__ == "__main__":
    upgrade()
