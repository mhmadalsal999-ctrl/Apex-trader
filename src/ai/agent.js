import { callAI }              from './providers.js';
import { buildSystemPrompt }   from './prompt.js';
import { getMarketData, getFullMarketContext, getVIX, getBondYield } from '../market/data.js';
import { getCurrentSession }   from '../utils/i18n.js';

export async function analyzeNews(news, impactScore) {
  const t0 = Date.now();

  const [liveData, marketCtx, vix, yield10y] = await Promise.allSettled([
    getMarketData(),
    getFullMarketContext(),
    getVIX(),
    getBondYield()
  ]);

  const context = buildContext(
    liveData.value, marketCtx.value,
    vix.value, yield10y.value
  );

  const lang    = process.env.BOT_LANGUAGE === 'ar' ? 'Arabic' : 'English';
  const session = getCurrentSession();

  const userMsg = `NEWS EVENT:
Title: ${news.title}
Description: ${news.description || 'N/A'}
Source: ${news.source}
Published: ${news.publishedAt}
Impact Score: ${impactScore}/10
Output Language: ${lang}
Current UTC: ${new Date().toUTCString()}
Trading Session: ${session}

${context}

Process through all 6 lobes. Return ONLY valid JSON.`;

  const raw  = await callAI(buildSystemPrompt(), userMsg, 6000);
  const secs = ((Date.now()-t0)/1000).toFixed(1);
  console.log(`⏱  Analysis done in ${secs}s`);

  return parseResponse(raw, news);
}

export async function getWeeklyAnalysis() {
  const [live, ctx] = await Promise.allSettled([getMarketData(), getFullMarketContext()]);
  const lang = process.env.BOT_LANGUAGE === 'ar' ? 'Arabic' : 'English';
  return callAI(buildSystemPrompt(),
    `Weekly forex analysis. Language: ${lang}. UTC: ${new Date().toUTCString()}. Session: ${getCurrentSession()}.
Market: ${JSON.stringify(live.value||{})}
Format: clear Telegram message with emojis. Focus: major pair outlooks, key events, opportunities.`, 2500);
}

export async function getMonthlyAnalysis() {
  const lang  = process.env.BOT_LANGUAGE === 'ar' ? 'Arabic' : 'English';
  const month = new Date().toLocaleString('en-US',{month:'long',year:'numeric'});
  return callAI(buildSystemPrompt(),
    `Monthly forex analysis for ${month}. Language: ${lang}. UTC: ${new Date().toUTCString()}.
Format: clear Telegram message with emojis. Focus: macro themes, CB calendar, major risks, positioning.`, 2500);
}

export async function getYearlyAnalysis() {
  const lang = process.env.BOT_LANGUAGE === 'ar' ? 'Arabic' : 'English';
  return callAI(buildSystemPrompt(),
    `Strategic yearly forex outlook for ${new Date().getFullYear()}. Language: ${lang}. UTC: ${new Date().toUTCString()}.
Format: clear Telegram message with emojis. Focus: mega-trends, CB cycles, geopolitical risks, opportunities.`, 2500);
}

// ─── Context builder ──────────────────────────────────────────────────────────
function buildContext(live, marketCtx, vix, yield10y) {
  let out = '';

  if (live && Object.keys(live).length) {
    out += 'LIVE PRICES:\n';
    Object.entries(live).forEach(([s,d]) => { out += `  ${s}: ${d.price} (${d.change})\n`; });
  }

  if (marketCtx?.daily && Object.keys(marketCtx.daily).length) {
    out += '\nDAILY TECHNICAL (90-day):\n';
    Object.entries(marketCtx.daily).forEach(([s,d]) => {
      out += `  ${s}: RSI=${d.rsi} SMA20=${d.sma20} SMA50=${d.sma50} SMA200=${d.sma200} ATR=${d.atr} Trend=${d.trend} Range=${d.low90}–${d.high90}\n`;
    });
  }

  if (marketCtx?.hourly && Object.keys(marketCtx.hourly).length) {
    out += '\nHOURLY BATTLEFIELD (7-day, 1h candles):\n';
    Object.entries(marketCtx.hourly).forEach(([s,d]) => {
      out += `  ${s}:\n`;
      out += `    7D Range: ${d.low7d}–${d.high7d} | 24H Range: ${d.low24h}–${d.high24h}\n`;
      out += `    Hourly Trend: ${d.hourlyTrend} | H-SMA20: ${d.smaH20}\n`;
      if (d.equalHighs?.length) out += `    Equal Highs (Liquidity Pools): ${d.equalHighs.join(', ')}\n`;
      if (d.equalLows?.length)  out += `    Equal Lows (Liquidity Pools):  ${d.equalLows.join(', ')}\n`;
      if (d.fvgs?.length) {
        out += `    Open FVGs:\n`;
        d.fvgs.forEach(fvg => { out += `      ${fvg.type}: ${fvg.bottom}–${fvg.top} (${fvg.time})\n`; });
      }
      // Top 3 most active hours
      if (d.sessionData) {
        const sorted = Object.entries(d.sessionData).sort((a,b)=>parseFloat(b[1].avgRange)-parseFloat(a[1].avgRange)).slice(0,3);
        out += `    Most Active Hours UTC: ${sorted.map(([h,v])=>`${h}:00(${v.avgRange})`).join(', ')}\n`;
      }
    });
  }

  if (vix)     out += `\nVIX: ${vix}`;
  if (yield10y) out += `\nUS 10Y Yield: ${yield10y}%`;

  return out || 'Market data temporarily unavailable';
}

// ─── JSON parser with fallback ────────────────────────────────────────────────
function parseResponse(text, news) {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return {
    impact_tier:'TIER 2', news_type:'B', heat_index:70,
    hunt_mode:false, veto_activated:false, veto_reason:null,
    conflict_detected:false, conflict_description:null,
    dna_fingerprint:{ dna_score:0, closest_historical_event:'N/A', historical_outcome:'N/A' },
    causal_chain:{ order_1:'', order_2:'', order_3:'', order_4:'' },
    hourly_key_levels:{ liquidity_pools_swept:'', unfilled_fvgs:'', structural_breaks:'', killzone_analysis:'' },
    summary_message:`⚡ APEX ALERT\n━━━━━━━━━━━━━━━━━━━━\n📰 ${news.title}\n📡 ${news.source}\n\n🔄 Processing...\n⚠️ Educational analysis only`,
    full_analysis: text || 'Parse error',
    technical_analysis:'', historical_analysis:'', smart_money_analysis:'', mtf_analysis:'',
    instruments:{}, risk_management:{},
    immediate_liquidity_hunt:'', structural_shift:'', macro_trend:'',
    weekly_analysis:'', monthly_analysis:'', yearly_analysis:''
  };
}
