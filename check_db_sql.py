import sqlite3
conn = sqlite3.connect('backend/mnu_system.db')
c = conn.cursor()

c.execute("SELECT id, faculty_id, semester, academic_year, is_deleted FROM study_plans")
plans = c.fetchall()
print("All study plans:")
for p in plans:
    print(p)

c.execute("SELECT id, name_ar FROM professors WHERE name_ar LIKE '%ربا%'")
ruba = c.fetchone()
if ruba:
    print(f"\nRuba's ID: {ruba[0]}")
    c.execute("SELECT * FROM study_plan_items WHERE professor_id = ?", (ruba[0],))
    items = c.fetchall()
    print("Ruba's items:")
    for i in items:
        print(i)
        
conn.close()
