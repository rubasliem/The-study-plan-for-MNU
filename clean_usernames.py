import sqlite3

def clean_usernames():
    conn = sqlite3.connect('backend/mnu_system.db')
    c = conn.cursor()
    c.execute("UPDATE users SET username = REPLACE(username, '@gmail.com', '') WHERE username LIKE '%@gmail.com'")
    print(f"Updated {c.rowcount} users")
    conn.commit()
    conn.close()

if __name__ == '__main__':
    clean_usernames()
