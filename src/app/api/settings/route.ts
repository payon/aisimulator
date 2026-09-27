import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
        openaiKeyPreview: settings.openaiKey ? `${settings.openaiKey.slice(0, 8)}...` : null,
        geminiKeyPreview: settings.geminiKey ? `${settings.geminiKey.slice(0, 8)}...` : null,
        grokKeyPreview: settings.grokKey ? `${settings.grokKey.slice(0, 8)}...` : null,
        claudeKeyPreview: settings.claudeKey ? `${settings.claudeKey.slice(0, 8)}...` : null,
      },
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ success: false, error: '설정을 불러오지 못했습니다.' }, { status: 500 });
  }
}

// PUT - Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, openaiKey, geminiKey, grokKey, claudeKey } = body;

    const settings = await db.aiSettings.upsert({
      where: { id: 'default' },
      update: {
        ...(provider ? { provider } : {}),
        ...(openaiKey !== undefined ? { openaiKey } : {}),
        ...(geminiKey !== undefined ? { geminiKey } : {}),
        ...(grokKey !== undefined ? { grokKey } : {}),
        ...(claudeKey !== undefined ? { claudeKey } : {}),
      },
      create: {
        id: 'default',
        provider: provider || 'zai-built-in',
        openaiKey: openaiKey || null,
        geminiKey: geminiKey || null,
        grokKey: grokKey || null,
        claudeKey: claudeKey || null,
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
    console.error('Settings PUT error:', error);
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
    console.error('Settings test error:', error);
    return NextResponse.json({ success: false, error: 'API 키 테스트에 실패했습니다.' }, { status: 500 });
  }
}
