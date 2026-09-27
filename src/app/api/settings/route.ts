import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encryptSecret, decryptSecret } from '@/lib/crypto';
import { logger } from '@/lib/logger';

function preview(enc: string | null): string | null {
  const v = decryptSecret(enc);
  return v ? `${v.slice(0, 4)}...${v.slice(-2)}` : null;
}

// GET - Fetch settings
export async function GET() {
  try {
    let settings = await db.aiSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await db.aiSettings.create({ data: { id: 'default' } });
    }
    return NextResponse.json({
      success: true,
      data: {
        provider: settings.provider,
        hasOpenaiKey: !!settings.openaiKey,
        hasGeminiKey: !!settings.geminiKey,
        hasGrokKey: !!settings.grokKey,
        hasClaudeKey: !!settings.claudeKey,
        openaiKeyPreview: preview(settings.openaiKey),
        geminiKeyPreview: preview(settings.geminiKey),
        grokKeyPreview: preview(settings.grokKey),
        claudeKeyPreview: preview(settings.claudeKey),
      },
    });
  } catch (error) {
    logger.error('Settings GET error', { error: String(error) });
    return NextResponse.json({ success: false, error: '설정을 불러오지 못했습니다.' }, { status: 500 });
  }
}

// PUT - Update settings (API 키는 AES-256-GCM 암호화 저장)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, openaiKey, geminiKey, grokKey, claudeKey } = body;

    const enc = (v: unknown) =>
      typeof v === 'string' && v.length > 0 ? encryptSecret(v) : v === '' ? null : undefined;

    const settings = await db.aiSettings.upsert({
      where: { id: 'default' },
      update: {
        ...(provider ? { provider } : {}),
        ...(enc(openaiKey) !== undefined ? { openaiKey: enc(openaiKey) as string | null } : {}),
        ...(enc(geminiKey) !== undefined ? { geminiKey: enc(geminiKey) as string | null } : {}),
        ...(enc(grokKey) !== undefined ? { grokKey: enc(grokKey) as string | null } : {}),
        ...(enc(claudeKey) !== undefined ? { claudeKey: enc(claudeKey) as string | null } : {}),
      },
      create: {
        id: 'default',
        provider: provider || 'zai-built-in',
        openaiKey: (enc(openaiKey) as string | null) || null,
        geminiKey: (enc(geminiKey) as string | null) || null,
        grokKey: (enc(grokKey) as string | null) || null,
        claudeKey: (enc(claudeKey) as string | null) || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        provider: settings.provider,
        hasOpenaiKey: !!settings.openaiKey,
        hasGeminiKey: !!settings.geminiKey,
        hasGrokKey: !!settings.grokKey,
        hasClaudeKey: !!settings.claudeKey,
      },
    });
  } catch (error) {
    logger.error('Settings PUT error:', error);
    return NextResponse.json({ success: false, error: '설정 저장에 실패했습니다.' }, { status: 500 });
  }
}

// POST - Test API key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, key } = body;

    if (!provider || !key) {
      return NextResponse.json({ success: false, error: 'Provider와 API Key를 입력해주세요.' }, { status: 400 });
    }

    let testSuccess = false;
    let errorMessage = '';

    try {
      if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        });
        testSuccess = response.ok;
        if (!testSuccess) {
          const data = await response.json();
          errorMessage = data.error?.message || '인증 실패';
        }
      } else if (provider === 'gemini') {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
        );
        testSuccess = response.ok;
        if (!testSuccess) {
          const data = await response.json();
          errorMessage = data.error?.message || '인증 실패';
        }
      } else if (provider === 'grok') {
        const response = await fetch('https://api.x.ai/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        });
        testSuccess = response.ok;
        if (!testSuccess) {
          const data = await response.json();
          errorMessage = data.error?.message || '인증 실패';
        }
      } else if (provider === 'claude') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        });
        testSuccess = response.ok;
        if (!testSuccess) {
          const data = await response.json();
          errorMessage = data.error?.message || '인증 실패';
        }
      }
    } catch {
      errorMessage = '네트워크 오류가 발생했습니다.';
    }

    return NextResponse.json({
      success: true,
      data: { valid: testSuccess, error: errorMessage },
    });
  } catch (error) {
    logger.error('Settings test error:', error);
    return NextResponse.json({ success: false, error: 'API 키 테스트에 실패했습니다.' }, { status: 500 });
  }
}
