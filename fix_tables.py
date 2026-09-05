import re

with open("frontend/src/pages/ControlPanelPage.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Find the start of the card
start_idx = content.find('<Card className="shadow-sm border-0 mt-4" style={{ width: \'100%\' }}>')

# Find the end of the card
end_idx = content.find('</Card>', start_idx) + len('</Card>')

new_card = """<Card className="shadow-sm border-0 mt-4" style={{ width: '100%' }}>
                <Card.Body className="p-0">
                    <style>
                        {`
                        .sticky-col-1 { position: sticky; right: 0; z-index: 2; background-color: inherit; width: 180px; min-width: 180px; border-left: 2px solid #dee2e6; }
                        .sticky-col-2 { position: sticky; right: 180px; z-index: 2; background-color: inherit; width: 340px; min-width: 340px; border-left: 2px solid #dee2e6; }
                        thead .sticky-col-1, thead .sticky-col-2 { background-color: var(--primary) !important; color: white; z-index: 3; }
                        /* Ensure sticky columns have opaque backgrounds over stripes */
                        tbody .sticky-col-1, tbody .sticky-col-2 { background-color: #fff; }
                        .table-striped > tbody > tr:nth-of-type(odd) > .sticky-col-1,
                        .table-striped > tbody > tr:nth-of-type(odd) > .sticky-col-2 {
                            background-color: var(--bs-table-striped-bg, rgba(0, 0, 0, 0.05));
                        }
                        .table-hover > tbody > tr:hover > .sticky-col-1,
                        .table-hover > tbody > tr:hover > .sticky-col-2 {
                            background-color: var(--bs-table-hover-bg, rgba(0, 0, 0, 0.075));
                        }
                        `}
                    </style>
                    <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', margin: 0 }}>
                        <Table striped bordered hover className="mb-0" style={{ width: 'max-content', minWidth: '100%' }}>
                            <thead className="bg-light">
                                <tr style={{ borderBottom: '2.5px solid var(--secondary)', whiteSpace: 'nowrap', height: '80px' }}>
                                    <th className="sticky-col-1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' }}>اسم المستخدم</th>
                                    <th className="sticky-col-2" style={{ overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' }}>الكلية</th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>جدول الأساتذة</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(الخطة الدراسية)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>بيانات الأساتذة</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(الجدول الرئيسي)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>مراجعة أولى</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(الخطة الدراسية)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>مراجعة ثانية</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(الخطة الدراسية)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>إعتماد الخطة</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(الخطة الدراسية)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>الحذف</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(هيئة التدريس)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>الرؤية</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(هيئة التدريس)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>الطباعة</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(هيئة التدريس)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>الاستيراد</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(هيئة التدريس)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>استرجاع المحذوف</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(المحذوفات)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>الحذف النهائي</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(المحذوفات)</small>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id} style={{ height: '70px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                        <td className="fw-bold text-center sticky-col-1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' }}>
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.username.split('@')[0]}</div>
                                            {u.role === 'student_affairs' && (
                                                <div className="mt-1">
                                                    <span className="badge bg-warning text-dark" style={{ fontSize: '11px', padding: '4px 8px' }}>
                                                        مدير شؤون الطلاب
                                                    </span>
                                                </div>
                                            )}
                                            {u.role === 'reviewer' && (
                                                <div className="mt-1">
                                                    <span className="badge bg-purple text-white" style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#8b5cf6' }}>
                                                        المراجع
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="sticky-col-2" style={{ verticalAlign: 'middle', whiteSpace: 'normal', padding: '10px' }}>
                                            <div className="fw-bold" style={{ color: 'var(--primary-hover)', lineHeight: '1.5' }}>
                                                {u.role === 'student_affairs' ? "جميع الكليات" : 
                                                 u.role === 'reviewer' ? (
                                                     u.assigned_faculties && u.assigned_faculties.length > 0 ? (
                                                         <div className="d-flex flex-wrap gap-2 justify-content-center align-items-center w-100">
                                                             {u.assigned_faculties.map(f => {
                                                                 const isLong = f.name.length > 22;
                                                                 return (
                                                                     <div 
                                                                         key={f.id} 
                                                                         className="text-center fw-semibold"
                                                                         style={{ 
                                                                             fontSize: '12.5px', 
                                                                             flex: isLong ? '1 1 100%' : '0 1 calc(50% - 0.5rem)',
                                                                             padding: '2px 4px',
                                                                             color: 'var(--primary-hover)'
                                                                         }}
                                                                     >
                                                                         - {f.name}
                                                                     </div>
                                                                 );
                                                             })}
                                                         </div>
                                                     ) : "لا يوجد"
                                                 ) : getFacultyName(u.faculty_id)}
                                            </div>
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_view_prof_study_plan}
                                                onChange={() => handleTogglePermission(u.id, 'perm_view_prof_study_plan', u.perm_view_prof_study_plan)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_view_prof_data_btn}
                                                onChange={() => handleTogglePermission(u.id, 'perm_view_prof_data_btn', u.perm_view_prof_data_btn)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_review_1}
                                                onChange={() => handleTogglePermission(u.id, 'perm_review_1', u.perm_review_1)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_review_2}
                                                onChange={() => handleTogglePermission(u.id, 'perm_review_2', u.perm_review_2)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_approve_plan}
                                                onChange={() => handleTogglePermission(u.id, 'perm_approve_plan', u.perm_approve_plan)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_view_prof_delete_btn}
                                                onChange={() => handleTogglePermission(u.id, 'perm_view_prof_delete_btn', u.perm_view_prof_delete_btn)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_view_prof_view_btn}
                                                onChange={() => handleTogglePermission(u.id, 'perm_view_prof_view_btn', u.perm_view_prof_view_btn)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_view_prof_print_btn}
                                                onChange={() => handleTogglePermission(u.id, 'perm_view_prof_print_btn', u.perm_view_prof_print_btn)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_view_prof_import_btn}
                                                onChange={() => handleTogglePermission(u.id, 'perm_view_prof_import_btn', u.perm_view_prof_import_btn)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_recycle_restore_btn}
                                                onChange={() => handleTogglePermission(u.id, 'perm_recycle_restore_btn', u.perm_recycle_restore_btn)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_recycle_delete_btn}
                                                onChange={() => handleTogglePermission(u.id, 'perm_recycle_delete_btn', u.perm_recycle_delete_btn)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr style={{ height: '100px' }}>
                                        <td colSpan="13" className="text-muted text-center" style={{ verticalAlign: 'middle' }}>
                                            لا يوجد مسؤولي كليات حالياً.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>"""

new_content = content[:start_idx] + new_card + content[end_idx:]

with open("frontend/src/pages/ControlPanelPage.jsx", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Done")
