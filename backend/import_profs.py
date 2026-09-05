import sys
import pandas as pd
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import math

def process_professors(excel_path):
    df = pd.read_excel(excel_path)
    db: Session = SessionLocal()
    
    # Pre-fetch all faculties
    faculties = {f.name.strip(): f for f in db.query(models.Faculty).all()}
    
    new_count = 0
    updated_count = 0
    
    processed_ids = set()
    
    for idx, row in df.iterrows():
        national_id = str(row.get('الرقم القومى', '')).strip()
        if not national_id or national_id.lower() == 'nan':
            continue
            
        if national_id.endswith('.0'):
            national_id = national_id[:-2]
            
        if national_id in processed_ids:
            continue
            
        name = str(row.get('الاسم', '')).strip()
        email = str(row.get('البريد الإلكترونى', '')).strip()
        if email.lower() == 'nan': email = ""
        
        phone = str(row.get('رقم التليفون', '')).strip()
        if phone.lower() == 'nan': phone = ""
        if phone.endswith('.0'): phone = phone[:-2]
        
        workplace_str = str(row.get('جهة العمل', '')).strip()
        
        # Determine job title based on email or defaults if empty
        job_title = "عضو هيئة تدريس"
        
        prof = db.query(models.Professor).filter(models.Professor.national_id == national_id).first()
        
        fac_names = [f.strip() for f in workplace_str.split(',') if f.strip()]
        matched_faculties = []
        for fn in fac_names:
            if fn in faculties:
                matched_faculties.append(faculties[fn])
                
        if prof:
            # Check name length
            old_name = prof.name_ar or ""
            old_words = old_name.split()
            new_words = name.split()
            if len(new_words) > len(old_words) and len(new_words) > 0:
                prof.name_ar = name
                
            # Update missing data
            if not prof.email and email:
                prof.email = email
            if not prof.phone and phone:
                prof.phone = phone
                
            # Job title rule: if empty, set to 'أ.م'
            if not prof.job_title:
                prof.job_title = "أ.م"
                
            # Workplace rule: if empty, leave empty. (If they already had it, we keep it).
            # The user explicitly said: "واللذين غير مسجل جهة القدوم الخاصة بهم اتركها فارغة"
            # So if it was empty, we do nothing.
            if prof.original_workplace is None:
                prof.original_workplace = ""
            
            # Overwrite faculties unconditionally based on Excel
            prof.faculties = matched_faculties
                
            updated_count += 1
        else:
            new_prof = models.Professor(
                name_ar=name,
                national_id=national_id,
                email=email,
                phone=phone,
                job_title="أ.م",
                original_workplace="",
                faculties=matched_faculties
            )
            db.add(new_prof)
            new_count += 1
            
        processed_ids.add(national_id)
            
    db.commit()
    print(f"Done! Created {new_count} new professors, Updated {updated_count} existing professors.")

if __name__ == "__main__":
    process_professors(sys.argv[1])
