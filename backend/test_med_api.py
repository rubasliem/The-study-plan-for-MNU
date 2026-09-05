import sqlite3
def check_medicine_api():
    conn = sqlite3.connect('mnu_system.db')
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, name_ar, faculty_id, is_deleted
        FROM courses 
        WHERE faculty_id = 10
    ''')
    rows = cursor.fetchall()
    print("Medicine courses count:", len(rows))
    print("First 5:", rows[:5])
if __name__ == '__main__':
    check_medicine_api()
