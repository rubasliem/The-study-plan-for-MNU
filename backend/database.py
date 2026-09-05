import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# اسم ملف / رابط قاعدة البيانات
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mnu_system.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# إنشاء محرك قاعدة البيانات
engine = create_engine(
    DATABASE_URL, connect_args=connect_args
)

# إنشاء جلسة للتعامل مع البيانات
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# القاعدة الأساسية للنماذج
Base = declarative_base()

# دالة للحصول على الجلسة (ستستخدمها في المسارات لاحقاً)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()