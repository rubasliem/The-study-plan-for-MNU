import sqlite3

conn = sqlite3.connect('mnu_system.db')
cursor = conn.cursor()

try:
    cursor.execute("DELETE FROM programs WHERE id = 25")
    print(f"Deleted {cursor.rowcount} from programs")
    
    conn.commit()
    print("Successfully deleted program 25 (الطب والجراحة اللائحة القديمة).")
except Exception as e:
    print("Error:", e)
    conn.rollback()
