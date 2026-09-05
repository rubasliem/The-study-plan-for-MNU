import sqlite3
conn = sqlite3.connect('backend/mnu_system.db')
c = conn.cursor()
c.execute("SELECT * FROM faculties")
print(c.fetchall())
conn.close()
