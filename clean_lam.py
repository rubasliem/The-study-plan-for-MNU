import sqlite3

def clean_lam():
    conn = sqlite3.connect('backend/mnu_system.db')
    c = conn.cursor()

    c.execute("SELECT id, action_text FROM notifications WHERE action_text LIKE '%لـ كلية%'")
    rows = c.fetchall()
    updated = 0

    for row_id, text in rows:
        if not text:
            continue
            
        new_text = text.replace("لـ كلية", "لكلية")
            
        if new_text != text:
            c.execute("UPDATE notifications SET action_text = ? WHERE id = ?", (new_text, row_id))
            updated += 1

    conn.commit()
    conn.close()
    print(f"Cleaned {updated} records for 'lam' successfully")

if __name__ == '__main__':
    clean_lam()
