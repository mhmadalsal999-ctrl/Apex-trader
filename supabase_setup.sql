-- ============================================================
-- APEX SOVEREIGN BOT v3 — Supabase Setup
-- Run this in Supabase SQL Editor before starting the bot
-- ============================================================

create table if not exists processed_news (
  id                   uuid default gen_random_uuid() primary key,
  news_id              text unique not null,
  processed_at         timestamptz default now(),
  impact_tier          text,
  heat_index           int,
  full_analysis        text,
  technical_analysis   text,
  historical_analysis  text,
  smart_money_analysis text,
  mtf_analysis         text,
  raw_json             text,
  created_at           timestamptz default now()
);

create index if not exists idx_news_id      on processed_news(news_id);
create index if not exists idx_processed_at on processed_news(processed_at desc);

-- Auto-delete news older than 30 days
create or replace function delete_old_news()
returns void language plpgsql as $$
begin
  delete from processed_news where processed_at < now() - interval '30 days';
end;
$$;
