async function copyIP(button) {
  try {
    await navigator.clipboard.writeText('WildLands.pl');
    const old = button.textContent;
    button.textContent = '✓ Skopiowano IP!';
    button.disabled = true;
    setTimeout(() => { button.textContent = old; button.disabled = false; }, 2000);
  } catch { window.prompt('Skopiuj adres serwera:', 'WildLands.pl'); }
}
document.querySelectorAll('#copy,#copy2').forEach(b => b.addEventListener('click', () => copyIP(b)));
let checking = false;
async function updateStatus() {
  if (checking || document.hidden) return;
  checking = true;
  const label = document.getElementById('status');
  const dot = document.getElementById('dot');
  try {
    const r = await fetch('https://api.mcsrvstat.us/3/WildLands.pl', { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error('Status HTTP');
    const data = await r.json();
    if (typeof data.online !== 'boolean') throw new Error('Nieprawidłowy status');
    const count = data.players?.online;
    label.textContent = data.online
      ? `Serwer online • Gracze online: ${Number.isInteger(count) && count >= 0 ? count : 'brak danych'}${Number.isInteger(data.players?.max) ? ' / ' + data.players.max : ''}`
      : 'Serwer offline według ostatniego odczytu';
    dot.classList.toggle('on', data.online);
    document.getElementById('status-note').textContent = 'Odczyt: ' + new Date().toLocaleTimeString('pl-PL') + ' • odświeżanie co 60 s • dane mogą być buforowane';
  } catch {
    dot.classList.remove('on');
    label.textContent = 'Liczba graczy chwilowo niedostępna';
    document.getElementById('status-note').textContent = 'Nie udało się pobrać statusu • ponowna próba za 60 s';
  } finally { checking = false; }
}
updateStatus();
setInterval(updateStatus, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateStatus(); });
async function loadNews() {
  const list = document.getElementById('news');
  if (!list) return;
  try {
    const r = await fetch('/aktualnosci.json');
    if (!r.ok) throw new Error('Aktualności HTTP');
    const items = await r.json();
    if (!Array.isArray(items)) throw new Error('Nieprawidłowe dane');
    list.replaceChildren();
    if (!items.length) { list.textContent = 'Jeszcze nie ma opublikowanych aktualności. Zajrzyj ponownie lub dołącz na Discord!'; return; }
    items.sort((a,b) => String(b.date).localeCompare(String(a.date))).forEach(item => {
      const article = document.createElement('article'); article.className = 'panel';
      const date = document.createElement('time'); date.dateTime = item.date;
      const parsed = new Date(item.date + 'T12:00:00');
      date.textContent = Number.isNaN(parsed.getTime()) ? item.date : parsed.toLocaleDateString('pl-PL');
      const title = document.createElement('h2'); title.textContent = item.title;
      const body = document.createElement('p'); body.textContent = item.content;
      article.append(date, title, body); list.append(article);
    });
  } catch { list.textContent = 'Nie udało się wczytać aktualności. Spróbuj ponownie później lub sprawdź naszego Discorda.'; }
}
loadNews();
