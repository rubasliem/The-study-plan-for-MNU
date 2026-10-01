import os
import sys
import openpyxl
from sqlalchemy.orm import Session
from database import SessionLocal
import models

def clean_national_id(val):
    if val is None:
        return ""
    s = str(val).strip()
    if s.endswith(".0"):
        s = s[:-2]
    s = "".join(c for c in s if c.isdigit())
    return s

def clean_phone(val):
    if val is None:
        return ""
    p = str(val).strip()
    if p.endswith(".0"):
        p = p[:-2]
    p = "".join(c for c in p if c.isdigit())
    if not p:
        return ""
    if len(p) == 10 and p[0] == '1':
        p = '0' + p
    return p

def clean_email(val):
    if val is None:
        return ""
    e = str(val).strip()
    if e.lower() in ["nan", "none", ".", "--", "لا يوجد"]:
        return ""
    return e

def format_workplace(faculty, university, email=""):
    f = str(faculty or "").strip()
    u = str(university or "").strip()
    em = str(email or "").strip().lower()
    
    invalid_vals = {"", "none", "nan", ".", "--", "لا", "لا يوجد", "-"}
    if f.lower() in invalid_vals:
        f = ""
    if u.lower() in invalid_vals:
        u = ""
        
    # Check if university was mistakenly input as phone number
    if any(c.isdigit() for c in u) and len([c for c in u if c.isdigit()]) >= 8:
        if "azhar" in em or "ازهر" in f:
            u = "جامعة الأزهر"
        else:
            u = ""
            
    if not f and not u:
        return ""
    if f and not u:
        return f
    if not f and u:
        return u
        
    if f == u:
        return f
        
    if u in f:
        return f
        
    # الكلية المنتدب منها ثم الجامعة المنتدب منها
    return f"{f} - {u}"

def map_job_title(val):
    j = str(val or "").strip()
    if "متفرغ" in j or j == "استاذ" or j == "أستاذ":
        return "أ.م"
    if "مساعد" in j and ("استاذ" in j or "أستاذ" in j):
        return "أ.م.د"
    if j == "مدرس":
        return "د"
    if "مدرس مساعد" in j:
        return "م.م"
    if "معيد" in j or "معيدة" in j:
        return "معيد"
    return "د"

def run_import(excel_path=None):
    if not excel_path:
        candidates = [
            r"C:\Users\rubas\Desktop\staff.xlsx",
            r"C:\Users\rubas\OneDrive\Desktop\staff.xlsx",
            r"C:\Users\rubas\Downloads\staff.xlsx"
        ]
        for p in candidates:
            if os.path.exists(p):
                excel_path = p
                break
                
    if not excel_path or not os.path.exists(excel_path):
        print(f"Error: staff.xlsx not found!")
        return

    print(f"Loading Excel file from: {excel_path}")
    wb = openpyxl.load_workbook(excel_path)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))[1:]
    
    db: Session = SessionLocal()
    
    updated_count = 0
    created_count = 0
    skipped_count = 0
    
    for idx, row in enumerate(rows):
        nid = clean_national_id(row[0])
        name = str(row[1] or "").strip()
        email = clean_email(row[2])
        phone = clean_phone(row[3])
        univ = row[4]
        fac = row[5]
        job = map_job_title(row[7])
        
        if not nid:
            skipped_count += 1
            continue
            
        workplace = format_workplace(fac, univ, email)
        
        prof = db.query(models.Professor).filter(models.Professor.national_id == nid).first()
        
        if prof:
            # Update existing professor
            if workplace:
                prof.original_workplace = workplace
            if phone:
                prof.phone = phone
            if email:
                prof.email = email
            if job:
                prof.job_title = job
            # Update name if Excel has fuller name
            if len(name.split()) > len((prof.name_ar or "").split()):
                prof.name_ar = name
                
            updated_count += 1
        else:
            # Create new professor
            new_prof = models.Professor(
                name_ar=name,
                name_en="N/A",
                national_id=nid,
                phone=phone,
                email=email,
                job_title=job,
                original_workplace=workplace,
                academic_year="2026/2027",
                required_hours=0.0,
                executed_hours=0.0,
                absences_count=0
            )
            db.add(new_prof)
            created_count += 1
            
    db.commit()
    db.close()
    
    print("=" * 60)
    print("Staff import completed successfully!")
    print(f"Total rows processed: {len(rows)}")
    print(f"Updated existing professors: {updated_count}")
    print(f"Created new professors: {created_count}")
    print(f"Skipped invalid rows: {skipped_count}")
    print("=" * 60)

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else None
    run_import(path)
