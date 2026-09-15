/* ===================================================================
   app.js — portfolio + live Discord dashboard (vanilla JS, no deps)
   =================================================================== */
(() => {
  'use strict';
  const CFG = window.SITE_CONFIG || {};
  hydrateIcons();
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
  const toast = msg => { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2600); };

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

  /* ---------- Hover effects: spotlight cards, 3D tilt, magnetic buttons ---------- */
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  document.addEventListener('pointermove', e => {
    const card = e.target.closest('.card, .stat-card, .skill'); if (!card) return;
    const r = card.getBoundingClientRect(); card.style.setProperty('--mx', (e.clientX - r.left) + 'px'); card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
  if (fine) {
    document.addEventListener('pointermove', e => {
      const t = e.target.closest('.tilt'); if (!t) return;
      const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      t.style.transform = `perspective(900px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateY(-4px)`;
    });
    document.addEventListener('pointerout', e => { const t = e.target.closest('.tilt'); if (t && !t.contains(e.relatedTarget)) t.style.transform = ''; });
    $$('.btn-primary, .icon-btn').forEach(b => {
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.translate = `${(e.clientX - r.left - r.width / 2) * .18}px ${(e.clientY - r.top - r.height / 2) * .28}px`; });
      b.addEventListener('pointerleave', () => b.style.translate = '');
    });
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
    { t: 'Nova Bot', cat: 'bot', icon: 'bot', c: ['#6d5dfc', '#22d3ee'], d: 'Multipurpose Discord bot with moderation, music, leveling and a slash-command framework serving thousands of members.', tags: ['discord.js', 'Node', 'MongoDB'], gh: '#', live: '#' },
    { t: 'Bot Dashboard', cat: 'web', icon: 'barChart', c: ['#f472b6', '#6d5dfc'], d: 'Real-time analytics dashboard for bot stats with live charts, guild management and OAuth login.', tags: ['Express', 'Chart', 'OAuth2'], gh: '#', live: '#dashboard' },
    { t: 'Ticket System', cat: 'bot', icon: 'ticket', c: ['#f59e0b', '#ef4444'], d: 'Support-ticket bot with transcripts, categories, staff claiming and auto-close on inactivity.', tags: ['discord.js', 'SQLite'], gh: '#' },
    { t: 'Embed Builder', cat: 'tool', icon: 'puzzle', c: ['#10b981', '#22d3ee'], d: 'Visual Discord embed designer with live preview and JSON/webhook export.', tags: ['Vanilla JS', 'Webhooks'], gh: '#', live: '#' },
    { t: 'Portfolio Site', cat: 'web', icon: 'globe', c: ['#8b5cf6', '#ec4899'], d: 'This site — responsive, themeable and dependency-free with a command palette and local workspace.', tags: ['HTML', 'CSS', 'JS'], gh: 'https://github.com/moinhamza/test-1' },
    { t: 'Uptime Monitor', cat: 'tool', icon: 'radio', c: ['#0ea5e9', '#6366f1'], d: 'Pings services every minute and alerts a Discord channel with latency graphs when something goes down.', tags: ['Node', 'Cron', 'Webhooks'], gh: '#' }
  ];
  $('#projectGrid').innerHTML = projects.map((p, i) => `
    <article class="card project reveal tilt" data-cat="${p.cat}" style="--d:${i * 80}ms">
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
    { label: 'Refresh bot stats', kbd: 'R', run: () => loadAll(true) },
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
     LIVE DATA: bot stats API + Discord widget
     =================================================================== */
  const statusEl = $('#botStatus');
  const setStatus = (mode, text) => { statusEl.className = 'status-pill ' + mode; statusEl.innerHTML = `<span class="live-dot"></span> ${text}`; };
  const prev = {};
  const setStat = (id, val, deltaId, raw) => {
    const el = $(id); el.textContent = val;
    if (deltaId && raw != null) { const d = $(deltaId), p = prev[id]; if (p != null && p !== raw) { const diff = raw - p; d.innerHTML = icon(diff > 0 ? 'trendUp' : 'trendDown') + (diff > 0 ? '+' : '-') + fmt(Math.abs(diff)); d.classList.toggle('down', diff < 0); } prev[id] = raw; }
  };
  const uptimeStr = s => { const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`; };

  /* Demo data generator (used when the bot API is not reachable) */
  const demo = (() => {
    let base = { guilds: 42, members: 18640, online: 3120, commands: 152340, uptime: 86400 * 3 + 5400, ping: 38, memory: 142.3, cpu: 2.4 };
    const cmds = ['play', 'help', 'ban', 'rank', 'ticket', 'meme', 'poll', 'skip'];
    return () => {
      base.online = Math.max(500, base.online + Math.round((Math.random() - .48) * 60));
      base.commands += Math.round(Math.random() * 12); base.uptime += CFG.REFRESH_INTERVAL_MS / 1000; base.ping = 30 + Math.round(Math.random() * 25);
      base.memory = +(135 + Math.random() * 15).toFixed(1); base.cpu = +(1 + Math.random() * 4).toFixed(1);
      const now = Date.now(), activity = Array.from({ length: 24 }, (_, i) => ({ t: now - (23 - i) * 3600e3, online: Math.round(2200 + Math.sin(i / 3.8) * 700 + Math.random() * 200) }));
      return { ...base, status: 'demo', topCommands: cmds.map((n, i) => ({ name: n, count: Math.round(40000 / (i + 1) + Math.random() * 500) })), activity, events: [{ t: now - 12e4, text: 'Executed /play in Lounge' }, { t: now - 34e4, text: 'Member joined: nova_fan' }, { t: now - 61e4, text: 'Joined guild "Pixel Hub"' }, { t: now - 9e5, text: 'Ticket #482 closed' }] };
    };
  })();

  /* Activity chart (canvas, hi-dpi, hover tooltip) */
  const canvas = $('#activityChart'), ctx = canvas.getContext('2d');
  let activity = [], range = 24, hoverX = null;
  function drawChart() {
    const dpr = devicePixelRatio || 1, w = canvas.clientWidth, h = 220;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const data = activity.slice(-range); if (data.length < 2) return;
    const pad = { l: 44, r: 12, t: 16, b: 26 }, cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
    let min = Math.min(...data.map(d => d.online)) * .9, max = Math.max(...data.map(d => d.online)) * 1.05; if (max - min < 1) { max = min + 10; }
    const X = i => pad.l + i / (data.length - 1) * cw, Y = v => pad.t + ch - (v - min) / (max - min) * ch;
    const css = getComputedStyle(root), muted = css.getPropertyValue('--muted').trim(), accent = css.getPropertyValue('--accent').trim(), accent2 = css.getPropertyValue('--accent-2').trim();
    ctx.font = '11px ' + css.getPropertyValue('--mono'); ctx.fillStyle = muted; ctx.strokeStyle = css.getPropertyValue('--border').trim(); ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) { const y = pad.t + ch * g / 4; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(fmt(Math.round(max - (max - min) * g / 4)), pad.l - 8, y + 4); }
    ctx.textAlign = 'center'; const step = Math.ceil(data.length / 6);
    data.forEach((d, i) => { if (i % step === 0) ctx.fillText(new Date(d.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), X(i), h - 8); });
    const hex6 = /^#[0-9a-f]{6}$/i.test(accent); const grad = ctx.createLinearGradient(0, pad.t, 0, h); grad.addColorStop(0, hex6 ? accent + '66' : accent); grad.addColorStop(1, hex6 ? accent + '00' : 'transparent');
    ctx.beginPath(); data.forEach((d, i) => i ? ctx.lineTo(X(i), Y(d.online)) : ctx.moveTo(X(i), Y(d.online)));
    const line = new Path2D(); data.forEach((d, i) => i ? line.lineTo(X(i), Y(d.online)) : line.moveTo(X(i), Y(d.online)));
    ctx.lineTo(X(data.length - 1), pad.t + ch); ctx.lineTo(X(0), pad.t + ch); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    const lg = ctx.createLinearGradient(pad.l, 0, w, 0); lg.addColorStop(0, accent); lg.addColorStop(1, accent2);
    ctx.strokeStyle = lg; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke(line);
    if (hoverX != null) {
      const i = Math.round((hoverX - pad.l) / cw * (data.length - 1)); if (i < 0 || i >= data.length) return;
      const x = X(i), y = Y(data[i].online); ctx.strokeStyle = muted; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ch); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = accent2; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill();
      const label = `${fmt(data[i].online)} online · ${new Date(data[i].t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`; ctx.font = '600 12px ' + css.getPropertyValue('--font'); const tw = ctx.measureText(label).width + 16, tx = Math.min(Math.max(x - tw / 2, pad.l), w - pad.r - tw);
      ctx.fillStyle = css.getPropertyValue('--text').trim(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(tx, pad.t - 4, tw, 24, 6) : ctx.rect(tx, pad.t - 4, tw, 24); ctx.fill(); ctx.fillStyle = css.getPropertyValue('--bg').trim(); ctx.textAlign = 'center'; ctx.fillText(label, tx + tw / 2, pad.t + 12);
    }
  }
  canvas.onmousemove = e => { hoverX = e.offsetX; drawChart(); }; canvas.onmouseleave = () => { hoverX = null; drawChart(); };
  canvas.addEventListener('touchmove', e => { hoverX = e.touches[0].clientX - canvas.getBoundingClientRect().left; drawChart(); }, { passive: true });
  addEventListener('resize', drawChart); new MutationObserver(drawChart).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  $('#rangeChips').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; range = +b.dataset.range; $$('.chip', e.currentTarget).forEach(c => c.classList.toggle('active', c === b)); drawChart(); };

  /* Event log */
  const logEl = $('#eventLog'); let seenEvents = new Set();
  const addEvent = (text, t = Date.now(), key = text + t) => { if (seenEvents.has(key)) return; seenEvents.add(key); const li = document.createElement('li'); li.innerHTML = `<time>${new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time><span>${esc(text)}</span>`; logEl.prepend(li); while (logEl.children.length > 40) logEl.lastChild.remove(); };
  $('#clearLog').onclick = () => { logEl.innerHTML = ''; seenEvents.clear(); };

  /* Apply bot stats */
  function applyStats(s, isDemo) {
    ['guilds', 'members', 'online', 'commands', 'uptime', 'ping', 'memory', 'cpu'].forEach(k => s[k] = +s[k] || 0);
    setStat('#statGuilds', fmt(s.guilds), '#statGuildsDelta', s.guilds); setStat('#statMembers', fmt(s.members), '#statMembersDelta', s.members);
    setStat('#statOnline', fmt(s.online), '#statOnlineDelta', s.online); setStat('#statCommands', fmt(s.commands), '#statCommandsDelta', s.commands);
    setStat('#statUptime', uptimeStr(s.uptime)); $('#statPing').textContent = `${s.ping} ms`;
    setStat('#statMemory', `${s.memory} MB`); $('#statCpu').textContent = `CPU ${s.cpu}%`;
    const hs = $('#heroServers'); hs.dataset.count = s.guilds; if (hs.dataset.animated) hs.textContent = fmt(s.guilds);
    const top = Array.isArray(s.topCommands) ? s.topCommands : [];
    const maxC = Math.max(1, ...top.map(c => +c.count || 0));
    $('#commandList').innerHTML = top.length ? top.slice(0, 6).map(c => `<li><code>/${esc(c.name)}</code><span>${fmt(c.count)}</span><div class="bar"><i data-w="${c.count / maxC * 100}%" style="width:${c.count / maxC * 100}%"></i></div></li>`).join('') : '<li class="muted">No commands recorded yet.</li>';
    activity = s.activity || []; drawChart();
    (s.events || []).slice().reverse().forEach(e => addEvent(e.text, e.t, isDemo ? e.text : undefined));
    setStatus(isDemo ? 'demo' : (s.status === 'online' ? '' : 'offline'), isDemo ? 'Demo data' : s.status === 'online' ? 'Bot online' : 'Bot offline');
    $('#lastUpdated').textContent = 'Updated ' + new Date().toLocaleTimeString();
  }
  async function loadStats() {
    if (CFG.BOT_API_URL) {
      try { const r = await fetch(CFG.BOT_API_URL, { cache: 'no-store' }); if (r.ok) { applyStats(await r.json(), false); return; } } catch { }
    }
    applyStats(demo(), true);
  }

  /* Discord widget */
  let members = [];
  const initials = n => (n || '?').split(/\s|_/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const avatarHTML = m => `<div class="avatar">${m.avatar_url ? `<img src="${m.avatar_url}" alt="" loading="lazy">` : esc(initials(m.username))}<i class="${m.status}"></i></div>`;
  function renderMembers() {
    const q = $('#memberSearch').value.toLowerCase(), st = $('#memberStatusFilter').value;
    const list = members.filter(m => m.username.toLowerCase().includes(q) && (st === 'all' || m.status === st));
    $('#memberList').innerHTML = list.length ? list.map(m => `<li class="member">${avatarHTML(m)}<div><div class="member-name">${esc(m.username)}</div>${m.game ? `<div class="member-game">${icon('gamepad')} ${esc(m.game.name)}</div>` : ''}</div></li>`).join('') : '<li class="muted">No members match.</li>';
  }
  $('#memberSearch').oninput = renderMembers; $('#memberStatusFilter').onchange = renderMembers;
  function applyWidget(w, isDemo) {
    $('#guildName').textContent = w.name; $('#presenceCount').textContent = w.presence_count;
    const inv = $('#inviteBtn'); if (w.instant_invite) { inv.href = w.instant_invite; inv.hidden = false; } else inv.hidden = true;
    members = w.members || []; renderMembers();
    const chans = (w.channels || []).sort((a, b) => a.position - b.position);
    $('#channelList').innerHTML = chans.length ? chans.map(c => { const u = members.filter(m => m.channel_id === c.id); return `<li class="channel"><div class="channel-title"><span>${icon('volume')} ${esc(c.name)}</span><span class="muted">${u.length}</span></div>${u.length ? `<div class="channel-users">${u.map(avatarHTML).join('')}</div>` : ''}</li>`; }).join('') : '<li class="muted">No voice channels.</li>';
    $('#setupNote').hidden = !isDemo;
  }
  const demoWidget = () => ({ name: 'Nova Community (demo)', presence_count: 3120, instant_invite: '', channels: [{ id: '1', name: 'Lounge', position: 0 }, { id: '2', name: 'Gaming', position: 1 }, { id: '3', name: 'Music', position: 2 }], members: [['Moin', 'online', '1', 'Visual Studio Code'], ['nova_fan', 'idle', '1'], ['pixel', 'dnd', '2', 'Valorant'], ['sky', 'online', '2', 'Minecraft'], ['zed', 'online'], ['luna', 'idle'], ['kai', 'online', '3', 'Spotify'], ['aria', 'dnd']].map(([u, s, ch, g], i) => ({ id: String(i), username: u, status: s, channel_id: ch, game: g ? { name: g } : null })) });
  async function loadWidget() {
    if (CFG.DISCORD_SERVER_ID) {
      try { const r = await fetch(`https://discord.com/api/guilds/${CFG.DISCORD_SERVER_ID}/widget.json`, { cache: 'no-store' }); if (r.ok) { applyWidget(await r.json(), false); return; } } catch { }
    }
    applyWidget(demoWidget(), true);
  }

  let loading = false;
  async function loadAll(manual) { if (loading) return; loading = true; const b = $('#refreshBtn'); b.disabled = true; b.classList.add('spinning'); b.lastElementChild.textContent = 'Refreshing…'; await Promise.all([loadStats(), loadWidget()]); b.disabled = false; b.classList.remove('spinning'); b.lastElementChild.textContent = 'Refresh'; loading = false; if (manual) toast('Dashboard refreshed'); }
  $('#refreshBtn').onclick = () => loadAll(true);
  loadAll(); setInterval(() => document.visibilityState === 'visible' && loadAll(), CFG.REFRESH_INTERVAL_MS || 30000);
})();
