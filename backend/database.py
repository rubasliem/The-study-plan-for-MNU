from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# اسم ملف قاعدة البيانات
SQLALCHEMY_DATABASE_URL = "sqlite:///./mnu_system.db"

# إنشاء محرك قاعدة البيانات
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
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