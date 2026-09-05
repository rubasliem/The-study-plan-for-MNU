import sys
sys.path.append('backend')
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
import auth

SQLALCHEMY_DATABASE_URL = "sqlite:///backend/mnu_system.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

db = SessionLocal()
user = db.query(models.User).filter(models.User.username == "Ruba_Sliem").first()
if user:
    user.hashed_password = auth.get_password_hash("123456")
    db.commit()
    print("Password updated successfully.")
else:
    print("User not found.")
db.close()
