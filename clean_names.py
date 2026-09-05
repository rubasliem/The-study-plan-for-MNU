import sqlite3

def clean_db_names():
    conn = sqlite3.connect('mnu_system.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, name_ar, name_en FROM courses")
    rows = cursor.fetchall()
    
    updated = 0
    for r in rows:
        c_id, name_ar, name_en = r
        new_name_ar = name_ar
        new_name_en = name_en
        
        if name_ar and '\n' in name_ar:
            new_name_ar = name_ar.split('\n')[0].strip()
        if name_en and '\n' in name_en:
            new_name_en = name_en.split('\n')[0].strip()
            
        if new_name_ar != name_ar or new_name_en != name_en:
            cursor.execute("UPDATE courses SET name_ar = ?, name_en = ? WHERE id = ?", (new_name_ar, new_name_en, c_id))
            updated += 1
            
    conn.commit()
    print(f"Cleaned {updated} courses.")
    conn.close()

if __name__ == '__main__':
    clean_db_names()
