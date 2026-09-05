import sqlite3

def run():
    try:
        conn = sqlite3.connect('mnu_system.db')
        conn.execute("ALTER TABLE study_plan_items ADD COLUMN level VARCHAR(50);")
        conn.commit()
        print("Column 'level' added successfully.")
    except Exception as e:
        print(f"Error (column might already exist): {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    run()
