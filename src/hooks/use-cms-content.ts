'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * CMS 콘텐츠 훅
 * 프론트엔드에서 관리자 대시보드를 통해 편집 가능한 콘텐츠를 로드합니다.
 * 
 * 사용법:
 * const { content, getContent, loading } = useCmsContent();
 * const title = getContent('home.hero.title', '기본값');
 */

interface CmsContentMap {
  [key: string]: string;
}

// 전역 캐시 - 모든 컴포넌트가 공유
// 타 단말(키오스크/태블릿) 반영 지연 단축을 위해 TTL 10초로 단축 (기존 30초)
let contentCache: CmsContentMap = {};
let cacheTimestamp = 0;
const CACHE_TTL = 10_000; // 10초 캐시
const POLL_INTERVAL = 15_000; // 백그라운드 폴링 15초 (다른 단말 변경분 수렴)

// 글로벌 리스너들 - 캐시 갱신 시 알림
let refreshListeners: (() => void)[] = [];

/**
 * 글로벌 CMS 콘텐츠 리프레시
 * 관리자가 콘텐츠를 저장한 후 호출하여 모든 프론트엔드 컴포넌트에 즉시 반영
 */
export async function refreshCmsContent() {
  contentCache = {};
  cacheTimestamp = 0;
  // 모든 리스너에게 알림
  for (const listener of refreshListeners) {
    listener();
  }
}

export function useCmsContent() {
  const [content, setContent] = useState<CmsContentMap>(contentCache);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchContent = useCallback(async (force = false) => {
    // 캐시가 유효하면 스킵
    if (!force && Object.keys(contentCache).length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
      setContent(contentCache);
      return;
    }

    setLoading(true);
    try {
      // SW/브라우저 캐시 우회 — 항상 최신 CMS 반영
      const response = await fetch('/api/cms/content', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        // CMS API returns { content, typed, categories } directly
        const contentMap = data.content || {};
        if (Object.keys(contentMap).length > 0) {
          contentCache = contentMap;
          cacheTimestamp = Date.now();
          setContent(contentMap);
        }
      }
    } catch {
      // CMS 로드 실패 시 기본값 사용 (silent fail)
    } finally {
      setLoading(false);
    }
  }, []);

  // 글로벌 리프레시 리스너 등록
  useEffect(() => {
    const listener = () => setRefreshTrigger((prev) => prev + 1);
    refreshListeners.push(listener);
    return () => {
      refreshListeners = refreshListeners.filter((l) => l !== listener);
    };
  }, []);

  useEffect(() => {
    fetchContent(refreshTrigger > 0);
  }, [fetchContent, refreshTrigger]);

  // 백그라운드 폴링 + 탭 복귀 시 갱신 (타 단말 변경 수렴용)
  useEffect(() => {
    const id = setInterval(() => {
      fetchContent(true);
    }, POLL_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchContent(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [fetchContent]);

  /**
   * 콘텐츠 키로 값을 가져옵니다.
   * @param key 콘텐츠 키 (예: 'home.hero.title')
   * @param fallback 기본값 (CMS에 값이 없을 때 사용)
   */
  const getContent = useCallback((key: string, fallback: string = ''): string => {
    return content[key] ?? fallback;
  }, [content]);

  /**
   * 캐시를 무시하고 강제로 다시 로드합니다.
   * 관리자가 콘텐츠를 변경한 후 즉시 반영하기 위해 사용합니다.
   */
  const refreshContent = useCallback(async () => {
    await refreshCmsContent();
  }, []);

  return { content, getContent, loading, refreshContent };
}

/**
 * 단일 콘텐츠 값을 빠르게 가져오는 유틸리티
 */
export function useCmsValue(key: string, fallback: string = '') {
  const { getContent, loading, refreshContent } = useCmsContent();
  return { value: getContent(key, fallback), loading, refreshContent };
}
