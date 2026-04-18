import TelegramBot          from 'node-telegram-bot-api';
import { getWeeklyAnalysis, getMonthlyAnalysis, getYearlyAnalysis } from '../ai/agent.js';
import { getMarketData }     from '../market/data.js';
import { getStoredAnalysis } from '../db/supabase.js';
import { formatDNAMessage, chunkText } from '../utils/formatter.js';
import { t, getSessionDetails } from '../utils/i18n.js';
import { getActiveModel }    from '../ai/providers.js';

let bot = null;

export async function startBot() {
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

  // ── /start ───────────────────────────────────────────────────────────────────
  bot.onText(/\/start/, msg => send(msg.chat.id, t.welcome()));

  // ── /market ──────────────────────────────────────────────────────────────────
  bot.onText(/\/market/, async msg => {
    const w = await send(msg.chat.id, t.loading('market data'));
    try {
      const data = await getMarketData();
      const isAr = process.env.BOT_LANGUAGE === 'ar';
      let text = `📊 *${isAr ? 'وضع السوق الآن' : 'Live Market Snapshot'}*\n`;
      text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      Object.entries(data).forEach(([sym, d]) => {
        const arrow = d.change?.startsWith('+') ? '📈' : '📉';
        text += `${arrow} *${sym}:* \`${d.price}\` (${d.change})\n`;
      });
      text += `\n_${new Date().toUTCString()}_`;
      await edit(msg.chat.id, w.message_id, text);
    } catch { await edit(msg.chat.id, w.message_id, t.error()); }
  });

  // ── /session ─────────────────────────────────────────────────────────────────
  bot.onText(/\/session/, async msg => {
    send(msg.chat.id, getSessionDetails());
  });

  // ── /weekly ──────────────────────────────────────────────────────────────────
  bot.onText(/\/weekly/, async msg => {
    const isAr = process.env.BOT_LANGUAGE === 'ar';
    const w = await send(msg.chat.id, t.loading(isAr ? 'التحليل الأسبوعي' : 'weekly analysis'));
    try {
      const text = await getWeeklyAnalysis();
      await edit(msg.chat.id, w.message_id, text);
    } catch { await edit(msg.chat.id, w.message_id, t.error()); }
  });

  // ── /monthly ─────────────────────────────────────────────────────────────────
  bot.onText(/\/monthly/, async msg => {
    const isAr = process.env.BOT_LANGUAGE === 'ar';
    const w = await send(msg.chat.id, t.loading(isAr ? 'التحليل الشهري' : 'monthly analysis'));
    try {
      const text = await getMonthlyAnalysis();
      await edit(msg.chat.id, w.message_id, text);
    } catch { await edit(msg.chat.id, w.message_id, t.error()); }
  });

  // ── /yearly ──────────────────────────────────────────────────────────────────
  bot.onText(/\/yearly/, async msg => {
    const isAr = process.env.BOT_LANGUAGE === 'ar';
    const w = await send(msg.chat.id, t.loading(isAr ? 'التحليل السنوي' : 'yearly analysis'));
    try {
      const text = await getYearlyAnalysis();
      await edit(msg.chat.id, w.message_id, text);
    } catch { await edit(msg.chat.id, w.message_id, t.error()); }
  });

  // ── /status ───────────────────────────────────────────────────────────────────
  bot.onText(/\/status/, msg => {
    const isAr = process.env.BOT_LANGUAGE === 'ar';
    const up   = process.uptime();
    const hrs  = Math.floor(up/3600), mins = Math.floor((up%3600)/60);
    const text = isAr
      ? `⚙️ *حالة البوت*\n\n🤖 AI: \`${getActiveModel()}\`\n🌐 اللغة: ${isAr?'العربية':'English'}\n📡 الفحص: كل 30 ثانية\n⏱ وقت التشغيل: ${hrs}h ${mins}m\n✅ يعمل بشكل طبيعي`
      : `⚙️ *Bot Status*\n\n🤖 AI: \`${getActiveModel()}\`\n🌐 Language: English\n📡 Interval: 30s\n⏱ Uptime: ${hrs}h ${mins}m\n✅ Running normally`;
    send(msg.chat.id, text);
  });

  // ── /language ─────────────────────────────────────────────────────────────────
  bot.onText(/\/language/, msg => {
    const cur  = process.env.BOT_LANGUAGE || 'en';
    const next = cur === 'en' ? 'ar' : 'en';
    process.env.BOT_LANGUAGE = next;
    const reply = next === 'ar'
      ? '✅ تم التبديل إلى العربية — Switch back: /language'
      : '✅ Switched to English — للعربية: /language';
    send(msg.chat.id, reply, false);
  });

  // ── Inline keyboard callbacks ─────────────────────────────────────────────────
  bot.on('callback_query', async query => {
    const chatId = query.message.chat.id;
    const data   = query.data;
    await bot.answerCallbackQuery(query.id, { text: '⏳' });

    try {
      // Static actions (no news_id)
      if (data === 'weekly')  return sendLong(chatId, await getWeeklyAnalysis());
      if (data === 'monthly') return sendLong(chatId, await getMonthlyAnalysis());
      if (data === 'yearly')  return sendLong(chatId, await getYearlyAnalysis());
      if (data === 'session') return send(chatId, getSessionDetails());

      // News-specific (format: type_newsId)
      const idx    = data.indexOf('_');
      const type   = data.slice(0, idx);
      const newsId = data.slice(idx + 1);

      const stored = await getStoredAnalysis(newsId);
      if (!stored) return send(chatId, t.notFound());

      let response = '';
      if      (type === 'full')       response = stored.full_analysis;
      else if (type === 'technical')  response = stored.technical_analysis;
      else if (type === 'dna')        response = formatDNAMessage(safeJSON(stored.raw_json));
      else if (type === 'history')    response = stored.historical_analysis;
      else if (type === 'smartmoney') response = stored.smart_money_analysis;
      else if (type === 'mtf')        response = stored.mtf_analysis;

      if (response && response.length > 10) {
        await sendLong(chatId, response);
      } else {
        send(chatId, t.notFound());
      }
    } catch(e) {
      console.error('Callback error:', e.message);
      send(chatId, t.error());
    }
  });

  // Handle polling errors silently
  bot.on('polling_error', err => console.error('Polling:', err.message));

  return bot;
}

export function getBot() { return bot; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function send(chatId, text, markdown = true) {
  try {
    return await bot.sendMessage(chatId, text,
      markdown ? { parse_mode: 'Markdown' } : {});
  } catch {
    return bot.sendMessage(chatId, strip(text)).catch(() => null);
  }
}

async function edit(chatId, msgId, text) {
  try {
    return await bot.editMessageText(text,
      { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown' });
  } catch {
    return bot.editMessageText(strip(text),
      { chat_id: chatId, message_id: msgId }).catch(() => null);
  }
}

async function sendLong(chatId, text) {
  for (const chunk of chunkText(text, 4000)) await send(chatId, chunk);
}

function strip(t) { return (t||'').replace(/[*_`[\]]/g, ''); }

function safeJSON(str) {
  try { return JSON.parse(str || '{}'); } catch { return {}; }
}
