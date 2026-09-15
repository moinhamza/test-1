/* ===================================================================
   app.js — portfolio + live Discord dashboard (vanilla JS, no deps)
   =================================================================== */
(() => {
  'use strict';
  const CFG = window.SITE_CONFIG || {};
  hydrateIcons();
  document.addEventListener('DOMContentLoaded', () => window.Games && Games.init(), { once: true }); if (document.readyState !== 'loading') Games.init();
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
  };
  const fmt = n => { n = +n || 0; const a = Math.abs(n), f = (v, u) => (v.toFixed(1).replace(/\.0$/, '')) + u; return a >= 1e6 ? f(n / 1e6, 'M') : a >= 1e3 ? f(n / 1e3, 'k') : String(Math.round(n)); };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Toast ---------- */
  const toastEl = $('#toast');
  let toastT;
  const toast = window.toast = msg => { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2600); };

  /* ---------- Theme ---------- */
  const root = document.documentElement, themeBtn = $('#themeToggle');
  const applyTheme = t => { root.dataset.theme = t; themeBtn.innerHTML = icon(t === 'dark' ? 'moon' : 'sun'); store.set('theme', t); };
  applyTheme(store.get('theme', matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  themeBtn.onclick = () => applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');

  /* ---------- Navbar / mobile menu / scroll-spy ---------- */
  const nav = $('#navbar'), links = $('#navLinks'), burger = $('#hamburger');
  const closeMenu = () => { links.classList.remove('open'); burger.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.onclick = () => { const o = links.classList.toggle('open'); burger.classList.toggle('open', o); burger.setAttribute('aria-expanded', o); };
  $$('a', links).forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('click', e => { if (!nav.contains(e.target)) closeMenu(); });
  const fab = $('#fabTop'), progress = document.createElement('div'); progress.className = 'scroll-progress'; document.body.prepend(progress);
  addEventListener('scroll', () => { nav.classList.toggle('scrolled', scrollY > 10); fab.classList.toggle('show', scrollY > 600); progress.style.width = (scrollY / (document.documentElement.scrollHeight - innerHeight) * 100) + '%'; }, { passive: true });
  fab.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
  const sections = $$('main section[id]');
  const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) $$('a', links).forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(s => spy.observe(s));

  /* ---------- Reveal on scroll + counters ---------- */
  const revealObs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); revealObs.unobserve(e.target);
    $$('[data-count]', e.target).forEach(animateCount);
    $$('.skill-bar i, .bar i', e.target).forEach(b => b.style.width = b.dataset.w);
  }), { threshold: .15 });
  $$('.stat-card').forEach((el, i) => { el.classList.add('reveal'); el.style.setProperty('--d', i * 70 + 'ms'); });
  $$('.reveal').forEach(el => revealObs.observe(el));
  function animateCount(el) {
    const target = +el.dataset.count || 0, start = performance.now(), dur = 1400;
    const step = t => { const p = Math.min(1, (t - start) / dur), v = Math.round(target * (1 - Math.pow(1 - p, 3))); el.textContent = fmt(v); if (p < 1) requestAnimationFrame(step); else el.dataset.animated = '1'; };
    requestAnimationFrame(step);
  }

  /* ---------- Typewriter ---------- */
  const code = [
    ['tk-c', '// discord bot — ready handler'], ['', ''],
    ['', '<k>const</k> client = <k>new</k> <f>Client</f>({ intents });'], ['', ''],
    ['', 'client.<f>once</f>(<s>"ready"</s>, () => {'],
    ['', '  console.<f>log</f>(<s>`Logged in as ${client.user.tag}`</s>);'],
    ['', '  client.user.<f>setActivity</f>(<s>"/help"</s>);'],
    ['', '});'], ['', ''],
    ['', 'client.<f>login</f>(process.env.<f>TOKEN</f>);']
  ].map(([c, l]) => c ? `<span class="${c}">${l}</span>` : l.replace(/<k>/g, '<span class="tk-k">').replace(/<s>/g, '<span class="tk-s">').replace(/<f>/g, '<span class="tk-f">').replace(/<\/[ksf]>/g, '</span>')).join('\n');
  const tw = $('#typewriter'); let i = 0, plain = code;
  (function type() {
    // type tag-by-tag so HTML never breaks
    if (i >= plain.length) return;
    if (plain[i] === '<') { const j = plain.indexOf('>', i); i = j + 1; } else i++;
    tw.innerHTML = plain.slice(0, i); setTimeout(type, plain[i - 1] === '\n' ? 90 : 18);
  })();

  /* ---------- Projects ---------- */
  const projects = [
    { t: 'Nova Bot', cat: 'bot', icon: 'bot', c: ['#6366f1', '#0ea5e9'], d: 'Modular Discord bot with moderation, leveling and a slash-command framework, serving 40+ communities with 99.9% uptime.', tags: ['discord.js', 'Node', 'MongoDB'], gh: '#', live: '#' },
    { t: 'Browser Arcade', cat: 'web', icon: 'gamepad', c: ['#0ea5e9', '#6366f1'], d: 'Tic-Tac-Toe with an unbeatable minimax AI, memory match, canvas Snake and a reaction tester — all dependency-free.', tags: ['Canvas', 'Minimax', 'localStorage'], gh: 'https://github.com/moinhamza/test-1', live: '#games' },
    { t: 'Ticket System', cat: 'bot', icon: 'ticket', c: ['#f59e0b', '#f97316'], d: 'Support-ticket workflow with transcripts, categories, staff assignment and automatic inactivity closure.', tags: ['discord.js', 'SQLite'], gh: '#' },
    { t: 'Embed Builder', cat: 'tool', icon: 'puzzle', c: ['#10b981', '#14b8a6'], d: 'Visual embed designer with live preview, validation and JSON / webhook export.', tags: ['Vanilla JS', 'Webhooks'], gh: '#', live: '#' },
    { t: 'Portfolio Site', cat: 'web', icon: 'globe', c: ['#8b5cf6', '#6366f1'], d: 'This site: responsive, themeable and dependency-free, with a command palette and local workspace.', tags: ['HTML', 'CSS', 'JS'], gh: 'https://github.com/moinhamza/test-1' },
    { t: 'Uptime Monitor', cat: 'tool', icon: 'radio', c: ['#ef4444', '#f59e0b'], d: 'Monitors service health every minute and posts latency graphs and incident alerts to Discord.', tags: ['Node', 'Cron', 'Webhooks'], gh: '#' }
  ];
  $('#projectGrid').innerHTML = projects.map((p, i) => `
    <article class="card project reveal" data-cat="${p.cat}" style="--d:${i * 80}ms">
      <div class="project-cover" style="--c1:${p.c[0]};--c2:${p.c[1]}"><span class="project-icon">${icon(p.icon)}</span></div>
      <div class="project-body">
        <h3>${esc(p.t)}</h3><p>${esc(p.d)}</p>
        <div class="tags">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <div class="project-links">${p.gh ? `<a href="${p.gh}" target="_blank" rel="noopener">${icon('github')}GitHub</a>` : ''}${p.live ? `<a href="${p.live}" ${p.live.startsWith('#') ? '' : 'target="_blank" rel="noopener"'}>${icon('externalLink')}Live</a>` : ''}</div>
      </div>
    </article>`).join('');
  $$('.project').forEach(el => revealObs.observe(el));
  $('#projectFilters').onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $$('.chip', e.currentTarget).forEach(c => c.classList.toggle('active', c === b));
    $$('.project').forEach(p => p.classList.toggle('hide', b.dataset.filter !== 'all' && p.dataset.cat !== b.dataset.filter));
  };

  /* ---------- Skills ---------- */
  const skills = [['JavaScript / TypeScript', 92], ['Node.js', 90], ['discord.js', 95], ['HTML & CSS', 88], ['React', 75], ['MongoDB / SQL', 78], ['Python', 70], ['Git & CI', 82], ['Linux / Docker', 68]];
  $('#skillsGrid').innerHTML = skills.map(([n, v], i) => `<div class="skill reveal" style="--d:${i * 60}ms"><div class="skill-top"><span>${n}</span><span>${v}%</span></div><div class="skill-bar"><i data-w="${v}%"></i></div></div>`).join('');
  $$('.skill').forEach(el => revealObs.observe(el));

  /* ---------- Tasks ---------- */
  let tasks = store.get('tasks', []), taskFilter = 'all';
  const renderTasks = () => {
    const list = tasks.filter(t => taskFilter === 'all' || (taskFilter === 'done') === t.done);
    $('#taskList').innerHTML = list.length ? list.map(t => `<li class="task ${t.done ? 'done' : ''}" data-id="${t.id}"><input type="checkbox" ${t.done ? 'checked' : ''} aria-label="Toggle"/><span>${esc(t.text)}</span><button aria-label="Delete">${icon('x')}</button></li>`).join('') : `<li class="muted empty">${icon('partyPopper')} Nothing here</li>`;
    $('#taskCount').textContent = `${tasks.filter(t => !t.done).length} left`;
    store.set('tasks', tasks);
  };
  $('#taskForm').onsubmit = e => { e.preventDefault(); const v = $('#taskInput').value.trim(); if (!v) return; tasks.unshift({ id: Date.now() + Math.random().toString(16).slice(2, 6), text: v, done: false }); $('#taskInput').value = ''; renderTasks(); toast('Task added'); };
  $('#taskList').onclick = e => {
    const li = e.target.closest('.task'); if (!li) return; const t = tasks.find(x => x.id == li.dataset.id);
    if (e.target.matches('button')) tasks = tasks.filter(x => x !== t); else if (e.target.matches('input')) t.done = !t.done;
    renderTasks();
  };
  $('#taskFilters').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; taskFilter = b.dataset.tf; $$('.chip', e.currentTarget).forEach(c => c.classList.toggle('active', c === b)); renderTasks(); };
  renderTasks();

  /* ---------- Notes ---------- */
  const notes = $('#notes'), noteSaved = $('#noteSaved'), notePrev = $('#notePreview');
  notes.value = store.get('notes', '');
  const wc = () => $('#noteWords').textContent = `${(notes.value.trim().match(/\S+/g) || []).length} words`;
  let nt; notes.oninput = () => { noteSaved.textContent = 'Saving…'; clearTimeout(nt); nt = setTimeout(() => { store.set('notes', notes.value); noteSaved.textContent = 'Saved'; }, 400); wc(); if (!notePrev.hidden) renderPreview(); };
  const renderPreview = () => notePrev.innerHTML = esc(notes.value).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>').replace(/^# (.+)$/gm, '<h3>$1</h3>').replace(/\n/g, '<br>') || '<span class="muted">Nothing to preview</span>';
  $('#notePreviewBtn').onclick = e => { notePrev.hidden = !notePrev.hidden; e.target.textContent = notePrev.hidden ? 'Preview' : 'Hide preview'; renderPreview(); };
  $('#noteExportBtn').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([notes.value], { type: 'text/markdown' })); a.download = 'notes.md'; a.click(); toast('Exported notes.md'); };
  wc();

  /* ---------- Contact form ---------- */
  $('#contactForm').onsubmit = async e => {
    e.preventDefault(); const f = e.target; let ok = true;
    $$('input,textarea', f).forEach(i => { const bad = !i.checkValidity(); i.classList.toggle('invalid', bad); ok = ok && !bad; });
    const msg = $('#formMsg'); if (!ok) { msg.style.color = 'var(--dnd)'; msg.textContent = 'Please fill in all fields correctly.'; return; }
    msg.style.color = 'var(--ok)';
    if (CFG.FORMSPREE_ID) {
      try { const r = await fetch(`https://formspree.io/f/${CFG.FORMSPREE_ID}`, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(f) }); if (!r.ok) throw 0; }
      catch { msg.style.color = 'var(--dnd)'; msg.textContent = 'Could not send right now — please email me directly.'; return; }
    }
    msg.textContent = 'Thanks! Your message has been sent.'; f.reset(); toast('Message sent');
  };
  $('#discordTag').textContent = `Discord: ${CFG.DISCORD_USERNAME || 'moin'}`;
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Command palette ---------- */
  const palette = $('#palette'), pInput = $('#paletteInput'), pList = $('#paletteList');
  const commands = [
    ...sections.map(s => ({ label: `Go to ${s.id[0].toUpperCase() + s.id.slice(1)}`, kbd: '#' + s.id, run: () => location.hash = s.id })),
    { label: 'Toggle theme', kbd: 'T', run: () => themeBtn.click() },
    { label: 'Refresh Discord data', kbd: 'R', run: () => loadAll(true) },
    { label: 'Export notes', kbd: 'E', run: () => $('#noteExportBtn').click() },
    { label: 'Clear completed tasks', kbd: '', run: () => { tasks = tasks.filter(t => !t.done); renderTasks(); toast('Cleared'); } }
  ];
  let pIdx = 0, pFiltered = commands;
  const renderPalette = () => { pFiltered = commands.filter(c => c.label.toLowerCase().includes(pInput.value.toLowerCase())); pIdx = Math.min(pIdx, Math.max(0, pFiltered.length - 1)); pList.innerHTML = pFiltered.map((c, i) => `<li class="${i === pIdx ? 'active' : ''}" data-i="${i}">${c.label}<kbd>${c.kbd}</kbd></li>`).join('') || '<li class="muted">No results</li>'; };
  const openPalette = () => { palette.hidden = false; pInput.value = ''; pIdx = 0; renderPalette(); pInput.focus(); };
  const closePalette = () => palette.hidden = true;
  $('#searchBtn').onclick = openPalette;
  palette.onclick = e => { if (e.target === palette) closePalette(); };
  pInput.oninput = () => { pIdx = 0; renderPalette(); };
  pList.onclick = e => { const li = e.target.closest('li[data-i]'); if (li) { pFiltered[li.dataset.i].run(); closePalette(); } };
  addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.hidden ? openPalette() : closePalette(); }
    if (e.key === 'Escape') closeMenu();
    if (palette.hidden) return;
    if (e.key === 'Escape') closePalette();
    if (!pFiltered.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); pIdx = (pIdx + 1) % pFiltered.length; renderPalette(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); pIdx = (pIdx - 1 + pFiltered.length) % pFiltered.length; renderPalette(); }
    if (e.key === 'Enter' && pFiltered[pIdx]) { pFiltered[pIdx].run(); closePalette(); }
  });

  /* ===================================================================
     LIVE DATA: Discord widget
     =================================================================== */
  /* Discord widget */
  let members = [];
  const initials = n => (n || '?').split(/\s|_/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const avatarHTML = m => `<div class="avatar">${m.avatar_url ? `<img src="${m.avatar_url}" alt="" loading="lazy">` : esc(initials(m.username))}<i class="${m.status}"></i></div>`;
  function renderMembers() {
    const q = $('#memberSearch').value.toLowerCase(), st = $('#memberStatusFilter').value;
    const list = members.filter(m => m.username.toLowerCase().includes(q) && (st === 'all' || m.status === st));
    $('#memberList').innerHTML = list.length ? list.map(m => `<li class="member">${avatarHTML(m)}<div><div class="member-name">${esc(m.username)}</div>${m.game ? `<div class="member-game" title="${esc(m.game.name)}">${icon('gamepad')} ${esc(String(m.game.name).split(/\r?\n/)[0].trim())}</div>` : ''}</div></li>`).join('') : '<li class="muted">No members match.</li>';
  }
  $('#memberSearch').oninput = renderMembers; $('#memberStatusFilter').onchange = renderMembers;
  function applyWidget(w, isDemo) {
    $('#guildName').textContent = w.name; $('#presenceCount').textContent = w.presence_count;
    const ho = $('#heroOnline'); ho.dataset.count = w.presence_count; if (ho.dataset.animated) ho.textContent = fmt(w.presence_count);
    const fs = $('#footerStatus'); fs.className = 'footer-status ' + (isDemo ? 'demo' : ''); $('#footerOnline').textContent = isDemo ? 'Demo data' : `${w.presence_count} members online`; $('#footerGuild').textContent = isDemo ? 'Widget not connected' : w.name;
    const cnt = st => (w.members || []).filter(m => m.status === st).length;
    $('#memberBreakdown').innerHTML = [['online', 'Online'], ['idle', 'Idle'], ['dnd', 'DND']].map(([k, l]) => `<span><i class="dot ${k}"></i>${cnt(k)} ${l}</span>`).join('');
    const inv = $('#inviteBtn'), fi = $('#footerInvite'); if (w.instant_invite) { inv.href = fi.href = w.instant_invite; inv.hidden = false; fi.parentElement.hidden = false; } else { inv.hidden = true; fi.parentElement.hidden = true; }
    members = w.members || []; renderMembers();
    const chans = (w.channels || []).sort((a, b) => a.position - b.position);
    $('#channelList').innerHTML = chans.length ? chans.map(c => { const u = members.filter(m => m.channel_id === c.id); return `<li class="channel"><div class="channel-title"><span>${icon('volume')} ${esc(c.name)}</span><span class="muted">${u.length}</span></div>${u.length ? `<div class="channel-users">${u.map(avatarHTML).join('')}</div>` : ''}</li>`; }).join('') : '<li class="muted">No voice channels.</li>';
    const note = $('#setupNote'); note.hidden = !isDemo;
    if (isDemo) note.innerHTML = `<strong>Showing demo data.</strong> ${widgetError} To enable live data: Discord → <em>Server Settings → Widget → Enable Server Widget</em>, and set <code>DISCORD_SERVER_ID</code> in <code>js/config.js</code>.`;
  }
  const demoWidget = () => ({ name: 'Nova Community (demo)', presence_count: 3120, instant_invite: '', channels: [{ id: '1', name: 'Lounge', position: 0 }, { id: '2', name: 'Gaming', position: 1 }, { id: '3', name: 'Music', position: 2 }], members: [['Moin', 'online', '1', 'Visual Studio Code'], ['nova_fan', 'idle', '1'], ['pixel', 'dnd', '2', 'Valorant'], ['sky', 'online', '2', 'Minecraft'], ['zed', 'online'], ['luna', 'idle'], ['kai', 'online', '3', 'Spotify'], ['aria', 'dnd']].map(([u, s, ch, g], i) => ({ id: String(i), username: u, status: s, channel_id: ch, game: g ? { name: g } : null })) });
  let widgetError = '';
  async function loadWidget() {
    if (CFG.DISCORD_SERVER_ID) {
      try {
        const r = await fetch(`https://discord.com/api/guilds/${CFG.DISCORD_SERVER_ID}/widget.json`, { cache: 'no-store' });
        if (r.ok) { widgetError = ''; applyWidget(await r.json(), false); return; }
        widgetError = r.status === 403 ? 'The server widget is disabled.' : r.status === 404 ? `No server found for ID ${CFG.DISCORD_SERVER_ID}. Make sure this is the <em>server</em> ID (right-click the server icon → Copy Server ID), not a channel ID.` : `Discord returned HTTP ${r.status}.`;
      } catch { widgetError = 'Could not reach discord.com (network or ad-blocker).'; }
    } else widgetError = 'No server ID configured.';
    applyWidget(demoWidget(), true);
  }

  let loading = false;
  async function loadAll(manual) { if (loading) return; loading = true; await loadWidget(); loading = false; if (manual) toast('Refreshed'); }
  loadAll(); setInterval(() => document.visibilityState === 'visible' && loadAll(), CFG.REFRESH_INTERVAL_MS || 30000);
})();
