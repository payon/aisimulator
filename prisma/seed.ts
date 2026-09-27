import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 시드 데이터 시작...')

  // 1. 기본 권한 생성
  const permissions = [
    {
      role: 'superadmin',
      canManageUsers: true,
      canManageContent: true,
      canManageConfig: true,
      canViewAudit: true,
      canDeleteContent: true,
      canManageAPIKeys: true,
    },
    {
      role: 'admin',
      canManageUsers: true,
      canManageContent: true,
      canManageConfig: true,
      canViewAudit: true,
      canDeleteContent: true,
      canManageAPIKeys: false,
    },
    {
      role: 'editor',
      canManageUsers: false,
      canManageContent: true,
      canManageConfig: false,
      canViewAudit: false,
      canDeleteContent: false,
      canManageAPIKeys: false,
    },
    {
      role: 'viewer',
      canManageUsers: false,
      canManageContent: false,
      canManageConfig: false,
      canViewAudit: false,
      canDeleteContent: false,
      canManageAPIKeys: false,
    },
  ]

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { role: p.role },
      update: p,
      create: p,
    })
  }
  console.log('✅ 권한 생성 완료')

  // 2. 슈퍼관리자 계정 생성 (기본 비밀번호: admin123)
  const bcrypt = await import('bcrypt')
  const passwordHash = await bcrypt.hash('admin123', 10)
  
  await prisma.adminUser.upsert({
    where: { email: 'admin@aiplatform.kr' },
    update: {},
    create: {
      email: 'admin@aiplatform.kr',
      name: '슈퍼관리자',
      passwordHash,
      role: 'superadmin',
      isActive: true,
    },
  })
  console.log('✅ 관리자 계정 생성 완료 (admin@aiplatform.kr / admin123)')

  // 3. 기본 CMS 콘텐츠 시드
  const contents = [
    // 글로벌
    { key: 'global.siteName', category: 'global', type: 'text', value: 'AI 플랫폼', label: '사이트 이름', description: '헤더와 타이틀에 표시되는 사이트 이름', sortOrder: 1 },
    { key: 'global.providerBadge', category: 'global', type: 'text', value: 'OpenAI · Gemini · Grok · Claude', label: '제공자 배지 텍스트', description: '헤더에 표시되는 AI 제공자 텍스트', sortOrder: 2 },
    { key: 'global.footerText', category: 'global', type: 'text', value: 'Powered by AI', label: '푸터 텍스트', description: '사이드바 하단 텍스트', sortOrder: 3 },
    
    // 홈 화면
    { key: 'home.hero.badge', category: 'home', type: 'text', value: '다중 AI 제공자 지원', label: '히어로 배지 텍스트', description: '홈 화면 상단 배지', sortOrder: 1 },
    { key: 'home.hero.title', category: 'home', type: 'text', value: 'AI 플랫폼', label: '히어로 제목', description: '홈 화면 메인 제목', sortOrder: 2 },
    { key: 'home.hero.description', category: 'home', type: 'text', value: 'AI와 대화하고, 이미지를 변환하고, 미래를 예측하세요.\nOpenAI, Gemini, Grok, Claude — 원하는 AI를 선택하세요!', label: '히어로 설명', description: '홈 화면 설명 텍스트', sortOrder: 3 },
    { key: 'home.info.text', category: 'home', type: 'text', value: '💡 **시작하기 전에:** 설정 페이지에서 원하는 AI 제공자의 API 키를 입력하면 바로 사용할 수 있습니다.\nAPI 키가 없어도 내장 AI를 사용할 수 있어요!', label: '안내 텍스트', description: '홈 화면 하단 안내 카드', sortOrder: 4 },
    
    // 네비게이션
    { key: 'nav.home.label', category: 'nav', type: 'text', value: '홈', label: '홈 탭 라벨', description: '', sortOrder: 1 },
    { key: 'nav.chat.label', category: 'nav', type: 'text', value: 'AI 대화', label: '채팅 탭 라벨', description: '', sortOrder: 2 },
    { key: 'nav.image.label', category: 'nav', type: 'text', value: '이미지 변환', label: '이미지 탭 라벨', description: '', sortOrder: 3 },
    { key: 'nav.future.label', category: 'nav', type: 'text', value: '미래의 나', label: '미래 탭 라벨', description: '', sortOrder: 4 },
    { key: 'nav.quiz.label', category: 'nav', type: 'text', value: 'AI 퀴즈', label: '퀴즈 탭 라벨', description: '', sortOrder: 5 },
    { key: 'nav.settings.label', category: 'nav', type: 'text', value: '설정', label: '설정 탭 라벨', description: '', sortOrder: 6 },
    
    // 채팅
    { key: 'chat.title', category: 'chat', type: 'text', value: 'AI 대화하기', label: '채팅 패널 제목', description: '', sortOrder: 1 },
    { key: 'chat.subtitle', category: 'chat', type: 'text', value: 'AI와 자유롭게 대화하세요', label: '채팅 패널 부제목', description: '', sortOrder: 2 },
    { key: 'chat.welcome', category: 'chat', type: 'text', value: '안녕하세요! 저는 AI 교사입니다. 😊 AI에 대해 궁금한 것이 있으시면 무엇이든 물어보세요!\n\n예를 들어:\n• "AI란 무엇인가요?"\n• "AI가 우리 생활에 어떻게 도움이 될까요?"\n• "ChatGPT는 어떻게 작동하나요?"', label: '웰컴 메시지', description: '채팅 초기 메시지', sortOrder: 3 },
    { key: 'chat.placeholder', category: 'chat', type: 'text', value: 'AI에게 질문하세요...', label: '입력 플레이스홀더', description: '', sortOrder: 4 },
    { key: 'chat.clearMessage', category: 'chat', type: 'text', value: '대화가 초기화되었습니다. 새로운 질문을 시작해보세요! 😊', label: '초기화 메시지', description: '', sortOrder: 5 },
    { key: 'chat.loadingText', category: 'chat', type: 'text', value: 'AI가 답변을 생성하고 있어요...', label: '로딩 텍스트', description: '', sortOrder: 6 },
    
    // 이미지
    { key: 'image.title', category: 'image', type: 'text', value: '이미지 변환', label: '이미지 패널 제목', description: '', sortOrder: 1 },
    { key: 'image.subtitle', category: 'image', type: 'text', value: 'AI로 이미지 스타일을 변환하세요', label: '이미지 패널 부제목', description: '', sortOrder: 2 },
    { key: 'image.uploadTitle', category: 'image', type: 'text', value: '이미지를 업로드하세요', label: '업로드 영역 제목', description: '', sortOrder: 3 },
    { key: 'image.uploadDesc', category: 'image', type: 'text', value: 'JPG, PNG, WebP 파일 (최대 10MB)', label: '업로드 설명', description: '', sortOrder: 4 },
    { key: 'image.styles.watercolor.label', category: 'image', type: 'text', value: '수채화', label: '수채화 라벨', description: '', sortOrder: 5 },
    { key: 'image.styles.oil.label', category: 'image', type: 'text', value: '유화', label: '유화 라벨', description: '', sortOrder: 6 },
    { key: 'image.styles.cartoon.label', category: 'image', type: 'text', value: '만화', label: '만화 라벨', description: '', sortOrder: 7 },
    { key: 'image.styles.vintage.label', category: 'image', type: 'text', value: '빈티지', label: '빈티지 라벨', description: '', sortOrder: 8 },
    { key: 'image.styles.anime.label', category: 'image', type: 'text', value: '애니메이션', label: '애니메이션 라벨', description: '', sortOrder: 9 },
    { key: 'image.styles.pencil.label', category: 'image', type: 'text', value: '연필 스케치', label: '연필 스케치 라벨', description: '', sortOrder: 10 },
    
    // 미래의 나
    { key: 'future.title', category: 'future', type: 'text', value: '미래의 나', label: '미래 패널 제목', description: '', sortOrder: 1 },
    { key: 'future.subtitle', category: 'future', type: 'text', value: 'AI로 미래의 내 모습을 만나보세요', label: '미래 패널 부제목', description: '', sortOrder: 2 },
    { key: 'future.uploadTitle', category: 'future', type: 'text', value: '내 사진을 업로드하세요', label: '업로드 영역 제목', description: '', sortOrder: 3 },
    { key: 'future.uploadDesc', category: 'future', type: 'text', value: '얼굴이 보이는 정면 사진을 올려주세요', label: '업로드 설명', description: '', sortOrder: 4 },
    
    // 퀴즈
    { key: 'quiz.title', category: 'quiz', type: 'text', value: 'AI 퀴즈', label: '퀴즈 패널 제목', description: '', sortOrder: 1 },
    { key: 'quiz.subtitle', category: 'quiz', type: 'text', value: 'AI 지식을 테스트해보세요', label: '퀴즈 패널 부제목', description: '', sortOrder: 2 },
    { key: 'quiz.challengeTitle', category: 'quiz', type: 'text', value: 'AI 퀴즈에 도전하세요!', label: '도전 제목', description: '', sortOrder: 3 },
    { key: 'quiz.easy.label', category: 'quiz', type: 'text', value: '초급', label: '초급 라벨', description: '', sortOrder: 4 },
    { key: 'quiz.medium.label', category: 'quiz', type: 'text', value: '중급', label: '중급 라벨', description: '', sortOrder: 5 },
    { key: 'quiz.hard.label', category: 'quiz', type: 'text', value: '고급', label: '고급 라벨', description: '', sortOrder: 6 },
    
    // 설정
    { key: 'settings.title', category: 'settings', type: 'text', value: '설정', label: '설정 패널 제목', description: '', sortOrder: 1 },
    { key: 'settings.subtitle', category: 'settings', type: 'text', value: 'API 키 및 AI 제공자 설정', label: '설정 패널 부제목', description: '', sortOrder: 2 },
    
    // 홈 화면 기능 카드
    { key: 'home.feature.chat.title', category: 'home', type: 'text', value: 'AI 대화하기', label: '채팅 카드 제목', description: '', sortOrder: 5 },
    { key: 'home.feature.chat.description', category: 'home', type: 'text', value: 'AI와 자연스럽게 대화하며 궁금한 것을 물어보세요', label: '채팅 카드 설명', description: '', sortOrder: 6 },
    { key: 'home.feature.image.title', category: 'home', type: 'text', value: '이미지 변환', label: '이미지 카드 제목', description: '', sortOrder: 7 },
    { key: 'home.feature.image.description', category: 'home', type: 'text', value: '내 사진을 수채화, 만화, 애니메이션 등으로 변환', label: '이미지 카드 설명', description: '', sortOrder: 8 },
    { key: 'home.feature.future.title', category: 'home', type: 'text', value: '미래의 나', label: '미래 카드 제목', description: '', sortOrder: 9 },
    { key: 'home.feature.future.description', category: 'home', type: 'text', value: 'AI로 미래의 내 모습을 생성하고 건강 팁을 받아보세요', label: '미래 카드 설명', description: '', sortOrder: 10 },
    { key: 'home.feature.quiz.title', category: 'home', type: 'text', value: 'AI 퀴즈', label: '퀴즈 카드 제목', description: '', sortOrder: 11 },
    { key: 'home.feature.quiz.description', category: 'home', type: 'text', value: '초급/중급/고급 난이도로 AI 지식을 테스트하세요', label: '퀴즈 카드 설명', description: '', sortOrder: 12 },
    { key: 'home.feature.settings.title', category: 'home', type: 'text', value: '설정', label: '설정 카드 제목', description: '', sortOrder: 13 },
    { key: 'home.feature.settings.description', category: 'home', type: 'text', value: 'OpenAI, Gemini, Grok, Claude API 키를 설정하세요', label: '설정 카드 설명', description: '', sortOrder: 14 },
  ]

  for (const c of contents) {
    await prisma.content.upsert({
      where: { key: c.key },
      update: { value: c.value, label: c.label, description: c.description },
      create: c,
    })
  }
  console.log(`✅ ${contents.length}개 콘텐츠 항목 생성 완료`)

  // 4. 사이트 설정
  await prisma.siteConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  })
  console.log('✅ 사이트 설정 생성 완료')

  console.log('🎉 시드 데이터 완료!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
