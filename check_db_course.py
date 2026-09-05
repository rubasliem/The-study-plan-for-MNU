import sqlite3
conn = sqlite3.connect('backend/mnu_system.db')
c = conn.cursor()
c.execute("SELECT name_en, name_ar, code FROM courses WHERE id=437")
print(c.fetchone())
conn.close()
