/**
 * Drop-in stats API for your discord.js bot.
 * ------------------------------------------------
 *   npm i discord.js express cors
 *   DISCORD_TOKEN=xxx node server/bot-example.js
 *
 * Exposes GET /api/stats in the exact shape js/app.js expects,
 * and also serves the website from the repo root so you can run
 * everything from one process. Set BOT_API_URL in js/config.js to
 * "/api/stats" (same origin) or to your bot's public URL.
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers] });
const commandCounts = new Map();
const events = [];
const activity = []; // 24h ring buffer of online counts
const pushEvent = text => { events.unshift({ t: Date.now(), text }); events.length = Math.min(events.length, 30); };

client.on('interactionCreate', i => {
  if (!i.isChatInputCommand()) return;
  commandCounts.set(i.commandName, (commandCounts.get(i.commandName) || 0) + 1);
  pushEvent(`Executed /${i.commandName} in ${i.guild?.name ?? 'DM'}`);
});
client.on('guildCreate', g => pushEvent(`Joined guild "${g.name}"`));
client.on('guildDelete', g => pushEvent(`Left guild "${g.name}"`));
client.on('guildMemberAdd', m => pushEvent(`Member joined: ${m.user.username}`));

const onlineCount = () => client.guilds.cache.reduce((n, g) => n + g.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size, 0);
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  setInterval(() => { activity.push({ t: Date.now(), online: onlineCount() }); if (activity.length > 24) activity.shift(); }, 60 * 60 * 1000);
  activity.push({ t: Date.now(), online: onlineCount() });
});

const app = express();
app.use(cors());
app.get('/api/stats', (_req, res) => {
  const mem = process.memoryUsage().rss / 1024 / 1024;
  res.json({
    status: client.isReady() ? 'online' : 'offline',
    guilds: client.guilds.cache.size,
    members: client.guilds.cache.reduce((n, g) => n + g.memberCount, 0),
    online: onlineCount(),
    commands: [...commandCounts.values()].reduce((a, b) => a + b, 0),
    uptime: Math.floor(process.uptime()),
    ping: client.ws.ping,
    memory: +mem.toFixed(1),
    cpu: +(process.cpuUsage().user / 1e6 / process.uptime()).toFixed(1),
    topCommands: [...commandCounts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    activity,
    events
  });
});
app.use(express.static(path.join(__dirname, '..')));
app.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('🌐 http://localhost:' + (process.env.PORT || 3000)));
client.login(process.env.DISCORD_TOKEN);
