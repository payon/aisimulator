// 서버 TTS 폴백 (브라우저 음성 엔진이 없을 때, OpenAI 음성 API)
// 생성된 mp3는 public/uploads/tts에 캐시 (볼륨 영속 → 오프라인 재사용 가능)
import { createHash } from 'crypto';
import { mkdir, writeFile, stat } from 'fs/promises';
import path from 'path';
import { decryptSecret } from '@/lib/crypto';
import { db } from '@/lib/db';

const CACHE_DIR = path.join(process.cwd(), 'public', 'uploads', 'tts');

async function getSpeechKey(): Promise<string | null> {
  try {
    const settings = await db.aiSettings.findUnique({ where: { id: 'default' } });
    const dbKey = decryptSecret(settings?.openaiKey);
    if (dbKey) return dbKey;
  } catch { /* ignore */ }
  return process.env.OPENAI_API_KEY || null;
}

export async function synthesizeSpeech(text: string): Promise<{ url: string; cached: boolean }> {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 2000);
  if (!clean) throw new Error('텍스트가 비어 있습니다.');
  const hash = createHash('sha256').update(clean).digest('hex');
  const file = `${hash}.mp3`;
  const abs = path.join(CACHE_DIR, file);

  try {
    await stat(abs);
    return { url: `/uploads/tts/${file}`, cached: true };
  } catch { /* miss → 생성 */ }

  const key = await getSpeechKey();
  if (!key) throw new Error('서버 TTS 키(OpenAI)가 설정되지 않았습니다.');

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: 'nova', input: clean, response_format: 'mp3' }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`TTS 생성 실패 (${res.status}): ${detail.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(abs, buf);
  return { url: `/uploads/tts/${file}`, cached: false };
}
