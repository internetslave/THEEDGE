import { FANTASY_SYSTEM } from '../config/constants.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { ServiceError } from '../utils/service-error.js';
import { sanitizeText } from '../utils/validation.js';

const fantasyLogger = logger.child({ component: 'fantasy-service', provider: 'Anthropic' });

export async function askFantasy(prompt, title = '') {
  if (!env.ANTHROPIC_API_KEY) throw new ServiceError(503, 'AI not configured', { success: false });
  if (!prompt || typeof prompt !== 'string') throw new ServiceError(400, 'Prompt required', { success: false });

  const trimmed = sanitizeText(prompt, { maxLength: 2000, allowNewlines: true });
  const safeTitle = sanitizeText(title, { maxLength: 80 });
  if (!trimmed.length) throw new ServiceError(400, 'Prompt required', { success: false });
  if (trimmed.length > 2000) throw new ServiceError(400, 'Prompt too long (max 2000 chars)', { success: false });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: FANTASY_SYSTEM,
        messages: [{ role: 'user', content: trimmed }],
      }),
    });

    if (!response.ok) {
      fantasyLogger.warn('fantasy.upstream.error', { statusCode: response.status });
      throw new ServiceError(502, 'AI service returned an error', { success: false });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) throw new ServiceError(502, 'No response from AI', { success: false });

    return { success: true, text, title: safeTitle };
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    fantasyLogger.error('fantasy.request.failed', {
      error: { name: error.name, message: error.message },
    });
    throw new ServiceError(500, 'AI request failed', { success: false });
  }
}
