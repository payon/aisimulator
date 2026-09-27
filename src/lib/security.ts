// === 보안 유틸리티 ===

// 프롬프트 인젝션 탐지
export function detectPromptInjection(input: string): boolean {
  const injectionPatterns = [
    /ignore\s+(previous|above|all)\s+instructions/i,
    /you\s+are\s+now\s+(a|an)\s+/i,
    /system\s*:/i,
    /\[INST\]/i,
    /<\|im_start\|>/i,
    /jailbreak/i,
    /DAN\s+mode/i,
    /당신은\s+(이제|부터)\s+/i,
    /네가\s+(아니라|아닌)/i,
    / forget\s+(everything|all|your)/i,
  ];
  return injectionPatterns.some((pattern) => pattern.test(input));
}

// HTML 새니타이징 (서버사이드)
export function sanitizeHTML(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// PII 패턴 마스킹
export function maskPII(text: string): string {
  let filtered = text;
  
  // 전화번호 마스킹
  filtered = filtered.replace(/\d{2,3}-\d{3,4}-\d{4}/g, '[전화번호 보호됨]');
  
  // 주민번호 마스킹
  filtered = filtered.replace(/\d{6}-\d{7}/g, '[개인정보 보호됨]');
  
  // 이메일 마스킹
  filtered = filtered.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[이메일 보호됨]'
  );
  
  return filtered;
}

// 위험 키워드 필터링
const BLOCKED_PATTERNS = [
  /폭탄만들|총기제작|마약제조|해킹방법|피싱방법/gi,
];

const FORBIDDEN_TOPICS = [
  '의료 진단', '법률 상담', '투자 조언',
  '개인 신상 정보 조회', '기밀 정보',
];

export function filterOutput(text: string): { safe: boolean; filtered: string } {
  let filtered = text;
  let blocked = false;

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(filtered)) {
      filtered = filtered.replace(pattern, '[⚠️ 내용 보호됨]');
      blocked = true;
    }
  }

  for (const topic of FORBIDDEN_TOPICS) {
    if (filtered.includes(topic)) {
      return {
        safe: false,
        filtered: '해당 주제에 대해서는 답변드리기 어렵습니다. 다른 궁금한 점이 있으시면 말씀해주세요.',
      };
    }
  }

  return { safe: !blocked, filtered };
}

// 입력 검증
export function validateMessage(input: string): { valid: boolean; error?: string } {
  if (!input || input.trim().length === 0) {
    return { valid: false, error: '메시지를 입력해주세요.' };
  }
  if (input.length > 2000) {
    return { valid: false, error: '메시지는 2000자를 초과할 수 없습니다.' };
  }
  if (detectPromptInjection(input)) {
    return { valid: false, error: '해당 요청은 처리할 수 없습니다.' };
  }
  return { valid: true };
}

// 파일 검증
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: '파일 크기는 10MB 이하여야 합니다.' };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'JPG, PNG, WebP 파일만 업로드할 수 있습니다.' };
  }
  return { valid: true };
}
