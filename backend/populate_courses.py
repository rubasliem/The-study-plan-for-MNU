import re
import sys
import pandas as pd
sys.path.append("c:/Users/rubas/Desktop/MNU-Study-Plan/backend")
from database import SessionLocal
import models

def map_faculty(fac_name_raw):
    norm = str(fac_name_raw).strip().replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ى", "ي").replace("ة", "ه").replace(" ", "")
    if "حاسبات" in norm or "علومالحاسوب" in norm:
        return "كلية علوم الحاسوب والذكاء الاصطناعي"
    if "اسنان" in norm:
        return "كلية طب الأسنان"
    if "هندسه" in norm or "هندسة" in norm:
        return "كلية الهندسة"
    if "انساني" in norm or "إنساني" in norm:
        return "كلية العلوم الانسانية"
    if "صحيه" in norm or "صحية" in norm:
        return "كلية تكنولوجيا العلوم الصحية التطبيقية"
    if "تمريض" in norm:
        return "كلية التمريض"
    if "صيدله" in norm or "صيدلية" in norm:
        return "كلية الصيدلة"
    if "طبيعي" in norm:
        return "كلية العلاج الطبيعي"
    if "بيطري" in norm or "بيطرى" in norm:
        return "كلية الطب البيطري"
    if "طبوالجراحه" in norm or "الطبوالجراحه" in norm:
        return "كلية الطب والجراحة"
    return fac_name_raw

def map_program_and_level(fac_name_db, code, name_ar):
    level = 1
    code_part = code
    if "_" in code:
        parts = code.split("_")
        if len(parts) >= 2:
            code_part = parts[1]
            
    # Try to find the level from the first digit group
    digits = re.findall(r'\d+', code_part)
    if digits:
        first_digit_group = digits[0]
        if len(first_digit_group) >= 3:
            level = int(first_digit_group[0])
        elif len(first_digit_group) == 2:
            if len(digits) >= 2:
                second_group = digits[1]
                if len(second_group) >= 3:
                    level = int(second_group[0])
                else:
                    level = int(second_group)
            else:
                level = int(first_digit_group)
        else:
            level = int(first_digit_group)
            
    if level > 5:
        level = 1
        
    if fac_name_db == "كلية علوم الحاسوب والذكاء الاصطناعي":
        if "IOT" in code or "انترنت" in name_ar:
            return "إنترنت الأشياء وتحليل البيانات الضخمة", level
        elif "AI" in code or "ذكاء" in name_ar:
            return "ذكاء الآلة", level
        else:
            return "علوم البيانات", level
            
    elif fac_name_db == "كلية طب الأسنان":
        return "طب وجراحة الفم والأسنان", level
        
    elif fac_name_db == "كلية الهندسة":
        if "00" in code or level == 0 or (level == 1 and ("BAS" in code or "GEN" in code or "ENG" in code)):
            return "المستوى العام", (0 if "00" in code else 1)
        if "COM" in code or "CSE" in code or "CS" in code:
            return "هندسة الحاسوب", level
        elif "ARE" in code or "CVE" in code or "PLAN" in code or "URB" in code:
            return "تخطيط وتشييد المدن الذكية", level
        elif "MEC" in code or "ELE" in code or "MAT" in code or "ENG" in code:
            return "هندسة المواد وإدارة التصنيع", level
        else:
            return "المستوى العام", level
            
    elif fac_name_db == "كلية العلوم الانسانية":
        return "اللغة الإنجليزية والترجمة التخصصية", level
        
    elif fac_name_db == "كلية تكنولوجيا العلوم الصحية التطبيقية":
        if "DP" in code or "dent" in code.lower() or "اسنان" in name_ar:
            return "تكنولوجيا صناعة تركيبات الأسنان", level
        elif "ML" in code or "مختبر" in name_ar or "تحاليل" in name_ar:
            return "تكنولوجيا المختبرات الطبية", level
        elif "RT" in code or "تنفس" in name_ar:
            return "تكنولوجيا الرعاية التنفسية", level
        elif "RAD" in code or "اشعه" in name_ar or "أشعة" in name_ar:
            return "تكنولوجيا علوم الأشعة والتصوير الطبي", level
        else:
            return "برنامج عام", level
            
    elif fac_name_db == "كلية التمريض":
        if "CEN" in code or "طوارئ" in name_ar:
            return "تمريض الطوارئ", level
        elif "MID" in code or "قبالة" in name_ar:
            return "تمريض القبالة", level
        elif "NEO" in code or "حديثي" in name_ar:
            return "تمريض حديثي الولادة", level
        else:
            return "علوم التمريض", level
            
    elif fac_name_db == "كلية الصيدلة":
        return "فارم دي (الصيدلة الإكلينيكية)", level
        
    elif fac_name_db == "كلية العلاج الطبيعي":
        return "العلاج الطبيعي", level
        
    elif fac_name_db == "كلية الطب البيطري":
        return "الطب البيطري", level
        
    elif fac_name_db == "كلية الطب والجراحة":
        if "NEW" in code or "جديد" in name_ar:
            return "الطب والجراحة اللائحة الجديدة", level
        else:
            return "الطب والجراحة اللائحة القديمة", level
            
    return None, level

