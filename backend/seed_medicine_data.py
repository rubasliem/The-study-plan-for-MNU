import sys
import os
from database import SessionLocal, engine
import models

def seed_medicine_courses():
    db = SessionLocal()
    try:
        # Create tables if not exist
        models.Base.metadata.create_all(bind=engine)
        
        # 1. Get Medicine Faculty
        fac = db.query(models.Faculty).filter(models.Faculty.name == "كلية الطب والجراحة").first()
        if not fac:
            fac = models.Faculty(name="كلية الطب والجراحة")
            db.add(fac)
            db.flush()
            
        # 2. Get Program
        prog = db.query(models.Program).filter(models.Program.faculty_id == fac.id, models.Program.name == "الطب والجراحة اللائحة الجديدة").first()
        if not prog:
            prog = models.Program(name="الطب والجراحة اللائحة الجديدة", faculty_id=fac.id)
            db.add(prog)
            db.flush()
            
        print(f"Target Faculty ID: {fac.id}, Program ID: {prog.id}")
        
        # Define courses from the 6 images of Medicine Faculty Regulations
        medicine_courses_data = [
            # =========================================================================
            # المستوى الأول - الفصل الدراسي الأول
            # =========================================================================
            {
                "code": "MED 101",
                "name_ar": "Orientation & preparation to Medical school*",
                "name_en": "Orientation & preparation to Medical school*",
                "level": 1,
                "semester": "الفصل الدراسي الأول",
                "credit_hours": 1.0,
                "theory_hours": 0.0,
                "practical_hours": 0.0,
                "activity_hours": 0.0,
                "total_grade": 25.0,
                "year_work_grade": 0.0,
                "practical_grade": 0.0,
                "theory_grade": 25.0,
                "exam_time_hours": 0.0,
                "is_bundle": False,
                "modules": []
            },
            {
                "code": "MED 102",
                "name_ar": "Foundation 1",
                "name_en": "Foundation 1",
                "level": 1,
                "semester": "الفصل الدراسي الأول",
                "credit_hours": 8.0,
                "theory_hours": 2.5,
                "practical_hours": 2.5,
                "activity_hours": 2.4,
                "total_grade": 200.0,
                "year_work_grade": 60.0,
                "practical_grade": 60.0,
                "theory_grade": 80.0,
                "exam_time_hours": 3.0,
                "is_bundle": True,
                "modules": [
                    {
                        "department_name": "Anatomy",
                        "credit_hours": 2.7,
                        "theory_hours": 1.08,
                        "practical_hours": 0.81,
                        "activity_hours": 0.81,
                        "year_work_grade": 20.25,
                        "practical_grade": 20.25,
                        "theory_grade": 27.0,
                        "total_grade": 67.5
                    },
                    {
                        "department_name": "Histology",
                        "credit_hours": 1.3,
                        "theory_hours": 0.52,
                        "practical_hours": 0.39,
                        "activity_hours": 0.39,
                        "year_work_grade": 9.75,
                        "practical_grade": 9.75,
                        "theory_grade": 13.0,
                        "total_grade": 32.5
                    },
                    {
                        "department_name": "Physiology",
                        "credit_hours": 1.3,
                        "theory_hours": 0.52,
                        "practical_hours": 0.39,
                        "activity_hours": 0.39,
                        "year_work_grade": 9.75,
                        "practical_grade": 9.75,
                        "theory_grade": 13.0,
                        "total_grade": 32.5
                    },
                    {
                        "department_name": "Biochemistry",
                        "credit_hours": 2.7,
                        "theory_hours": 1.08,
                        "practical_hours": 0.81,
                        "activity_hours": 0.81,
                        "year_work_grade": 20.25,
                        "practical_grade": 20.25,
                        "theory_grade": 27.0,
                        "total_grade": 67.5
                    }
                ]
            },
            {
                "code": "MED 103",
                "name_ar": "Foundation 2",
                "name_en": "Foundation 2",
                "level": 1,
                "semester": "الفصل الدراسي الأول",
                "credit_hours": 7.0,
                "theory_hours": 2.7,
                "practical_hours": 2.3,
                "activity_hours": 2.0,
                "total_grade": 175.0,
                "year_work_grade": 52.5,
                "practical_grade": 52.5,
                "theory_grade": 70.0,
                "exam_time_hours": 3.0,
                "is_bundle": True,
                "modules": [
                    {
                        "department_name": "Pathology",
                        "credit_hours": 1.4,
                        "theory_hours": 0.56,
                        "practical_hours": 0.42,
                        "activity_hours": 0.42,
                        "year_work_grade": 10.5,
                        "practical_grade": 10.5,
                        "theory_grade": 14.0,
                        "total_grade": 35.0
                    },
                    {
                        "department_name": "Pharmacology",
                        "credit_hours": 1.7,
                        "theory_hours": 0.68,
                        "practical_hours": 0.51,
                        "activity_hours": 0.51,
                        "year_work_grade": 12.75,
                        "practical_grade": 12.75,
                        "theory_grade": 17.0,
                        "total_grade": 42.5
                    },
                    {
                        "department_name": "Microbiology",
                        "credit_hours": 2.3,
                        "theory_hours": 0.92,
                        "practical_hours": 0.69,
                        "activity_hours": 0.69,
                        "year_work_grade": 17.25,
                        "practical_grade": 17.25,
                        "theory_grade": 23.0,
                        "total_grade": 57.5
                    },
                    {
                        "department_name": "Parasitology",
                        "credit_hours": 1.6,
                        "theory_hours": 0.64,
                        "practical_hours": 0.48,
                        "activity_hours": 0.48,
                        "year_work_grade": 12.0,
                        "practical_grade": 12.0,
                        "theory_grade": 16.0,
                        "total_grade": 40.0
                    }
                ]
            },
            {
                "code": "MED 104",
                "name_ar": "Medical Terminology (English Language)",
                "name_en": "Medical Terminology",
                "level": 1,
                "semester": "الفصل الدراسي الأول",
                "credit_hours": 1.0,
                "theory_hours": 0.7,
                "practical_hours": 0.0,
                "activity_hours": 0.3,
                "total_grade": 25.0,
                "year_work_grade": 7.5,
                "practical_grade": 0.0,
                "theory_grade": 17.5,
                "exam_time_hours": 1.0,
                "is_bundle": False,
                "modules": []
            },
            {
                "code": "MED 105",
                "name_ar": "Presentation skills (Family Medicine)",
                "name_en": "Presentation skills",
                "level": 1,
                "semester": "الفصل الدراسي الأول",
                "credit_hours": 1.0,
                "theory_hours": 0.7,
                "practical_hours": 0.0,
                "activity_hours": 0.3,
                "total_grade": 25.0,
                "year_work_grade": 7.5,
                "practical_grade": 0.0,
                "theory_grade": 17.5,
                "exam_time_hours": 1.0,
                "is_bundle": False,
                "modules": []
            },
            {
                "code": "UNI 101",
                "name_ar": "مدخل الجودة والاعتماد في مؤسسات التعليم العالي",
                "name_en": "Quality & Accreditation in Higher Education",
                "level": 1,
                "semester": "الفصل الدراسي الأول",
                "credit_hours": 1.0,
                "theory_hours": 0.7,
                "practical_hours": 0.0,
                "activity_hours": 0.3,
                "total_grade": 20.0,
                "year_work_grade": 6.0,
                "practical_grade": 0.0,
                "theory_grade": 14.0,
                "exam_time_hours": 1.0,
                "is_bundle": False,
                "modules": []
            },
            {
                "code": "E 000",
                "name_ar": "Faculty elective 1*",
                "name_en": "Faculty elective 1*",
                "level": 1,
                "semester": "الفصل الدراسي الأول",
                "credit_hours": 1.0,
                "theory_hours": 0.7,
                "practical_hours": 0.0,
                "activity_hours": 0.3,
                "total_grade": 25.0,
                "year_work_grade": 7.5,
                "practical_grade": 0.0,
                "theory_grade": 17.5,
                "exam_time_hours": 1.0,
                "is_bundle": False,
                "modules": []
            },

            # =========================================================================
            # المستوى الأول - الفصل الدراسي الثاني
            # =========================================================================
            {
                "code": "MED 106",
                "name_ar": "Musculoskeletal system",
                "name_en": "Musculoskeletal system",
                "level": 1,
                "semester": "الفصل الدراسي الثاني",
                "credit_hours": 8.0,
                "theory_hours": 3.2,
                "practical_hours": 2.4,
                "activity_hours": 2.4,
                "total_grade": 200.0,
                "year_work_grade": 60.0,
                "practical_grade": 60.0,
                "theory_grade": 80.0,
                "exam_time_hours": 3.0,
                "is_bundle": True,
                "modules": [
                    {
                        "department_name": "Anatomy",
                        "credit_hours": 4.0,
                        "theory_hours": 1.6,
                        "practical_hours": 1.2,
                        "activity_hours": 1.2,
                        "year_work_grade": 30.0,
                        "practical_grade": 30.0,
                        "theory_grade": 40.0,
                        "total_grade": 100.0
                    },
                    {
                        "department_name": "Histology",
                        "credit_hours": 1.3,
                        "theory_hours": 0.52,
                        "practical_hours": 0.39,
                        "activity_hours": 0.39,
                        "year_work_grade": 9.75,
                        "practical_grade": 9.75,
                        "theory_grade": 13.0,
                        "total_grade": 32.5
                    },
                    {
                        "department_name": "Physiology",
                        "credit_hours": 0.7,
                        "theory_hours": 0.28,
                        "practical_hours": 0.21,
                        "activity_hours": 0.21,
                        "year_work_grade": 5.25,
                        "practical_grade": 5.25,
                        "theory_grade": 7.0,
                        "total_grade": 17.5
                    },
                    {
                        "department_name": "Biochemistry",
                        "credit_hours": 1.3,
                        "theory_hours": 0.52,
                        "practical_hours": 0.39,
                        "activity_hours": 0.39,
                        "year_work_grade": 9.75,
                        "practical_grade": 9.75,
                        "theory_grade": 13.0,
                        "total_grade": 32.5
                    },
                    {
                        "department_name": "Pathology",
                        "credit_hours": 0.7,
                        "theory_hours": 0.28,
                        "practical_hours": 0.21,
                        "activity_hours": 0.21,
                        "year_work_grade": 5.25,
                        "practical_grade": 5.25,
                        "theory_grade": 7.0,
                        "total_grade": 17.5
                    }
                ]
            },
            {
                "code": "MED 107",
                "name_ar": "Blood and Lymph",
                "name_en": "Blood and Lymph",
                "level": 1,
                "semester": "الفصل الدراسي الثاني",
                "credit_hours": 8.0,
                "theory_hours": 3.2,
                "practical_hours": 2.4,
                "activity_hours": 2.4,
                "total_grade": 200.0,
                "year_work_grade": 60.0,
                "practical_grade": 60.0,
                "theory_grade": 80.0,
                "exam_time_hours": 3.0,
                "is_bundle": True,
                "modules": [
                    {
                        "department_name": "Histology",
                        "credit_hours": 1.0,
                        "theory_hours": 0.4,
                        "practical_hours": 0.3,
                        "activity_hours": 0.3,
                        "year_work_grade": 7.5,
                        "practical_grade": 7.5,
                        "theory_grade": 10.0,
                        "total_grade": 25.0
                    },
                    {
                        "department_name": "Physiology",
                        "credit_hours": 1.3,
                        "theory_hours": 0.52,
                        "practical_hours": 0.39,
                        "activity_hours": 0.39,
                        "year_work_grade": 9.75,
                        "practical_grade": 9.75,
                        "theory_grade": 13.0,
                        "total_grade": 32.5
                    },
                    {
                        "department_name": "Biochemistry",
                        "credit_hours": 1.3,
                        "theory_hours": 0.52,
                        "practical_hours": 0.39,
                        "activity_hours": 0.39,
                        "year_work_grade": 9.75,
                        "practical_grade": 9.75,
                        "theory_grade": 13.0,
                        "total_grade": 32.5
                    },
                    {
                        "department_name": "Pathology",
                        "credit_hours": 0.7,
                        "theory_hours": 0.28,
                        "practical_hours": 0.21,
                        "activity_hours": 0.21,
                        "year_work_grade": 5.25,
                        "practical_grade": 5.25,
                        "theory_grade": 7.0,
                        "total_grade": 17.5
                    },
                    {
                        "department_name": "Pharmacology",
                        "credit_hours": 1.0,
                        "theory_hours": 0.4,
                        "practical_hours": 0.3,
                        "activity_hours": 0.3,
                        "year_work_grade": 7.5,
                        "practical_grade": 7.5,
                        "theory_grade": 10.0,
                        "total_grade": 25.0
                    },
                    {
                        "department_name": "Microbiology",
                        "credit_hours": 1.7,
                        "theory_hours": 0.68,
                        "practical_hours": 0.51,
                        "activity_hours": 0.51,
                        "year_work_grade": 12.75,
                        "practical_grade": 12.75,
                        "theory_grade": 17.0,
                        "total_grade": 42.5
                    },
                    {
                        "department_name": "Parasitology",
                        "credit_hours": 1.0,
                        "theory_hours": 0.4,
                        "practical_hours": 0.3,
                        "activity_hours": 0.3,
                        "year_work_grade": 7.5,
                        "practical_grade": 7.5,
                        "theory_grade": 10.0,
                        "total_grade": 25.0
                    }
                ]
            },
            {
                "code": "MED 108",
                "name_ar": "Communication skills and medical professionalism",
                "name_en": "Communication skills and medical professionalism",
                "level": 1,
                "semester": "الفصل الدراسي الثاني",
                "credit_hours": 2.0,
                "theory_hours": 1.4,
                "practical_hours": 0.0,
                "activity_hours": 0.6,
                "total_grade": 50.0,
                "year_work_grade": 15.0,
                "practical_grade": 0.0,
                "theory_grade": 35.0,
                "exam_time_hours": 1.5,
                "is_bundle": False,
                "modules": []
            },
            {
                "code": "UNI 102",
                "name_ar": "القضايا المجتمعية",
                "name_en": "Community Issues",
                "level": 1,
                "semester": "الفصل الدراسي الثاني",
                "credit_hours": 1.0,
                "theory_hours": 0.7,
                "practical_hours": 0.0,
                "activity_hours": 0.3,
                "total_grade": 20.0,
                "year_work_grade": 6.0,
                "practical_grade": 0.0,
                "theory_grade": 14.0,
                "exam_time_hours": 1.0,
                "is_bundle": False,
                "modules": []
            },

            # =========================================================================
            # المستوى الثاني - الفصل الدراسي الثالث
            # =========================================================================
            {
                "code": "MED 201",
                "name_ar": "Respiratory system",
                "name_en": "Respiratory system",
                "level": 2,
                "semester": "الفصل الدراسي الأول",
                "credit_hours": 8.0,
                "theory_hours": 3.2,
                "practical_hours": 2.4,
                "activity_hours": 2.4,
                "total_grade": 200.0,
                "year_work_grade": 60.0,
                "practical_grade": 60.0,
                "theory_grade": 80.0,
                "exam_time_hours": 3.0,
                "is_bundle": True,
                "modules": [
                    {"department_name": "Anatomy", "credit_hours": 1.0, "theory_hours": 0.4, "practical_hours": 0.3, "activity_hours": 0.3, "year_work_grade": 7.5, "practical_grade": 7.5, "theory_grade": 10.0, "total_grade": 25.0},
                    {"department_name": "Histology", "credit_hours": 0.7, "theory_hours": 0.28, "practical_hours": 0.21, "activity_hours": 0.21, "year_work_grade": 5.25, "practical_grade": 5.25, "theory_grade": 7.0, "total_grade": 17.5},
                    {"department_name": "Physiology", "credit_hours": 1.3, "theory_hours": 0.52, "practical_hours": 0.39, "activity_hours": 0.39, "year_work_grade": 9.75, "practical_grade": 9.75, "theory_grade": 13.0, "total_grade": 32.5},
                    {"department_name": "Biochemistry", "credit_hours": 2.0, "theory_hours": 0.8, "practical_hours": 0.6, "activity_hours": 0.6, "year_work_grade": 15.0, "practical_grade": 15.0, "theory_grade": 20.0, "total_grade": 50.0},
                    {"department_name": "Pathology", "credit_hours": 1.0, "theory_hours": 0.4, "practical_hours": 0.3, "activity_hours": 0.3, "year_work_grade": 7.5, "practical_grade": 7.5, "theory_grade": 10.0, "total_grade": 25.0},
                    {"department_name": "Microbiology", "credit_hours": 0.7, "theory_hours": 0.28, "practical_hours": 0.21, "activity_hours": 0.21, "year_work_grade": 5.25, "practical_grade": 5.25, "theory_grade": 7.0, "total_grade": 17.5},
                    {"department_name": "Pharmacology", "credit_hours": 1.3, "theory_hours": 0.52, "practical_hours": 0.39, "activity_hours": 0.39, "year_work_grade": 9.75, "practical_grade": 9.75, "theory_grade": 13.0, "total_grade": 32.5}
                ]
            },
            {
                "code": "MED 202",
                "name_ar": "Cardiovascular system",
                "name_en": "Cardiovascular system",
                "level": 2,
                "semester": "الفصل الدراسي الأول",
                "credit_hours": 8.0,
                "theory_hours": 3.2,
                "practical_hours": 2.4,
                "activity_hours": 2.4,
                "total_grade": 200.0,
                "year_work_grade": 60.0,
                "practical_grade": 60.0,
                "theory_grade": 80.0,
                "exam_time_hours": 3.0,
                "is_bundle": True,
                "modules": [
                    {"department_name": "Anatomy", "credit_hours": 1.7, "theory_hours": 0.68, "practical_hours": 0.51, "activity_hours": 0.51, "year_work_grade": 12.75, "practical_grade": 12.75, "theory_grade": 17.0, "total_grade": 42.5},
                    {"department_name": "Histology", "credit_hours": 0.8, "theory_hours": 0.32, "practical_hours": 0.24, "activity_hours": 0.24, "year_work_grade": 6.0, "practical_grade": 6.0, "theory_grade": 8.0, "total_grade": 20.0},
                    {"department_name": "Physiology", "credit_hours": 2.7, "theory_hours": 1.08, "practical_hours": 0.81, "activity_hours": 0.81, "year_work_grade": 20.25, "practical_grade": 20.25, "theory_grade": 27.0, "total_grade": 67.5},
                    {"department_name": "Pathology", "credit_hours": 1.4, "theory_hours": 0.56, "practical_hours": 0.42, "activity_hours": 0.42, "year_work_grade": 10.5, "practical_grade": 10.5, "theory_grade": 14.0, "total_grade": 35.0},
                    {"department_name": "Pharmacology", "credit_hours": 1.4, "theory_hours": 0.56, "practical_hours": 0.42, "activity_hours": 0.42, "year_work_grade": 10.5, "practical_grade": 10.5, "theory_grade": 14.0, "total_grade": 35.0}
                ]
            },
            {
                "code": "MED 203",
                "name_ar": "Basic clinical skills I",
                "name_en": "Basic clinical skills I",
                "level": 2,
                "semester": "الفصل الدراسي الأول",
                "credit_hours": 2.0,
                "theory_hours": 0.0,
                "practical_hours": 1.4,
                "activity_hours": 0.6,
                "total_grade": 50.0,
                "year_work_grade": 15.0,
                "practical_grade": 35.0,
                "theory_grade": 0.0,
                "exam_time_hours": 0.0,
                "is_bundle": False,
                "modules": []
            },
            {
                "code": "MED 204",
                "name_ar": "Psychology",
                "name_en": "Psychology",
                "level": 2,
                "semester": "الفصل الدراسي الأول",
                "credit_hours": 1.0,
                "theory_hours": 0.7,
                "practical_hours": 0.0,
                "activity_hours": 0.3,
                "total_grade": 25.0,
                "year_work_grade": 7.5,
                "practical_grade": 0.0,
                "theory_grade": 17.5,
                "exam_time_hours": 1.0,
                "is_bundle": False,
                "modules": []
            },

            # =========================================================================
            # المستوى الثاني - الفصل الدراسي الرابع
            # =========================================================================
            {
                "code": "MED 205",
                "name_ar": "Gastrointestinal system",
                "name_en": "Gastrointestinal system",
                "level": 2,
                "semester": "الفصل الدراسي الثاني",
                "credit_hours": 7.0,
                "theory_hours": 2.8,
                "practical_hours": 2.1,
                "activity_hours": 2.1,
                "total_grade": 175.0,
                "year_work_grade": 52.5,
                "practical_grade": 52.5,
                "theory_grade": 70.0,
                "exam_time_hours": 3.0,
                "is_bundle": True,
                "modules": [
                    {"department_name": "Anatomy", "credit_hours": 1.7, "theory_hours": 0.68, "practical_hours": 0.51, "activity_hours": 0.51, "year_work_grade": 12.75, "practical_grade": 12.75, "theory_grade": 17.0, "total_grade": 42.5},
                    {"department_name": "Histology", "credit_hours": 0.9, "theory_hours": 0.36, "practical_hours": 0.27, "activity_hours": 0.27, "year_work_grade": 6.75, "practical_grade": 6.75, "theory_grade": 9.0, "total_grade": 22.5},
                    {"department_name": "Physiology", "credit_hours": 0.7, "theory_hours": 0.28, "practical_hours": 0.21, "activity_hours": 0.21, "year_work_grade": 5.25, "practical_grade": 5.25, "theory_grade": 7.0, "total_grade": 17.5},
                    {"department_name": "Pathology", "credit_hours": 0.9, "theory_hours": 0.36, "practical_hours": 0.27, "activity_hours": 0.27, "year_work_grade": 6.75, "practical_grade": 6.75, "theory_grade": 9.0, "total_grade": 22.5},
                    {"department_name": "Pharmacology", "credit_hours": 0.9, "theory_hours": 0.36, "practical_hours": 0.27, "activity_hours": 0.27, "year_work_grade": 6.75, "practical_grade": 6.75, "theory_grade": 9.0, "total_grade": 22.5},
                    {"department_name": "Microbiology", "credit_hours": 0.6, "theory_hours": 0.24, "practical_hours": 0.18, "activity_hours": 0.18, "year_work_grade": 4.5, "practical_grade": 4.5, "theory_grade": 6.0, "total_grade": 15.0},
                    {"department_name": "Parasitology", "credit_hours": 1.3, "theory_hours": 0.52, "practical_hours": 0.39, "activity_hours": 0.39, "year_work_grade": 9.75, "practical_grade": 9.75, "theory_grade": 13.0, "total_grade": 32.5}
                ]
            },
            {
                "code": "MED 206",
                "name_ar": "CNS & Special Senses",
                "name_en": "CNS & Special Senses",
                "level": 2,
                "semester": "الفصل الدراسي الثاني",
                "credit_hours": 9.0,
                "theory_hours": 3.6,
                "practical_hours": 2.7,
                "activity_hours": 2.7,
                "total_grade": 225.0,
                "year_work_grade": 67.5,
                "practical_grade": 67.5,
                "theory_grade": 90.0,
                "exam_time_hours": 3.5,
                "is_bundle": True,
                "modules": [
                    {"department_name": "Anatomy", "credit_hours": 2.0, "theory_hours": 0.8, "practical_hours": 0.6, "activity_hours": 0.6, "year_work_grade": 15.0, "practical_grade": 15.0, "theory_grade": 20.0, "total_grade": 50.0},
                    {"department_name": "Histology", "credit_hours": 0.7, "theory_hours": 0.28, "practical_hours": 0.21, "activity_hours": 0.21, "year_work_grade": 5.25, "practical_grade": 5.25, "theory_grade": 7.0, "total_grade": 17.5},
                    {"department_name": "Physiology", "credit_hours": 3.6, "theory_hours": 1.44, "practical_hours": 1.08, "activity_hours": 1.08, "year_work_grade": 27.0, "practical_grade": 27.0, "theory_grade": 36.0, "total_grade": 90.0},
                    {"department_name": "Pathology", "credit_hours": 0.7, "theory_hours": 0.28, "practical_hours": 0.21, "activity_hours": 0.21, "year_work_grade": 5.25, "practical_grade": 5.25, "theory_grade": 7.0, "total_grade": 17.5},
                    {"department_name": "Pharmacology", "credit_hours": 1.3, "theory_hours": 0.52, "practical_hours": 0.39, "activity_hours": 0.39, "year_work_grade": 9.75, "practical_grade": 9.75, "theory_grade": 13.0, "total_grade": 32.5},
                    {"department_name": "Parasitology", "credit_hours": 0.7, "theory_hours": 0.28, "practical_hours": 0.21, "activity_hours": 0.21, "year_work_grade": 5.25, "practical_grade": 5.25, "theory_grade": 7.0, "total_grade": 17.5}
                ]
            },
            {
                "code": "MED 207",
                "name_ar": "Basic clinical skills II",
                "name_en": "Basic clinical skills II",
                "level": 2,
                "semester": "الفصل الدراسي الثاني",
                "credit_hours": 2.0,
                "theory_hours": 0.0,
                "practical_hours": 1.4,
                "activity_hours": 0.6,
                "total_grade": 50.0,
                "year_work_grade": 15.0,
                "practical_grade": 35.0,
                "theory_grade": 0.0,
                "exam_time_hours": 0.0,
                "is_bundle": False,
                "modules": []
            },
            {
                "code": "MED 208",
                "name_ar": "Basic life Support",
                "name_en": "Basic life Support",
                "level": 2,
                "semester": "الفصل الدراسي الثاني",
                "credit_hours": 1.0,
                "theory_hours": 0.4,
                "practical_hours": 0.3,
                "activity_hours": 0.3,
                "total_grade": 25.0,
                "year_work_grade": 7.5,
                "practical_grade": 7.5,
                "theory_grade": 10.0,
                "exam_time_hours": 1.0,
                "is_bundle": False,
                "modules": []
            },

            # =========================================================================
            # المستوى الثالث - الفصل الدراسي الخامس
            # =========================================================================
            {
                "code": "MED 301",
                "name_ar": "Genitourinary system",
                "name_en": "Genitourinary system",
                "level": 3,
                "semester": "الفصل الدراسي الأول",
                "credit_hours": 7.0,
                "theory_hours": 2.8,
                "practical_hours": 2.1,
                "activity_hours": 2.1,
                "total_grade": 175.0,
                "year_work_grade": 52.5,
                "practical_grade": 52.5,
                "theory_grade": 70.0,
                "exam_time_hours": 3.0,
                "is_bundle": True,
                "modules": [
                    {"department_name": "Anatomy", "credit_hours": 2.0, "theory_hours": 0.8, "practical_hours": 0.6, "activity_hours": 0.6, "year_work_grade": 15.0, "practical_grade": 15.0, "theory_grade": 20.0, "total_grade": 50.0},
                    {"department_name": "Histology", "credit_hours": 1.3, "theory_hours": 0.52, "practical_hours": 0.39, "activity_hours": 0.39, "year_work_grade": 9.75, "practical_grade": 9.75, "theory_grade": 13.0, "total_grade": 32.5},
                    {"department_name": "Physiology", "credit_hours": 1.7, "theory_hours": 0.68, "practical_hours": 0.51, "activity_hours": 0.51, "year_work_grade": 12.75, "practical_grade": 12.75, "theory_grade": 17.0, "total_grade": 42.5},
                    {"department_name": "Pathology", "credit_hours": 1.3, "theory_hours": 0.52, "practical_hours": 0.39, "activity_hours": 0.39, "year_work_grade": 9.75, "practical_grade": 9.75, "theory_grade": 13.0, "total_grade": 32.5},
                    {"department_name": "Microbiology", "credit_hours": 0.7, "theory_hours": 0.28, "practical_hours": 0.21, "activity_hours": 0.21, "year_work_grade": 5.25, "practical_grade": 5.25, "theory_grade": 7.0, "total_grade": 17.5}
                ]
            },
            {
                "code": "MED 302",
                "name_ar": "Endocrine system",
                "name_en": "Endocrine system",
                "level": 3,
                "semester": "الفصل الدراسي الأول",
                "credit_hours": 5.0,
                "theory_hours": 2.0,
                "practical_hours": 1.5,
                "activity_hours": 1.5,
                "total_grade": 125.0,
                "year_work_grade": 37.5,
                "practical_grade": 37.5,
                "theory_grade": 50.0,
                "exam_time_hours": 2.0,
                "is_bundle": True,
                "modules": [
                    {"department_name": "Histology", "credit_hours": 0.7, "theory_hours": 0.28, "practical_hours": 0.21, "activity_hours": 0.21, "year_work_grade": 5.25, "practical_grade": 5.25, "theory_grade": 7.0, "total_grade": 17.5},
                    {"department_name": "Physiology", "credit_hours": 1.5, "theory_hours": 0.6, "practical_hours": 0.45, "activity_hours": 0.45, "year_work_grade": 11.25, "practical_grade": 11.25, "theory_grade": 15.0, "total_grade": 37.5},
                    {"department_name": "Biochemistry", "credit_hours": 1.2, "theory_hours": 0.48, "practical_hours": 0.36, "activity_hours": 0.36, "year_work_grade": 9.0, "practical_grade": 9.0, "theory_grade": 12.0, "total_grade": 30.0},
                    {"department_name": "Pathology", "credit_hours": 0.7, "theory_hours": 0.28, "practical_hours": 0.21, "activity_hours": 0.21, "year_work_grade": 5.25, "practical_grade": 5.25, "theory_grade": 7.0, "total_grade": 17.5},
                    {"department_name": "Pharmacology", "credit_hours": 0.9, "theory_hours": 0.36, "practical_hours": 0.27, "activity_hours": 0.27, "year_work_grade": 6.75, "practical_grade": 6.75, "theory_grade": 9.0, "total_grade": 22.5}
                ]
            },
            {
                "code": "MED 303",
                "name_ar": "Community Medicine",
                "name_en": "Community Medicine",
                "level": 3,
                "semester": "الفصل الدراسي الأول",
                "credit_hours": 4.0,
                "theory_hours": 1.6,
                "practical_hours": 1.2,
                "activity_hours": 1.2,
                "total_grade": 100.0,
                "year_work_grade": 30.0,
                "practical_grade": 30.0,
                "theory_grade": 40.0,
                "exam_time_hours": 1.5,
                "is_bundle": False,
                "modules": []
            },
            {
                "code": "MED 304",
                "name_ar": "Basic clinical skills III",
                "name_en": "Basic clinical skills III",
                "level": 3,
                "semester": "الفصل الدراسي الأول",
                "credit_hours": 2.0,
                "theory_hours": 0.0,
                "practical_hours": 1.4,
                "activity_hours": 0.6,
                "total_grade": 50.0,
                "year_work_grade": 15.0,
                "practical_grade": 35.0,
                "theory_grade": 0.0,
                "exam_time_hours": 0.0,
                "is_bundle": False,
                "modules": []
            },

            # =========================================================================
            # المستوى الثالث - الفصل الدراسي السادس
            # =========================================================================
            {
                "code": "MED 306",
                "name_ar": "Forensic Medicine and Clinical Toxicology",
                "name_en": "Forensic Medicine and Clinical Toxicology",
                "level": 3,
                "semester": "الفصل الدراسي الثاني",
                "credit_hours": 5.0,
                "theory_hours": 2.0,
                "practical_hours": 1.5,
                "activity_hours": 1.5,
                "total_grade": 150.0,
                "year_work_grade": 45.0,
                "practical_grade": 45.0,
                "theory_grade": 60.0,
                "exam_time_hours": 2.0,
                "is_bundle": False,
                "modules": []
            },
            {
                "code": "MED 307",
                "name_ar": "ENT (Otorhinolaryngology)",
                "name_en": "Otorhinolaryngology",
                "level": 3,
                "semester": "الفصل الدراسي الثاني",
                "credit_hours": 5.0,
                "theory_hours": 2.0,
                "practical_hours": 1.5,
                "activity_hours": 1.5,
                "total_grade": 150.0,
                "year_work_grade": 45.0,
                "practical_grade": 45.0,
                "theory_grade": 60.0,
                "exam_time_hours": 2.0,
                "is_bundle": False,
                "modules": []
            },
            {
                "code": "MED 308",
                "name_ar": "Ophthalmology",
                "name_en": "Ophthalmology",
                "level": 3,
                "semester": "الفصل الدراسي الثاني",
                "credit_hours": 6.0,
                "theory_hours": 2.4,
                "practical_hours": 1.8,
                "activity_hours": 1.8,
                "total_grade": 180.0,
                "year_work_grade": 54.0,
                "practical_grade": 54.0,
                "theory_grade": 72.0,
                "exam_time_hours": 2.5,
                "is_bundle": False,
                "modules": []
            },
            {
                "code": "MED 309",
                "name_ar": "Evidence Based Medicine, Research and Biostatistics",
                "name_en": "Evidence Based Medicine, Research and Biostatistics",
                "level": 3,
                "semester": "الفصل الدراسي الثاني",
                "credit_hours": 2.0,
                "theory_hours": 1.4,
                "practical_hours": 0.0,
                "activity_hours": 0.6,
                "total_grade": 60.0,
                "year_work_grade": 15.0,
                "practical_grade": 0.0,
                "theory_grade": 35.0,
                "exam_time_hours": 1.0,
                "is_bundle": False,
                "modules": []
            }
        ]
        
        # Clear existing courses for this medicine program first to avoid duplicate conflicts
        existing_cids = [c.id for c in db.query(models.Course).filter(models.Course.program_id == prog.id).all()]
        if existing_cids:
            db.query(models.CourseModule).filter(models.CourseModule.course_id.in_(existing_cids)).delete(synchronize_session=False)
            db.query(models.Course).filter(models.Course.id.in_(existing_cids)).delete(synchronize_session=False)
            db.commit()
            print("Cleared existing courses for Medicine program.")
            
        # Add new courses with breakdown modules
        for cdata in medicine_courses_data:
            mods = cdata.pop("modules", [])
            c_obj = models.Course(
                faculty_id=fac.id,
                program_id=prog.id,
                year="2026/2027",
                **cdata
            )
            db.add(c_obj)
            db.flush()
            
            if c_obj.is_bundle and mods:
                for mdata in mods:
                    m_obj = models.CourseModule(
                        course_id=c_obj.id,
                        **mdata
                    )
                    db.add(m_obj)
                    
        db.commit()
        print(f"Successfully seeded {len(medicine_courses_data)} courses with full sub-department breakdown modules for Medicine & Surgery Faculty!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding medicine courses: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_medicine_courses()
