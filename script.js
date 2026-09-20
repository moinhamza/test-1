/* ============================================================
   CONFIGURATION
   ============================================================ */
const CONFIG = {
    // Your Discord User ID for live profile + activity via Lanyard
    DISCORD_ID: '1426949078738276525',

    // Spotify OAuth — redirect returns to your site, which auto-exchanges the code
    SPOTIFY: {
        client_id: '749fed04cd1f43cf8166f5b90359f0c8',
        client_secret: 'db09609d12ca489ba949c95ab513c8ac',
        redirect_uri: 'https://moinhamza.antideploy.com/',
        scope: 'user-read-recently-played',
        // Static tokens (optional — the OAuth flow above fills localStorage instead)
        access_token: '',
        refresh_token: '',
    },

    SPOTIFY_TRACK_COUNT: 5,
    SPOTIFY_REFRESH_MIN: 5 * 60 * 1000, // re-check tracks every 5 min
};

const LS_TOKEN_KEY = 'spotify_auth_cache';

/* ============================================================
   TOKEN MANAGEMENT
   ============================================================ */
const Tokens = {
    current: null,
    expiresAt: 0,

    readCache() {
        try {
            return JSON.parse(localStorage.getItem(LS_TOKEN_KEY) || 'null');
        } catch (e) {
            return null;
        }
    },

    writeCache(data) {
        try {
            localStorage.setItem(LS_TOKEN_KEY, JSON.stringify({
                access_token: data.access_token,
                refresh_token: data.refresh_token || this.readCache()?.refresh_token || null,
                expires_at: Date.now() + (data.expires_in - 60) * 1000,
            }));
        } catch (e) { /* storage unavailable */ }
    },

    async fetchNew(override) {
        const { client_id, client_secret, redirect_uri, refresh_token, access_token } = CONFIG.SPOTIFY;
        const cached = this.readCache();

        // 1. Use a still-fresh cached access token
        if (cached && cached.access_token && cached.expires_at > Date.now() + 60_000) {
            this.current = cached.access_token;
            this.expiresAt = cached.expires_at;
            return true;
        }

        // 2. Refresh with a stored or configured refresh token
        const rt = override || cached?.refresh_token || refresh_token;
        if (rt && client_id && client_secret) {
            try {
                const res = await fetch('https://accounts.spotify.com/api/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': 'Basic ' + btoa(`${client_id}:${client_secret}`),
                    },
                    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: rt }),
                });
                if (res.ok) {
                    const data = await res.json();
                    this.current = data.access_token;
                    this.expiresAt = Date.now() + (data.expires_in - 60) * 1000;
                    this.writeCache(data);
                    return true;
                }
                console.warn('Spotify refresh failed:', res.status);
            } catch (e) {
                console.warn('Spotify refresh error:', e);
            }
        }

        // 3. Fall back to a static access token
        if (access_token) {
            this.current = access_token;
            return true;
        }
        return false;
    },

    async exchangeAuthCode(code) {
        const { client_id, client_secret, redirect_uri, scope } = CONFIG.SPOTIFY;
        const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(`${client_id}:${client_secret}`),
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri,
            }),
        });
        if (!res.ok) {
            console.warn('Spotify auth code exchange failed:', res.status);
            return false;
        }
        const data = await res.json();
        this.current = data.access_token;
        this.expiresAt = Date.now() + (data.expires_in - 60) * 1000;
        this.writeCache(data);
        return true;
    },

    buildAuthUrl() {
        const { client_id, redirect_uri, scope } = CONFIG.SPOTIFY;
        const p = new URLSearchParams({
            client_id,
            response_type: 'code',
            redirect_uri,
            scope,
        });
        return `https://accounts.spotify.com/authorize?${p.toString()}`;
    },
};

/* ============================================================
   LANYARD — Discord profile, status, activity, current Spotify
   ============================================================ */
