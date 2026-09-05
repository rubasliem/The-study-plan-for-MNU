from pydantic import BaseModel, validator, Field
from typing import List, Optional, Union, Any
from enum import Enum
from datetime import datetime

# تعريف أنواع المستخدمين
class UserRole(str, Enum):
    admin = "admin"
    manager = "manager"
    faculty_admin = "faculty_admin"
    faculty_professor = "faculty_professor"
    student_affairs = "student_affairs"
    reviewer = "reviewer"

# ==========================================
# Authentication Schemas (Token)
# ==========================================
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# ==========================================
# 1. Schemas الخاص بالكليات (Faculties)
# ==========================================
class FacultyBase(BaseModel):
    name: str

class FacultyCreate(FacultyBase):
    pass

class FacultyOut(FacultyBase):
    id: int

    class Config:
        from_attributes = True

# ==========================================
# 2. Schemas الخاص بالبرامج الدراسية (Programs)
# ==========================================
class ProgramBase(BaseModel):
    name: str
    faculty_id: int

class ProgramCreate(ProgramBase):
    pass

class ProgramOut(ProgramBase):
    id: int

    class Config:
        from_attributes = True

# ==========================================
# 3. Schemas الخاص بأعضاء هيئة التدريس (Professors)
# ==========================================

class ProfessorBase(BaseModel):
    name_ar: str
    name_en: str
    national_id: str
    phone: str = ""
    email: Optional[str] = ""
    job_title: str
    original_workplace: str
    contract_type: Optional[str] = None
    work_days: Optional[str] = None
    mnu_job_title: Optional[str] = None
    academic_year: Optional[str] = "2026/2027"
    semester1_weeks: Optional[int] = None
    semester2_weeks: Optional[int] = None
    summer_weeks: Optional[int] = None
    academic_year_weeks: Optional[Any] = None

class ProfessorCreate(ProfessorBase):
    faculty_ids: List[int]
    course_ids: List[int] = []
    
    @validator('name_ar')
    def name_must_have_three_words(cls, v):
        if len(v.strip().split()) < 3:
            raise ValueError('يجب أن يتكون الاسم من 3 كلمات على الأقل')
        return v

    @validator('job_title')
    def validate_job_title(cls, v):
        valid_titles = ["أ.م", "أ.م.د", "د", "م.م", "معيد", "أخصائي", "أ", "ط", "ص", "م.ع", "م", "أ.د"]
        if v not in valid_titles:
            raise ValueError('يرجى اختيار وظيفة صالحة')
        return v

class ProfessorOut(ProfessorBase):
    id: int
    courses: List["CourseOut"] = [] 
    faculties: List[FacultyOut] = []

    class Config:
        from_attributes = True

# ==========================================
# 3.1 Schemas للأقسام العلمية الفرعية للمقرر (CourseModule)
# ==========================================
class CourseModuleBase(BaseModel):
    department_name: str
    credit_hours: Optional[float] = 0.0
    theory_credit: Optional[float] = 0.0
    practical_credit: Optional[float] = 0.0
    activity_credit: Optional[float] = 0.0
    theory_hours: Optional[float] = 0.0
    practical_hours: Optional[float] = 0.0
    activity_hours: Optional[float] = 0.0
    year_work_grade: Optional[float] = 0.0
    practical_grade: Optional[float] = 0.0
    theory_grade: Optional[float] = 0.0
    total_grade: Optional[float] = 0.0

class CourseModuleCreate(CourseModuleBase):
    pass

class CourseModuleOut(CourseModuleBase):
    id: int
    course_id: int

    class Config:
        from_attributes = True

