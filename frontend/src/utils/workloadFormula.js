/**
 * Utility functions and constants for Workload dynamic formulas
 */

export const HOUR_VARIABLES = [
  { token: '[ساعات النظري]', label: 'ساعات النظري', desc: 'إجمالي الساعات النظرية للمقررات المسندة', icon: '📖' },
  { token: '[ساعات العملي]', label: 'ساعات العملي', desc: 'إجمالي ساعات المعامل والعملي', icon: '🧪' },
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
  { label: '6', token: '6' },
  { label: '8', token: '8' }
];

export const DEFAULT_FACULTY_FORMULA = '[ساعات النظري] + ([مجموع غير النظري] / 2) <= 6 * [أيام الانتداب]';
export const DEFAULT_ASSISTANT_FORMULA = '[مجموع غير النظري] <= 8 * [أيام الانتداب]';

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
    workDays = 1,
    totalHours = 0,
    isTA = false
  } = context;

  let f = (formulaStr || '').trim();
  if (!f) {
    f = isTA ? DEFAULT_ASSISTANT_FORMULA : DEFAULT_FACULTY_FORMULA;
  }

  const replaceTokens = (str) => {
    return str
      .replace(/\[ساعات النظري\]/g, String(totalTheory))
      .replace(/\[ساعات العملي\]/g, String(totalPractical))
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
