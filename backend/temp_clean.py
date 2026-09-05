import sqlite3

conn = sqlite3.connect('mnu_system.db')
cursor = conn.cursor()

# Delete garbage courses
cursor.execute("DELETE FROM courses WHERE course_type LIKE '%ابن الهيثم%' OR added_to_gpa LIKE '%ابن الهيثم%' OR name_ar LIKE '%ابن الهيثم%' OR name_en LIKE '%ابن الهيثم%'")
print(f"Deleted {cursor.rowcount} courses with 'ابن الهيثم'")

cursor.execute("DELETE FROM courses WHERE course_type = 'م' OR added_to_gpa = 'م'")
print(f"Deleted {cursor.rowcount} courses with 'م'")

conn.commit()
conn.close()
