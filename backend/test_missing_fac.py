import sqlite3
def check_faculties():
    conn = sqlite3.connect('mnu_system.db')
    cursor = conn.cursor()
    cursor.execute('''
        SELECT c.code, f.name 
        FROM courses c
        LEFT JOIN faculties f ON c.faculty_id = f.id
        WHERE credit_hours > 0 
          AND theory_hours = 0 
          AND practical_hours = 0 
          AND exercise_hours = 0
          AND activity_hours = 0
    ''')
    rows = cursor.fetchall()
    
    faculties_count = {}
    for r in rows:
        fac = r[1]
        if fac not in faculties_count:
            faculties_count[fac] = 0
        faculties_count[fac] += 1
        
    for k, v in faculties_count.items():
        print(f"{k}: {v} courses missing hours")
        
    print("\nSample missing courses:")
    for r in rows[:15]:
        print(r)
        
if __name__ == '__main__':
    check_faculties()
