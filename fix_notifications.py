import sqlite3
import re

def update_db():
    conn = sqlite3.connect('backend/mnu_system.db')
    c = conn.cursor()

    c.execute("SELECT id, action_text FROM notifications WHERE semester IS NULL OR semester = '' OR academic_year IS NULL OR academic_year = ''")
    rows = c.fetchall()
    updated = 0

    for row_id, action_text in rows:
        if not action_text:
            continue
            
        new_year = None
        new_sem = None
        
        if "الفصل الدراسي الأول" in action_text:
            new_sem = "الفصل الدراسي الأول"
        elif "الفصل الدراسي الثاني" in action_text:
            new_sem = "الفصل الدراسي الثاني"
        elif "الفصل الدراسي الصيفي" in action_text:
            new_sem = "الفصل الدراسي الصيفي"
            
        match_year = re.search(r'(20\d{2}/20\d{2})', action_text)
        if match_year:
            new_year = match_year.group(1)
            
        if new_year or new_sem:
            query = "UPDATE notifications SET "
            updates = []
            params = []
            if new_year:
                updates.append("academic_year = ?")
                params.append(new_year)
            if new_sem:
                updates.append("semester = ?")
                params.append(new_sem)
                
            params.append(row_id)
            query += ", ".join(updates) + " WHERE id = ?"
            c.execute(query, params)
            updated += 1

    conn.commit()
    conn.close()
    print(f"Updated {updated} records successfully")

if __name__ == '__main__':
    update_db()
