import Anthropic from '@anthropic-ai/sdk';
import OpenAI     from 'openai';

let _anthropic = null;
let _openai    = null;
let _grok      = null;

const MODELS = {
  anthropic: 'claude-opus-4-5-20251101',
  openai:    'gpt-4o',
  grok:      'grok-3'          // xAI Grok-3 — latest model
};

function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// Grok uses OpenAI-compatible API with different base URL
function getGrok() {
  if (!_grok) _grok = new OpenAI({
    apiKey:  process.env.GROK_API_KEY,
    baseURL: 'https://api.x.ai/v1'
  });
  return _grok;
}

export async function callAI(systemPrompt, userMessage, maxTokens = 6000) {
  const provider = process.env.AI_PROVIDER || 'grok';

  if (provider === 'anthropic') return callAnthropic(systemPrompt, userMessage, maxTokens);
  if (provider === 'openai')    return callOpenAI(systemPrompt, userMessage, maxTokens);
  return callGrok(systemPrompt, userMessage, maxTokens);     // default: grok
}

async function callGrok(system, user, maxTokens) {
  const client = getGrok();
  const r = await client.chat.completions.create({
    model:      MODELS.grok,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user',   content: user   }
    ]
  });
  return r.choices[0].message.content.trim();
}

async function callAnthropic(system, user, maxTokens) {
  const client = getAnthropic();
  const r = await client.messages.create({
    model:      MODELS.anthropic,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }]
  });
  return r.content[0].text.trim();
}

async function callOpenAI(system, user, maxTokens) {
  const client = getOpenAI();
  const r = await client.chat.completions.create({
    model:      MODELS.openai,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user',   content: user   }
    ]
  });
  return r.choices[0].message.content.trim();
}

export function getActiveModel() {
  const p = process.env.AI_PROVIDER || 'grok';
  return `${p}/${MODELS[p] || 'unknown'}`;
}
