import { NextRequest, NextResponse } from 'next/server';

// 푸시 알림 구독 관리 API

// POST: 푸시 구독 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, keys, userId } = body;

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'endpoint가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('[PWA] Push subscription registered:', endpoint.substring(0, 50) + '...');

    return NextResponse.json({
      success: true,
      message: '푸시 알림 구독이 등록되었습니다.',
    });
  } catch (error) {
    console.error('[PWA] Push subscription error:', error);
    return NextResponse.json(
      { success: false, error: '구독 등록에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 푸시 구독 해제
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'endpoint가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('[PWA] Push subscription removed:', endpoint.substring(0, 50) + '...');

    return NextResponse.json({
      success: true,
      message: '푸시 알림 구독이 해제되었습니다.',
    });
  } catch (error) {
    console.error('[PWA] Push unsubscription error:', error);
    return NextResponse.json(
      { success: false, error: '구독 해제에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// GET: VAPID 공개키 조회
export async function GET() {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';

  return NextResponse.json({
    success: true,
    data: {
      vapidPublicKey,
      supported: !!vapidPublicKey,
    },
  });
}
