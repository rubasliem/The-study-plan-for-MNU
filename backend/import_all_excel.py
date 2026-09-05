import sys
sys.path.append('C:/Users/rubas/Desktop/MNU-Study-Plan/backend')
import os
import pandas as pd
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import difflib

def normalize_arabic(text):
    if not text or pd.isna(text) or str(text).lower() == 'nan':
        return ""
    return str(text).replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا') \
                    .replace('ة', 'ه').replace('ى', 'ي').strip()

def safe_float(val):
    try:
        if pd.isna(val) or str(val).lower() == 'nan' or str(val).strip() == '':
            return 0.0
        return float(str(val).strip())
    except:
        return 0.0

def import_excel_files():
    db = SessionLocal()
    faculties = db.query(models.Faculty).all()
    fac_names = {normalize_arabic(f.name): f for f in faculties}
    
    folder = 'C:/Users/rubas/Desktop/مقرارات الكليات'
    files = [f for f in os.listdir(folder) if f.endswith('.xlsx')]
    
    total_added = 0
    total_updated = 0
    
    for fname in files:
        base_name = fname.replace('.xlsx', '').strip()
        norm_name = normalize_arabic(base_name)
        
        matched_fac = None
        for fn, f_obj in fac_names.items():
            if norm_name in fn or fn in norm_name:
                matched_fac = f_obj
                break
        
        if not matched_fac:
            matches = difflib.get_close_matches(norm_name, fac_names.keys(), n=1, cutoff=0.5)
            if matches:
                matched_fac = fac_names[matches[0]]
                
        if not matched_fac:
            print(f"Skipping {fname}: could not match to any faculty.")
            continue
            
        prog = db.query(models.Program).filter(models.Program.faculty_id == matched_fac.id).first()
        prog_id = prog.id if prog else None
            
        print(f"Importing {fname} into Faculty: {matched_fac.name}")
        
        fpath = os.path.join(folder, fname)
        df = pd.read_excel(fpath, dtype=str)
        
        # Find header row
        header_idx = -1
        for i, row in df.iterrows():
            row_str = str(row.values)
            if 'كود' in row_str and 'مقرر' in row_str:
                header_idx = i
                break
                
        if header_idx != -1:
            header_row1 = list(df.iloc[header_idx])
            header_row2 = list(df.iloc[header_idx + 1]) if header_idx + 1 < len(df) else []
            
            flat_headers = []
            for i in range(len(header_row1)):
                h1 = normalize_arabic(header_row1[i])
                h2 = normalize_arabic(header_row2[i]) if i < len(header_row2) else ""
                
                if h1 and h2:
                    flat_headers.append(f"{h1}_{h2}")
                elif h1:
                    flat_headers.append(h1)
                elif h2:
                    flat_headers.append(h2)
                else:
                    flat_headers.append(f"col_{i}")
                    
            # Deduplicate headers to avoid pandas Series when accessing row by col name
            seen = {}
            unique_headers = []
            for h in flat_headers:
                if h in seen:
                    seen[h] += 1
                    unique_headers.append(f"{h}_{seen[h]}")
                else:
                    seen[h] = 0
                    unique_headers.append(h)
                    
            df.columns = unique_headers
            df = df.iloc[header_idx+2:].reset_index(drop=True)
            
        def get_col(df, possible_names):
            for col in df.columns:
                for p in possible_names:
                    if col == p:
                        return col
            for col in df.columns:
                for p in possible_names:
                    if p in col:
                        if p == "مقرر" and "كود" in col:
                            continue
                        return col
            return None
            
        col_code = get_col(df, ["كود المقرر", "كود", "code"])
        col_name_ar = get_col(df, ["اسم المقرر_nan", "اسم المقرر", "مقرر", "عربي", "arabic"])
        col_name_en = get_col(df, ["اسم المقرر انجليزي", "انجليزي", "english"])
        col_level = get_col(df, ["المستوي", "مستوي", "level"])
        col_semester = get_col(df, ["الفصل الدراسي", "فصل دراسي", "ترم", "semester"])
        col_credit = get_col(df, ["ساعات معتمده", "الساعات المعتمده", "ساعات معتمدة", "الساعات المعتمدة"])
        
        col_theory = get_col(df, ["الساعات_محاضرات", "محاضرات"])
        col_practical = get_col(df, ["الساعات_عملي", "عملي"])
        col_exercise = get_col(df, ["الساعات_تدريب", "تدريب"])
        col_activity = get_col(df, ["الساعات_ساعات التدريب الميداني", "ساعات التدريب الميداني", "تدريب ميداني"])
        col_exam_time = get_col(df, ["الساعات_ساعات الامتحان", "ساعات الامتحان"])
        
        col_midterm_grade = get_col(df, ["الدرجات_منتصف الفصل", "منتصف الفصل"])
        col_year_work = get_col(df, ["الدرجات_اعمال فصل", "اعمال فصل", "أعمال فصل"])
        col_theory_grade = get_col(df, ["الدرجات_نهايه الفصل", "نهايه الفصل", "نهاية الفصل"])
        col_practical_grade = get_col(df, ["الدرجات_عملي"])
        col_final_eval = get_col(df, ["الدرجات_تقييم نهائي", "تقييم نهائي"])
        col_total_grade = get_col(df, ["الدرجات_المجموع"])
        
        for idx, row in df.iterrows():
            code_val = str(row[col_code]).strip() if col_code and not pd.isna(row[col_code]) else ""
            if not code_val or code_val.lower() == 'nan':
                continue
                
            name_ar_val = str(row[col_name_ar]).strip() if col_name_ar and not pd.isna(row[col_name_ar]) else ""
            name_en_val = str(row[col_name_en]).strip() if col_name_en and not pd.isna(row[col_name_en]) else ""
            
            # Clean \n from names
            if '\n' in name_ar_val:
                name_ar_val = name_ar_val.split('\n')[0].strip()
            if '\n' in name_en_val:
                name_en_val = name_en_val.split('\n')[0].strip()
                
            if name_ar_val.lower() == 'nan': name_ar_val = ""
            if name_en_val.lower() == 'nan': name_en_val = ""
            if not name_ar_val and not name_en_val:
                continue
                
            credit_val = safe_float(row[col_credit]) if col_credit else 0.0
            
            level_int = 1
            if col_level and not pd.isna(row[col_level]):
                l_str = str(row[col_level]).replace('المستوى', '').strip()
                try: level_int = int(l_str)
                except: pass
                
            sem_val = str(row[col_semester]).strip() if col_semester and not pd.isna(row[col_semester]) else "الفصل الدراسي الأول"
            
            new_course = models.Course(
                code=code_val,
                name_ar=name_ar_val if name_ar_val else name_en_val,
                name_en=name_en_val,
                level=level_int,
                semester=sem_val,
                faculty_id=matched_fac.id,
                program_id=prog_id,
                credit_hours=credit_val,
                theory_hours=safe_float(row[col_theory]) if col_theory else 0.0,
                practical_hours=safe_float(row[col_practical]) if col_practical else 0.0,
                exercise_hours=safe_float(row[col_exercise]) if col_exercise else 0.0,
                activity_hours=safe_float(row[col_activity]) if col_activity else 0.0,
                exam_time_hours=str(row[col_exam_time]).strip() if col_exam_time and not pd.isna(row[col_exam_time]) and str(row[col_exam_time]).lower() != 'nan' else "",
                midterm_grade=str(safe_float(row[col_midterm_grade])) if col_midterm_grade else "",
                year_work_grade=safe_float(row[col_year_work]) if col_year_work else 0.0,
                theory_grade=safe_float(row[col_theory_grade]) if col_theory_grade else 0.0,
                practical_grade=safe_float(row[col_practical_grade]) if col_practical_grade else 0.0,
                final_eval_grade=str(safe_float(row[col_final_eval])) if col_final_eval else "",
                total_grade=safe_float(row[col_total_grade]) if col_total_grade else 0.0,
                is_deleted=False
            )
            
            existing = db.query(models.Course).filter(models.Course.code == code_val).first()
            if existing:
                for col_obj in models.Course.__table__.columns:
                    if col_obj.name not in ('id', 'is_deleted', 'deleted_at'):
                        val = getattr(new_course, col_obj.name)
                        if val is not None:
                            setattr(existing, col_obj.name, val)
                total_updated += 1
            else:
                db.add(new_course)
                total_added += 1
                
        db.commit()

    print(f"Total Added: {total_added}")
    print(f"Total Updated: {total_updated}")
    db.close()

if __name__ == "__main__":
    import_excel_files()
