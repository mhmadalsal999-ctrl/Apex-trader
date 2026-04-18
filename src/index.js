import 'dotenv/config';
import http from 'http'; // إضافة مكتبة http لفتح المنفذ
import { initDB }           from './db/supabase.js';
import { startBot }         from './bot/index.js';
import { startScheduler }   from './news/scheduler.js';

// --- كود فتح المنفذ لإرضاء Render ---
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Apex Bot is Live and Active!');
}).listen(port, () => {
  console.log(`✅ Render Port Binding successful on port ${port}`);
});
// -----------------------------------

async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   APEX SOVEREIGN CONSCIOUSNESS v3.0      ║');
  console.log('║   Institutional Forex Intelligence       ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Validate critical env vars
  const required = ['TELEGRAM_BOT_TOKEN','TELEGRAM_CHAT_ID','FINNHUB_API_KEY','SUPABASE_URL','SUPABASE_KEY'];
  const missing  = required.filter(k => !process.env[k]);
  if (missing.length) { console.error('❌ Missing:', missing.join(', ')); process.exit(1); }

  const provider = process.env.AI_PROVIDER || 'grok';
  const keyMap   = { grok: 'GROK_API_KEY', anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY' };
  if (!process.env[keyMap[provider]]) {
    console.error(`❌ ${keyMap[provider]} required for AI_PROVIDER=${provider}`);
    process.exit(1);
  }

  await initDB();           console.log('✅ Supabase connected');
  const bot = await startBot(); console.log('✅ Telegram bot running');
  await startScheduler(bot);    console.log('✅ News monitor active\n');

  console.log(`🔥 APEX is LIVE`);
  console.log(`🤖 AI: ${provider} | 🌐 Lang: ${process.env.BOT_LANGUAGE || 'en'} | 📡 Interval: 30s\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
