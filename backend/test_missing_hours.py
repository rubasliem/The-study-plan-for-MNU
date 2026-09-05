import sqlite3

def check_missing_hours():
    conn = sqlite3.connect('mnu_system.db')
    cursor = conn.cursor()
    # Find courses that have credit hours but no theory, practical, or exercise hours
    cursor.execute('''
        SELECT code, name_ar, credit_hours, theory_hours, practical_hours, exercise_hours, activity_hours
        FROM courses 
        WHERE credit_hours > 0 
          AND theory_hours = 0 
          AND practical_hours = 0 
          AND exercise_hours = 0
          AND activity_hours = 0
    ''')
    rows = cursor.fetchall()
    print(f"Total courses with missing hours: {len(rows)}")
    for r in rows[:20]:
        print(r)
    conn.close()

if __name__ == '__main__':
    check_missing_hours()
