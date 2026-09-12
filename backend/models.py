from sqlalchemy import Table, Column, Integer, String, Float, ForeignKey, Enum, DateTime, Boolean
from datetime import datetime
from sqlalchemy.orm import relationship
import enum
from database import Base # تأكدي أن Base معرفة في ملف database.py لديكِ

# 1. تعريف أنواع المستخدمين (الصلاحيات)
class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    faculty_admin = "faculty_admin"
    faculty_professor = "faculty_professor"
    student_affairs = "student_affairs"
    reviewer = "reviewer"

# ==========================================
# الجدول الوسيط للربط بين الدكاترة والكليات (علاقة متعدد إلى متعدد)
# ==========================================
professor_faculty_association = Table(
    "professor_faculty_association",
    Base.metadata,
    Column("professor_id", Integer, ForeignKey("professors.id")),
    Column("faculty_id", Integer, ForeignKey("faculties.id")),
)
user_faculty_association = Table(
    "user_faculty_association",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id")),
    Column("faculty_id", Integer, ForeignKey("faculties.id")),
)

# 2. جدول الكليات
class Faculty(Base):
    __tablename__ = "faculties"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # مثل: كلية الهندسة، كلية الطب البيطري
    
    # العلاقات (Relations)
    programs = relationship("Program", back_populates="faculty")
    professors = relationship("Professor", secondary=professor_faculty_association, back_populates="faculties")
    courses = relationship("Course", back_populates="faculty")
    users = relationship("User", back_populates="faculty")
    reviewers = relationship("User", secondary=user_faculty_association, back_populates="assigned_faculties")

# 3. جدول البرامج الدراسية (التابعة للكليات)
class Program(Base):
    __tablename__ = "programs"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True) # مثل: الأمن السيبراني، فارم دي
    faculty_id = Column(Integer, ForeignKey("faculties.id"))
    
    faculty = relationship("Faculty", back_populates="programs")
    courses = relationship("Course", back_populates="program")

# 4. جدول المستخدمين (للوحة التحكم)
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.faculty_admin)
    job_title = Column(String, nullable=True) # المسمى الوظيفي الديناميكي (وظيفة المستخدم)
    faculty_id = Column(Integer, ForeignKey("faculties.id"), nullable=True) # يكون فارغاً (Null) إذا كان المستخدم Admin
    all_faculties_access = Column(Boolean, default=False) # إمكانية رؤية وإدارة جميع الكليات
    
    # أسئلة الأمان لاستعادة كلمة المرور
    security_question = Column(String, nullable=True)
    security_answer = Column(String, nullable=True)
    
    # الصلاحيات الخاصة بمسؤول الكلية
    perm_view_prof_study_plan = Column(Boolean, default=False)
    perm_view_prof_data_btn = Column(Boolean, default=False)
    perm_view_prof_delete_btn = Column(Boolean, default=False)
    perm_view_prof_view_btn = Column(Boolean, default=False)
    perm_view_prof_print_btn = Column(Boolean, default=False)
    perm_view_prof_import_btn = Column(Boolean, default=False)
    perm_recycle_restore_btn = Column(Boolean, default=False)
    perm_recycle_delete_btn = Column(Boolean, default=False)
    perm_delete_notif_btn = Column(Boolean, default=False)
    perm_review_1 = Column(Boolean, default=False)
    perm_review_2 = Column(Boolean, default=False)
    perm_approve_plan = Column(Boolean, default=False)
    perm_finish_plan = Column(Boolean, default=False)
    perm_view_professors_load = Column(Boolean, default=False) # تعديل صفحة أعباء الأساتذة
    hidden_pages = Column(String, default="[]", nullable=True) # قائمة معرفات الصفحات المخفية كـ JSON
    
    faculty = relationship("Faculty", back_populates="users")
    assigned_faculties = relationship("Faculty", secondary=user_faculty_association, back_populates="reviewers")

