import cron from 'node-cron';
import { fetchAllNews, filterHighImpactNews, scoreNewsImpact } from './fetcher.js';
import { analyzeNews } from '../ai/agent.js';
import { isNewsProcessed, markNewsProcessed } from '../db/supabase.js';
import { sendAnalysisMessage } from '../utils/formatter.js';

const MIN = () => parseInt(process.env.MIN_IMPACT_SCORE || '7');

export async function startScheduler(bot) {
  await cycle(bot);                                    // immediate on boot
  cron.schedule('*/30 * * * * *', () => cycle(bot));  // then every 30s
}

async function cycle(bot) {
  try {
    const all      = await fetchAllNews();
    const filtered = filterHighImpactNews(all);

    for (const news of filtered) {
      const score = scoreNewsImpact(news);
      if (score < MIN()) continue;
      if (await isNewsProcessed(news.id)) continue;

      console.log(`\n🔥 [${score}/10] ${news.title}`);
      try {
        const analysis = await analyzeNews(news, score);
        await sendAnalysisMessage(bot, analysis, news);
        await markNewsProcessed(news.id, analysis);
      } catch(e) { console.error(`❌ Analysis error: ${e.message}`); }

      await sleep(3000);
    }
  } catch(e) { console.error(`❌ Cycle error: ${e.message}`); }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
