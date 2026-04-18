import { callAI }            from './providers.js';
import { buildSystemPrompt } from './prompt.js';
import { getMarketData, getFullMarketContext, getVIX, getBondYield } from '../market/data.js';
import { getCurrentSession } from '../utils/i18n.js';

// Lightweight prompt for periodic analyses — avoids token overflow on free tier
function buildLightPrompt() {
  return `You are APEX — an elite institutional forex analyst with 20 years on Wall Street (Goldman Sachs, JPMorgan).
Write clear, professional market analysis. Use emojis and clean Telegram formatting.
Be specific: name the pairs, direction, pip targets, timeframes. No vague statements.
Always end with: ⚠️ Educational analysis only — not financial advice`;
}

// ─── Full news analysis ───────────────────────────────────────────────────────
export async function analyzeNews(news, impactScore) {
  const t0 = Date.now();

  const [liveData, marketCtx, vix, yield10y] = await Promise.allSettled([
    getMarketData(), getFullMarketContext(), getVIX(), getBondYield()
  ]);

  const ctx  = buildContext(liveData.value, marketCtx.value, vix.value, yield10y.value);
  const lang = process.env.BOT_LANGUAGE === 'ar' ? 'Arabic' : 'English';

  const userMsg =
`NEWS EVENT:
Title: ${news.title}
Description: ${news.description || 'N/A'}
Source: ${news.source}
Published: ${news.publishedAt}
Impact Score: ${impactScore}/10
Language: ${lang}
UTC: ${new Date().toUTCString()}
Session: ${getCurrentSession()}

${ctx}

Process through all 6 cognitive lobes. Return ONLY valid JSON as specified in the system prompt.`;

  try {
    const raw = await callAI(buildSystemPrompt(), userMsg, 5000);
    console.log(`⏱  Done in ${((Date.now()-t0)/1000).toFixed(1)}s`);
    return parseJSON(raw, news);
  } catch (err) {
    console.error('❌ analyzeNews error:', err.message);
    return fallback(news);
  }
}

// ─── Weekly ───────────────────────────────────────────────────────────────────
export async function getWeeklyAnalysis() {
  const lang   = process.env.BOT_LANGUAGE === 'ar' ? 'Arabic' : 'English';
  const [live] = await Promise.allSettled([getMarketData()]);
  const prices = fmtPrices(live.value);

  try {
    return await callAI(buildLightPrompt(),
`Weekly forex analysis. Language: ${lang}. UTC: ${new Date().toUTCString()}.
${prices}
Cover: major pair outlooks, key events this week, top 2-3 setups with direction + pip targets, risk factors.
Format: professional Telegram message with emojis and clear sections. Max 35 lines.`, 1800);
  } catch (err) {
    console.error('❌ Weekly error:', err.message);
    return `❌ Weekly analysis error: ${err.message}`;
  }
}

// ─── Monthly ──────────────────────────────────────────────────────────────────
export async function getMonthlyAnalysis() {
  const lang  = process.env.BOT_LANGUAGE === 'ar' ? 'Arabic' : 'English';
  const month = new Date().toLocaleString('en-US', { month:'long', year:'numeric' });

  try {
    return await callAI(buildLightPrompt(),
`Monthly forex analysis for ${month}. Language: ${lang}. UTC: ${new Date().toUTCString()}.
Cover: macro themes, CB calendar + expected decisions, pair outlooks, geopolitical risks, best opportunities.
Format: professional Telegram message with emojis and clear sections. Max 35 lines.`, 1800);
  } catch (err) {
    console.error('❌ Monthly error:', err.message);
    return `❌ Monthly analysis error: ${err.message}`;
  }
}

// ─── Yearly ───────────────────────────────────────────────────────────────────
export async function getYearlyAnalysis() {
  const lang = process.env.BOT_LANGUAGE === 'ar' ? 'Arabic' : 'English';

  try {
    return await callAI(buildLightPrompt(),
`Strategic yearly forex outlook for ${new Date().getFullYear()}. Language: ${lang}. UTC: ${new Date().toUTCString()}.
Cover: macro mega-trends, CB policy cycles (Fed/ECB/BOJ/BOE), geopolitical FX impact, best pairs for the year, key risk events.
Format: professional Telegram message with emojis and clear sections. Max 35 lines.`, 1800);
  } catch (err) {
    console.error('❌ Yearly error:', err.message);
    return `❌ Yearly analysis error: ${err.message}`;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildContext(live, mCtx, vix, y10) {
  let o = fmtPrices(live);

  if (mCtx?.daily && Object.keys(mCtx.daily).length) {
    o += '\nDAILY TECHNICAL (90-day):\n';
    Object.entries(mCtx.daily).forEach(([s,d]) => {
      o += `  ${s}: RSI=${d.rsi} | SMA20=${d.sma20} | SMA50=${d.sma50} | ATR=${d.atr} | Trend=${d.trend}\n`;
    });
  }
  if (mCtx?.hourly && Object.keys(mCtx.hourly).length) {
    o += '\nHOURLY (7-day):\n';
    Object.entries(mCtx.hourly).forEach(([s,d]) => {
      o += `  ${s}: 7D ${d.low7d}–${d.high7d} | 24H ${d.low24h}–${d.high24h} | HTrend=${d.hourlyTrend}\n`;
      if (d.equalHighs?.length) o += `    EQ-Highs: ${d.equalHighs.join(', ')}\n`;
      if (d.equalLows?.length)  o += `    EQ-Lows:  ${d.equalLows.join(', ')}\n`;
      if (d.fvgs?.length) d.fvgs.forEach(f => { o += `    FVG ${f.type}: ${f.bottom}–${f.top}\n`; });
    });
  }
  if (vix) o += `\nVIX: ${vix}`;
  if (y10) o += `\nUS 10Y: ${y10}%`;
  return o || 'Market data temporarily unavailable.';
}

function fmtPrices(live) {
  if (!live || !Object.keys(live).length) return '';
  return 'LIVE PRICES:\n' + Object.entries(live).map(([s,d]) => `  ${s}: ${d.price} (${d.change})`).join('\n') + '\n';
}

function parseJSON(text, news) {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return fallback(news, text);
}

function fallback(news, raw = '') {
  return {
    impact_tier:'TIER 2', news_type:'B', heat_index:70,
    hunt_mode:false, veto_activated:false, veto_reason:null,
    conflict_detected:false, conflict_description:null,
    dna_fingerprint:{ dna_score:0, closest_historical_event:'N/A', historical_outcome:'N/A' },
    causal_chain:{ order_1:'', order_2:'', order_3:'', order_4:'' },
    hourly_key_levels:{ liquidity_pools_swept:'', unfilled_fvgs:'', structural_breaks:'', killzone_analysis:'' },
    summary_message:`⚡ *APEX ALERT*\n━━━━━━━━━━━━━━━━━━━━\n📰 ${news?.title||'Alert'}\n📡 ${news?.source||'APEX'}\n\n🔄 Processing...\n⚠️ Educational only`,
    full_analysis: raw || 'N/A',
    technical_analysis:'', historical_analysis:'', smart_money_analysis:'', mtf_analysis:'',
    instruments:{}, risk_management:{},
    immediate_liquidity_hunt:'', structural_shift:'', macro_trend:'',
    weekly_analysis:'', monthly_analysis:'', yearly_analysis:''
  };
}
