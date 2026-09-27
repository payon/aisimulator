'use client';

import { useState, useEffect } from 'react';

export interface MockSchedule {
  startAt: string | null;
  endAt: string | null;
  note: string;
}

interface MockModeResult {
  mockMode: boolean;
  mockSchedule: MockSchedule | null;
  isLoading: boolean;
}

export function useMockMode(): MockModeResult {
  const [mockMode, setMockMode] = useState(false);
  const [mockSchedule, setMockSchedule] = useState<MockSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchMockMode = async () => {
      try {
        const res = await fetch('/api/config', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            if (mounted) {
              // 서버가 체험 기간을 반영한 유효 mockMode를 반환
              if (data.data.mockMode !== undefined) setMockMode(data.data.mockMode);
              setMockSchedule(data.data.mockSchedule ?? null);
            }
          }
        }
      } catch {
        // ignore fetch errors
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    // Initial fetch
    fetchMockMode();

    // Poll every 15 seconds to check for admin changes (CMS 폴링과 동일 주기)
    const interval = setInterval(fetchMockMode, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { mockMode, mockSchedule, isLoading };
}

/** 체험 기간 상태 텍스트 (시니어 표시용) */
export function formatMockSchedule(schedule: MockSchedule | null): string | null {
  if (!schedule || (!schedule.startAt && !schedule.endAt)) return null;
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  };
  const s = schedule.startAt ? fmt(schedule.startAt) : '';
  const e = schedule.endAt ? fmt(schedule.endAt) : '';
  if (s && e) return `체험 기간: ${s} ~ ${e}`;
  if (s) return `체험 시작: ${s}부터`;
  return `체험 종료: ${e}까지`;
}
