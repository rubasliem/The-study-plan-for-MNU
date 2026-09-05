import io
import pandas as pd

def clean_col(c):
    val = str(c).strip().replace(" ", "").replace("_", "").lower()
    val = val.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ى", "ي").replace("ة", "ه")
    return val

def test_columns():
    df = pd.DataFrame(columns=[
        "كود المقرر",
        "المقرر / الحزمة الدراسية (عربي)",
        "المقرر / الحزمة الدراسية (إنجليزي)",
        "الأقسام العلمية",
        "أقسام أخرى (إن وجدت)",
        "الساعات المعتمدة للأقسام",
        "توزيع الساعات المعتمدة", "Unnamed: 7", "Unnamed: 8",
        "توزيع الساعات التدريسية", "Unnamed: 10", "Unnamed: 11",
        "توزيع الدرجات", "Unnamed: 13", "Unnamed: 14",
        "الدرجات للأقسام العلمية",
        "الدرجة الكاملة للمقرر",
        "الساعات المعتمدة للمقرر",
        "عدد الأسابيع",
        "زمن الامتحان النهائي",
        "المستوى",
        "الفصل الدراسي"
    ])
    
    columns_cleaned = {clean_col(col): col for col in df.columns}
    
    def get_col_name(candidates):
        for c in candidates:
            cleaned_cand = clean_col(c)
            if cleaned_cand in columns_cleaned:
                return columns_cleaned[cleaned_cand]
            for col_key, original_col in columns_cleaned.items():
                if cleaned_cand in col_key or col_key in cleaned_cand:
                    return original_col
        return None

    col_code = get_col_name(["كود المقرر", "كود", "code"])
    col_name_ar = get_col_name(["اسم المقرر بالعربية", "اسم المقرر بالعربي", "اسم المقرر عربي", "الاسم بالعربية", "عربي", "ar", "name_ar"])
    col_name_en = get_col_name(["اسم المقرر بالإنجليزية", "اسم المقرر بالإنجليزي", "اسم المقرر انجليزي", "الاسم بالإنجليزية", "انجليزي", "en", "name_en"])
    col_department = get_col_name(["الأقسام العلمية", "القسم العلمي", "department"])
    
    print("Code:", col_code)
    print("Name AR:", col_name_ar)
    print("Name EN:", col_name_en)
    print("Dept:", col_department)

test_columns()