# ==========================================
# 4. Schemas الخاص بالمقررات (Courses)
# ==========================================
class CourseBase(BaseModel):
    code: str
    name_ar: str
    name_en: str
    level: int
    semester: str
    year: Optional[str] = "2026/2027"
    theory_hours: Optional[float] = 0.0
    practical_hours: Optional[float] = 0.0
    exercise_hours: Optional[float] = 0.0
    activity_hours: Optional[float] = 0.0
    total_grade: Optional[float] = 0.0
    theory_grade: Optional[float] = 0.0
    practical_grade: Optional[float] = 0.0
    year_work_grade: Optional[float] = 0.0
    exam_time_hours: Union[str, float, None] = ""
    duration: Union[str, None] = ""
    faculty_id: Optional[int] = None
    program_id: Optional[int] = None
    professor_id: Optional[int] = None
    
    is_bundle: Optional[bool] = False
    department_name: Optional[str] = None
    
    course_type: Optional[str] = None
    other_programs: Optional[str] = None
    requirement: Optional[str] = None
    prerequisite: Optional[str] = None
    concurrent_courses: Optional[str] = None
    added_to_gpa: Optional[str] = None
    pass_fail: Optional[str] = None
    credit_hours: Optional[float] = 0.0
    summer_registration: Optional[str] = None
    
    study_hours: Optional[str] = None
    midterm_grade: Optional[str] = None
    written_grade: Optional[str] = None
    oral_grade: Optional[str] = None
    clinical_grade: Optional[str] = None
    final_eval_grade: Optional[str] = None
    midterm_2_grade: Optional[str] = None
    attendance_activity_grade: Optional[str] = None
    success_rate: Optional[str] = None
    fail_rate: Optional[str] = None
    elective_group_code: Optional[str] = None
    elective_courses_count: Optional[str] = None
    description: Optional[str] = None

class CourseCreate(CourseBase):
    modules: Optional[List[CourseModuleCreate]] = []

class CourseOut(CourseBase):
    id: int
    faculty: Optional[FacultyOut] = None
    program: Optional[ProgramOut] = None
    modules: List[CourseModuleOut] = []

    class Config:
        from_attributes = True


# ==========================================
# 5. Schemas الخاص بالمستخدمين (Users)
# ==========================================
class UserBase(BaseModel):
    username: str
    role: UserRole = UserRole.faculty_admin
    job_title: Optional[str] = None
    faculty_id: Optional[int] = None
    all_faculties_access: bool = False
    perm_view_prof_study_plan: bool = False
    perm_view_prof_data_btn: bool = False
    perm_view_prof_delete_btn: bool = False
    perm_view_prof_view_btn: bool = False
    perm_view_prof_print_btn: bool = False
    perm_view_prof_import_btn: bool = False
    perm_recycle_restore_btn: bool = False
    perm_recycle_delete_btn: bool = False
    perm_delete_notif_btn: bool = False
    perm_review_1: bool = False
    perm_review_2: bool = False
    perm_approve_plan: bool = False
    perm_finish_plan: bool = False

class UserCreate(UserBase):
    password: str
    assigned_faculty_ids: List[int] = []

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    job_title: Optional[str] = None
    faculty_id: Optional[int] = None
    all_faculties_access: Optional[bool] = None
    assigned_faculty_ids: Optional[List[int]] = None
    perm_view_prof_study_plan: Optional[bool] = None
    perm_view_prof_data_btn: Optional[bool] = None
    perm_view_prof_delete_btn: Optional[bool] = None
    perm_view_prof_view_btn: Optional[bool] = None
    perm_view_prof_print_btn: Optional[bool] = None
    perm_view_prof_import_btn: Optional[bool] = None
    perm_recycle_restore_btn: Optional[bool] = None
    perm_recycle_delete_btn: Optional[bool] = None
    perm_delete_notif_btn: Optional[bool] = None
    perm_review_1: Optional[bool] = None
    perm_review_2: Optional[bool] = None
    perm_approve_plan: Optional[bool] = None
    perm_finish_plan: Optional[bool] = None

class UserOut(UserBase):
    id: int
    faculty: Optional[FacultyOut] = None
    assigned_faculties: List[FacultyOut] = []

    class Config:
        from_attributes = True

# ==========================================
# 6. Schemas الخاص بالخطة الدراسية (StudyPlan)
# ==========================================

class StudyPlanItemBase(BaseModel):
    base_course_id: Optional[int] = None
    course_id: int
    module_id: Optional[int] = None
    program_id: int
    professor_id: Optional[int] = None
    entry_group_id: Optional[str] = None
    level: Optional[str] = None
    student_count: int
    groups_theory: int
    groups_practical: int
    groups_exercise: Optional[int] = 0
    groups_activity: Optional[int] = 0
    hours_actual_theory: Optional[float] = 0.0
    hours_actual_practical: Optional[float] = 0.0
    hours_actual_exercise: Optional[float] = 0.0
    hours_actual_activity: Optional[float] = 0.0
    required_hours_theory: Optional[float] = 0.0
    required_hours_practical: Optional[float] = 0.0
    required_hours_exercise: Optional[float] = 0.0
    required_hours_activity: Optional[float] = 0.0
    notes: Optional[str] = None
    course_notes: Optional[str] = None

