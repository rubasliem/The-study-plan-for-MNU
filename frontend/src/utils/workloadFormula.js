/**
 * Utility functions and constants for Workload dynamic formulas
 */

export const HOUR_VARIABLES = [
  { token: '[ساعات النظري]', label: 'ساعات النظري', desc: 'إجمالي الساعات النظرية للمقررات المسندة', icon: '📖' },
  { token: '[ساعات العملي]', label: 'ساعات العملي', desc: 'إجمالي ساعات العملي', icon: '🧪' },
  { token: '[ساعات المعملي]', label: 'ساعات المعملي', desc: 'إجمالي الساعات المعملية (المعملي - كلية التمريض)', icon: '🧫' },
  { token: '[مجموع العملي والمعملي]', label: 'مجموع العملي والمعملي', desc: 'مجموع (العملي + المعملي)', icon: '➕' },
  { token: '[ساعات التوتوريال]', label: 'ساعات التوتوريال', desc: 'إجمالي ساعات التمارين والمناقشات', icon: '✏️' },
  { token: '[ساعات الحقل]', label: 'ساعات الحقل', desc: 'إجمالي ساعات التدريب الميداني والسريري', icon: '🏥' },
  { token: '[مجموع غير النظري]', label: 'مجموع غير النظري', desc: 'مجموع (العملي + التوتوريال + الحقل)', icon: '🔬' },
  { token: '[أيام الانتداب]', label: 'أيام الانتداب', desc: 'عدد أيام الانتداب الفعلي (كلي = 5، جزئي = 1 أو 2 أو 3)', icon: '📅' },
  { token: '[إجمالي الساعات]', label: 'إجمالي الساعات', desc: 'مجموع كافة ساعات المقررات بدون استثناء', icon: '∑' }
];

export const MATH_OPERATORS = [
  { label: '+', token: ' + ' },
  { label: '-', token: ' - ' },
  { label: '×', token: ' * ' },
  { label: '÷', token: ' / ' },
  { label: '(', token: '(' },
  { label: ')', token: ')' },
  { label: '≤', token: ' <= ' },
  { label: '0.5', token: '0.5' },
  { label: '2', token: '2' },
  { label: '4', token: '4' },
  { label: '6', token: '6' },
  { label: '8', token: '8' }
];

export const DEFAULT_FACULTY_FORMULA = '[ساعات النظري] + ([مجموع غير النظري] / 2) <= 6 * [أيام الانتداب]';
export const DEFAULT_ASSISTANT_FORMULA = '[مجموع غير النظري] <= 8 * [أيام الانتداب]';

export const ACADEMIC_ROLE_OPTIONS = [
  { value: 'أستاذ', label: 'أستاذ (أ.د)' },
  { value: 'أستاذ مساعد', label: 'أستاذ مساعد (أ.م.د / أ.م)' },
  { value: 'مدرس', label: 'مدرس (د)' },
  { value: 'مدرس مساعد', label: 'مدرس مساعد (م.م)' },
  { value: 'معيد', label: 'معيد (م.ع)' },
  { value: 'محاضر', label: 'محاضر' },
  { value: 'أخصائي', label: 'أخصائي' }
];

export const FACULTY_ROLE_OPTIONS = ACADEMIC_ROLE_OPTIONS;

export const DEFAULT_FACULTY_ROLES = ['أستاذ', 'أستاذ مساعد', 'مدرس'];
export const DEFAULT_ASSISTANT_ROLES = ['مدرس مساعد', 'معيد'];

/**
 * Checks if a professor's job title matches any of the allowed academic roles.
 * Supports abbreviations (أ.د, أ.م.د, أ.م, د, م.م, م.ع, معيد) and full titles.
 */
export const matchesAcademicRole = (jobTitleStr, allowedRoles = []) => {
  if (!jobTitleStr || !allowedRoles || allowedRoles.length === 0) return false;
  const str = String(jobTitleStr).trim();
  return allowedRoles.some(role => {
    const r = role.trim();
    if (!r) return false;
    if (r === 'أستاذ') {
      return str.includes('أستاذ') || str.includes('أ.د') || str === 'أستاذ';
    }
    if (r === 'أستاذ مساعد') {
      return str.includes('أستاذ مساعد') || str.includes('أ.م.د') || str.includes('أ.م') || str === 'أستاذ مساعد';
    }
    if (r === 'مدرس') {
      return (str.includes('مدرس') && !str.includes('مساعد')) || str === 'د' || str.includes('د.') || str.startsWith('د/') || str === 'مدرس';
    }
    if (r === 'مدرس مساعد') {
      return str.includes('مدرس مساعد') || str.includes('م.م');
    }
    if (r === 'معيد') {
      return str.includes('معيد') || str.includes('م.ع');
    }
    return str.includes(r);
  });
};


