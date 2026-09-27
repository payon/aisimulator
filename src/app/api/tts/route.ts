import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { synthesizeSpeech } from '@/lib/server-tts';

/** POST /api/tts { text } — 서버 음성 합성 (브라우저 TTS 폴백용, mp3 URL 반환) */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`tts:${ip}`, 10, 60);
    if (!rl.success) {
      return NextResponse.json({ success: false, error: '요청이 너무 많습니다.' }, { status: 429 });
    }
    const { text } = await request.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ success: false, error: 'text가 필요합니다.' }, { status: 400 });
    }
    const { url, cached } = await synthesizeSpeech(text);
    return NextResponse.json({ success: true, url, cached });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'TTS 생성에 실패했습니다.';
    logger.error('TTS error', { error: msg });
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
