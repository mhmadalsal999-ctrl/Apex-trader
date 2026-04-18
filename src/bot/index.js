import TelegramBot          from 'node-telegram-bot-api';
import { getWeeklyAnalysis, getMonthlyAnalysis, getYearlyAnalysis } from '../ai/agent.js';
import { getMarketData }     from '../market/data.js';
import { getStoredAnalysis } from '../db/supabase.js';
import { formatDNAMessage, chunkText } from '../utils/formatter.js';
import { t, getSessionDetails }        from '../utils/i18n.js';
import { getActiveModel }              from '../ai/providers.js';

let bot = null;

export async function startBot() {
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

  // ── /start ───────────────────────────────────────────────────────────────────
  bot.onText(/\/start/, msg => send(msg.chat.id, t.welcome()));

  // ── /market ──────────────────────────────────────────────────────────────────
  bot.onText(/\/market/, async msg => {
    const w = await send(msg.chat.id, '⏳ Fetching live prices...');
    try {
      const data = await getMarketData();
      const isAr = isArabic();
      const entries = Object.entries(data);

      if (!entries.length) {
        return edit(msg.chat.id, w.message_id,
          isAr ? '⚠️ بيانات السوق غير متاحة حالياً (السوق مغلق أو مشكلة في الاتصال)'
               : '⚠️ Market data unavailable (market closed or connection issue)');
      }

      let text  = isAr ? '📊 *وضع السوق الآن*\n' : '📊 *Live Market Snapshot*\n';
      text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

      // Group by type
      const forex = entries.filter(([s])=>!s.includes('XAU')&&!s.includes('XAG')&&!s.includes('OIL')&&!s.includes('GAS'));
      const comms = entries.filter(([s])=> s.includes('XAU')||s.includes('XAG')||s.includes('OIL')||s.includes('GAS'));

      if (forex.length) {
        text += isAr ? '💱 *أزواج الفوركس*\n' : '💱 *Forex Pairs*\n';
        forex.forEach(([sym, d]) => {
          const isUp    = d.change && !d.change.startsWith('-');
          const arrow   = d.change === 'N/A' ? '•' : isUp ? '📈' : '📉';
          const chgStr  = d.change === 'N/A' ? '' : ` _(${d.change})_`;
          text += `${arrow} \`${sym}\` *${d.price}*${chgStr}\n`;
        });
      }

      if (comms.length) {
        text += isAr ? '\n🏅 *السلع*\n' : '\n🏅 *Commodities*\n';
        comms.forEach(([sym, d]) => {
          const arrow = d.change && !d.change.startsWith('-') ? '📈' : '📉';
          const chgStr = d.change === 'N/A' ? '' : ` _(${d.change})_`;
          text += `${arrow} \`${sym}\` *${d.price}*${chgStr}\n`;
        });
      }

      text += `\n_🕐 ${new Date().toUTCString()}_`;
      await edit(msg.chat.id, w.message_id, text);
    } catch(e) {
      await edit(msg.chat.id, w.message_id, `❌ Error: ${e.message}`);
    }
  });

  // ── /session ─────────────────────────────────────────────────────────────────
  bot.onText(/\/session/, msg => send(msg.chat.id, getSessionDetails()));

  // ── /weekly ──────────────────────────────────────────────────────────────────
  bot.onText(/\/weekly/, async msg => {
    const w = await send(msg.chat.id, isArabic() ? '⏳ جاري إعداد التحليل الأسبوعي...' : '⏳ Preparing weekly analysis...');
    try {
      const text = await getWeeklyAnalysis();
      await edit(msg.chat.id, w.message_id, text);
    } catch(e) { await edit(msg.chat.id, w.message_id, `❌ ${e.message}`); }
  });

  // ── /monthly ─────────────────────────────────────────────────────────────────
  bot.onText(/\/monthly/, async msg => {
    const w = await send(msg.chat.id, isArabic() ? '⏳ جاري إعداد التحليل الشهري...' : '⏳ Preparing monthly analysis...');
    try {
      const text = await getMonthlyAnalysis();
      await edit(msg.chat.id, w.message_id, text);
    } catch(e) { await edit(msg.chat.id, w.message_id, `❌ ${e.message}`); }
  });

  // ── /yearly ──────────────────────────────────────────────────────────────────
  bot.onText(/\/yearly/, async msg => {
    const w = await send(msg.chat.id, isArabic() ? '⏳ جاري إعداد التحليل السنوي...' : '⏳ Preparing yearly analysis...');
    try {
      const text = await getYearlyAnalysis();
      await edit(msg.chat.id, w.message_id, text);
    } catch(e) { await edit(msg.chat.id, w.message_id, `❌ ${e.message}`); }
  });

  // ── /status ───────────────────────────────────────────────────────────────────
  bot.onText(/\/status/, msg => {
    const up  = process.uptime();
    const hrs = Math.floor(up/3600), min = Math.floor((up%3600)/60), sec = Math.floor(up%60);
    const ar  = isArabic();
    const txt = ar
      ? `⚙️ *حالة البوت*\n━━━━━━━━━━━━━━━━━━━━\n\n🤖 *AI:* \`${getActiveModel()}\`\n🌐 *اللغة:* العربية\n📡 *الفحص:* كل 30 ثانية\n⏱ *وقت التشغيل:* ${hrs}h ${min}m ${sec}s\n📊 *الحد الأدنى للخبر:* ${process.env.MIN_IMPACT_SCORE||5}/10\n✅ *الحالة:* يعمل بشكل طبيعي`
      : `⚙️ *Bot Status*\n━━━━━━━━━━━━━━━━━━━━\n\n🤖 *AI:* \`${getActiveModel()}\`\n🌐 *Language:* English\n📡 *Check interval:* 30s\n⏱ *Uptime:* ${hrs}h ${min}m ${sec}s\n📊 *Min impact score:* ${process.env.MIN_IMPACT_SCORE||5}/10\n✅ *Status:* Running normally`;
    send(msg.chat.id, txt);
  });

  // ── /language ─────────────────────────────────────────────────────────────────
  bot.onText(/\/language/, msg => {
    const cur  = process.env.BOT_LANGUAGE || 'en';
    process.env.BOT_LANGUAGE = cur==='en' ? 'ar' : 'en';
    const next = process.env.BOT_LANGUAGE;
    send(msg.chat.id,
      next==='ar'
        ? '✅ *تم التبديل إلى العربية*\nTo switch back: /language'
        : '✅ *Switched to English*\nللتبديل للعربية: /language', true);
  });

  // ── Inline callbacks ──────────────────────────────────────────────────────────
  bot.on('callback_query', async query => {
    const chatId = query.message.chat.id;
    const data   = query.data;
    await bot.answerCallbackQuery(query.id, { text: '⏳' });

    try {
      if (data==='weekly')  return sendLong(chatId, await getWeeklyAnalysis());
      if (data==='monthly') return sendLong(chatId, await getMonthlyAnalysis());
      if (data==='yearly')  return sendLong(chatId, await getYearlyAnalysis());
      if (data==='session') return send(chatId, getSessionDetails());

      const idx    = data.indexOf('_');
      const type   = data.slice(0, idx);
      const newsId = data.slice(idx+1);
      const stored = await getStoredAnalysis(newsId);
      if (!stored) return send(chatId, t.notFound());

      let resp = '';
      if      (type==='full')       resp = stored.full_analysis;
      else if (type==='technical')  resp = stored.technical_analysis;
      else if (type==='dna')        resp = formatDNAMessage(safeJSON(stored.raw_json));
      else if (type==='history')    resp = stored.historical_analysis;
      else if (type==='smartmoney') resp = stored.smart_money_analysis;
      else if (type==='mtf')        resp = stored.mtf_analysis;

      resp && resp.length > 10 ? sendLong(chatId, resp) : send(chatId, t.notFound());
    } catch(e) {
      console.error('Callback error:', e.message);
      send(chatId, t.error());
    }
  });

  bot.on('polling_error', e => console.error('Polling:', e.message));
  return bot;
}

export function getBot() { return bot; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isArabic() { return (process.env.BOT_LANGUAGE||'en')==='ar'; }

async function send(chatId, text, markdown=true) {
  try {
    return await bot.sendMessage(chatId, text, markdown ? { parse_mode:'Markdown' } : {});
  } catch {
    return bot.sendMessage(chatId, strip(text)).catch(()=>null);
  }
}

async function edit(chatId, msgId, text) {
  try {
    return await bot.editMessageText(text, { chat_id:chatId, message_id:msgId, parse_mode:'Markdown' });
  } catch {
    return bot.editMessageText(strip(text), { chat_id:chatId, message_id:msgId }).catch(()=>null);
  }
}

async function sendLong(chatId, text) {
  for (const chunk of chunkText(text, 4000)) await send(chatId, chunk);
}

function strip(t='') { return t.replace(/[*_`[\]]/g,''); }
function safeJSON(s) { try { return JSON.parse(s||'{}'); } catch { return {}; } }
