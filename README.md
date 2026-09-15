# Moin Hamza — Developer Portfolio

A responsive, dependency-free portfolio site with a browser arcade and a live Discord community panel. Vanilla HTML, CSS and JavaScript.

## Features
- **Mini games** — Tic-Tac-Toe (unbeatable minimax AI), Memory match, canvas Snake (keyboard, swipe and on-screen d-pad) and a Reaction-time tester, with a local leaderboard
- **Live Discord panel** — server name, online members with status and activity, voice channels and invite link via the Discord widget API
- **Projects** with category filters, **skills** with animated bars, **experience** timeline
- **Workspace** — tasks and notes with autosave, markdown preview and export
- Dark / light theme, Ctrl+K command palette, scroll progress, back-to-top
- Contact form with validation (optional Formspree)
- Fully responsive; keyboard accessible; honours `prefers-reduced-motion`

## Run locally
```bash
npm start   # http://localhost:3000
```
or open `index.html` directly.

## Configuration — `js/config.js`
| Key | Description |
|---|---|
| `DISCORD_SERVER_ID` | Your server (guild) ID. Enable **Server Settings → Widget → Enable Server Widget** in Discord. |
| `REFRESH_INTERVAL_MS` | Refresh interval for Discord data (default 30 s). |
| `DISCORD_USERNAME` | Shown in the contact section. |
| `FORMSPREE_ID` | Optional Formspree form ID for the contact form. |

If the widget is unreachable the Discord panel shows labelled demo data with a note explaining why.
