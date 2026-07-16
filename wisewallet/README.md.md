# wiseWallet Backend

Backend كامل لتطبيق wiseWallet، مبني بالكامل على وحدات **Node.js الأساسية** (بدون Express أو أي مكتبة خارجية)، حتى يعمل مباشرة بدون `npm install`.

## التشغيل

```bash
cd backend
node server.js
```

سيعمل الخادم على: `http://localhost:3001`

البيانات تُخزَّن في ملف `data.json` (يُنشأ تلقائيًا عند أول تشغيل). لإعادة التطبيق لحالته الافتراضية، فقط احذف هذا الملف.

## البنية

| الملف | الوظيفة |
|---|---|
| `server.js` | الخادم الرئيسي وجدول التوجيه (Router) لكل الـ endpoints |
| `store.js` | طبقة تخزين بسيطة (JSON file) بديلة لقاعدة بيانات حقيقية في مرحلة الـ MVP |
| `auth.js` | تجزئة والتحقق من كلمات المرور (scrypt) |
| `classifier.js` | تصنيف المصاريف تلقائيًا بالكلمات المفتاحية |
| `healthScore.js` | حساب مؤشر الصحة المالية (Financial Health Score) |
| `advisor.js` | محرك التوصيات المالية (قواعد منطقية) |

> **ملاحظة للتوسع المستقبلي:** حاليًا `classifier.js` يعتمد على كلمات مفتاحية، و`advisor.js` يعتمد على قواعد منطقية بسيطة — تمامًا كما هو مخطط في خطة التنفيذ (المرحلة 3 والمرحلة 4)، أي: التدرج من Rule-based إلى نموذج تعلم آلي / LLM لاحقًا دون تغيير عقد الـ API.

## عقد الـ API (API Contract)

جميع الاستجابات بصيغة JSON. عند الخطأ: `{ "error": "..." }` مع كود HTTP مناسب (400/401/404/409/500).

### المصادقة

**POST `/api/auth/register`**
```json
{ "name": "سلطان", "email": "sultan@test.com", "password": "1234abcd" }
```
→ `201` `{ "user": { "id": 1, "name": "...", "email": "..." } }`

**POST `/api/auth/login`**
```json
{ "email": "sultan@test.com", "password": "1234abcd" }
```
→ `200` `{ "user": {...} }`

### العمليات المالية

**GET `/api/transactions?userId=1`**
→ `{ "transactions": [ { "id", "type", "description", "amount", "category", "date" }, ... ] }`

**POST `/api/transactions`**
```json
{ "userId": 1, "type": "expense", "description": "غداء مطعم", "amount": 45, "date": "2026-07-01" }
```
- `type` يجب أن تكون `income` أو `expense`.
- عند `expense` يتم استدعاء `classifyExpense()` تلقائيًا وإرجاع `category` مع الاستجابة.
- عند `income` توضع `category = "دخل"`.

→ `201` `{ "transaction": {...} }`

**DELETE `/api/transactions/:id?userId=1`**
→ `200` `{ "ok": true }`

### التحليل المالي

**GET `/api/health-score?userId=1`**
→
```json
{
  "score": 99,
  "label": "ممتازة",
  "savingsRate": 98,
  "totalIncome": 8000,
  "totalExpenses": 165,
  "details": "دخلك الشهري 8000 ريال..."
}
```

**GET `/api/advisor?userId=1`**
→ `{ "tips": ["...", "..."] }`

### فحص الحالة

**GET `/api/health`** → `{ "status": "ok" }`

## أمن ملاحظات مهمة قبل الإنتاج

- كلمات المرور محمية بـ scrypt + salt عشوائي (وليست نص صريح)، لكن لا توجد جلسات/JWT فعلية — الجلسة الحالية تعتمد فقط على `userId` (كافٍ للـ Hackathon/MVP وليس للإنتاج).
- لا يوجد HTTPS أو rate-limiting في هذه النسخة — يجب إضافتهما قبل أي نشر فعلي (راجع "الأمان والاختبار" في خطة التنفيذ، الأسبوع 9).
- التخزين على ملف JSON مناسب للتجربة فقط؛ يُستبدل بقاعدة بيانات فعلية (PostgreSQL/MySQL) في مرحلة لاحقة كما هو مخطط في المرحلة 2.
