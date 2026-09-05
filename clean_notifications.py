import sqlite3

def clean_notifications():
    conn = sqlite3.connect('backend/mnu_system.db')
    c = conn.cursor()

    c.execute("SELECT id, action_text FROM notifications")
    rows = c.fetchall()
    updated = 0

    for row_id, text in rows:
        if not text:
            continue
            
        new_text = text
        
        # Replace common duplicated phrases
        replacements = [
            ("خطة الخطة الدراسية", "الخطة الدراسية"),
            ("لكلية كلية ", "لـ كلية "),
            ("كلية كلية ", "كلية "),
            ("الفصل الدراسي الفصل الدراسي ", "الفصل الدراسي "),
            ("لـ كلية كلية ", "لـ كلية ")
        ]
        
        for old_str, new_str in replacements:
            new_text = new_text.replace(old_str, new_str)
            
        if new_text != text:
            c.execute("UPDATE notifications SET action_text = ? WHERE id = ?", (new_text, row_id))
            updated += 1

    conn.commit()
    conn.close()
    print(f"Cleaned {updated} records successfully")

if __name__ == '__main__':
    clean_notifications()
