import sqlite3
def clean_garbage():
    conn = sqlite3.connect('mnu_system.db')
    cursor = conn.cursor()
    cursor.execute("DELETE FROM courses WHERE code IN (SELECT name FROM faculties WHERE name IN ('1', '2', '3', '4', '5', '6', '7', '8') OR CAST(name AS INTEGER) > 0)")
    cursor.execute("DELETE FROM faculties WHERE CAST(name AS INTEGER) > 0 OR name = 'م' OR name LIKE 'نظام ابن الهيثم%'")
    conn.commit()
    print("Cleaned up garbage faculties and courses")
if __name__ == '__main__':
    clean_garbage()