# 5. جدول أعضاء هيئة التدريس (مع نظام التقييم والمتابعة)
class Professor(Base):
    __tablename__ = "professors"
    id = Column(Integer, primary_key=True, index=True)
    name_ar = Column(String, index=True)
    name_en = Column(String, index=True) 
    national_id = Column(String, unique=True, index=True) # الرقم القومي
    phone = Column(String)
    email = Column(String, nullable=True) # البريد الإلكتروني
    job_title = Column(String) # الوظيفة
    original_workplace = Column(String) # جهة العمل الأصلية
    contract_type = Column(String, nullable=True) # نوع التعاقد (كلي / جزئي)
    work_days = Column(String, nullable=True) # عدد أيام العمل (5 أيام في الأسبوع / يوم واحد / يومان / 3 أيام)
    mnu_job_title = Column(String, nullable=True) # الوظيفة/طبيعة العمل بجامعة المنوفية الأهلية
    academic_year = Column(String, default="2026/2027") # العام الدراسي
    semester1_weeks = Column(Integer, nullable=True) # عدد أسابيع الفصل الأول
    semester2_weeks = Column(Integer, nullable=True) # عدد أسابيع الفصل الثاني
    summer_weeks = Column(Integer, nullable=True)    # عدد أسابيع الفصل الصيفي
    academic_year_weeks = Column(String, nullable=True) # JSON لتوزيع أسابيع الحضور لكل عام جامعي
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    
    # مؤشرات الأداء (KPIs) والمتابعة
    required_hours = Column(Float, default=0.0) # الساعات المطلوبة
    executed_hours = Column(Float, default=0.0) # الساعات المنفذة فعلياً
    absences_count = Column(Integer, default=0) # عدد مرات التخلف عن الحضور
    
    faculties = relationship("Faculty", secondary=professor_faculty_association, back_populates="professors")
    courses = relationship("Course", back_populates="professor")

# 6. جدول المقررات (بتفاصيل الدرجات والساعات)
class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, index=True) # كود المقرر
    name_ar = Column(String) # اسم المقرر بالعربي
    name_en = Column(String) # اسم المقرر بالإنجليزي
    level = Column(Integer) # المستوى (0 إلى 5)
    semester = Column(String) # الفصل الدراسي
    year = Column(String, default="2026/2027")
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    department_name = Column(String, nullable=True) # اسم القسم العلمي (للمواد المفردة)
    
    # توزيع الساعات
    theory_hours = Column(Float, default=0.0)
    practical_hours = Column(Float, default=0.0)
    exercise_hours = Column(Float, default=0.0)
    activity_hours = Column(Float, default=0.0)
    
    # توزيع الدرجات
    total_grade = Column(Float, default=0.0)
    theory_grade = Column(Float, default=0.0)
    practical_grade = Column(Float, default=0.0)
    year_work_grade = Column(Float, default=0.0)
    exam_time_hours = Column(String, nullable=True) # زمن الامتحان (نص)
    duration = Column(String, nullable=True) # عدد الأسابيع أو "مقرر طولي"
    
    course_type = Column(String, nullable=True) # نوع المقرر
    other_programs = Column(String, nullable=True) # البرامج الاخرى المسجل بها
    requirement = Column(String, nullable=True) # متطلب
    prerequisite = Column(String, nullable=True) # المتطلب السابق
    concurrent_courses = Column(String, nullable=True) # المقررات المتزامنة
    added_to_gpa = Column(String, nullable=True) # يضاف للمعدل التراكمي
    pass_fail = Column(String, nullable=True) # مادة نجاح أو رسوب
    credit_hours = Column(Float, default=0.0) # الساعات المعتمدة
    summer_registration = Column(String, nullable=True) # تسجيل المقرر في الصيفي
    
    study_hours = Column(String, nullable=True) # الساعات - الساعات الدراسية
    midterm_grade = Column(String, nullable=True) # الدرجات - منتصف الفصل
    written_grade = Column(String, nullable=True) # الدرجات - تحريري خلال الفصل
    oral_grade = Column(String, nullable=True) # الدرجات - شفوي
    clinical_grade = Column(String, nullable=True) # الدرجات - كلينك
    final_eval_grade = Column(String, nullable=True) # الدرجات - تقييم نهائي
    midterm_2_grade = Column(String, nullable=True) # الدرجات - منتصف الفصل ٢
    attendance_activity_grade = Column(String, nullable=True) # الدرجات - Attendance, Activity & Attitude
    success_rate = Column(String, nullable=True) # نسبة النجاح
    fail_rate = Column(String, nullable=True) # نسبة الرسوب النظري
    elective_group_code = Column(String, nullable=True) # كود المجموعة الاختيارية
    elective_courses_count = Column(String, nullable=True) # عدد المقررات او الوحدات الاختيارية
    description = Column(String, nullable=True) # وصف المقرر
    
    is_bundle = Column(Boolean, default=False) # هل المقرر حزمة دراسية تحتوي أقسام علمية
    
    faculty_id = Column(Integer, ForeignKey("faculties.id"))
    program_id = Column(Integer, ForeignKey("programs.id"))
    professor_id = Column(Integer, ForeignKey("professors.id"), nullable=True) 
    
    faculty = relationship("Faculty", back_populates="courses")
    program = relationship("Program", back_populates="courses")
    professor = relationship("Professor", back_populates="courses")
    modules = relationship("CourseModule", back_populates="course", cascade="all, delete-orphan")

