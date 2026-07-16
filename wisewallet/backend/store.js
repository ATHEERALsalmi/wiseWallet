// store.js — طبقة تخزين بسيطة تعتمد على ملف JSON (بديل قاعدة بيانات حقيقية لمرحلة الـ MVP)
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { users: [], transactions: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    return { users: [], transactions: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function nextId(collection) {
  return collection.length ? Math.max(...collection.map((x) => x.id)) + 1 : 1;
}

module.exports = { readDB, writeDB, nextId };