const Lanyard = {
    ws: null,

    connect() {
        if (!CONFIG.DISCORD_ID) return;
        try {
            this.ws = new WebSocket('wss://api.lanyard.rest/socket');
            this.ws.onopen = () => {
                this.ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: CONFIG.DISCORD_ID } }));
            };
            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.op === 0 && msg.d && msg.d.discord_user) {
                        this.render(msg.d);
                    }
                } catch (e) { /* ignore malformed frames */ }
            };
            this.ws.onclose = () => setTimeout(() => this.connect(), 5000);
        } catch (e) {
            console.warn('Lanyard unavailable:', e);
        }
    },

    render(d) {
        // --- avatar + name ---
        const user = d.discord_user;
        const avatarEl = document.querySelector('.avatar-placeholder');
        if (avatarEl) {
            const url = user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
                : null;
            const name = user.global_name || user.username;
            const nameEl = document.querySelector('.profile-name');
            if (nameEl) nameEl.textContent = name;
            const initials = (name.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/)
                .map(w => w[0]).join('').slice(0, 2).toUpperCase()) || '?';
            avatarEl.innerHTML = url
                ? `<img src="${url}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
                : `<span class="avatar-initials">${initials}</span>`;
        }

        // --- status ---
        const statusMap = {
            online: { text: 'Online', color: '#23a55a' },
            idle: { text: 'Idle', color: '#f0b232' },
            dnd: { text: 'Do Not Disturb', color: '#f23f43' },
            invisible: { text: 'Invisible', color: '#808080' },
            offline: { text: 'Offline', color: '#808080' },
        };
        const st = statusMap[d.discord_status] || statusMap.offline;
        const pill = document.querySelector('.status-indicator');
        if (pill) {
            pill.style.background = `${st.color}1a`;
            pill.style.borderColor = `${st.color}40`;
            pill.style.color = st.color;
            pill.querySelector('.status-dot').style.background = st.color;
            pill.querySelector('.status-text').textContent = st.text;
        }
        const dDot = document.querySelector('.status-indicator-small');
        if (dDot) dDot.style.background = st.color;
        const dName = document.querySelector('.discord-username');
        if (dName) dName.textContent = user.username;

        // --- activity ---
        const actBox = document.querySelector('.discord-activity');
        const actEl = document.querySelector('.activity-content');
        const custom = (d.activities || []).find(a => a.type === 4);
        const appAct = (d.activities || []).find(a => a.type !== 4);
        const target = appAct || custom;

        if (actBox && actEl) {
            if (!target) {
                actBox.style.display = 'none';
            } else {
                actBox.style.display = 'block';
                const typeIcon = { 0: 'fas fa-gamepad', 1: 'fas fa-video', 2: 'fas fa-headphones', 3: 'fas fa-eye', 5: 'fas fa-trophy', 4: 'fas fa-comment' };
                const typeVerb = { 0: 'Playing', 1: 'Streaming', 2: 'Listening to', 3: 'Watching', 5: 'Competing in' };
                const icon = typeIcon[target.type] || 'fas fa-circle';
                const text = target.type === 4 ? target.name : `${typeVerb[target.type]} ${target.name}`;
                actEl.innerHTML = `<i class="${icon}"></i><span>${this.esc(text)}</span>`;
            }
        }

        // --- current Spotify song (listening via Discord) ---
        const listening = (d.activities || []).find(a => a.type === 2);
        if (listening) {
            const spotify = d.spotify || {};
            const art = spotify.album_art_url
                ? spotify.album_art_url.replace(/174x174/, '300x300')
                : null;
            Spotify.showNowPlaying(spotify.song || listening.name, spotify.artist || 'Spotify', art);
        }
    },

    esc(s) {
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    },
};

/* ============================================================
   SPOTIFY — Recently played list + now-playing highlight
   ============================================================ */
const Spotify = {
    container: document.querySelector('.spotify-tracks'),

    async loadRecentlyPlayed() {
        if (!this.container) return;
        if (!(await Tokens.fetchNew())) {
            console.log('No Spotify token available — showing placeholder tracks.');
            return;
        }
        try {
            const res = await fetch(
                `https://api.spotify.com/v1/me/player/recently-played?limit=${CONFIG.SPOTIFY_TRACK_COUNT}`,
                { headers: { Authorization: `Bearer ${Tokens.current}` } }
            );
            if (!res.ok) {
                console.warn('Spotify recently-played returned', res.status);
                return;
            }
            const data = await res.json();
            const items = (data.items || []).slice(0, CONFIG.SPOTIFY_TRACK_COUNT);
            if (items.length) {
                this.renderTracks(items.map(i => ({
                    name: i.track.name,
                    artist: i.track.artists.map(a => a.name).join(', '),
                    cover: i.track.album.images[1] ? i.track.album.images[1].url : (i.track.album.images[0] || null),
                })));
            }
        } catch (e) {
            console.warn('Spotify fetch failed:', e);
        }
    },

    renderTracks(tracks) {
        if (!this.container) return;
        const esc = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
        this.container.innerHTML = tracks.map(t => `
            <div class="track-item">
                <div class="track-cover">
                    ${t.cover ? `<img src="${t.cover}" alt="cover" style="width:100%;height:100%;border-radius:8px;object-fit:cover;">` : '<i class="fas fa-music"></i>'}
                </div>
                <div class="track-info">
                    <h4 class="track-name">${esc(t.name)}</h4>
                    <p class="track-artist">${esc(t.artist)}</p>
                </div>
                <div class="track-duration"><span><i class="fas fa-bars" style="font-size:9px;"></i></span></div>
            </div>
        `).join('');
    },

    showNowPlaying(name, artist, artUrl) {
        const list = document.querySelector('.spotify-tracks');
        if (!list) return;
        const esc = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
        const rowHtml = `
            <div class="track-item now-playing">
                <div class="track-cover">
                    ${artUrl ? `<img src="${artUrl}" alt="cover" style="width:100%;height:100%;border-radius:8px;object-fit:cover;">` : '<i class="fas fa-music"></i>'}
                </div>
                <div class="track-info">
                    <h4 class="track-name">${esc(name)} <i class="fas fa-circle-play" style="font-size:10px;color:var(--accent-spotify);margin-left:6px;"></i></h4>
                    <p class="track-artist">${esc(artist)}</p>
                </div>
                <div class="track-duration"><span>Now</span></div>
            </div>
        `;
        let row = document.querySelector('.track-item.now-playing');
        if (!row) list.insertAdjacentHTML('afterbegin', rowHtml);
        else row.outerHTML = rowHtml;
    },
};

/* ============================================================
   INIT — OAuth callback, connect button, data loads
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
    const btn = document.getElementById('spotify-connect');
    const setLinked = (on) => {
        document.body.classList.toggle('spotify-linked', on);
        const s = btn?.querySelector('span');
        if (s) s.textContent = on ? 'Linked' : 'Connect';
    };

    // 1. If we just came back from Spotify OAuth, exchange the code
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    if (code) {
        history.replaceState({}, '', location.pathname); // clean the URL
        const ok = await Tokens.exchangeAuthCode(code);
        if (ok) {
            setLinked(true);
            console.log('Spotify linked successfully.');
        } else {
            console.warn('Spotify code exchange failed.');
        }
    }

    // 2. Reflect cached linked state + wire the Connect button
    if (!code) {
        const cached = Tokens.readCache();
        setLinked(!!(cached && cached.access_token));
    }
    if (btn) {
        btn.addEventListener('click', () => {
            window.location.href = Tokens.buildAuthUrl();
        });
    }

    // 3. Live data
    Lanyard.connect();
    Spotify.loadRecentlyPlayed();
    setInterval(() => Spotify.loadRecentlyPlayed(), CONFIG.SPOTIFY_REFRESH_MIN);
});
