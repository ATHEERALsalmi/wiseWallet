// server.js — خادم wiseWallet: REST API مبني بالكامل على وحدات Node.js المدمجة (بدون Express)
// للتشغيل: node server.js  (يستمع على http://localhost:3001)

const http = require('http');
const { URL } = require('url');

const { readDB, writeDB, nextId } = require('./store');
const { classifyExpense } = require('./classifier');
const { computeHealthScore } = require('./healthScore');
const { generateAdvice } = require('./advisor');
const { hashPassword, verifyPassword } = require('./auth');

const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// أدوات مساعدة للـ HTTP
// ---------------------------------------------------------------------------

function sendJSON(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) req.destroy(); // حماية بسيطة من حمولات ضخمة
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('صيغة JSON غير صحيحة في الطلب'));
      }
    });
    req.on('error', reject);
  });
}

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function requireUser(db, userId) {
  const id = Number(userId);
  const user = db.users.find((u) => u.id === id);
  if (!user) throw new HttpError(401, 'مستخدم غير موجود، الرجاء تسجيل الدخول من جديد.');
  return user;
}

// ---------------------------------------------------------------------------
// معالجات المسارات (Handlers)
// ---------------------------------------------------------------------------

async function handleRegister(req, res) {
  const { name, email, password } = await readBody(req);
  if (!name || !email || !password) {
    throw new HttpError(400, 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة.');
  }
  const db = readDB();
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new HttpError(409, 'هذا البريد الإلكتروني مسجّل بالفعل.');
  }
  const user = {
    id: nextId(db.users),
    name,
    email,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  writeDB(db);
  sendJSON(res, 201, { user: publicUser(user) });
}

async function handleLogin(req, res) {
  const { email, password } = await readBody(req);
  if (!email || !password) throw new HttpError(400, 'البريد الإلكتروني وكلمة المرور مطلوبة.');
  const db = readDB();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new HttpError(401, 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
  }
  sendJSON(res, 200, { user: publicUser(user) });
}

async function handleGetTransactions(req, res, query) {
  const db = readDB();
  const user = requireUser(db, query.get('userId'));
  const transactions = db.transactions
    .filter((t) => t.userId === user.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  sendJSON(res, 200, { transactions });
}

async function handleAddTransaction(req, res) {
  const { userId, type, description, amount, date } = await readBody(req);
  if (!userId || !type || !description || amount === undefined) {
    throw new HttpError(400, 'الحقول المطلوبة: userId, type, description, amount.');
  }
  if (!['income', 'expense'].includes(type)) {
    throw new HttpError(400, 'نوع العملية يجب أن يكون income أو expense.');
  }
  const numAmount = Number(amount);
  if (!(numAmount > 0)) throw new HttpError(400, 'المبلغ يجب أن يكون رقمًا أكبر من صفر.');

  const db = readDB();
  const user = requireUser(db, userId);

  const transaction = {
    id: nextId(db.transactions),
    userId: user.id,
    type,
    description,
    amount: numAmount,
    category: type === 'expense' ? classifyExpense(description) : 'دخل',
    date: date || new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  };
  db.transactions.push(transaction);
  writeDB(db);
  sendJSON(res, 201, { transaction });
}

async function handleDeleteTransaction(req, res, query, id) {
  const db = readDB();
  const user = requireUser(db, query.get('userId'));
  const idx = db.transactions.findIndex((t) => t.id === Number(id) && t.userId === user.id);
  if (idx === -1) throw new HttpError(404, 'العملية غير موجودة.');
  db.transactions.splice(idx, 1);
  writeDB(db);
  sendJSON(res, 200, { ok: true });
}

async function handleHealthScore(req, res, query) {
  const db = readDB();
  const user = requireUser(db, query.get('userId'));
  const transactions = db.transactions.filter((t) => t.userId === user.id);
  sendJSON(res, 200, computeHealthScore(transactions));
}

async function handleAdvisor(req, res, query) {
  const db = readDB();
  const user = requireUser(db, query.get('userId'));
  const transactions = db.transactions.filter((t) => t.userId === user.id);
  sendJSON(res, 200, { tips: generateAdvice(transactions) });
}

// ---------------------------------------------------------------------------
// جدول التوجيه (Router)
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname, searchParams } = url;
  const method = req.method;

  if (method === 'OPTIONS') {
    return sendJSON(res, 204, {});
  }

  try {
    if (pathname === '/api/auth/register' && method === 'POST') return await handleRegister(req, res);
    if (pathname === '/api/auth/login' && method === 'POST') return await handleLogin(req, res);
    if (pathname === '/api/transactions' && method === 'GET') return await handleGetTransactions(req, res, searchParams);
    if (pathname === '/api/transactions' && method === 'POST') return await handleAddTransaction(req, res);
    if (pathname === '/api/health-score' && method === 'GET') return await handleHealthScore(req, res, searchParams);
    if (pathname === '/api/advisor' && method === 'GET') return await handleAdvisor(req, res, searchParams);

    const txMatch = pathname.match(/^\/api\/transactions\/(\d+)$/);
    if (txMatch && method === 'DELETE') return await handleDeleteTransaction(req, res, searchParams, txMatch[1]);

    if (pathname === '/api/health' && method === 'GET') return sendJSON(res, 200, { status: 'ok' });

    throw new HttpError(404, 'المسار غير موجود.');
  } catch (err) {
    const status = err.statusCode || 500;
    if (status === 500) console.error(err);
    sendJSON(res, status, { error: err.message || 'خطأ في الخادم' });
  }
});

server.listen(PORT, () => {
  console.log(`✅ wiseWallet backend يعمل على http://localhost:${PORT}`);
});
