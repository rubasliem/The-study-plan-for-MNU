import sqlite3
import os
import json

db_path = r'c:\Users\rubas\Desktop\MNU-Study-Plan\backend\mnu_system.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("""
SELECT id, name_ar, original_workplace, job_title 
FROM professors 
WHERE original_workplace LIKE '%معيدة%' 
   OR original_workplace LIKE '%معيده%'
   OR job_title = 'معيدة'
""")
rows = cursor.fetchall()
updated_names = []

for row in rows:
    prof_id, name_ar, original_workplace, job_title = row
    if job_title != 'معيد':
        cursor.execute("UPDATE professors SET job_title = 'معيد' WHERE id = ?", (prof_id,))
        updated_names.append(name_ar)

conn.commit()
conn.close()

print(json.dumps(updated_names, ensure_ascii=False))
