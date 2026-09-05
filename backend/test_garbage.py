import sqlite3
def check_garbage():
    conn = sqlite3.connect('mnu_system.db')
    cursor = conn.cursor()
    cursor.execute('''
        SELECT c.code, c.name_ar, f.name 
        FROM courses c
        JOIN faculties f ON c.faculty_id = f.id
        WHERE f.name IN ('1', '2', '3')
    ''')
    print("Garbage courses:")
    for r in cursor.fetchall():
        print(r)
if __name__ == '__main__':
    check_garbage()
