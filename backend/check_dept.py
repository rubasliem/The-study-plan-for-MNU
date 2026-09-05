import sqlite3
conn = sqlite3.connect('study_plan.db')
cursor = conn.cursor()
cursor.execute("SELECT c.id, c.name_en, m.department_name FROM courses c LEFT JOIN course_modules m ON c.id = m.course_id WHERE c.name_en LIKE '%Medical%'")
rows = cursor.fetchall()
print(rows)
