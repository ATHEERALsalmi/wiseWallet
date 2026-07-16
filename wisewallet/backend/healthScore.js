// healthScore.js — حساب مؤشر الصحة المالية (Financial Health Score) بناءً على نسبة الادخار والتحكم بالإنفاق

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeHealthScore(transactions) {
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  if (income === 0) {
    return {
      score: 0,
      label: 'غير كافٍ للتقييم',
      savingsRate: 0,
      totalIncome: 0,
      totalExpenses: expenses,
      details: 'أدخل دخلك الشهري أولًا لحساب مؤشر الصحة المالية بدقة.',
    };
  }

  const savingsRate = (income - expenses) / income; // قد تكون سالبة إن تجاوزت المصاريف الدخل
  const expenseRatio = expenses / income;

  // 60 نقطة كحد أقصى من نسبة الادخار
  const savingsScore = clamp(savingsRate * 100, -20, 100) * 0.6;

  // 40 نقطة كحد أقصى من التحكم بالإنفاق (كلما قلّت نسبة الإنفاق من الدخل زادت النقاط)
  let controlScore;
  if (expenseRatio <= 0.5) controlScore = 40;
  else if (expenseRatio >= 1.2) controlScore = 0;
  else controlScore = 40 * (1.2 - expenseRatio) / 0.7;

  const rawScore = savingsScore + controlScore;
  const score = Math.round(clamp(rawScore, 0, 100));

  let label;
  if (score >= 80) label = 'ممتازة';
  else if (score >= 60) label = 'جيدة';
  else if (score >= 40) label = 'متوسطة';
  else label = 'تحتاج إلى تحسين';

  return {
    score,
    label,
    savingsRate: Math.round(savingsRate * 100),
    totalIncome: income,
    totalExpenses: expenses,
    details: `دخلك الشهري ${income} ريال، ومصاريفك ${expenses} ريال، بنسبة ادخار ${Math.round(savingsRate * 100)}%.`,
  };
}

module.exports = { computeHealthScore };
