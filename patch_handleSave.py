import os

file_path = r'frontend/src/pages/CoursesPage.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
for i, line in enumerate(lines):
    if 'const handleSave = async () => {' in line:
        start_idx = i
        break

payload_idx = -1
for i in range(start_idx, len(lines)):
    if 'const payload = {' in lines[i]:
        payload_idx = i
        break

end_payload_idx = -1
for i in range(payload_idx, len(lines)):
    if '};' in lines[i] and 'level: parseInt(formData.level)' in lines[i-1]:
        end_payload_idx = i
        break

medicine_logic = """
      const selectedFacultyName = faculties.find(f => String(f.id) === String(formData.faculty_id))?.name;
      const isMedicine = selectedFacultyName === "كلية الطب والجراحة";

      let payload = {};
      if (isMedicine) {
        const totalCred = medDepartments.reduce((sum, d) => sum + (parseFloat(d.theory_credit)||0) + (parseFloat(d.practical_credit)||0) + (parseFloat(d.activity_credit)||0), 0);
        payload = {
          code: formData.code,
          name_ar: formData.name_ar,
          name_en: formData.name_en,
          faculty_id: parseInt(formData.faculty_id),
          program_id: parseInt(formData.program_id) || 0,
          level: parseInt(formData.level) || 0,
          semester: formData.semester,
          year: formData.year,
          course_type: formData.course_type,
          duration: durationMode === 'رقم' ? durationWeeks : durationMode,
          exam_time_hours: String(formData.exam_time_hours || ""),
          credit_hours: totalCred,
          is_bundle: true,
          modules: medDepartments.map(m => ({
            department_name: m.department_name,
            theory_credit: parseFloat(m.theory_credit) || 0,
            practical_credit: parseFloat(m.practical_credit) || 0,
            activity_credit: parseFloat(m.activity_credit) || 0,
            theory_hours: (parseFloat(m.theory_credit) || 0) * 15,
            practical_hours: (parseFloat(m.practical_credit) || 0) * 30,
            activity_hours: (parseFloat(m.activity_credit) || 0) * 60,
            theory_grade: parseFloat(m.theory_grade) || 0,
            practical_grade: parseFloat(m.practical_grade) || 0,
            year_work_grade: parseFloat(m.year_work_grade) || 0,
            total_grade: (parseFloat(m.theory_grade)||0) + (parseFloat(m.practical_grade)||0) + (parseFloat(m.year_work_grade)||0)
          }))
        };
      } else {
        payload = {
          ...formData,
          theory_hours: parseFloat(formData.theory_hours) || 0.0,
          practical_hours: parseFloat(formData.practical_hours) || 0.0,
          exercise_hours: parseFloat(formData.exercise_hours) || 0.0,
          activity_hours: parseFloat(formData.activity_hours) || 0.0,
          total_grade: parseFloat(formData.total_grade) || 0.0,
          theory_grade: parseFloat(formData.theory_grade) || 0.0,
          practical_grade: parseFloat(formData.practical_grade) || 0.0,
          year_work_grade: parseFloat(formData.year_work_grade) || 0.0,
          exam_time_hours: String(formData.exam_time_hours || ""),
          credit_hours: parseFloat(formData.credit_hours) || 0.0,
          faculty_id: parseInt(formData.faculty_id),
          program_id: parseInt(formData.program_id),
          level: parseInt(formData.level),
          is_bundle: false
        };
      }
"""

lines = lines[:payload_idx] + [medicine_logic] + lines[end_payload_idx+1:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Patched handleSave successfully")
