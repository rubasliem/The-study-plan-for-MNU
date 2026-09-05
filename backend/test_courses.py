import sqlite3
def check_db():
    conn = sqlite3.connect('mnu_system.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name_ar, code, theory_hours, practical_hours, exercise_hours, credit_hours FROM courses WHERE code='DDA101'")
    print(cursor.fetchone())
if __name__ == '__main__':
    check_db()
