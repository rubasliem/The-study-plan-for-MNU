import os

file_path = r'frontend/src/pages/CoursesPage.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find start of section 2
start_idx = -1
for i, line in enumerate(lines):
    if '{/* القسم الثاني: خصائص المقرر والتسجيل */}' in line:
        start_idx = i
        break

# Find end of the form (the footer buttons)
end_idx = -1
for i in range(start_idx, len(lines)):
    if '<div className="mt-4 d-flex justify-content-end gap-2">' in line:
        end_idx = i
        break

medicine_form = """              {isMedicine && (
                <div className="card mb-3 p-3 border-0 bg-light shadow-sm" style={{ borderRadius: '10px' }}>
                  <h6 className="fw-bold mb-3 border-bottom pb-2 text-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="bi bi-heart-pulse-fill"></i> خصائص مقرر الطب
                  </h6>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="small fw-bold">عدد الأسابيع</label>
                      <div className="d-flex align-items-center gap-3">
                        <Form.Check
                          type="radio"
                          id="duration-number"
                          label="رقم"
                          name="durationMode"
                          checked={durationMode === 'رقم'}
                          onChange={() => setDurationMode('رقم')}
                          disabled={modalMode === 'view'}
                        />
                        <Form.Check
                          type="radio"
                          id="duration-long"
                          label="مقرر طولي"
                          name="durationMode"
                          checked={durationMode === 'مقرر طولي'}
                          onChange={() => {
                            setDurationMode('مقرر طولي');
                            setDurationWeeks('');
                          }}
                          disabled={modalMode === 'view'}
                        />
                      </div>
                    </div>
                    {durationMode === 'رقم' && (
                      <div className="col-md-4">
                        <label className="small fw-bold">الرقم</label>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          placeholder="عدد الأسابيع"
                          value={durationWeeks}
                          onChange={(e) => setDurationWeeks(e.target.value)}
                          disabled={modalMode === 'view'}
                        />
                      </div>
                    )}
                    <div className="col-md-4">
                      <label className="small fw-bold">زمن الامتحان النهائي</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="مثال: 2.5 أو Practical"
                        value={formData.exam_time_hours || ""}
                        onChange={(e) => setFormData({ ...formData, exam_time_hours: e.target.value })}
                        disabled={modalMode === 'view'}
                      />
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-12">
                      <label className="small fw-bold">الأقسام العلمية (Multiple Selection)</label>
                      <Select
                        isMulti
                        options={medDepartmentOptions}
                        value={medDepartments.map(d => ({ value: d.department_name, label: d.department_name }))}
                        onChange={(selected) => {
                          const newDepts = [];
                          selected.forEach(s => {
                            if (s.value === 'other') {
                              // Handled below
                            } else {
                              const existing = medDepartments.find(m => m.department_name === s.value);
                              if (existing) newDepts.push(existing);
                              else newDepts.push({
                                department_name: s.value,
                                theory_credit: 0, practical_credit: 0, activity_credit: 0,
                                theory_grade: 0, practical_grade: 0, year_work_grade: 0
                              });
                            }
                          });
                          // keep custom ones that are not 'other' but not in options
                          medDepartments.forEach(m => {
                            if (!medDepartmentOptions.find(o => o.value === m.department_name)) {
                              newDepts.push(m);
                            }
                          });
                          setMedDepartments(newDepts);
                        }}
                        isDisabled={modalMode === 'view'}
                        placeholder="اختر الأقسام العلمية..."
                        styles={{ menu: provided => ({ ...provided, zIndex: 9999 }) }}
                      />
                    </div>
                  </div>
                  <div className="row mb-3">
                     <div className="col-md-6 d-flex align-items-end gap-2">
                        <div className="flex-grow-1">
                          <label className="small fw-bold">إضافة قسم غير موجود (Other)</label>
                          <input 
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="اسم القسم الجديد"
                            value={customMedDept}
                            onChange={e => setCustomMedDept(e.target.value)}
                            disabled={modalMode === 'view'}
                          />
                        </div>
                        <Button 
                          variant="success" 
                          size="sm" 
                          disabled={!customMedDept || modalMode === 'view'}
                          onClick={() => {
                            if (customMedDept && !medDepartments.find(m => m.department_name === customMedDept)) {
                               setMedDepartments([...medDepartments, {
                                 department_name: customMedDept,
                                 theory_credit: 0, practical_credit: 0, activity_credit: 0,
                                 theory_grade: 0, practical_grade: 0, year_work_grade: 0
                               }]);
                               setCustomMedDept('');
                            }
                          }}
                        >
                          إضافة
                        </Button>
                     </div>
                  </div>

                  {medDepartments.length > 0 && (
                  <div className="table-responsive">
                    <table className="table table-bordered table-sm text-center align-middle" style={{ fontSize: '12px' }}>
                      <thead className="table-success">
                        <tr>
                          <th rowSpan="2">القسم العلمي</th>
                          <th colSpan="3">الساعات المعتمدة</th>
                          <th colSpan="3">الساعات التدريسية (تلقائي)</th>
                          <th colSpan="3">توزيع الدرجات</th>
                          <th rowSpan="2">إجمالي الدرجة</th>
                          {modalMode !== 'view' && <th rowSpan="2">حذف</th>}
                        </tr>
                        <tr>
                          <th>نظري</th><th>عملي</th><th>أنشطة</th>
                          <th>نظري</th><th>عملي</th><th>أنشطة</th>
                          <th>نظري</th><th>عملي</th><th>أعمال سنة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {medDepartments.map((dept, idx) => {
                          const tc = parseFloat(dept.theory_credit) || 0;
                          const pc = parseFloat(dept.practical_credit) || 0;
                          const ac = parseFloat(dept.activity_credit) || 0;
                          const tg = parseFloat(dept.theory_grade) || 0;
                          const pg = parseFloat(dept.practical_grade) || 0;
                          const yg = parseFloat(dept.year_work_grade) || 0;
                          const totalG = tg + pg + yg;
                          
                          const updateDept = (field, val) => {
                             const newDepts = [...medDepartments];
                             newDepts[idx][field] = val;
                             setMedDepartments(newDepts);
                          };
                          
                          return (
                            <tr key={idx}>
                              <td className="fw-bold">{dept.department_name}</td>
                              <td><input type="number" step="0.5" className="form-control form-control-sm" value={dept.theory_credit} onChange={e => updateDept('theory_credit', e.target.value)} disabled={modalMode==='view'}/></td>
                              <td><input type="number" step="0.5" className="form-control form-control-sm" value={dept.practical_credit} onChange={e => updateDept('practical_credit', e.target.value)} disabled={modalMode==='view'}/></td>
                              <td><input type="number" step="0.5" className="form-control form-control-sm" value={dept.activity_credit} onChange={e => updateDept('activity_credit', e.target.value)} disabled={modalMode==='view'}/></td>
                              
                              <td className="bg-light">{tc * 15}</td>
                              <td className="bg-light">{pc * 30}</td>
                              <td className="bg-light">{ac * 60}</td>
                              
                              <td><input type="number" step="1" className="form-control form-control-sm" value={dept.theory_grade} onChange={e => updateDept('theory_grade', e.target.value)} disabled={modalMode==='view'}/></td>
                              <td><input type="number" step="1" className="form-control form-control-sm" value={dept.practical_grade} onChange={e => updateDept('practical_grade', e.target.value)} disabled={modalMode==='view'}/></td>
                              <td><input type="number" step="1" className="form-control form-control-sm" value={dept.year_work_grade} onChange={e => updateDept('year_work_grade', e.target.value)} disabled={modalMode==='view'}/></td>
                              
                              <td className="bg-light fw-bold text-success">{totalG}</td>
                              {modalMode !== 'view' && (
                                <td>
                                  <Button variant="danger" size="sm" className="p-0 px-1" onClick={() => {
                                      setMedDepartments(medDepartments.filter((_, i) => i !== idx));
                                  }}><i className="bi bi-trash"></i></Button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="4" className="text-start fw-bold">إجمالي الساعات المعتمدة للمقرر:</td>
                          <td colSpan="3" className="fw-bold text-success" style={{ fontSize: '14px' }}>
                            {medDepartments.reduce((sum, d) => sum + (parseFloat(d.theory_credit)||0) + (parseFloat(d.practical_credit)||0) + (parseFloat(d.activity_credit)||0), 0)}
                          </td>
                          <td colSpan="5"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  )}
                </div>
              )}
"""

lines.insert(start_idx, medicine_form)

# Re-find the indices after insertion
start_idx_2 = -1
for i, line in enumerate(lines):
    if '{/* القسم الثاني: خصائص المقرر والتسجيل */}' in line:
        start_idx_2 = i
        break

end_idx_2 = -1
for i in range(start_idx_2, len(lines)):
    if '<div className="mt-4 d-flex justify-content-end gap-2">' in lines[i]:
        end_idx_2 = i
        break

lines.insert(start_idx_2, "              {!isMedicine && (\n              <>\n")
lines.insert(end_idx_2 + 1, "              </>\n              )}\n")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Modified UI successfully!")