def run_import():
    file_path = "c:/Users/rubas/Desktop/ALL Courses.xlsx"
    df = pd.read_excel(file_path)
    
    db = SessionLocal()
    try:
        # Load all faculties and programs from db for lookup
        faculties = db.query(models.Faculty).all()
        fac_map = {f.name: f for f in faculties}
        
        programs = db.query(models.Program).all()
        prog_map = {(p.name, p.faculty_id): p for p in programs}
        
        imported = 0
        skipped = 0
        
        for idx, row in df.iterrows():
            code = str(row['كود المقرر']).strip()
            name_ar = str(row['إسم المقرر']).strip()
            fac_raw = str(row['الكلية']).strip()
            sem_raw = str(row['الفصل ']).strip() if 'الفصل ' in row else "الفصل الدراسي الأول"
            
            if not code or not name_ar or code == 'nan' or name_ar == 'nan':
                skipped += 1
                continue
                
            fac_db_name = map_faculty(fac_raw)
            fac_obj = fac_map.get(fac_db_name)
            if not fac_obj:
                print(f"Skipping row {idx}: Faculty '{fac_db_name}' not found in DB.")
                skipped += 1
                continue
                
            prog_name, level = map_program_and_level(fac_db_name, code, name_ar)
            if not prog_name:
                print(f"Skipping row {idx}: Could not map program for '{name_ar}' in '{fac_db_name}'")
                skipped += 1
                continue
                
            prog_obj = prog_map.get((prog_name, fac_obj.id))
            if not prog_obj:
                # Let's create it if it doesn't exist
                print(f"Creating missing program: '{prog_name}' under Faculty '{fac_db_name}'")
                prog_obj = models.Program(name=prog_name, faculty_id=fac_obj.id)
                db.add(prog_obj)
                db.flush()
                prog_map[(prog_name, fac_obj.id)] = prog_obj
                
            # Check if course code already exists in this program
            existing = db.query(models.Course).filter(
                models.Course.code == code,
                models.Course.program_id == prog_obj.id
            ).first()
            
            if existing:
                existing.name_ar = name_ar
                existing.level = level
                existing.semester = sem_raw
            else:
                new_c = models.Course(
                    code=code,
                    name_ar=name_ar,
                    name_en="",
                    level=level,
                    semester=sem_raw,
                    faculty_id=fac_obj.id,
                    program_id=prog_obj.id,
                    year="2026/2027"
                )
                db.add(new_c)
            imported += 1
            
        db.commit()
        print(f"\nImport Finished: Imported/Updated {imported} courses, skipped {skipped}.")
        
    finally:
        db.close()

if __name__ == "__main__":
    run_import()
