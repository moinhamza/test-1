# Moin Hamza — Portfolio & Live Discord Dashboard

A fully responsive, dependency-free static website combining a personal portfolio with a **live Discord bot dashboard**.

## Features
- 🎨 **Dark / light theme** (remembers your choice, respects system preference)
- 📱 **Fully responsive** — mobile hamburger nav, fluid grids, touch-friendly chart
- 📊 **Bot dashboard** — servers, members, online, commands, uptime, ping, memory, CPU, with live deltas
- 📈 **Activity chart** (hand-drawn canvas, hi-DPI, hover/touch tooltip, 6h/12h/24h ranges)
- 💬 **Live Discord widget** — online members with status/activity, voice channels, invite link, search & filter
- 🔔 **Event log** — recent bot events
- 🗂️ **Projects** with category filters, **skills** with animated bars
- ✅ **Workspace** — tasks (filters, persistence) and notes (autosave, markdown preview, export)
- ⌘K **Command palette** for quick navigation & actions
- ✉️ Contact form with validation (optional Formspree)
- ♿ Skip link, ARIA labels, reduced-motion support

## Run locally
```bash
npm start          # serves the site at http://localhost:3000
```
or just open `index.html` in a browser.

## Connect your Discord bot

### 1. Discord widget (no backend)
Discord → **Server Settings → Widget → Enable Server Widget**, then in `js/config.js`:
```js
DISCORD_SERVER_ID: "1234567890123456789"
```

### 2. Bot stats API (optional)
`server/bot-example.js` is a drop-in discord.js + Express server exposing `GET /api/stats` and serving the site:
```bash
npm i discord.js express cors
DISCORD_TOKEN=your_token npm run bot
```
Point `BOT_API_URL` in `js/config.js` at it (default `/api/stats`). If you already have a bot, copy the `/api/stats` handler into it — the expected JSON shape is documented in `js/config.js`.

When neither source is reachable, the dashboard shows clearly-labelled **demo data** so the page never looks broken.