# ==========================================
# 6.1 جدول الأقسام العلمية الفرعية للمقرر (للحزم الدراسية بكلية الطب)
# ==========================================
class CourseModule(Base):
    __tablename__ = "course_modules"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), index=True)
    department_name = Column(String, index=True) # اسم القسم العلمي (Anatomy, Histology, etc.)
    
    credit_hours = Column(Float, default=0.0) # الساعات المعتمدة للأقسام العلمية (الإجمالي)
    
    # توزيع الساعات المعتمدة
    theory_credit = Column(Float, default=0.0)
    practical_credit = Column(Float, default=0.0)
    activity_credit = Column(Float, default=0.0)
    
    # توزيع الساعات التدريسية للقسم
    theory_hours = Column(Float, default=0.0) # نظري
    practical_hours = Column(Float, default=0.0) # عملي / كلينيكي
    activity_hours = Column(Float, default=0.0) # أنشطة
    
    # توزيع الدرجات للقسم
    year_work_grade = Column(Float, default=0.0) # أعمال سنة
    practical_grade = Column(Float, default=0.0) # عملي / كلينيكي
    theory_grade = Column(Float, default=0.0) # نظري
    total_grade = Column(Float, default=0.0) # الدرجات للأقسام العلمية
    
    course = relationship("Course", back_populates="modules")


# ==========================================
# 7. جدول الخطة الدراسية - الترويسة (StudyPlan)
# ==========================================
class StudyPlan(Base):
    __tablename__ = "study_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculties.id"))
    
    semester = Column(String, default="الفصل الدراسي الأول")
    academic_year = Column(String, default="2026/2027")
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    
    total_theory_hours = Column(Float, default=0.0)
    total_practical_hours = Column(Float, default=0.0)
    total_activity_hours = Column(Float, default=0.0)
    
    is_finished = Column(Boolean, default=False)
    finished_by = Column(String, nullable=True)
    
    is_reviewed_1 = Column(Boolean, default=False)
    reviewed_1_by = Column(String, nullable=True)
    is_reviewed_2 = Column(Boolean, default=False)
    reviewed_2_by = Column(String, nullable=True)
    is_approved = Column(Boolean, default=False)
    approved_by = Column(String, nullable=True)
    frozen_signatures = Column(String, nullable=True)
    
    faculty = relationship("Faculty")
    items = relationship("StudyPlanItem", back_populates="study_plan", cascade="all, delete-orphan")

# ==========================================
# 8. جدول بنود الخطة الدراسية - مقرر واحد (StudyPlanItem)
# ==========================================
class StudyPlanItem(Base):
    __tablename__ = "study_plan_items"
    
    id = Column(Integer, primary_key=True, index=True)
    study_plan_id = Column(Integer, ForeignKey("study_plans.id"))
    base_course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    module_id = Column(Integer, ForeignKey("course_modules.id"), nullable=True) # للموديول/القسم العلمي الخاص بكلية الطب
    program_id = Column(Integer, ForeignKey("programs.id"))
    professor_id = Column(Integer, ForeignKey("professors.id"), nullable=True)
    entry_group_id = Column(String, nullable=True)
    
    student_count = Column(Integer, default=0)
    groups_theory = Column(Integer, default=0)
    groups_practical = Column(Integer, default=0)
    groups_exercise = Column(Integer, default=0)
    groups_activity = Column(Integer, default=0)
    
    level = Column(String, nullable=True)
    
    hours_actual_theory = Column(Float, default=0.0)
    hours_actual_practical = Column(Float, default=0.0)
    hours_actual_exercise = Column(Float, default=0.0)
    hours_actual_activity = Column(Float, default=0.0) # ساعات الأنشطة المنفذة
    
    required_hours_theory = Column(Float, default=0.0)
    required_hours_practical = Column(Float, default=0.0)
    required_hours_exercise = Column(Float, default=0.0)
    required_hours_activity = Column(Float, default=0.0)
    
    notes = Column(String, nullable=True) # ملاحظات الأستاذ
    course_notes = Column(String, nullable=True) # ملاحظات المقرر ككل
    
    study_plan = relationship("StudyPlan", back_populates="items")
    base_course = relationship("Course", foreign_keys=[base_course_id])
    course = relationship("Course", foreign_keys=[course_id])
    module = relationship("CourseModule", foreign_keys=[module_id])
    program = relationship("Program")
    professor = relationship("Professor")


