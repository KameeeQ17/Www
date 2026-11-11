const { createHmac, timingSafeEqual, createHash, randomBytes } = require('node:crypto');

const endpoint = 'https://api.github.com/repos/KameeeQ17/Www/contents/aktualnosci.json';
const allowedOrigins = new Set(['https://wildlands.pl', 'https://www.wildlands.pl']);
const attempts = new Map();
const ttl = 2 * 60 * 60;
const cookieName = '__Host-wildlands_admin';
function equal(a, b) {
  const hash = x => createHash('sha256').update(String(x)).digest();
  return timingSafeEqual(hash(a), hash(b));
}
function sign(value) { return createHmac('sha256', process.env.ADMIN_PASSWORD).update('wildlands-admin-v1:' + value).digest('base64url'); }
function sessionValid(req) {
  const cookie = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='));
  if (!cookie) return false;
  const [expiry, nonce, signature] = cookie.slice(cookieName.length + 1).split('.');
  const now = Math.floor(Date.now() / 1000);
  return /^\d+$/.test(expiry) && Number(expiry) > now && Number(expiry) <= now + ttl && /^[a-f0-9]{32}$/.test(nonce || '') && !!signature && equal(sign(expiry + '.' + nonce), signature);
}
function setCookie(res, value, age) { res.setHeader('Set-Cookie', `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`); }
function validate(items) {
  if (!Array.isArray(items) || items.length > 200) return null;
  const ids = new Set();
  const cleaned = [];
  for (const x of items) {
    if (!x || typeof x.title !== 'string' || !x.title.trim() || x.title.length > 160 || typeof x.content !== 'string' || !x.content.trim() || x.content.length > 15000 || typeof x.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x.date)) return null;
    const d = new Date(x.date + 'T12:00:00Z');
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== x.date) return null;
    if (typeof x.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(x.id) || ids.has(x.id)) return null;
    ids.add(x.id);
    cleaned.push({ id: x.id, date: x.date, title: x.title.trim(), content: x.content.trim() });
  }
  return cleaned;
}
async function github(method = 'GET', body) {
  return fetch(endpoint + (method === 'GET' ? '?ref=main' : ''), {
    method,
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'WildLands-admin', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000), cache: 'no-store'
  });
}
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const send = (status, data) => res.status(status).json(data);
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) { res.setHeader('Allow', 'GET, POST, PUT, DELETE'); return send(405, { error: 'Niedozwolona metoda.' }); }
  const configured = typeof process.env.ADMIN_PASSWORD === 'string' && process.env.ADMIN_PASSWORD.length >= 20 && !!process.env.GITHUB_TOKEN;
  if (!configured) return send(503, { error: 'Panel czeka na jednorazową konfigurację w Vercel: ADMIN_PASSWORD (minimum 20 znaków) i GITHUB_TOKEN.', setupRequired: true });
  if (req.method !== 'GET') {
    if (!allowedOrigins.has(req.headers.origin)) return send(403, { error: 'Niedozwolone źródło żądania.' });
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return send(415, { error: 'Wymagany format JSON.' });
  }
  let body = req.body;
  try {
    if (typeof body === 'string') body = JSON.parse(body);
    if (Buffer.byteLength(JSON.stringify(body || {})) > 250000) return send(413, { error: 'Zbyt dużo treści. Skróć wpisy.' });
  } catch { return send(400, { error: 'Nieprawidłowe dane.' }); }
  if (req.method === 'POST') {
    // Small per-instance throttle; platform firewall provides additional edge protection.
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.until < now) attempts.delete(key);
    if (attempts.size > 10000) return send(429, { error: 'Spróbuj ponownie później.' });
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const entry = attempts.get(ip) || { count: 0, until: now + 15 * 60 * 1000 };
    if (entry.count >= 5) { res.setHeader('Retry-After', '900'); return send(429, { error: 'Zbyt wiele prób. Spróbuj za 15 minut.' }); }
    if (typeof body?.password !== 'string' || body.password.length > 1024 || !equal(body.password, process.env.ADMIN_PASSWORD)) { entry.count++; attempts.set(ip, entry); return send(401, { error: 'Nieprawidłowe hasło.' }); }
    attempts.delete(ip);
    const value = (Math.floor(now / 1000) + ttl) + '.' + randomBytes(16).toString('hex');
    setCookie(res, value + '.' + sign(value), ttl);
    return send(200, { ok: true });
  }
  if (req.method === 'DELETE') { setCookie(res, '', 0); return send(200, { ok: true }); }
  if (!sessionValid(req)) return send(401, { error: 'Zaloguj się do panelu.' });
  try {
    if (req.method === 'GET') {
      const response = await github();
      if (!response.ok) return send(502, { error: 'Nie udało się odczytać aktualności. Sprawdź dostęp i ważność GITHUB_TOKEN w Vercel.' });
      const file = await response.json();
      const items = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
      if (!Array.isArray(items)) throw new Error('Invalid news file');
      return send(200, { sha: file.sha, items: items.map((item, i) => ({ ...item, id: item.id || 'existing-' + i })) });
    }
    const items = validate(body?.items);
    if (!items || typeof body?.sha !== 'string' || !/^[a-f0-9]{40,64}$/.test(body.sha)) return send(400, { error: 'Sprawdź daty, tytuły i treści wpisów. Maksymalnie 200 wpisów, tytuł 160 znaków, treść 15 000 znaków.' });
    const response = await github('PUT', { branch: 'main', sha: body.sha, message: 'Aktualizacja aktualności przez panel WildLands', content: Buffer.from(JSON.stringify(items, null, 2) + '\n').toString('base64') });
    if (response.status === 409 || response.status === 422) return send(409, { error: 'Aktualności zmieniły się w międzyczasie. Zachowaj swój tekst, odśwież listę i ponów edycję.' });
    if (!response.ok) return send(502, { error: 'Zapis nie powiódł się. Sprawdź uprawnienie Contents: Read and write dla repozytorium Www oraz ważność tokenu.' });
    const saved = await response.json();
    return send(200, { ok: true, sha: saved.content.sha, commit: saved.commit.sha });
  } catch { return send(502, { error: 'Nie udało się połączyć z GitHub. Twoje zmiany pozostają w otwartym panelu; spróbuj ponownie.' }); }
};
