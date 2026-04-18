import { createClient } from '@supabase/supabase-js';

let db = null;

export async function initDB() {
  db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  const { error } = await db.from('processed_news').select('id').limit(1);
  if (error?.code==='42P01') console.warn('⚠️  Run supabase_setup.sql first');
  return db;
}

export async function isNewsProcessed(newsId) {
  try {
    const { data } = await db.from('processed_news').select('id').eq('news_id',newsId).single();
    return !!data;
  } catch { return false; }
}

export async function markNewsProcessed(newsId, analysis) {
  try {
    await db.from('processed_news').insert({
      news_id:              newsId,
      processed_at:         new Date().toISOString(),
      impact_tier:          analysis?.impact_tier              || null,
      heat_index:           analysis?.heat_index               || null,
      full_analysis:        analysis?.full_analysis            || null,
      technical_analysis:   analysis?.technical_analysis       || null,
      historical_analysis:  analysis?.historical_analysis      || null,
      smart_money_analysis: analysis?.smart_money_analysis     || null,
      mtf_analysis:         analysis?.mtf_analysis             || null,
      raw_json:             JSON.stringify(analysis)
    });
  } catch(e){ console.error('DB write error:', e.message); }
}

export async function getStoredAnalysis(newsId) {
  try {
    const { data } = await db.from('processed_news').select('*').eq('news_id',newsId).single();
    return data || null;
  } catch { return null; }
}