class StudyPlanItemCreate(StudyPlanItemBase):
    pass

class StudyPlanItemOut(StudyPlanItemBase):
    id: int
    course: Optional[CourseOut] = None
    module: Optional[CourseModuleOut] = None
    program: Optional[ProgramOut] = None
    professor: Optional[ProfessorOut] = None

    class Config:
        from_attributes = True


class StudyPlanBase(BaseModel):
    faculty_id: int
    semester: Optional[str] = "الفصل الدراسي الأول"
    academic_year: Optional[str] = "2026/2027"
    total_theory_hours: Optional[float] = 0.0
    total_practical_hours: Optional[float] = 0.0
    total_activity_hours: Optional[float] = 0.0
    
    is_finished: Optional[bool] = False
    finished_by: Optional[str] = None
    is_reviewed_1: Optional[bool] = False
    reviewed_1_by: Optional[str] = None
    is_reviewed_2: Optional[bool] = False
    reviewed_2_by: Optional[str] = None
    is_approved: Optional[bool] = False
    approved_by: Optional[str] = None
    frozen_signatures: Optional[str] = None

class StudyPlanCreate(StudyPlanBase):
    items: List[StudyPlanItemCreate] = []

class StudyPlanOut(StudyPlanBase):
    id: int
    items: List[StudyPlanItemOut] = []

    class Config:
        from_attributes = True

class StudyPlanStatusUpdate(BaseModel):
    faculty_id: int
    semester: str
    academic_year: str
    action: str  # review1, cancel_review1, review2, cancel_review2, approve, cancel_approve

# ==========================================
# 7. Schemas الخاص بتوقيعات المسؤولين (Signatures)
# ==========================================
class SignatureBase(BaseModel):
    faculty_id: int
    signature_title: str
    official_name: str
    order_index: Optional[int] = 0
    report_type: str = "الخطة الدراسية"

class SignatureCreate(SignatureBase):
    pass

class SignatureUpdate(BaseModel):
    signature_title: Optional[str] = None
    official_name: Optional[str] = None
    faculty_id: Optional[int] = None
    order_index: Optional[int] = None
    report_type: Optional[str] = None

class SignatureOut(SignatureBase):
    id: int

    class Config:
        from_attributes = True

class SignatureReorderItem(BaseModel):
    id: int
    order_index: int

# ==========================================
# 8. Schemas الخاص بالاشعارات (Notifications)
# ==========================================

class NotificationCreate(BaseModel):
    action_text: str
    faculty_ids: Optional[List[int]] = None
    academic_year: Optional[str] = None
    semester: Optional[str] = None


class NotificationOut(BaseModel):
    id: int
    action_by: str
    action_text: str
    created_at: datetime
    faculty_id: Optional[int] = None
    faculty: Optional[FacultyOut] = None
    academic_year: Optional[str] = None
    semester: Optional[str] = None

    class Config:
        from_attributes = True

class RecycleBinItemAction(BaseModel):
    type: str
    id: int

class RecycleBinAction(BaseModel):
    items: List[RecycleBinItemAction]

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class SetSecurityQuestionRequest(BaseModel):
    security_question: str
    security_answer: str

class ResetPasswordRequest(BaseModel):
    username: str
    security_answer: str
    new_password: str

class AcademicYearBase(BaseModel):
    name: str = Field(..., pattern=r"^\d{4}/\d{4}$")
    order_index: int = 0
    semester1_weeks: Optional[int] = 15
    semester2_weeks: Optional[int] = 14
    summer_weeks: Optional[int] = 7

class AcademicYearReorderItem(BaseModel):
    id: int
    order_index: int


class AcademicYearCreate(AcademicYearBase):
    pass

class AcademicYearOut(AcademicYearBase):
    id: int
    semester1_weeks: Optional[int] = 15
    semester2_weeks: Optional[int] = 14
    summer_weeks: Optional[int] = 7
    
    class Config:
        from_attributes = True

# ==========================================
# 11. Schemas الخاص بسجل العمليات (Activity Logs)
# ==========================================
class ActivityLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    user_role: Optional[str] = None
    action_type: str
    entity_type: str
    description: str
    status: str = "success"
    faculty_id: Optional[int] = None
    faculty_name: Optional[str] = None
    academic_year: Optional[str] = None
    semester: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class BulkDeleteLogsRequest(BaseModel):
    ids: List[int]

ProfessorOut.update_forward_refs()

