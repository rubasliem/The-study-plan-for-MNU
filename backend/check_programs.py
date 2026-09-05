import sqlite3
import sys

conn = sqlite3.connect('mnu_system.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT id, name FROM faculties WHERE name LIKE '%الطب والجراحة%'")
faculty = cursor.fetchone()
if not faculty:
    print("Faculty not found")
    sys.exit()

print(f"Faculty: {faculty['name']} (ID: {faculty['id']})")

cursor.execute("SELECT id, name FROM programs WHERE faculty_id = ?", (faculty['id'],))
programs = cursor.fetchall()

print("Programs:")
for p in programs:
    print(f" - {p['name']} (ID: {p['id']})")

