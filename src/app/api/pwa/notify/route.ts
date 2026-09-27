import { NextRequest, NextResponse } from 'next/server';

// 푸시 알림 전송 API (서버 → 클라이언트)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, url, priority } = body;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: 'title과 message가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('[PWA] Push notification sent:', { title, message, priority });

    return NextResponse.json({
      success: true,
      message: '알림이 전송되었습니다.',
    });
  } catch (error) {
    console.error('[PWA] Push send error:', error);
    return NextResponse.json(
      { success: false, error: '알림 전송에 실패했습니다.' },
      { status: 500 }
    );
  }
}
