async function loadRecentPlayers() {
  const list = document.getElementById('recent-players');
  try {
    const response = await fetch('/api/recent', { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Unavailable');
    const data = await response.json();
    list.replaceChildren();
    if (!data.players?.length) {
      const p = document.createElement('p'); p.className = 'recent-empty';
      p.textContent = data.configured ? 'Lista pojawi się po pierwszych wejściach graczy.' : 'Historia wejść pojawi się po połączeniu strony z serwerem Minecraft.';
      list.append(p); return;
    }
    data.players.slice(0,5).forEach(player => {
      const tile = document.createElement('article'); tile.className = 'player-tile';
      const head = document.createElement('img'); head.width = 68; head.height = 68; head.alt = ''; head.src = 'https://mc-heads.net/avatar/' + encodeURIComponent(player.uuid) + '/68';
      head.addEventListener('error', () => { head.hidden = true; }, {once:true});
      const name = document.createElement('strong'); name.textContent = player.name;
      const date = document.createElement('time'); date.dateTime = player.joinedAt;
      date.textContent = new Date(player.joinedAt).toLocaleString('pl-PL',{timeZone:'Europe/Warsaw',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
      tile.append(head,name,date); list.append(tile);
    });
  } catch { list.replaceChildren(); const p = document.createElement('p'); p.className='recent-empty';p.textContent='Historia wejść jest chwilowo niedostępna.';list.append(p); }
}
loadRecentPlayers(); setInterval(() => { if (!document.hidden) loadRecentPlayers(); },60000);
