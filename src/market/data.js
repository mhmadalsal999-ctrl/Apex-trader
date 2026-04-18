import axios from 'axios';

const FH = () => process.env.FINNHUB_API_KEY;
const AV = () => process.env.ALPHA_VANTAGE_API_KEY;

const MAIN_PAIRS = ['EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','USDCAD'];

// ─── Live prices — uses quote endpoint (faster, works weekends) ───────────────
export async function getMarketData() {
  const results = {};

  // Use Finnhub forex quote (works on weekends, returns last close)
  await Promise.allSettled(MAIN_PAIRS.map(async sym => {
    try {
      const from = sym.slice(0,3), to = sym.slice(3,6);
      // Try quote first (faster)
      const r = await axios.get('https://finnhub.io/api/v1/forex/rates', {
        params: { base: from, token: FH() },
        timeout: 6000
      });
      const rate = r.data?.quote?.[to];
      if (rate) {
        results[sym] = { price: rate.toFixed(5), change: 'N/A' };
        return;
      }
    } catch {}

    // Fallback: candle data (last 5 days to handle weekends)
    try {
      const from = sym.slice(0,3), to = sym.slice(3,6);
      const r = await axios.get('https://finnhub.io/api/v1/forex/candle', {
        params: {
          symbol: `OANDA:${from}_${to}`,
          resolution: 'D',
          from: Math.floor(Date.now()/1000) - 86400 * 7,
          to:   Math.floor(Date.now()/1000),
          token: FH()
        },
        timeout: 6000
      });
      if (r.data.s === 'ok' && r.data.c?.length) {
        const c = r.data.c;
        const cur  = c.at(-1);
        const prev = c.length > 1 ? c.at(-2) : cur;
        const chg  = ((cur-prev)/prev*100).toFixed(3);
        results[sym] = { price: cur.toFixed(5), change: `${Number(chg)>=0?'+':''}${chg}%` };
      }
    } catch {}
  }));

  // Gold — try Alpha Vantage, fallback to Finnhub
  if (AV()) {
    try {
      const r = await axios.get('https://www.alphavantage.co/query', {
        params: { function:'CURRENCY_EXCHANGE_RATE', from_currency:'XAU', to_currency:'USD', apikey:AV() },
        timeout: 7000
      });
      const rt = r.data?.['Realtime Currency Exchange Rate'];
      if (rt) {
        results['XAUUSD'] = {
          price:  parseFloat(rt['5. Exchange Rate']).toFixed(2),
          change: rt['10. Change Percent'] ? `${parseFloat(rt['10. Change Percent']).toFixed(2)}%` : 'N/A'
        };
      }
    } catch {}
  }

  // Fallback gold via Finnhub quote
  if (!results['XAUUSD']) {
    try {
      const r = await axios.get('https://finnhub.io/api/v1/forex/rates', {
        params: { base:'XAU', token: FH() },
        timeout: 5000
      });
      const rate = r.data?.quote?.USD;
      if (rate) results['XAUUSD'] = { price: rate.toFixed(2), change: 'N/A' };
    } catch {}
  }

  return results;
}

// ─── Hourly candles — 7 days ──────────────────────────────────────────────────
export async function getHourlyData(symbol) {
  try {
    const from = symbol.slice(0,3), to = symbol.slice(3,6);
    const r = await axios.get('https://finnhub.io/api/v1/forex/candle', {
      params: {
        symbol: `OANDA:${from}_${to}`,
        resolution: '60',
        from: Math.floor(Date.now()/1000) - 3600 * 168,
        to:   Math.floor(Date.now()/1000),
        token: FH()
      },
      timeout: 8000
    });
    if (r.data.s !== 'ok' || !r.data.c?.length) return null;

    const c = r.data.c, h = r.data.h, l = r.data.l, t = r.data.t;
    if (c.length < 24) return null;

    const cur   = c.at(-1);
    const smaH20 = avg(c.slice(-20));
    const eqH   = findEqLevels(h, 0.0002);
    const eqL   = findEqLevels(l, 0.0002);
    const fvgs  = findFVGs(h, l, c, t);
    const sessData = sessionActivity(c, h, l, t);

    return {
      symbol, current: cur.toFixed(5),
      high7d: Math.max(...h).toFixed(5), low7d: Math.min(...l).toFixed(5),
      high24h: Math.max(...h.slice(-24)).toFixed(5),
      low24h:  Math.min(...l.slice(-24)).toFixed(5),
      hourlyTrend: cur > smaH20 ? 'Bullish' : 'Bearish',
      smaH20: smaH20.toFixed(5),
      equalHighs: eqH.slice(0,3).map(v=>v.toFixed(5)),
      equalLows:  eqL.slice(0,3).map(v=>v.toFixed(5)),
      fvgs: fvgs.slice(0,3),
      sessionData: sessData,
      dataPoints: c.length
    };
  } catch { return null; }
}

