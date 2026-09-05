import sqlite3
conn = sqlite3.connect('backend/mnu_system.db')
conn.execute('DELETE FROM professors WHERE id IN (856, 857)')
conn.execute("UPDATE professors SET phone = '1069596375', email = 'essam.hamad.eng@sh-eng.menofia.edu.eg' WHERE id = 695")
conn.commit()
print("Fixed Professor Essam")
