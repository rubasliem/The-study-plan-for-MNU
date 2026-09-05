"""
Script to add academic_year and semester columns to the notifications table.
"""
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "mnu_system.db")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check existing columns
cursor.execute("PRAGMA table_info(notifications)")
cols = [row[1] for row in cursor.fetchall()]
print("Existing columns:", cols)

if "academic_year" not in cols:
    cursor.execute("ALTER TABLE notifications ADD COLUMN academic_year TEXT")
    print("Added academic_year column")
else:
    print("academic_year already exists")

if "semester" not in cols:
    cursor.execute("ALTER TABLE notifications ADD COLUMN semester TEXT")
    print("Added semester column")
else:
    print("semester already exists")

conn.commit()
conn.close()
print("Done!")
