import sqlite3
conn = sqlite3.connect('mnu_system.db')
conn.execute('UPDATE professors SET name_en = "" WHERE name_en IS NULL')
conn.commit()
print("Fixed NULL name_en")