# ==========================================
# 9. جدول توقيعات المسؤولين (Signatures)
# ==========================================
class Signature(Base):
    __tablename__ = "signatures"
    
    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculties.id"))
    signature_title = Column(String, index=True)
    official_name = Column(String)
    order_index = Column(Integer, default=0)
    report_type = Column(String, default="الخطة الدراسية")
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    
    faculty = relationship("Faculty")

# ==========================================
# 10. جدول الإشعارات (Notifications)
# ==========================================
class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    action_by = Column(String)
    action_text = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    faculty_id = Column(Integer, ForeignKey("faculties.id"), nullable=True)
    academic_year = Column(String, nullable=True)
    semester = Column(String, nullable=True)
    
    faculty = relationship("Faculty")

# ==========================================
# 11. جدول الأعوام الجامعية (Academic Years)
# ==========================================
class AcademicYear(Base):
    __tablename__ = "academic_years"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    order_index = Column(Integer, default=0)
    semester1_weeks = Column(Integer, default=15, nullable=True) # عدد أسابيع الفصل الأول (الكليات العامة)
    semester2_weeks = Column(Integer, default=15, nullable=True) # عدد أسابيع الفصل الثاني (الكليات العامة)
    summer_weeks = Column(Integer, default=8, nullable=True)    # عدد أسابيع الفصل الصيفي (الكليات العامة)
    
    med_semester1_weeks = Column(Integer, default=15, nullable=True) # عدد أسابيع الفصل الأول (كلية الطب والجراحة)
    med_semester2_weeks = Column(Integer, default=14, nullable=True) # عدد أسابيع الفصل الثاني (كلية الطب والجراحة)
    med_summer_weeks = Column(Integer, default=7, nullable=True)    # عدد أسابيع الفصل الصيفي (كلية الطب والجراحة)

# ==========================================
# 12. جدول سجل العمليات والأنشطة (Activity & Audit Logs)
# ==========================================
class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String, index=True)
    user_role = Column(String, nullable=True)
    action_type = Column(String, index=True) # LOGIN, LOGIN_FAILED, CREATE, UPDATE, DELETE, APPROVE, EXPORT, SECURITY
    entity_type = Column(String, index=True) # AUTH, PROFESSORS, COURSES, STUDY_PLAN, USERS, SIGNATURES, RECYCLE_BIN, SYSTEM
    description = Column(String)
    status = Column(String, default="success") # success, failed, warning
    faculty_id = Column(Integer, ForeignKey("faculties.id"), nullable=True)
    academic_year = Column(String, nullable=True)
    semester = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    extra_data = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    faculty = relationship("Faculty")
    user = relationship("User")

