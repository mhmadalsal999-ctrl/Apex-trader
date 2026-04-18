import axios  from 'axios';
import Parser from 'rss-parser';

const rss = new Parser({ timeout: 5000 });

const RSS = [
  { url:'https://feeds.reuters.com/reuters/businessNews', name:'Reuters Business' },
  { url:'https://feeds.reuters.com/reuters/worldNews',    name:'Reuters World'    },
  { url:'https://www.marketwatch.com/rss/topstories',     name:'MarketWatch'      },
  { url:'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', name:'CNBC Economy' },
  { url:'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664',  name:'CNBC Markets' },
];

// Scoring table
const SCORE_MAP = [
  { score:4, words:['rate decision','fomc decision','rate hike','rate cut','emergency rate cut',
      'declares war','military strike','nuclear threat','sovereign default','bank failure','bank collapse'] },
  { score:3, words:['federal reserve','central bank','powell','lagarde','ueda','bailey',
      'nfp','non-farm payroll','cpi','inflation report','gdp report','interest rate',
      'monetary policy','rate','opec','sanctions','trade war','tariffs','debt ceiling'] },
  { score:2, words:['unemployment','jobless','pmi','retail sales','trade balance',
      'treasury','yield','bond','recession','stagflation','bailout','default',
      'ukraine','russia','taiwan','iran','china','nato','conflict','escalation',
      'oil price','gold','dollar','forex','currency','fed','ecb','boj','boe'] },
  { score:1, words:['economy','market','growth','inflation','spending','exports','deficit',
      'surplus','reserve','financial','fiscal','monetary','rate','bank'] },
];

const NOISE = new Set([
  'sports','celebrity','entertainment','movie','music','fashion',
  'lifestyle','weather','instagram','tiktok','dating','horoscope',
  'gaming','nft','meme','viral','influencer'
]);

// ─── Fetch all sources ────────────────────────────────────────────────────────
export async function fetchAllNews() {
  const all = [];

  // 1. NewsAPI
  if (process.env.NEWS_API_KEY) {
    try {
      const r = await axios.get('https://newsapi.org/v2/top-headlines', {
        params:{ category:'business', language:'en', pageSize:30, apiKey:process.env.NEWS_API_KEY },
        timeout:8000
      });
      (r.data.articles||[]).forEach(a => {
        if (!a.title || a.title==='[Removed]') return;
        all.push({ title:a.title, description:a.description||'', source:a.source?.name||'NewsAPI',
                   url:a.url, publishedAt:a.publishedAt, id:`na_${hash(a.url)}` });
      });
      console.log(`📰 NewsAPI: ${all.length} articles`);
    } catch(e){ console.log(`⚠️  NewsAPI: ${e.message}`); }
  }

  // 2. Finnhub — general + forex + merge
  if (process.env.FINNHUB_API_KEY) {
    const before = all.length;
    for (const cat of ['general','forex','merger']) {
      try {
        const r = await axios.get('https://finnhub.io/api/v1/news',
          { params:{ category:cat, token:process.env.FINNHUB_API_KEY }, timeout:8000 });
        (r.data||[]).slice(0,20).forEach(a => {
          if (!a.headline) return;
          all.push({ title:a.headline, description:a.summary||'', source:a.source||'Finnhub',
                     url:a.url||'', publishedAt:new Date(a.datetime*1000).toISOString(), id:`fh_${a.id}` });
        });
      } catch(e){ console.log(`⚠️  Finnhub(${cat}): ${e.message}`); }
    }
    console.log(`📰 Finnhub: ${all.length - before} articles`);
  }

  // 3. RSS feeds — parallel
  const rssResults = await Promise.allSettled(RSS.map(async src => {
    const feed = await Promise.race([
      rss.parseURL(src.url),
      new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),5000))
    ]);
    return { src, items: feed.items||[] };
  }));
  rssResults.forEach(r => {
    if (r.status==='fulfilled') {
      r.value.items.slice(0,15).forEach(item => {
        if (!item.title) return;
        all.push({ title:item.title, description:item.contentSnippet||'', source:r.value.src.name,
                   url:item.link||'', publishedAt:item.isoDate||new Date().toISOString(),
                   id:`rss_${hash(item.link||item.title)}` });
      });
    }
  });

  // Deduplicate
  const seen = new Set();
  const deduped = all.filter(n=>{ if(seen.has(n.id))return false; seen.add(n.id); return true; });
  console.log(`📊 Total unique articles: ${deduped.length}`);
  return deduped;
}

// ─── Filter: reject noise, keep meaningful ────────────────────────────────────
export function filterHighImpactNews(list) {
  return list.filter(n => {
    const text = `${n.title} ${n.description}`.toLowerCase();
    if ([...NOISE].some(kw=>text.includes(kw))) return false;
    return scoreText(text) >= 2;  // pre-filter: at least something relevant
  });
}

// ─── Score: how impactful is this news ───────────────────────────────────────
export function scoreNewsImpact(news) {
  const text = `${news.title} ${news.description}`.toLowerCase();
  return Math.min(scoreText(text), 10);
}

function scoreText(text) {
  let total=0;
  for (const {score, words} of SCORE_MAP)
    for (const w of words)
      if (text.includes(w)) total+=score;
  return total;
}

function hash(str='') {
  let h=0;
  for (let i=0;i<Math.min(str.length,80);i++) h=Math.imul(31,h)+str.charCodeAt(i)|0;
  return Math.abs(h).toString(36);
}
