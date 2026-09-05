import sqlite3
conn = sqlite3.connect('backend/mnu_system.db')
c = conn.cursor()

c.execute("SELECT id, name_ar FROM professors WHERE name_ar LIKE '%سامي علي%'")
samy = c.fetchone()
if samy:
    print(f"\nSamy's ID: {samy[0]}")
    c.execute("SELECT * FROM study_plan_items WHERE professor_id = ?", (samy[0],))
    items = c.fetchall()
    print("Samy's items:")
    for i in items:
        # get study plan info
        c.execute("SELECT faculty_id, semester, academic_year, is_deleted FROM study_plans WHERE id = ?", (i[1],))
        sp = c.fetchone()
        print(f"Plan ID {i[1]} ({sp[0]}, {sp[1]}, {sp[2]}, del={sp[3]}) | Course ID: {i[2]}")
        
conn.close()