// ─── Daily historical — 90 days ───────────────────────────────────────────────
export async function getHistoricalData(symbol) {
  try {
    const from = symbol.slice(0,3), to = symbol.slice(3,6);
    const r = await axios.get('https://finnhub.io/api/v1/forex/candle', {
      params: {
        symbol: `OANDA:${from}_${to}`,
        resolution: 'D',
        from: Math.floor(Date.now()/1000) - 86400 * 95,
        to:   Math.floor(Date.now()/1000),
        token: FH()
      },
      timeout: 8000
    });
    if (r.data.s !== 'ok') return null;

    const c = r.data.c||[], h = r.data.h||[], l = r.data.l||[];
    if (c.length < 14) return null;

    const cur  = c.at(-1);
    const sma20  = avg(c.slice(-20));
    const sma50  = avg(c.slice(-50));
    const sma200 = c.length >= 200 ? avg(c.slice(-200)) : null;
    const atr14  = calcATR(h, l, c, 14);
    const rsi14  = calcRSI(c, 14);
    const trend  = cur > sma50
      ? (sma200 && cur > sma200 ? 'Strong Uptrend' : 'Uptrend')
      : cur < sma50
        ? (sma200 && cur < sma200 ? 'Strong Downtrend' : 'Downtrend')
        : 'Neutral';

    return {
      symbol, current: cur.toFixed(5),
      high90: Math.max(...h).toFixed(5), low90: Math.min(...l).toFixed(5),
      sma20: sma20.toFixed(5), sma50: sma50.toFixed(5),
      sma200: sma200 ? sma200.toFixed(5) : 'N/A',
      atr: atr14.toFixed(5), rsi: rsi14.toFixed(1),
      trend, dataPoints: c.length
    };
  } catch { return null; }
}

// ─── Combined context ─────────────────────────────────────────────────────────
export async function getFullMarketContext() {
  const pairs = ['EURUSD','GBPUSD','USDJPY','XAUUSD'];
  const [dailyR, hourlyR] = await Promise.all([
    Promise.allSettled(pairs.map(s => getHistoricalData(s))),
    Promise.allSettled(pairs.map(s => getHourlyData(s)))
  ]);
  const daily={}, hourly={};
  pairs.forEach((p,i) => {
    if (dailyR[i].status==='fulfilled'  && dailyR[i].value)  daily[p]  = dailyR[i].value;
    if (hourlyR[i].status==='fulfilled' && hourlyR[i].value) hourly[p] = hourlyR[i].value;
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
      { params:{ symbol:'VIX', token:FH() }, timeout:5000 });
    return r.data?.c ?? null;
  } catch { return null; }
}

export async function getBondYield() {
  if (!AV()) return null;
  try {
    const r = await axios.get('https://www.alphavantage.co/query',
      { params:{ function:'TREASURY_YIELD', interval:'daily', maturity:'10year', apikey:AV() }, timeout:6000 });
    return r.data?.data?.[0] ? parseFloat(r.data.data[0].value).toFixed(3) : null;
  } catch { return null; }
}

// ─── Math ─────────────────────────────────────────────────────────────────────
function avg(a) { return a.reduce((x,y)=>x+y,0)/a.length; }

function calcRSI(c, p=14) {
  if (c.length < p+1) return 50;
  let g=0, l=0;
  for (let i=c.length-p; i<c.length; i++) { const d=c[i]-c[i-1]; d>0?g+=d:l-=d; }
  if (!l) return 100;
  return 100-(100/(1+(g/p)/(l/p)));
}

function calcATR(h, l, c, p=14) {
  const tr=[];
  for (let i=1;i<h.length;i++) tr.push(Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1])));
  return avg(tr.slice(-p));
}

function findEqLevels(arr, tol) {
  const lvl=[];
  for (let i=0;i<arr.length-1;i++)
    for (let j=i+1;j<arr.length;j++)
      if (Math.abs(arr[i]-arr[j])/arr[i]<tol) lvl.push(arr[i]);
  return [...new Set(lvl)].sort((a,b)=>b-a);
}

function findFVGs(h, l, c, t) {
  const fvgs=[];
  const s=Math.max(0,h.length-48);
  for (let i=s+1;i<h.length-1;i++) {
    if (h[i-1]<l[i+1]) fvgs.push({type:'Bullish FVG',top:l[i+1].toFixed(5),bottom:h[i-1].toFixed(5),time:new Date(t[i]*1000).toUTCString()});
    if (l[i-1]>h[i+1]) fvgs.push({type:'Bearish FVG',top:l[i-1].toFixed(5),bottom:h[i+1].toFixed(5),time:new Date(t[i]*1000).toUTCString()});
  }
  return fvgs;
}

function sessionActivity(c, h, l, t) {
  const bkt={};
  for (let i=0;i<t.length;i++) {
    const hr=new Date(t[i]*1000).getUTCHours();
    if (!bkt[hr]) bkt[hr]={ranges:[],count:0};
    bkt[hr].ranges.push(h[i]-l[i]);
    bkt[hr].count++;
  }
  const res={};
  for (const [hr,d] of Object.entries(bkt))
    res[hr]={avgRange:(avg(d.ranges)*10000).toFixed(1)+' pips',count:d.count};
  return res;
}
