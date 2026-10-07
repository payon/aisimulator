'use client';

import { useMemo } from 'react';
import { TABS, type TabId, type TabInfo } from '@/types';
import { useCmsContent } from '@/hooks/use-cms-content';
import { parseNavOrder, parseNavHidden, navLabelKey, NAV_ORDER_KEY, NAV_HIDDEN_KEY } from '@/lib/menu';

export interface NavItem {
  tab: TabInfo;
  label: string;
}

const DEFAULT_ORDER: TabId[] = TABS.map((t) => t.id);

/**
 * CMS(nav.order/nav.hidden/nav.<id>.label)를 반영한 메뉴 목록
 * 저장 직후 refreshCmsContent() → 15초 폴링으로 전 기기에 즉시 반영
 */
export function useNavItems(): NavItem[] {
  const { getContent } = useCmsContent();

  return useMemo(() => {
    const order = parseNavOrder(getContent(NAV_ORDER_KEY, ''), DEFAULT_ORDER);
    const hidden = new Set(parseNavHidden(getContent(NAV_HIDDEN_KEY, ''), DEFAULT_ORDER));
    const visible = order.filter((id) => !hidden.has(id));
    // 전부 숨긴 경우 폴백 (빈 메뉴 방지)
    const ids = visible.length > 0 ? visible : DEFAULT_ORDER;
    return ids
      .map((id) => TABS.find((t) => t.id === id))
      .filter((t): t is TabInfo => !!t)
      .map((tab) => ({ tab, label: getContent(navLabelKey(tab.id), tab.label) }));
  }, [getContent]);
}
