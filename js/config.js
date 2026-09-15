/**
 * ============================================================
 *  SITE CONFIG — edit this file to connect your own Discord bot
 * ============================================================
 *
 * Two live data sources are supported:
 *
 * 1) DISCORD WIDGET (no backend needed)
 *    Discord → Server Settings → Widget → "Enable Server Widget"
 *    Then paste your Server ID below. This gives online members,
 *    presence count, voice channels and the instant invite.
 *
 * 2) YOUR BOT'S STATS API (optional)
 *    Point BOT_API_URL at an endpoint your bot exposes.
 *    See server/bot-example.js for a drop-in discord.js + express
 *    example that returns the expected JSON shape:
 *    {
 *      status: "online", guilds: 12, members: 4380, online: 912,
 *      commands: 15234, uptime: 86400 (seconds), ping: 42,
 *      memory: 128.5 (MB), cpu: 3.1 (%),
 *      topCommands: [{ name: "play", count: 4021 }, ...],
 *      activity: [{ t: 1700000000000, online: 812 }, ...],
 *      events: [{ t: 1700000000000, text: "Joined guild Foo" }, ...]
 *    }
 *
 * If either source is unreachable, the dashboard falls back to
 * realistic demo data so the page always looks alive.
 */
window.SITE_CONFIG = {
  DISCORD_SERVER_ID: "1454200146400251907",  // your Discord server (guild) ID
  BOT_API_URL: "/api/stats",       // e.g. "https://mybot.example.com/api/stats" ("" to disable)
  REFRESH_INTERVAL_MS: 30000,      // how often to refresh live data
  DISCORD_USERNAME: "moin",        // shown in the contact section
  FORMSPREE_ID: ""                 // optional: Formspree form id for the contact form
};
