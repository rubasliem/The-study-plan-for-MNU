import sqlite3

conn = sqlite3.connect('backend/mnu_system.db')
c = conn.cursor()

c.execute("SELECT id, name FROM faculties WHERE name LIKE '%طب%'")
faculties = c.fetchall()
print('Faculties:', faculties)

if faculties:
    fac_id = faculties[0][0]
    c.execute("SELECT id, name FROM programs WHERE faculty_id = ?", (fac_id,))
    programs = c.fetchall()
    print('Programs:', programs)
