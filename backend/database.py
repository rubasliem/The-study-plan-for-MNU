import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# اسم ملف / رابط قاعدة البيانات (قاعدة بيانات سحابية موحدة - Neon مع Connection Pooler)
NEON_DATABASE_URL = "postgresql+psycopg2://neondb_owner:npg_gaEzKvbN0d5H@ep-muddy-voice-b10gbneo-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require"
env_db = os.getenv("DATABASE_URL")
if not env_db or "localhost" in env_db or "127.0.0.1" in env_db or "sqlite" in env_db:
    DATABASE_URL = NEON_DATABASE_URL
else:
    DATABASE_URL = env_db

connect_args = {}

# إنشاء محرك قاعدة البيانات مع تحسين إدارة الاتصالات
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_size=15,
    max_overflow=25,
    pool_pre_ping=True,
    pool_recycle=300
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