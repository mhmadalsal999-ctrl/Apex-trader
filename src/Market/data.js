import axios from 'axios';

const FH = () => process.env.FINNHUB_API_KEY;
const AV = () => process.env.ALPHA_VANTAGE_API_KEY;

const MAIN_PAIRS = ['EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','USDCAD'];

// ─── Live prices ──────────────────────────────────────────────────────────────
export async function getMarketData() {
  const results = {};
  await Promise.allSettled(MAIN_PAIRS.map(async sym => {
    try {
      const f = sym.slice(0,3), t = sym.slice(3,6);
      const r = await axios.get('https://finnhub.io/api/v1/forex/candle', {
        params: { symbol:`OANDA:${f}_${t}`, resolution:'D',
                  from: Math.floor(Date.now()/1000) - 86400*3,
                  to:   Math.floor(Date.now()/1000), token: FH() },
        timeout: 6000
      });
      if (r.data.s === 'ok' && r.data.c?.length) {
        const c = r.data.c, cur = c.at(-1), prev = c.at(-2) ?? cur;
        const chg = ((cur-prev)/prev*100).toFixed(3);
        results[sym] = { price: cur.toFixed(5), change: `${chg>=0?'+':''}${chg}%` };
      }
    } catch {}
  }));

  // Gold via Alpha Vantage
  if (AV()) {
    try {
      const r = await axios.get('https://www.alphavantage.co/query', {
        params:{ function:'CURRENCY_EXCHANGE_RATE', from_currency:'XAU', to_currency:'USD', apikey:AV() },
        timeout:6000
      });
      const rt = r.data?.['Realtime Currency Exchange Rate'];
      if (rt) results['XAUUSD'] = {
        price:  parseFloat(rt['5. Exchange Rate']).toFixed(2),
        change: rt['10. Change Percent'] ? `${parseFloat(rt['10. Change Percent']).toFixed(2)}%` : 'N/A'
      };
    } catch {}
  }
  return results;
}

// ─── Hourly candles — last 7 days (168 hours) ─────────────────────────────────
// This powers ICT Kill Zone detection, liquidity sweep identification,
// FVG mapping, and hourly S/R level analysis inside the AI prompt.
export async function getHourlyData(symbol, hours = 168) {
  try {
    const f = symbol.slice(0,3), t = symbol.slice(3,6);
    const r = await axios.get('https://finnhub.io/api/v1/forex/candle', {
      params: {
        symbol: `OANDA:${f}_${t}`,
        resolution: '60',                                      // 1-hour candles
        from: Math.floor(Date.now()/1000) - 3600 * hours,
        to:   Math.floor(Date.now()/1000),
        token: FH()
      },
      timeout: 8000
    });
    if (r.data.s !== 'ok' || !r.data.c?.length) return null;

    const closes = r.data.c, highs = r.data.h, lows = r.data.l, times = r.data.t;
    if (closes.length < 24) return null;

    // Identify key levels from hourly data
    const high7d  = Math.max(...highs);
    const low7d   = Math.min(...lows);
    const cur     = closes.at(-1);

    // Liquidity pools — equal highs/lows within 0.01% tolerance
    const eqHighs = findEqualLevels(highs, 0.0001);
    const eqLows  = findEqualLevels(lows,  0.0001);

    // Fair Value Gaps (FVG) — last 48 hours
    const fvgs = findFVGs(highs, lows, closes, times);

    // Hourly sessions liquidity — average volume by hour UTC
    const sessionData = analyzeSessionActivity(closes, highs, lows, times);

    // Recent structure — last 24h highs/lows
    const last24h = closes.slice(-24);
    const high24h = Math.max(...highs.slice(-24));
    const low24h  = Math.min(...lows.slice(-24));

    // Trend from hourly perspective
    const smaH20  = avg(closes.slice(-20));
    const smaH50  = closes.length >= 50 ? avg(closes.slice(-50)) : null;
    const hourlyTrend = cur > smaH20 ? 'Bullish' : 'Bearish';

    return {
      symbol, current: cur.toFixed(5),
      high7d: high7d.toFixed(5), low7d: low7d.toFixed(5),
      high24h: high24h.toFixed(5), low24h: low24h.toFixed(5),
      hourlyTrend, smaH20: smaH20.toFixed(5),
      smaH50: smaH50 ? smaH50.toFixed(5) : 'N/A',
      equalHighs: eqHighs.slice(0,3).map(v=>v.toFixed(5)),
      equalLows:  eqLows.slice(0,3).map(v=>v.toFixed(5)),
      fvgs:       fvgs.slice(0,3),
      sessionData,
      dataPoints: closes.length
    };
  } catch { return null; }
}