/**
 * Safely evaluates a simple arithmetic expression containing numbers and basic operators.
 * @param {string} expr 
 * @returns {number}
 */
export const evaluateExpression = (expr) => {
  if (!expr || typeof expr !== 'string') return 0;
  
  // Normalize Arabic and alternative math symbols
  let clean = expr
    .replace(/÷/g, '/')
    .replace(/×/g, '*')
    .replace(/−/g, '-')
    .replace(/،/g, '.')
    .replace(/\s+/g, '');

  if (!clean) return 0;

  // Validate allowed characters: digits, operators, parentheses, dot
  if (!/^[0-9+\-*/().]+$/.test(clean)) {
    return 0;
  }

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${clean});`);
    const val = fn();
    return typeof val === 'number' && !isNaN(val) && isFinite(val) ? val : 0;
  } catch (e) {
    return 0;
  }
};

/**
 * Evaluates a custom workload formula against professor context.
 * 
 * @param {string} formulaStr 
 * @param {object} context 
 * @returns {{
 *   rawFormula: string,
 *   calculatedLoad: number,
 *   maxAllowed: number,
 *   hasViolation: boolean,
 *   lhsExpression: string,
 *   rhsExpression: string
 * }}
 */
export const evaluateWorkloadFormula = (formulaStr, context = {}) => {
  const {
    totalTheory = 0,
    totalPractical = 0,
    totalExercise = 0,
    totalActivity = 0,
    totalNonTheory = 0,
    totalLab = totalExercise,
    totalPracticalAndLab = (totalPractical + (context.totalLab !== undefined ? context.totalLab : totalExercise)),
    workDays = 1,
    totalHours = 0,
    isTA = false
  } = context;

  let f = (formulaStr || '').trim();
  if (!f) {
    f = isTA ? DEFAULT_ASSISTANT_FORMULA : DEFAULT_FACULTY_FORMULA;
  }

  const replaceTokens = (str) => {
    const labHours = context.totalLab !== undefined ? context.totalLab : totalExercise;
    const practicalAndLab = context.totalPracticalAndLab !== undefined 
      ? context.totalPracticalAndLab 
      : (totalPractical + labHours);

    return str
      .replace(/\[ساعات النظري\]/g, String(totalTheory))
      .replace(/\[ساعات العملي\]/g, String(totalPractical))
      .replace(/\[ساعات (المعملي|المعمل)\]/g, String(labHours))
      .replace(/\[مجموع العملي\s*و\s*المعملي\]/g, String(practicalAndLab))
      .replace(/\[مجموع العملي والمعملي\]/g, String(practicalAndLab))
      .replace(/\[ساعات التوتوريال\]/g, String(totalExercise))
      .replace(/\[ساعات الحقل\]/g, String(totalActivity))
      .replace(/\[مجموع غير النظري\]/g, String(totalNonTheory))
      .replace(/\[(عدد )?أيام الانتداب\]/g, String(workDays))
      .replace(/\[إجمالي الساعات\]/g, String(totalHours || (totalTheory + totalNonTheory)));
  };

  let lhs = '';
  let rhs = '';
  let comp = '<=';

  if (f.includes('<=')) {
    [lhs, rhs] = f.split('<=');
    comp = '<=';
  } else if (f.includes('≤')) {
    [lhs, rhs] = f.split('≤');
    comp = '<=';
  } else if (f.includes('<')) {
    [lhs, rhs] = f.split('<');
    comp = '<';
  } else {
    // If no comparison operator was provided, default to evaluating LHS with default daily limit
    lhs = f;
    rhs = isTA ? `8 * ${workDays}` : `6 * ${workDays}`;
  }

  const replacedLhs = replaceTokens(lhs);
  const replacedRhs = replaceTokens(rhs);

  const lhsVal = Number(evaluateExpression(replacedLhs).toFixed(2));
  const rhsVal = Number(evaluateExpression(replacedRhs).toFixed(2));

  let hasViolation = false;
  if (comp === '<=') {
    hasViolation = lhsVal > rhsVal;
  } else if (comp === '<') {
    hasViolation = lhsVal >= rhsVal;
  }

  return {
    rawFormula: f,
    calculatedLoad: lhsVal,
    maxAllowed: rhsVal,
    hasViolation,
    lhsExpression: replacedLhs,
    rhsExpression: replacedRhs
  };
};
