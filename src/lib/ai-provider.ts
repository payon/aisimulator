import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { decryptSecret } from '@/lib/crypto';

export type AIProvider = 'openai' | 'gemini' | 'grok' | 'claude' | 'zai-built-in';

export interface ProviderConfig {
  provider: AIProvider;
  openaiKey: string | null;
  geminiKey: string | null;
  grokKey: string | null;
  claudeKey: string | null;
}

export async function getSettings(): Promise<ProviderConfig> {
  try {
    let settings = await db.aiSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await db.aiSettings.create({ data: { id: 'default' } });
    }
    return {
      provider: (settings.provider as AIProvider) || 'zai-built-in',
      // DB 저장값은 암호화되어 있으므로 사용 시 복호화 (레거시 평문도 허용)
      openaiKey: decryptSecret(settings.openaiKey) || process.env.OPENAI_API_KEY || null,
      geminiKey: decryptSecret(settings.geminiKey) || process.env.GEMINI_API_KEY || null,
      grokKey: decryptSecret(settings.grokKey) || process.env.GROK_API_KEY || null,
      claudeKey: decryptSecret(settings.claudeKey) || process.env.CLAUDE_API_KEY || null,
    };
  } catch {
    return {
      provider: 'zai-built-in',
      openaiKey: process.env.OPENAI_API_KEY || null,
      geminiKey: process.env.GEMINI_API_KEY || null,
      grokKey: process.env.GROK_API_KEY || null,
      claudeKey: process.env.CLAUDE_API_KEY || null,
    };
  }
}

export function getActiveProviderKey(config: ProviderConfig): { provider: AIProvider; key: string | null } {
  const p = config.provider;
  if (p === 'openai') return { provider: 'openai', key: config.openaiKey };
  if (p === 'gemini') return { provider: 'gemini', key: config.geminiKey };
  if (p === 'grok') return { provider: 'grok', key: config.grokKey };
  if (p === 'claude') return { provider: 'claude', key: config.claudeKey };
  return { provider: 'zai-built-in', key: null };
}

export async function callChatCompletion(
  messages: Array<{ role: string; content: string }>,
  requestedProvider?: AIProvider
): Promise<string> {
  const config = await getSettings();
  const provider = requestedProvider || config.provider;

  // Use z-ai-web-dev-sdk as the built-in provider (always works)
  if (provider === 'zai-built-in' || !provider) {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: messages.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
      thinking: { type: 'disabled' },
    });
    return completion.choices[0]?.message?.content || '죄송합니다, 답변을 생성하지 못했습니다.';
  }

  // OpenAI
  if (provider === 'openai' && config.openaiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 1024,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices?.[0]?.message?.content || '응답을 생성하지 못했습니다.';
  }

  // Gemini
  if (provider === 'gemini' && config.geminiKey) {
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const systemInstruction = messages.find((m) => m.role === 'system')?.content;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
        }),
      }
    );
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '응답을 생성하지 못했습니다.';
  }

  // Grok (xAI)
  if (provider === 'grok' && config.grokKey) {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.grokKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages,
        max_tokens: 1024,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices?.[0]?.message?.content || '응답을 생성하지 못했습니다.';
  }

  // Claude (Anthropic)
  if (provider === 'claude' && config.claudeKey) {
    const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
    const claudeMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.claudeKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemMsg || undefined,
        messages: claudeMessages,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.content?.[0]?.text || '응답을 생성하지 못했습니다.';
  }

  // Fallback to built-in
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: messages.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
    thinking: { type: 'disabled' },
  });
  return completion.choices[0]?.message?.content || '죄송합니다, 답변을 생성하지 못했습니다.';
}

export async function callImageEdit(
  prompt: string,
  imageBase64: string,
  requestedProvider?: AIProvider
): Promise<string | null> {
  const config = await getSettings();
  const provider = requestedProvider || config.provider;

  if (provider === 'openai' && config.openaiKey) {
    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openaiKey}`,
      },
      body: (() => {
        const formData = new FormData();
        const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const blob = new Blob([buffer], { type: 'image/png' });
        formData.append('image', blob, 'image.png');
        formData.append('prompt', prompt);
        formData.append('model', 'gpt-image-1');
        formData.append('size', '1024x1024');
        return formData;
      })(),
    });
    const data = await response.json();
    return data.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null;
  }

  // Default: use z-ai-web-dev-sdk
  const zai = await ZAI.create();
  const result = await zai.images.generations.edit({
    prompt,
    images: [{ url: imageBase64 }],
    size: '1024x1024',
  });
  const b64 = result.data[0]?.base64;
  return b64 ? `data:image/png;base64,${b64}` : null;
}
