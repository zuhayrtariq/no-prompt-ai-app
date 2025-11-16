// lib/providers.ts
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function callGPT(prompt: string): Promise<string> {
  if (!openai) {
    throw new Error(
      'OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.'
    );
  }

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Updated to a valid model
    messages: [{ role: 'user', content: prompt }]
  });
  return resp.choices[0].message?.content ?? '';
}

export async function callClaude(prompt: string): Promise<string> {
  if (!anthropic) {
    throw new Error(
      'Anthropic API key not configured. Please set ANTHROPIC_API_KEY in your environment variables.'
    );
  }

  const resp = await anthropic.messages.create({
    model: 'claude-3-5-haiku-latest', // Updated to a valid model
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });
  return resp.content[0].type === 'text' ? resp.content[0].text : '';
}
