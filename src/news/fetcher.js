import axios      from 'axios';
import Parser     from 'rss-parser';

const rss = new Parser({ timeout: 5000 });

// ─── RSS sources (cloud-accessible) ──────────────────────────────────────────
const RSS = [
  { url:'https://feeds.reuters.com/reuters/businessNews', name:'Reuters Business' },
  { url:'https://feeds.reuters.com/reuters/worldNews',    name:'Reuters World'    },
  { url:'https://www.marketwatch.com/rss/topstories',     name:'MarketWatch'      },
  { url:'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', name:'CNBC Economy' },
  { url:'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664',  name:'CNBC Markets' },
];

// ─── Scoring weights ──────────────────────────────────────────────────────────
// Each keyword → impact score contribution
const SCORE_MAP = [
  // CRITICAL (+3 each) — guaranteed TIER 1/2
  { score:3, words:['rate decision','fomc meeting','rate hike','rate cut','emergency rate',
    'nfp ','non-farm payroll','cpi report','pce index','declares war','military strike',
    'nuclear','sovereign default','bank collapse','bank failure','systemic risk'] },

  // HIGH IMPACT (+2 each) — likely TIER 2
  { score:2, words:['federal reserve','central bank','powell','lagarde','ueda','bailey',
    'interest rate','monetary policy','inflation','gdp','unemployment','jobless',
    'pmi','retail sales','trade balance','opec','sanctions','tariffs','trade war',
    'debt ceiling','treasury yield','bond yield','recession','stagflation','bailout',
    'ukraine','taiwan','iran','nato','escalation','coup','election result',
    'oil price','gold price','dollar index','dxy','fx intervention'] },

  // MEDIUM (+1 each) — might reach threshold
  { score:1, words:['economy','market','currency','dollar','euro','yen','sterling',
    'crude','commodity','equity','stock market','fed','ecb','boj','boe',
    'growth','spending','exports','imports','deficit','surplus','reserves'] },
];

// NOISE — always reject regardless of score
const NOISE = new Set([
  'sports','celebrity','entertainment','movie','music','fashion','lifestyle',
  'weather','social media','instagram','tiktok','dating','horoscope',
  'gaming','crypto scam','nft','meme','viral','influencer'
]);

// ─── Fetch from all sources ───────────────────────────────────────────────────
export async function fetchAllNews() {
  const all = [];

  // 1. NewsAPI
  if (process.env.NEWS_API_KEY) {
    try {
      const r = await axios.get('https://newsapi.org/v2/top-headlines', {
        params:{ category:'business', language:'en', pageSize:30, apiKey: process.env.NEWS_API_KEY },
        timeout:8000
      });
      (r.data.articles||[]).forEach(a => {
        if (!a.title || a.title==='[Removed]') return;
        all.push({ title:a.title, description:a.description||'', source:a.source?.name||'NewsAPI',
                   url:a.url, publishedAt:a.publishedAt, id:`na_${hash(a.url)}` });
      });
    } catch(e){ console.log(`⚠️  NewsAPI: ${e.message}`); }
  }

  // 2. Finnhub — general + forex categories
  if (process.env.FINNHUB_API_KEY) {
    for (const cat of ['general','forex','merger']) {
      try {
        const r = await axios.get('https://finnhub.io/api/v1/news',
          { params:{ category:cat, token: process.env.FINNHUB_API_KEY }, timeout:8000 });
        (r.data||[]).slice(0,20).forEach(a => {
          if (!a.headline) return;
          all.push({ title:a.headline, description:a.summary||'', source:a.source||'Finnhub',
                     url:a.url||'', publishedAt:new Date(a.datetime*1000).toISOString(), id:`fh_${a.id}` });
        });
      } catch {}
    }
  }

  // 3. RSS feeds — parallel
  await Promise.allSettled(RSS.map(async src => {
    try {
      const feed = await Promise.race([
        rss.parseURL(src.url),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),5000))
      ]);
      (feed.items||[]).slice(0,15).forEach(item => {
        if (!item.title) return;
        all.push({ title:item.title, description:item.contentSnippet||'', source:src.name,
                   url:item.link||'', publishedAt:item.isoDate||new Date().toISOString(),
                   id:`rss_${hash(item.link||item.title)}` });
      });
    } catch {}
  }));

  // Deduplicate by id
  const seen = new Set();
  return all.filter(n=>{ if(seen.has(n.id))return false; seen.add(n.id); return true; });
}

// ─── Two-stage filter ─────────────────────────────────────────────────────────
// Stage 1: Noise rejection (fast — no AI cost)
// Stage 2: Score threshold (only forward high-impact to AI)
export function filterHighImpactNews(list) {
  return list.filter(n => {
    const text = `${n.title} ${n.description}`.toLowerCase();
    if ([...NOISE].some(kw => text.includes(kw))) return false;
    return scoreNews(text) >= 3; // Pre-filter: at least one HIGH or three LOW keywords
  });
}

export function scoreNewsImpact(news) {
  const text = `${news.title} ${news.description}`.toLowerCase();
  return scoreNews(text);
}

function scoreNews(text) {
  let total = 0;
  for (const { score, words } of SCORE_MAP) {
    for (const w of words) {
      if (text.includes(w)) total += score;
    }
  }
  return Math.min(total, 10);
}

function hash(str='') {
  let h=0;
  for (let i=0;i<Math.min(str.length,80);i++) h=Math.imul(31,h)+str.charCodeAt(i)|0;
  return Math.abs(h).toString(36);
}