# ==========================================
# 13. جدول حدود الأعباء للكلية (Faculty Workload Limits)
# ==========================================
class FacultyWorkloadLimit(Base):
    __tablename__ = "faculty_workload_limits"
    
    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculties.id"), index=True)
    academic_year = Column(String, index=True) # مثل 2026/2027
    semester = Column(String, index=True) # الفصل الدراسي الأول / الثاني / الصيفي
    
    # الحدود الديناميكية لساعات العمل باليوم
    max_faculty_hours_per_day = Column(Float, default=6.0, nullable=True) # الحد الأقصى في اليوم لعضو هيئة التدريس (أي وظيفة ما عدا المعيد والمدرس المساعد)
    max_assistant_hours_per_day = Column(Float, default=8.0, nullable=True) # الحد الأقصى في اليوم للهيئة المعاونة (المعيد والمدرس المساعد فقط)

    # تفصيل الساعات في اليوم
    min_theory_hours_per_day = Column(Float, default=0.0) # الحد الأدنى للساعات نظري في اليوم
    max_theory_hours_per_day = Column(Float, default=0.0) # الحد الأقصى للساعات نظري في اليوم
    
    min_practical_hours_per_day = Column(Float, default=0.0) # الحد الأدنى للساعات عملي في اليوم
    max_practical_hours_per_day = Column(Float, default=0.0) # الحد الأقصى للساعات عملي في اليوم
    
    min_tutorial_hours_per_day = Column(Float, default=0.0) # الحد الأدنى للساعات توتوريال في اليوم (تكنولوجيا العلوم الصحية)
    max_tutorial_hours_per_day = Column(Float, default=0.0) # الحد الأقصى للساعات توتوريال في اليوم (تكنولوجيا العلوم الصحية)
    
    min_field_hours_per_day = Column(Float, default=0.0) # الحد الأدنى لساعات الحقل في اليوم (تكنولوجيا العلوم الصحية)
    max_field_hours_per_day = Column(Float, default=0.0) # الحد الأقصى لساعات الحقل في اليوم (تكنولوجيا العلوم الصحية)
    
    # تفصيل الساعات للمقرر الواحد
    max_theory_hours_per_course = Column(Float, default=0.0, nullable=True) # الحد الأقصى للساعات نظري للمقرر الواحد
    max_practical_hours_per_course = Column(Float, default=0.0, nullable=True) # الحد الأقصى للساعات عملي للمقرر الواحد
    max_tutorial_hours_per_course = Column(Float, default=0.0, nullable=True) # الحد الأقصى للساعات توتوريال للمقرر الواحد (تكنولوجيا العلوم الصحية)
    max_field_hours_per_course = Column(Float, default=0.0, nullable=True) # الحد الأقصى لساعات الحقل للمقرر الواحد (تكنولوجيا العلوم الصحية)
    
    # حقول سابقة للتوافق
    max_hours_per_day = Column(Float, default=0.0, nullable=True)
    min_hours_per_day = Column(Float, default=0.0, nullable=True)
    max_hours_per_semester = Column(Float, default=0.0, nullable=True)
    min_hours_per_semester = Column(Float, default=0.0, nullable=True)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    faculty = relationship("Faculty")

# ==========================================
# 14. جدول انتقاص/تخفيض ساعات أعضاء هيئة التدريس (Professor Load Deductions)
# ==========================================
class ProfessorLoadDeduction(Base):
    __tablename__ = "professor_load_deductions"
    
    id = Column(Integer, primary_key=True, index=True)
    professor_id = Column(Integer, ForeignKey("professors.id"), index=True)
    faculty_id = Column(Integer, ForeignKey("faculties.id"), index=True, nullable=True)
    academic_year = Column(String, index=True) # مثل 2026/2027
    semester = Column(String, index=True) # الفصل الدراسي الأول / الثاني / الصيفي
    
    deducted_hours = Column(Float, default=0.0) # عدد الساعات الذي سيتم انتقاصه
    week_number = Column(Integer, nullable=True) # رقم الأسبوع
    week_name = Column(String, nullable=True) # اسم الأسبوع
    hour_type = Column(String, nullable=True) # نوع الساعات التدريسية (نظري، عملي، توتوريال، حقل)
    reason = Column(String, nullable=True) # سبب الانتقاص
    
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True) # المقرر الذي تم الانتقاص منه
    course_name = Column(String, nullable=True) # اسم المقرر
    
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    professor = relationship("Professor")
    faculty = relationship("Faculty")
    course = relationship("Course")

# ==========================================
# 15. جدول تخصيص عدد أسابيع المقررات الدراسية (Course Workload Weeks)
# ==========================================
class CourseWorkloadWeek(Base):
    __tablename__ = "course_workload_weeks"
    
    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculties.id"), index=True)
    academic_year = Column(String, index=True)
    semester = Column(String, index=True)
    
    course_key = Column(String, index=True) # e.g. "crs_12" or "mod_5"
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True, index=True)
    module_id = Column(Integer, ForeignKey("course_modules.id"), nullable=True, index=True)
    course_name = Column(String, nullable=False)
    course_code = Column(String, nullable=True)
    weeks_count = Column(Integer, nullable=False) # عدد الأسابيع الفعلي لتدريس هذا المقرر
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    faculty = relationship("Faculty")
    course = relationship("Course")
    module = relationship("CourseModule")


