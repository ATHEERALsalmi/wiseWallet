// advisor.js — المستشار المالي: توصيات مبنية على قواعد (نموذج أولي، قابل للاستبدال بنموذج لغوي لاحقًا)
const { computeHealthScore } = require('./healthScore');

function generateAdvice(transactions) {
  const tips = [];

  if (transactions.length === 0) {
    return [
      'ابدأ بإضافة دخلك الشهري ومصاريفك حتى نتمكن من بناء تحليل مالي دقيق لك.',
    ];
  }

  const health = computeHealthScore(transactions);
  const expenses = transactions.filter((t) => t.type === 'expense');
  const income = transactions.filter((t) => t.type === 'income');

  if (income.length === 0) {
    tips.push('لم نجد أي دخل مسجّل بعد. أضف دخلك الشهري لحساب مؤشر الصحة المالية والتوصيات بدقة.');
  }

  // تحليل الفئة الأعلى إنفاقًا
  if (expenses.length > 0) {
    const totalsByCategory = {};
    let totalExpenses = 0;
    for (const t of expenses) {
      totalsByCategory[t.category] = (totalsByCategory[t.category] || 0) + t.amount;
      totalExpenses += t.amount;
    }
    const [topCategory, topAmount] = Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1])[0];
    const share = totalExpenses ? topAmount / totalExpenses : 0;

    if (share >= 0.3) {
      tips.push(
        `فئة "${topCategory}" تمثل ${Math.round(share * 100)}% من إجمالي مصاريفك (${topAmount} ريال). حاول تقليل الإنفاق فيها بنسبة 10-15% الشهر القادم.`
      );
    }
  }

  // نسبة الادخار
  if (health.totalIncome > 0) {
    if (health.savingsRate < 0) {
      tips.push('مصاريفك تتجاوز دخلك هذا الشهر. راجع الالتزامات غير الضرورية فورًا لتفادي الاستدانة.');
    } else if (health.savingsRate < 10) {
      tips.push('نسبة ادخارك أقل من 10% من دخلك. حاول تخصيص ما لا يقل عن 20% من دخلك للادخار كل شهر.');
    } else if (health.savingsRate >= 20) {
      tips.push('نسبة ادخارك ممتازة! فكر في تحويل جزء من مدخراتك إلى صندوق استثماري منخفض المخاطر.');
    }
  }

  if (tips.length === 0) {
    tips.push('وضعك المالي مستقر حاليًا. استمر في متابعة مصاريفك أسبوعيًا للحفاظ على هذا الأداء.');
  }

  return tips;
}

module.exports = { generateAdvice };
