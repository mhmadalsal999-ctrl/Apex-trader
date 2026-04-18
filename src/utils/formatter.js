import { t, getCurrentSession } from './i18n.js';

// ─── Send alert to Telegram ───────────────────────────────────────────────────
export async function sendAnalysisMessage(bot, analysis, news) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) { console.error('❌ TELEGRAM_CHAT_ID not set'); return; }

  const msg      = buildShortMessage(analysis, news);
  const keyboard = buildKeyboard(news.id);

  try {
    await bot.sendMessage(chatId, msg, { parse_mode:'Markdown', reply_markup:keyboard });
  } catch {
    await bot.sendMessage(chatId, strip(msg), { reply_markup:keyboard }).catch(()=>{});
  }
}

// ─── Short summary message ────────────────────────────────────────────────────
function buildShortMessage(a, news) {
  const {
    instruments={}, heat_index=0, hunt_mode=false,
    veto_activated=false, veto_reason=null,
    conflict_detected=false, summary_message, impact_tier='TIER 2',
    dna_fingerprint={}, immediate_liquidity_hunt=''
  } = a;

  if (veto_activated) {
    return `🚫 *${t.vetoed()}*\n━━━━━━━━━━━━━━━━━━━━\n${veto_reason||'High failure probability — avoid'}\n\n━━━━━━━━━━━━━━━━━━━━\n${t.disclaimer()}`;
  }

  // News metadata footer — ALWAYS added
  const newsTime  = news.publishedAt ? new Date(news.publishedAt).toUTCString() : new Date().toUTCString();
  const session   = getCurrentSession();
  const footer    = `\n\n⏰ *News Time:* \`${newsTime}\`\n📡 *Session:* ${session}\n━━━━━━━━━━━━━━━━━━━━\n${t.disclaimer()}`;

  // If AI returned a good summary_message, use it + add footer
  if (summary_message && summary_message.length > 80) {
    // Remove any existing disclaimer from AI message to avoid duplication
    const clean = summary_message.replace(/⚠️.*استثمارية.*$/s,'').replace(/⚠️.*financial advice.*$/si,'').trim();
    return clean + footer;
  }

  // Build manually
  const tierEmoji = impact_tier === 'TIER 1' ? '🚨' : '⚡';
  const heatEmoji = heat_index>=80 ? '🔴' : heat_index>=60 ? '🟡' : '🟢';

  const bull=[], bear=[], neut=[];
  Object.entries(instruments).forEach(([sym,d])=>{
    if (!d.direction) return;
    const s = d.fusion_score ? ` _(${d.fusion_score})_` : '';
    if      (d.direction==='BULLISH') bull.push(`${sym}${s}`);
    else if (d.direction==='BEARISH') bear.push(`${sym}${s}`);
    else neut.push(sym);
  });

  let msg = `${tierEmoji} *APEX — ${impact_tier}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `📰 *${news.title || 'Market Alert'}*\n`;
  msg += `📡 _${news.source || 'APEX'}_\n\n`;
  msg += `${heatEmoji} *${t.heatLabel()}:* ${heat_index}/100 ${bar(heat_index)}\n`;
  if (dna_fingerprint.dna_score) msg += `🧬 *DNA Score:* ${dna_fingerprint.dna_score}/100\n`;
  if (hunt_mode)         msg += `${t.huntMode()}\n`;
  if (conflict_detected) msg += `${t.conflict()}\n`;
  msg += '\n';
  if (bull.length) msg += `${t.bullish()}: ${bull.join(' • ')}\n`;
  if (bear.length) msg += `${t.bearish()}: ${bear.join(' • ')}\n`;
  if (neut.length) msg += `${t.neutral()}: ${neut.slice(0,5).join(' • ')}\n`;
  if (immediate_liquidity_hunt) msg += `\n⚡ *4h:* ${immediate_liquidity_hunt.slice(0,120)}...\n`;
  if (dna_fingerprint.closest_historical_event && dna_fingerprint.closest_historical_event!=='N/A') {
    msg += `\n📚 *Closest Match:* ${dna_fingerprint.closest_historical_event}\n`;
  }

  return msg + footer;
}

// ─── DNA / Causal Chain message ───────────────────────────────────────────────
export function formatDNAMessage(a) {
  const dna   = a.dna_fingerprint  || {};
  const chain = a.causal_chain     || {};
  const hl    = a.hourly_key_levels|| {};
  const isAr  = (process.env.BOT_LANGUAGE||'en')==='ar';

  let msg = `🧬 *DNA FINGERPRINT*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  const rows = [
    ['Macro Impact',    dna.macro_impact],
    ['Surprise Factor', dna.surprise_factor],
    ['Hist. Match',     dna.historical_match],
    ['SMC Alignment',   dna.smc_alignment],
    ['Tech. Confirm.',  dna.technical_confirmation],
    ['Seasonality',     dna.seasonal_boost],
    ['Intermarket',     dna.intermarket_confirmation],
    ['Liquidity',       dna.liquidity],
  ];
  rows.forEach(([l,v])=>{ msg+=`${l.padEnd(18)} ${bar(v||0)} ${v||0}%\n`; });
  msg+=`\n🎯 *DNA SCORE: ${dna.dna_score||0}/100*\n`;

  if (dna.closest_historical_event && dna.closest_historical_event!=='N/A') {
    msg+=`\n📌 *Closest Historical Event:*\n${dna.closest_historical_event}\n`;
    msg+=`📈 *Outcome:*\n${dna.historical_outcome}\n`;
  }

  if (chain.order_1) {
    msg+=`\n⚡ *Causal Chain:*\n1️⃣ ${chain.order_1}\n2️⃣ ${chain.order_2}\n3️⃣ ${chain.order_3}\n4️⃣ ${chain.order_4}\n`;
  }

  if (hl.unfilled_fvgs || hl.liquidity_pools_swept) {
    msg+=`\n📊 *Hourly Key Levels:*\n`;
    if (hl.liquidity_pools_swept) msg+=`💧 Liquidity Swept: ${hl.liquidity_pools_swept}\n`;
    if (hl.unfilled_fvgs)         msg+=`🕳️ Open FVGs: ${hl.unfilled_fvgs}\n`;
    if (hl.structural_breaks)     msg+=`🔄 Structure: ${hl.structural_breaks}\n`;
    if (hl.killzone_analysis)     msg+=`🎯 Kill Zones: ${hl.killzone_analysis}\n`;
  }

  msg+=`\n━━━━━━━━━━━━━━━━━━━━\n${t.disclaimer()}`;
  return msg;
}

