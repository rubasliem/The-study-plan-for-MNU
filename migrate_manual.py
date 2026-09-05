import sys
sys.path.append('backend')
from sqlalchemy import text
from sqlalchemy import create_engine

SQLALCHEMY_DATABASE_URL = "sqlite:///backend/mnu_system.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN security_question TEXT"))
        print("Added security_question column.")
    except Exception as e:
        print("security_question column might already exist:", e)
        
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN security_answer TEXT"))
        print("Added security_answer column.")
    except Exception as e:
        print("security_answer column might already exist:", e)
