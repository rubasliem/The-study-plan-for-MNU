import re
import io
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import UploadFile, HTTPException
import models

async def process_and_replace_courses(file: UploadFile, db: Session):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), dtype=str)
        
        # 1. Skip initial rows that are just titles (like in Ibn Al-Haytham exports)
        header_idx = -1
        for i, row in df.iterrows():
            row_str = str(row.values)
            if 'كود' in row_str and ('مقرر' in row_str or 'عربي' in row_str or 'اسم' in row_str):
                header_idx = i
                break
        
        if header_idx != -1:
            df.columns = df.iloc[header_idx]
            df = df.iloc[header_idx+1:].reset_index(drop=True)

        # 2. If it's a 2-row header (like Medicine Template or Ibn Al-Haytham details), flatten it
        if any(k in str(c) for c in df.columns for k in ["توزيع", "الساعات", "الدرجات"]):
            h1 = pd.Series(df.columns).replace(r'^Unnamed: \d+$', '', regex=True).replace('nan', pd.NA).replace('', pd.NA).ffill()
            h2 = df.iloc[0].fillna('').astype(str).replace('nan', '')
            combined = []
            for a, b in zip(h1, h2):
                a_str = str(a).strip()
                b_str = str(b).strip()
                if b_str:
                    combined.append(f'{a_str} - {b_str}')
                else:
                    combined.append(a_str)
            df.columns = combined
            df = df.iloc[1:].reset_index(drop=True)

        # Deduplicate column names to prevent pandas from returning a Series for duplicated columns
        new_cols = []
        seen = {}
        for c in df.columns:
            c_str = str(c)
            if c_str in seen:
                seen[c_str] += 1
                new_cols.append(f"{c_str}_{seen[c_str]}")
            else:
                seen[c_str] = 0
                new_cols.append(c_str)
        df.columns = new_cols

        
        # Clean columns to search them robustly
        def clean_col(c):
            val = str(c).strip().replace(" ", "").replace("_", "").lower()
            val = val.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ى", "ي").replace("ة", "ه")
            return val
            
        columns_cleaned = {clean_col(col): col for col in df.columns}
        
        # Helper to get the actual column name from variations
        def get_col_name(candidates):
            for c in candidates:
                cleaned_cand = clean_col(c)
                # Check for direct match
                if cleaned_cand in columns_cleaned:
                    return columns_cleaned[cleaned_cand]
                # Check for substring match
                for col_key, original_col in columns_cleaned.items():
                    if (len(col_key) > 2 or len(cleaned_cand) > 2) and (cleaned_cand in col_key or col_key in cleaned_cand):
                        # Ensure we don't accidentally match 'م' (length 1) just because it's inside 'اسمالمقرر'
                        if len(col_key) <= 2 and col_key in cleaned_cand:
                            continue
                        return original_col
            return None
        col_code = get_col_name(["كود المقرر", "كود", "code"])
        col_name_ar = get_col_name(["اسم المقرر بالعربي", "المقرر / الحزمة الدراسية (عربي)", "عربي", "اسم المقرر", "arabic"])
        col_name_en = get_col_name(["اسم المقرر بالانجليزي", "المقرر / الحزمة الدراسية (إنجليزي)", "انجليزي", "اسم المقرر انجليزي", "english"])
        col_faculty = get_col_name(["الكلية", "كلية", "faculty"])
        col_program = get_col_name(["البرنامج", "برنامج", "program"])
        col_level = get_col_name(["المستوى", "مستوى", "level"])
        col_semester = get_col_name(["الفصل الدراسي", "فصل", "ترم", "semester"])
        col_theory_hours = get_col_name(["ساعات نظري", "نظري", "محاضرات"])
        col_practical_hours = get_col_name(["ساعات عملي", "عملي"])
        col_exercise_hours = get_col_name(["ساعات تمارين", "تمارين", "تدريب"])
        col_activity_hours = get_col_name(["ساعات أنشطة", "ساعات انشطة", "انشطة", "ميداني"])
        col_total_grade = get_col_name(["درجة كلية", "الدرجة الكلية", "إجمالي الدرجة"])
        col_theory_grade = get_col_name(["درجة نظري", "الدرجات - تحريري نهاية الفصل", "درجة التحريري", "نهاية الفصل"])
        col_practical_grade = get_col_name(["درجة عملي", "الدرجات - عملي"])
        col_year_work_grade = get_col_name(["درجة أعمال سنة", "درجة اعمال سنة", "الدرجات - أعمال الفصل", "اعمال سنة", "أعمال فصل"])
        col_exam_time_hours = get_col_name(["زمن الامتحان", "امتحان", "زمن"])
        col_description = get_col_name(["وصف المقرر", "وصف", "description"])
        col_course_type = get_col_name(["نوع المقرر", "course_type"])
        col_other_programs = get_col_name(["البرامج الاخرى المسجل بها", "البرامج الأخرى المسجل بها", "other_programs"])
        col_requirement = get_col_name(["متطلب", "requirement"])
        col_prerequisite = get_col_name(["المتطلب السابق", "prerequisite"])
        col_concurrent_courses = get_col_name(["المقررات المتزامنة", "concurrent_courses"])
        col_added_to_gpa = get_col_name(["يضاف للمعدل التراكمي", "added_to_gpa"])
        col_pass_fail = get_col_name(["مادة نجاح أو رسوب", "ماده نجاح او رسوب", "pass_fail"])
        col_credit_hours = get_col_name(["الساعات المعتمدة", "الساعات المعتمده", "credit_hours", "الساعات المعتمدة للمقرر"])
        col_summer_registration = get_col_name(["تسجيل المقرر في الصيفي", "تسجيل المقرر في الصيفى", "summer_registration"])
        col_duration = get_col_name(["عدد الأسابيع", "عدد الاسابيع", "duration", "طولي"])
        
        # الأعمدة الـ 12 المتبقية من الـ 39 عموداً
        col_study_hours = get_col_name(["الساعات - الساعات الدراسية", "study_hours"])
        col_midterm_grade = get_col_name(["الدرجات - منتصف الفصل", "midterm_grade"])
        col_written_grade = get_col_name(["الدرجات - تحريري خلال الفصل", "written_grade"])
        col_oral_grade = get_col_name(["الدرجات - شفوي", "oral_grade"])
        col_clinical_grade = get_col_name(["الدرجات - كلينك", "clinical_grade"])
        col_final_eval_grade = get_col_name(["الدرجات - تقييم نهائي", "final_eval_grade"])
        col_midterm_2_grade = get_col_name(["الدرجات - منتصف الفصل ٢", "midterm_2_grade"])
        col_attendance_activity_grade = get_col_name(["الدرجات - Attendance, Activity & Attitude", "attendance_activity_grade"])
        col_success_rate = get_col_name(["نسبة النجاح", "success_rate"])
        col_fail_rate = get_col_name(["نسبة الرسوب النظري", "fail_rate"])
        col_elective_group_code = get_col_name(["كود المجموعة الاختيارية", "elective_group_code"])
        col_elective_courses_count = get_col_name(["عدد المقررات او الوحدات الاختيارية", "elective_courses_count"])
        
        col_department = get_col_name(["الأقسام العلمية", "القسم العلمي", "department"])
        col_dept_credit = get_col_name(["الساعات المعتمدة للأقسام"])
        col_course_total_grade = get_col_name(["الدرجة الكاملة للمقرر"])
        col_course_total_credit = get_col_name(["الساعات المعتمدة للمقرر"])

        is_medicine_template = col_department is not None

        # Check required columns
        required = {
            "كود المقرر": col_code,
            "المستوى": col_level
        }
        # We don't require Faculty and Program because these detailed sheets are mainly used 
        # to update existing courses based on Course Code.
        
        missing = [k for k, v in required.items() if v is None]
        if missing:
            raise HTTPException(status_code=400, detail=f"الملف لا يحتوي على الأعمدة المطلوبة: {', '.join(missing)}")

        # لم نعد نحذف كل المقررات القديمة للحفاظ عليها (تحديث بدلاً من استبدال كامل)
        # db.query(models.Course).delete()
        # db.commit()

        # Cache for faculty and program lookups to reduce db calls
        faculty_cache = {}
        program_cache = {}

        def get_faculty_id(fac_name: str) -> int:
            fac_name = fac_name.strip()
            if not fac_name:
                return None
            if fac_name in faculty_cache:
                return faculty_cache[fac_name]
            
            fac = db.query(models.Faculty).filter(models.Faculty.name == fac_name).first()
            if not fac:
                fac = models.Faculty(name=fac_name)
                db.add(fac)
                db.flush()
            faculty_cache[fac_name] = fac.id
            return fac.id

        def get_program_id(prog_name: str, fac_id: int) -> int:
            prog_name = prog_name.strip()
            if not prog_name or not fac_id:
                return None
            cache_key = (prog_name, fac_id)
            if cache_key in program_cache:
                return program_cache[cache_key]
                
            prog = db.query(models.Program).filter(
                models.Program.name == prog_name,
                models.Program.faculty_id == fac_id
            ).first()
            if not prog:
                prog = models.Program(name=prog_name, faculty_id=fac_id)
                db.add(prog)
                db.flush()
            program_cache[cache_key] = prog.id
            return prog.id

        def parse_level(lvl_val: str) -> int:
            lvl_val = str(lvl_val).strip()
            if not lvl_val:
                return 1
            try:
                digits = "".join([c for c in lvl_val if c.isdigit()])
                if digits:
                    return int(digits)
                norm = lvl_val.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ى", "ي").replace("ة", "ه")
                if "اول" in norm:
                    return 1
                elif "ثاني" in norm or "ثانى" in norm:
                    return 2
                elif "ثالث" in norm:
                    return 3
                elif "رابع" in norm:
                    return 4
                elif "خامس" in norm:
                    return 5
            except Exception:
                pass
            return 1
        def safe_float(val):
            if pd.isna(val) or str(val).strip() == "" or str(val).strip() == "-":
                return 0.0
            try:
                return float(str(val).strip())
            except ValueError:
                return 0.0

        def safe_str(val):
            if pd.isna(val) or str(val).strip() == "" or str(val).strip() == "nan":
                return ""
            return str(val).strip()

        imported_courses = {}
        updated_courses = {}
        
        current_course = None
        current_course_code = None

        for index, row in df.iterrows():
            code = safe_str(row.get(col_code)) if col_code else ""
            if not code and not is_medicine_template:
                continue
            if is_medicine_template and not code and not current_course:
                continue
                
            if code:
                current_course_code = code
            else:
                code = current_course_code

            name_ar = safe_str(row.get(col_name_ar)) if col_name_ar else ""
            name_en = safe_str(row.get(col_name_en)) if col_name_en else ""
            
            # Extract basic course fields only if it's a new course row (has name)
            if name_ar or name_en or not is_medicine_template:
                level_str = safe_str(row.get(col_level)) if col_level else ""
                level = parse_level(level_str)
                semester = safe_str(row.get(col_semester)) if col_semester else "الفصل الدراسي الأول"
                
                faculty_name = safe_str(row.get(col_faculty)) if col_faculty else ""
                program_name = safe_str(row.get(col_program)) if col_program else ""
                
                faculty_id = get_faculty_id(faculty_name) if faculty_name else None
                program_id = get_program_id(program_name, faculty_id) if program_name and faculty_id else None

                # Additional fields
                course_type = safe_str(row.get(col_course_type)) if col_course_type else ""
                other_programs = safe_str(row.get(col_other_programs)) if col_other_programs else ""
                requirement = safe_str(row.get(col_requirement)) if col_requirement else ""
                prerequisite = safe_str(row.get(col_prerequisite)) if col_prerequisite else ""
                concurrent_courses = safe_str(row.get(col_concurrent_courses)) if col_concurrent_courses else ""
                added_to_gpa = safe_str(row.get(col_added_to_gpa)) if col_added_to_gpa else ""
                pass_fail = safe_str(row.get(col_pass_fail)) if col_pass_fail else ""
                summer_registration = safe_str(row.get(col_summer_registration)) if col_summer_registration else ""
                duration = safe_str(row.get(col_duration)) if col_duration else ""
                description = safe_str(row.get(col_description)) if col_description else ""
                exam_time_hours = safe_str(row.get(col_exam_time_hours)) if col_exam_time_hours else ""
                
                study_hours = safe_str(row.get(col_study_hours)) if col_study_hours else ""
                midterm_grade = safe_str(row.get(col_midterm_grade)) if col_midterm_grade else ""
                written_grade = safe_str(row.get(col_written_grade)) if col_written_grade else ""
                oral_grade = safe_str(row.get(col_oral_grade)) if col_oral_grade else ""
                clinical_grade = safe_str(row.get(col_clinical_grade)) if col_clinical_grade else ""
                final_eval_grade = safe_str(row.get(col_final_eval_grade)) if col_final_eval_grade else ""
                midterm_2_grade = safe_str(row.get(col_midterm_2_grade)) if col_midterm_2_grade else ""
                attendance_activity_grade = safe_str(row.get(col_attendance_activity_grade)) if col_attendance_activity_grade else ""
                success_rate = safe_str(row.get(col_success_rate)) if col_success_rate else ""
                fail_rate = safe_str(row.get(col_fail_rate)) if col_fail_rate else ""
                elective_group_code = safe_str(row.get(col_elective_group_code)) if col_elective_group_code else ""
                elective_courses_count = safe_str(row.get(col_elective_courses_count)) if col_elective_courses_count else ""

                # numeric fields
                theory_hours = safe_float(row.get(col_theory_hours)) if col_theory_hours else 0.0
                practical_hours = safe_float(row.get(col_practical_hours)) if col_practical_hours else 0.0
                exercise_hours = safe_float(row.get(col_exercise_hours)) if col_exercise_hours else 0.0
                activity_hours = safe_float(row.get(col_activity_hours)) if col_activity_hours else 0.0
                
                theory_grade = safe_float(row.get(col_theory_grade)) if col_theory_grade else 0.0
                practical_grade = safe_float(row.get(col_practical_grade)) if col_practical_grade else 0.0
                year_work_grade = safe_float(row.get(col_year_work_grade)) if col_year_work_grade else 0.0
                total_grade = safe_float(row.get(col_total_grade)) if col_total_grade else (theory_grade + practical_grade + year_work_grade)
                credit_hours = safe_float(row.get(col_credit_hours)) if col_credit_hours else 0.0

                if is_medicine_template:
                    course_total_grade = safe_float(row.get(col_course_total_grade)) if col_course_total_grade else total_grade
                    course_total_credit = safe_float(row.get(col_course_total_credit)) if col_course_total_credit else credit_hours
                else:
                    course_total_grade = total_grade
                    course_total_credit = credit_hours

                # find or create course
                course = db.query(models.Course).filter(models.Course.code == code).first()
                if course:
                    # update
                    if name_ar: course.name_ar = name_ar
                    if name_en: course.name_en = name_en
                    course.level = level
                    course.semester = semester
                    if faculty_id: course.faculty_id = faculty_id
                    if program_id: course.program_id = program_id
                    course.course_type = course_type
                    course.other_programs = other_programs
                    course.requirement = requirement
                    course.prerequisite = prerequisite
                    course.concurrent_courses = concurrent_courses
                    course.added_to_gpa = added_to_gpa
                    course.pass_fail = pass_fail
                    course.summer_registration = summer_registration
                    course.duration = duration
                    course.description = description
                    course.exam_time_hours = exam_time_hours
                    course.study_hours = study_hours
                    course.midterm_grade = midterm_grade
                    course.written_grade = written_grade
                    course.oral_grade = oral_grade
                    course.clinical_grade = clinical_grade
                    course.final_eval_grade = final_eval_grade
                    course.midterm_2_grade = midterm_2_grade
                    course.attendance_activity_grade = attendance_activity_grade
                    course.success_rate = success_rate
                    course.fail_rate = fail_rate
                    course.elective_group_code = elective_group_code
                    course.elective_courses_count = elective_courses_count
                    
                    if not is_medicine_template:
                        course.theory_hours = theory_hours
                        course.practical_hours = practical_hours
                        course.exercise_hours = exercise_hours
                        course.activity_hours = activity_hours
                        course.theory_grade = theory_grade
                        course.practical_grade = practical_grade
                        course.year_work_grade = year_work_grade
                        course.credit_hours = course_total_credit
                        course.total_grade = course_total_grade
                        course.is_bundle = False
                    else:
                        course.is_bundle = True
                        if course_total_credit > 0: course.credit_hours = course_total_credit
                        if course_total_grade > 0: course.total_grade = course_total_grade
                        
                    updated_courses[course.code] = course.name_ar or course.name_en or course.code
                else:
                    # create
                    course = models.Course(
                        code=code,
                        name_ar=name_ar,
                        name_en=name_en,
                        level=level,
                        semester=semester,
                        faculty_id=faculty_id,
                        program_id=program_id,
                        course_type=course_type,
                        other_programs=other_programs,
                        requirement=requirement,
                        prerequisite=prerequisite,
                        concurrent_courses=concurrent_courses,
                        added_to_gpa=added_to_gpa,
                        pass_fail=pass_fail,
                        summer_registration=summer_registration,
                        duration=duration,
                        description=description,
                        exam_time_hours=exam_time_hours,
                        study_hours=study_hours,
                        midterm_grade=midterm_grade,
                        written_grade=written_grade,
                        oral_grade=oral_grade,
                        clinical_grade=clinical_grade,
                        final_eval_grade=final_eval_grade,
                        midterm_2_grade=midterm_2_grade,
                        attendance_activity_grade=attendance_activity_grade,
                        success_rate=success_rate,
                        fail_rate=fail_rate,
                        elective_group_code=elective_group_code,
                        elective_courses_count=elective_courses_count,
                        theory_hours=theory_hours if not is_medicine_template else 0.0,
                        practical_hours=practical_hours if not is_medicine_template else 0.0,
                        exercise_hours=exercise_hours if not is_medicine_template else 0.0,
                        activity_hours=activity_hours if not is_medicine_template else 0.0,
                        theory_grade=theory_grade if not is_medicine_template else 0.0,
                        practical_grade=practical_grade if not is_medicine_template else 0.0,
                        year_work_grade=year_work_grade if not is_medicine_template else 0.0,
                        credit_hours=course_total_credit,
                        total_grade=course_total_grade,
                        is_bundle=is_medicine_template
                    )
                    db.add(course)
                    db.flush()
                    imported_courses[course.code] = course.name_ar or course.name_en or course.code

                current_course = course

                # Clear old modules if it's the first row for a medicine bundle and we just updated it
                if is_medicine_template and course.code in updated_courses:
                    # Nullify foreign key references in study_plan_items before deleting
                    db.query(models.StudyPlanItem).filter(
                        models.StudyPlanItem.module_id.in_(
                            db.query(models.CourseModule.id).filter(models.CourseModule.course_id == course.id)
                        )
                    ).update({"module_id": None}, synchronize_session=False)
                    db.query(models.CourseModule).filter(models.CourseModule.course_id == course.id).delete(synchronize_session=False)
                    db.flush()

            # Process module if medicine template
            if is_medicine_template and current_course:
                dept_name = safe_str(row.get(col_department)) if col_department else ""
                if dept_name:
                    def get_med_val(keys):
                        for k in keys:
                            if k in df.columns:
                                return safe_float(row.get(k, 0.0))
                        return 0.0
                    
                    m_theory_cred = get_med_val(["توزيع الساعات المعتمدة - نظري"])
                    m_prac_cred = get_med_val(["توزيع الساعات المعتمدة - عملي"])
                    m_act_cred = get_med_val(["توزيع الساعات المعتمدة - أنشطة"])
                    
                    m_theory_hrs = get_med_val(["توزيع الساعات التدريسية - نظري"])
                    m_prac_hrs = get_med_val(["توزيع الساعات التدريسية - عملي"])
                    m_act_hrs = get_med_val(["توزيع الساعات التدريسية - أنشطة"])
                    
                    m_theory_grd = get_med_val(["توزيع الدرجات - نظري"])
                    m_prac_grd = get_med_val(["توزيع الدرجات - عملي"])
                    m_yw_grd = get_med_val(["توزيع الدرجات - أعمال سنة", "توزيع الدرجات - اعمال سنة"])
                    
                    m_total_grd = safe_float(row.get(col_total_grade, 0.0))
                    if m_total_grd == 0.0:
                        m_total_grd = m_theory_grd + m_prac_grd + m_yw_grd
                    
                    m_total_cred = safe_float(row.get(col_dept_credit, 0.0))
                    if m_total_cred == 0.0:
                        m_total_cred = m_theory_cred + m_prac_cred + m_act_cred
                        
                    mod = models.CourseModule(
                        course_id=current_course.id,
                        department_name=dept_name,
                        credit_hours=m_total_cred,
                        theory_credit=m_theory_cred,
                        practical_credit=m_prac_cred,
                        activity_credit=m_act_cred,
                        theory_hours=m_theory_hrs,
                        practical_hours=m_prac_hrs,
                        activity_hours=m_act_hrs,
                        year_work_grade=m_yw_grd,
                        practical_grade=m_prac_grd,
                        theory_grade=m_theory_grd,
                        total_grade=m_total_grd
                    )
                    db.add(mod)
                    db.flush()

        # Update aggregated fields for medicine courses
        if is_medicine_template:
            courses_to_agg = db.query(models.Course).filter(models.Course.is_bundle == True).all()
            for c in courses_to_agg:
                if c.modules:
                    c.theory_hours = sum(m.theory_hours for m in c.modules)
                    c.practical_hours = sum(m.practical_hours for m in c.modules)
                    c.activity_hours = sum(m.activity_hours for m in c.modules)
                    c.theory_grade = sum(m.theory_grade for m in c.modules)
                    c.practical_grade = sum(m.practical_grade for m in c.modules)
                    c.year_work_grade = sum(m.year_work_grade for m in c.modules)
                    if not c.total_grade or c.total_grade == 0:
                        c.total_grade = sum(m.total_grade for m in c.modules)
                    if not c.credit_hours or c.credit_hours == 0:
                        c.credit_hours = sum(m.credit_hours for m in c.modules)

        imported_list = [{"code": k, "name": v} for k, v in imported_courses.items()]
        updated_list = [{"code": k, "name": v} for k, v in updated_courses.items()]
        imported_count = len(imported_list)
        updated_count = len(updated_list)

        db.commit()
        return {
            "message": "تم الاستيراد بنجاح", 
            "imported": imported_count, 
            "updated": updated_count, 
            "total": imported_count + updated_count,
            "imported_details": imported_list,
            "updated_details": updated_list
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"حدث خطأ أثناء معالجة ملف الإكسيل: {str(e)}")