// ─── Inline keyboard ──────────────────────────────────────────────────────────
function buildKeyboard(newsId) {
  return { inline_keyboard:[
    [{ text:t.btn.full(),       callback_data:`full_${newsId}`       },
     { text:t.btn.technical(),  callback_data:`technical_${newsId}`  }],
    [{ text:t.btn.dna(),        callback_data:`dna_${newsId}`        },
     { text:t.btn.historical(), callback_data:`history_${newsId}`    }],
    [{ text:t.btn.smartMoney(), callback_data:`smartmoney_${newsId}` },
     { text:t.btn.mtf(),        callback_data:`mtf_${newsId}`        }],
    [{ text:t.btn.session(),    callback_data:'session'              }],
    [{ text:t.btn.weekly(),     callback_data:'weekly'               },
     { text:t.btn.monthly(),    callback_data:'monthly'              },
     { text:t.btn.yearly(),     callback_data:'yearly'               }],
  ]};
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function bar(v=0){ const f=Math.round(Math.min(v,100)/10); return '█'.repeat(f)+'░'.repeat(10-f); }
function strip(t){ return t.replace(/[*_`[\]]/g,''); }
export function chunkText(t,max=4000){ const c=[]; for(let i=0;i<t.length;i+=max)c.push(t.slice(i,i+max)); return c; }
