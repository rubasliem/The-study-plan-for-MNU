import sqlite3

conn = sqlite3.connect('mnu_system.db')
cursor = conn.cursor()

# Find garbage modules
cursor.execute("SELECT id, course_id, department_name FROM course_modules WHERE department_name LIKE '%ابن الهيثم%' OR department_name = '-' OR department_name = 'م'")
rows = cursor.fetchall()
print(f"Found {len(rows)} garbage modules")

# Delete garbage modules
cursor.execute("DELETE FROM course_modules WHERE department_name LIKE '%ابن الهيثم%' OR department_name = '-' OR department_name = 'م'")
print(f"Deleted {cursor.rowcount} garbage modules")

conn.commit()
conn.close()