// ─── Daily historical data — 90 days ─────────────────────────────────────────
export async function getHistoricalData(symbol, days = 90) {
  try {
    const f = symbol.slice(0,3), t = symbol.slice(3,6);
    const r = await axios.get('https://finnhub.io/api/v1/forex/candle', {
      params: { symbol:`OANDA:${f}_${t}`, resolution:'D',
                from: Math.floor(Date.now()/1000) - 86400*days,
                to:   Math.floor(Date.now()/1000), token: FH() },
      timeout: 8000
    });
    if (r.data.s !== 'ok') return null;

    const closes = r.data.c || [], highs = r.data.h || [], lows = r.data.l || [];
    if (closes.length < 14) return null;

    const cur    = closes.at(-1);
    const sma20  = avg(closes.slice(-20));
    const sma50  = avg(closes.slice(-50));
    const sma200 = closes.length >= 200 ? avg(closes.slice(-200)) : null;
    const atr    = calcATR(highs, lows, closes, 14);
    const rsi    = calcRSI(closes, 14);
    const trend  = cur > sma50
      ? (sma200 && cur > sma200 ? 'Strong Uptrend' : 'Uptrend')
      : cur < sma50
        ? (sma200 && cur < sma200 ? 'Strong Downtrend' : 'Downtrend')
        : 'Neutral';

    return {
      symbol, current: cur.toFixed(5),
      high90: Math.max(...highs).toFixed(5),
      low90:  Math.min(...lows).toFixed(5),
      sma20: sma20.toFixed(5), sma50: sma50.toFixed(5),
      sma200: sma200 ? sma200.toFixed(5) : 'N/A',
      atr: atr.toFixed(5), rsi: rsi.toFixed(1),
      trend, dataPoints: closes.length
    };
  } catch { return null; }
}

// ─── Fetch both daily + hourly for main pairs ─────────────────────────────────
export async function getFullMarketContext() {
  const pairs = ['EURUSD','GBPUSD','USDJPY','XAUUSD'];
  const [dailyRes, hourlyRes] = await Promise.all([
    Promise.allSettled(pairs.map(s => getHistoricalData(s))),
    Promise.allSettled(pairs.map(s => getHourlyData(s)))
  ]);

  const daily  = {}, hourly = {};
  pairs.forEach((p, i) => {
    if (dailyRes[i].status  === 'fulfilled' && dailyRes[i].value)  daily[p]  = dailyRes[i].value;
    if (hourlyRes[i].status === 'fulfilled' && hourlyRes[i].value) hourly[p] = hourlyRes[i].value;
  });
  return { daily, hourly };
}

export async function getMultipleHistoricalData() {
  const { daily } = await getFullMarketContext();
  return daily;
}

export async function getVIX() {
  try {
    const r = await axios.get('https://finnhub.io/api/v1/quote',
      { params:{ symbol:'VIX', token: FH() }, timeout:5000 });
    return r.data?.c ?? null;
  } catch { return null; }
}

export async function getBondYield() {
  if (!AV()) return null;
  try {
    const r = await axios.get('https://www.alphavantage.co/query',
      { params:{ function:'TREASURY_YIELD', interval:'daily', maturity:'10year', apikey: AV() }, timeout:5000 });
    return r.data?.data?.[0] ? parseFloat(r.data.data[0].value).toFixed(3) : null;
  } catch { return null; }
}

// ─── Math helpers ─────────────────────────────────────────────────────────────
function avg(arr) { return arr.reduce((a,b)=>a+b,0)/arr.length; }

function calcRSI(c, p=14) {
  if (c.length < p+1) return 50;
  let g=0, l=0;
  for (let i=c.length-p; i<c.length; i++) {
    const d=c[i]-c[i-1]; d>0 ? g+=d : l-=d;
  }
  if (!l) return 100;
  return 100-(100/(1+(g/p)/(l/p)));
}

function calcATR(h, l, c, p=14) {
  const trs=[];
  for (let i=1;i<h.length;i++) trs.push(Math.max(h[i]-l[i], Math.abs(h[i]-c[i-1]), Math.abs(l[i]-c[i-1])));
  return avg(trs.slice(-p));
}

function findEqualLevels(arr, tolerance) {
  const levels=[];
  for (let i=0;i<arr.length-1;i++) {
    for (let j=i+1;j<arr.length;j++) {
      if (Math.abs(arr[i]-arr[j])/arr[i] < tolerance) levels.push(arr[i]);
    }
  }
  return [...new Set(levels)].sort((a,b)=>b-a);
}

function findFVGs(highs, lows, closes, times) {
  const fvgs=[];
  const start = Math.max(0, highs.length-48);      // last 48 hours only
  for (let i=start+1;i<highs.length-1;i++) {
    // Bullish FVG: candle[i-1].high < candle[i+1].low
    if (highs[i-1] < lows[i+1]) {
      fvgs.push({ type:'Bullish FVG', top: lows[i+1].toFixed(5), bottom: highs[i-1].toFixed(5),
                  time: new Date(times[i]*1000).toUTCString() });
    }
    // Bearish FVG: candle[i-1].low > candle[i+1].high
    if (lows[i-1] > highs[i+1]) {
      fvgs.push({ type:'Bearish FVG', top: lows[i-1].toFixed(5), bottom: highs[i+1].toFixed(5),
                  time: new Date(times[i]*1000).toUTCString() });
    }
  }
  return fvgs;
}

function analyzeSessionActivity(closes, highs, lows, times) {
  const hourBuckets = {};
  for (let i=0;i<times.length;i++) {
    const h = new Date(times[i]*1000).getUTCHours();
    if (!hourBuckets[h]) hourBuckets[h]={ ranges:[], count:0 };
    hourBuckets[h].ranges.push(highs[i]-lows[i]);
    hourBuckets[h].count++;
  }
  const result={};
  for (const [h, data] of Object.entries(hourBuckets)) {
    result[h]={ avgRange:(avg(data.ranges)*10000).toFixed(1)+' pips', count: data.count };
  }
  return result;
}
