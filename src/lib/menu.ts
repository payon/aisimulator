// 프론트/관리자 메뉴(내비게이션) 순서·표시·이름 해석 (단일 정본)
// DB(CMS Content)에 저장되는 키:
//   nav.order  (json): TabId 배열 — 사이드바·홈 카드 순서
//   nav.hidden (json): 숨긴 TabId 배열
//   nav.<id>.label (text): 메뉴 표시 이름 (없으면 TABS 기본값)
// 키가 없거나 형식이 깨져도 기본 순서로 폴백되며,
// 코드에 새로 추가된 탭(TABS)은 자동으로 맨 뒤에 붙는다.

export const NAV_ORDER_KEY = 'nav.order';
export const NAV_HIDDEN_KEY = 'nav.hidden';

export function navLabelKey(id: string): string {
  return `nav.${id}.label`;
}

function parseStringArray(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

/** 저장된 순서 + 기본 순서 병합 (미등록 탭은 뒤에 추가, 미지정 id는 제거) */
export function parseNavOrder(raw: string, defaultOrder: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of parseStringArray(raw)) {
    if (defaultOrder.includes(id) && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  for (const id of defaultOrder) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

/** 숨김 목록 (유효한 id만) */
export function parseNavHidden(raw: string, validIds: string[]): string[] {
  return parseStringArray(raw).filter((id) => validIds.includes(id));
}
