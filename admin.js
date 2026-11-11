const $ = id => document.getElementById(id);
let items = [], sha = '', selected = null, dirty = false, busy = false;
function message(text, error = false) { $('message').textContent = text; $('message').classList.toggle('error', error); }
async function api(method, body) {
  const r = await fetch('/api/admin', { method, credentials: 'same-origin', cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  let data;
  try { data = await r.json(); } catch { throw new Error('Panel nie jest dostępny. Spróbuj ponownie później.'); }
  if (!r.ok) {
    if (r.status === 401) { $('login').hidden = false; $('workspace').hidden = true; }
    if (data.setupRequired) { $('login').hidden = true; $('workspace').hidden = true; }
    throw new Error(data.error || 'Nie udało się wykonać operacji.');
  }
  return data;
}
function today() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(new Date()); }
function abandon() { return !dirty || window.confirm('Masz niezapisane zmiany. Porzucić je?'); }
function edit(id) {
  selected = id;
  const item = items.find(x => x.id === id);
  $('editor-title').textContent = item ? 'Edytuj aktualność' : 'Nowa aktualność';
  $('title').value = item?.title || ''; $('date').value = item?.date || today(); $('content').value = item?.content || '';
  $('article-preview').hidden = true; dirty = false; render();
}
function render() {
  $('entries').replaceChildren();
  if (!items.length) $('entries').textContent = 'Brak wpisów. Dodaj pierwszą aktualność.';
  [...items].sort((a,b) => b.date.localeCompare(a.date)).forEach(item => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'btn entry'; button.disabled = busy;
    button.setAttribute('aria-pressed', String(item.id === selected));
    const title = document.createElement('strong'); title.textContent = item.title;
    const date = document.createElement('small'); date.textContent = item.date;
    button.append(title, date); button.addEventListener('click', () => { if (abandon()) edit(item.id); }); $('entries').append(button);
  });
}
function setBusy(value) {
  busy = value;
  document.querySelectorAll('button,input,textarea').forEach(e => e.disabled = value);
}
async function load() {
  const data = await api('GET'); items = data.items; sha = data.sha;
  $('login').hidden = true; $('workspace').hidden = false; edit(null);
  message('Gotowe. Wybierz wpis do edycji lub dodaj nową aktualność.');
}
$('login-form').addEventListener('submit', async e => {
  e.preventDefault(); setBusy(true);
  try { await api('POST', { password: $('password').value }); $('password').value = ''; await load(); }
  catch(e) { message(e.message, true); } finally { setBusy(false); }
});
$('editor').addEventListener('input', () => { dirty = true; $('article-preview').hidden = true; });
$('new').addEventListener('click', () => { if (abandon()) { edit(null); $('title').focus(); } });
$('refresh').addEventListener('click', async () => {
  if (!abandon()) return;
  setBusy(true); try { await load(); } catch(e) { message(e.message,true); } finally { setBusy(false); }
});
$('logout').addEventListener('click', async () => {
  if (!abandon()) return;
  setBusy(true);
  try { await api('DELETE', {}); dirty = false; items = []; sha = ''; $('workspace').hidden = true; $('login').hidden = false; $('editor').reset(); $('entries').replaceChildren(); message('Wylogowano.'); }
  catch(e) { message(e.message,true); } finally { setBusy(false); }
});
$('preview-button').addEventListener('click', () => {
  $('preview-title').textContent = $('title').value; $('preview-date').textContent = $('date').value; $('preview-content').textContent = $('content').value; $('article-preview').hidden = false;
});
$('editor').addEventListener('submit', async e => {
  e.preventDefault();
  if (busy) return;
  const value = { id: selected || crypto.randomUUID(), title: $('title').value.trim(), date: $('date').value, content: $('content').value.trim() };
  if (!value.title || !value.content) { message('Wpisz tytuł i treść.',true); return; }
  const updated = selected ? items.map(x => x.id === selected ? value : x) : [...items, value];
  setBusy(true); message('Zapisywanie aktualności…');
  try {
    const data = await api('PUT', { sha, items: updated });
    items = updated; sha = data.sha; selected = value.id; dirty = false; render();
    $('editor-title').textContent = 'Edytuj aktualność';
    message('Zapisano! Publikacja strony została uruchomiona. Po zakończeniu wdrożenia wpis będzie widoczny w Aktualnościach.');
  } catch(e) { message(e.message, true); } finally { setBusy(false); }
});
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
load().catch(e => message(e.message,true));
