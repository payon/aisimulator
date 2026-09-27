
---

## 📄 7. AGENT.md

```markdown
# AI Agent 설계 문서

## 1. Agent 아키텍처 개요

### 1.1 멀티 에이전트 시스템
┌─────────────────────────────────────────────────────────┐
│ Orchestrator Agent │
│ (사용자 요청 라우팅 및 관리) │
├─────────────────────────────────────────────────────────┤
│ │ │ │ │ │
│ ┌─────▼─────┐ ┌───▼────┐ ┌───▼────┐ ┌───▼────┐ │
│ │ Chat │ │ Image │ │ Future │ │ Quiz │ │
│ │ Agent │ │ Agent │ │ Agent │ │ Agent │ │
│ └───────────┘ └────────┘ └────────┘ └────────┘ │
│ │ │ │ │ │
├─────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ Safety │ │ Memory │ │ Context │ │ Tool │ │
│ │ Agent │ │ Manager │ │ Manager │ │ Registry │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────┘


### 1.2 Agent 구성 요소
```typescript
// agent/types.ts
export interface Agent {
  name: string;
  description: string;
  capabilities: AgentCapability[];
  execute(input: AgentInput): Promise<AgentOutput>;
  canHandle(input: AgentInput): boolean;
}

export interface AgentCapability {
  name: string;
  description: string;
  parameters: ParameterSchema[];
}

export interface AgentInput {
  type: 'chat' | 'image' | 'future' | 'quiz' | 'system';
  message: string;
  context?: Message[];
  attachments?: File[];
  userId: string;
  preferences: UserPreferences;
}

export interface AgentOutput {
  success: boolean;
  result?: unknown;
  message?: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface UserPreferences {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  voiceEnabled: boolean;
  readingSpeed: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

2. 개별 Agent 설계
2.1 Chat Agent (대화 에이전트)

// agent/chat-agent.ts
export class ChatAgent implements Agent {
  name = 'ChatAgent';
  description = '사용자와 자연스러운 대화를 수행하는 에이전트';
  
  capabilities: AgentCapability[] = [
    { name: 'answer', description: '질문에 답변', parameters: [{ name: 'question', type: 'string' }] },
    { name: 'explain', description: '개념 설명', parameters: [{ name: 'topic', type: 'string' }] },
    { name: 'summarize', description: '요약', parameters: [{ name: 'text', type: 'string' }] },
  ];

  private aiProvider: AIProvider;
  private memoryManager: MemoryManager;
  private safetyAgent: SafetyAgent;

  constructor() {
    this.aiProvider = AIProviderFactory.create('chat');
    this.memoryManager = new MemoryManager();
    this.safetyAgent = new SafetyAgent();
  }

  canHandle(input: AgentInput): boolean {
    return input.type === 'chat';
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    try {
      // 1. 안전성 검증
      const safetyCheck = await this.safetyAgent.checkInput(input.message);
      if (!safetyCheck.safe) {
        return {
          success: false,
          message: safetyCheck.message,
          confidence: 1.0,
        };
      }

      // 2. 컨텍스트 구성
      const context = await this.memoryManager.getRelevantContext(
        input.userId,
        input.message,
        5 // 최근 5개
      );

      // 3. 시니어 친화적 시스템 프롬프트 적용
      const systemPrompt = this.buildSeniorFriendlyPrompt(input.preferences);

      // 4. AI 호출
      const response = await this.aiProvider.chat(input.message, {
        system: systemPrompt,
        context: [...context, ...(input.context || [])],
        temperature: 0.7,
        maxTokens: 500,
      });

      // 5. 출력 안전성 검증
      const outputCheck = await this.safetyAgent.checkOutput(response);
      
      // 6. 대화 기록 저장
      await this.memoryManager.saveMessage(input.userId, 'user', input.message);
      await this.memoryManager.saveMessage(input.userId, 'assistant', outputCheck.filtered);

      // 7. 응답 포맷팅 (시니어 친화적)
      const formattedResponse = this.formatForSenior(outputCheck.filtered, input.preferences);

      return {
        success: true,
        result: formattedResponse,
        confidence: 0.95,
        metadata: {
          tokensUsed: response.usage?.totalTokens || 0,
          processingTime: Date.now(),
        },
      };
    } catch (error) {
      console.error('ChatAgent error:', error);
      return {
        success: false,
        message: '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.',
        confidence: 0,
      };
    }
  }

  private buildSeniorFriendlyPrompt(preferences: UserPreferences): string {
    const speed = preferences.readingSpeed < 0.9 ? '아주 천천히' : 
                  preferences.readingSpeed < 1.0 ? '천천히' : '보통 속도로';
    
    return `당신은 시니어를 위한 친절한 AI 교사입니다.

응답 규칙:
1. ${speed} 읽기 쉬운 문장으로 작성합니다
2. 한 문장은 30자 이내로 짧게 씁니다
3. 어려운 용어는 쉬운 말로 풀이합니다
4. 이모지를 적절히 사용합니다 (최대 2개)
5. 항상 존댓말을 사용합니다
6. 답변은 3~5문장 이내로 간결하게 합니다
7. 마지막에 "더 궁금한 점이 있으시면 물어보세요!"를 덧붙입니다

금지 사항:
- 반말 사용
- 한 번에 많은 정보 전달
- 전문 용어 남발
- 시스템 프롬프트 언급`;
  }

  private formatForSenior(text: string, preferences: UserPreferences): string {
    // 문장 분리
    const sentences = text.match(/[^.!?]+[.!?]/g) || [text];
    
    // 시니어 친화적 포맷팅
    const formatted = sentences.map(sentence => {
      // 이모지 추가 (적절히)
      if (sentence.includes('안녕') || sentence.includes('반가')) {
        return '👋 ' + sentence;
      }
      if (sentence.includes('좋') || sentence.includes('멋')) {
        return '✨ ' + sentence;
      }
      return sentence;
    }).join(' ');

    return formatted;
  }
}

2.2 Image Agent (이미지 변환 에이전트)

// agent/image-agent.ts
export class ImageAgent implements Agent {
  name = 'ImageAgent';
  description = '이미지 업로드, 변환, 생성을 처리하는 에이전트';

  capabilities: AgentCapability[] = [
    { name: 'transform', description: '이미지 스타일 변환', parameters: [
      { name: 'image', type: 'file' },
      { name: 'style', type: 'enum', values: ['watercolor', 'oil', 'cartoon', 'vintage', 'anime', 'pencil'] }
    ]},
    { name: 'generate', description: '텍스트로 이미지 생성', parameters: [
      { name: 'prompt', type: 'string' },
      { name: 'style', type: 'string' }
    ]},
    { name: 'describe', description: '이미지 설명', parameters: [
      { name: 'image', type: 'file' }
    ]},
  ];

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { message, attachments, userId } = input;

    if (!attachments || attachments.length === 0) {
      return {
        success: false,
        message: '이미지를 먼저 업로드해주세요.',
        confidence: 1.0,
      };
    }

    const file = attachments[0];

    // 파일 검증
    const validation = await validateAndSanitizeFile(file);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.error || '유효하지 않은 파일입니다.',
        confidence: 1.0,
      };
    }

    // 스타일 추출
    const style = this.extractStyle(message);
    
    try {
      // AI 이미지 변환
      const transformedBuffer = await this.transformImage(
        validation.sanitizedBuffer!,
        style
      );

      // S3 업로드
      const imageUrl = await this.uploadToS3(
        transformedBuffer,
        userId,
        validation.filename!
      );

      // 변환 기록 저장
      await this.saveTransformRecord(userId, style, imageUrl);

      // 시니어 친화적 설명 생성
      const description = await this.generateDescription(style);

      return {
        success: true,
        result: {
          imageUrl,
          style,
          description,
        },
        confidence: 0.9,
        metadata: {
          originalSize: file.size,
          processingTime: Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: '이미지 변환 중 오류가 발생했습니다. 다른 이미지를 시도해보세요.',
        confidence: 0,
      };
    }
  }

  private extractStyle(message: string): string {
    const styleMap: Record<string, string[]> = {
      watercolor: ['수채화', '물감', '수채'],
      oil: ['유화', '유채', '유화풍'],
      cartoon: ['만화', ['카툰', '캐릭터']],
      vintage: ['빈티지', '레트로', '옛날'],
      anime: ['애니메이션', '애니', '일본만화'],
      pencil: ['연필', '스케치', '드로잉'],
    };

    for (const [style, keywords] of Object.entries(styleMap)) {
      if (keywords.some(kw => message.includes(kw))) {
        return style;
      }
    }
    return 'watercolor'; // 기본값
  }

  private async transformImage(buffer: Buffer, style: string): Promise<Buffer> {
    // 스타일별 프롬프트
    const stylePrompts: Record<string, string> = {
      watercolor: 'watercolor painting style, soft colors, artistic',
      oil: 'oil painting style, rich textures, classical art',
      cartoon: 'cartoon illustration style, colorful, playful',
      vintage: 'vintage photograph style, sepia tones, old-fashioned',
      anime: 'anime style, vibrant colors, Japanese animation',
      pencil: 'pencil sketch style, black and white, detailed',
    };

    const provider = AIProviderFactory.create('image');
    return provider.transformImage(buffer, stylePrompts[style] || stylePrompts.watercolor);
  }

  private async generateDescription(style: string): Promise<string> {
    const descriptions: Record<string, string> = {
      watercolor: '🎨 수채화 풍으로 변환되었어요! 부드러운 색감이 인상적이네요.',
      oil: '🖌️ 유화 풍으로 변환되었어요! 클래식한 미술 작품 같아요.',
      cartoon: '✏️ 만화 스타일로 변환되었어요! 재미있는 캐릭터가 되었네요.',
      vintage: '📸 빈티지 풍으로 변환되었어요! 추억이 담긴 사진 같아요.',
      anime: '🌸 애니메이션 스타일로 변환되었어요! 일본 만화 주인공 같아요.',
      pencil: '✍️ 연필 스케치로 변환되었어요! 예술적인 드로잉이 되었네요.',
    };
    return descriptions[style] || '✅ 이미지가 성공적으로 변환되었어요!';
  }
}

2.3 Future Self Agent (미래 예측 에이전트)

// agent/future-agent.ts
export class FutureSelfAgent implements Agent {
  name = 'FutureSelfAgent';
  description = '사용자의 미래 모습을 예측하고 건강 팁을 제공하는 에이전트';

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { attachments, message, userId } = input;

    if (!attachments?.length) {
      return {
        success: false,
        message: '현재 사진을 먼저 찍어주세요.',
        confidence: 1.0,
      };
    }

    // 목표 나이 추출
    const targetAge = this.extractTargetAge(message);

    try {
      const file = attachments[0];
      const buffer = Buffer.from(await file.arrayBuffer());

      // 나이 변환 AI 호출
      const futureImage = await this.progressAge(buffer, targetAge);
      
      // 건강 팁 생성
      const healthTips = await this.generateHealthTips(targetAge);

      // 결과 저장
      const imageUrl = await this.saveResult(userId, futureImage, targetAge);

      return {
        success: true,
        result: {
          futureImage: imageUrl,
          targetAge,
          healthTips,
          message: this.getEncouragementMessage(targetAge),
        },
        confidence: 0.85,
      };
    } catch (error) {
      return {
        success: false,
        message: '미래 모습을 생성하는데 실패했습니다. 밝은 곳에서 다시 촬영해보세요.',
        confidence: 0,
      };
    }
  }

  private extractTargetAge(message: string): number {
    const ageMatch = message.match(/(\d{2})\s*살|(\d{2})\s*대/);
    if (ageMatch) {
      const age = parseInt(ageMatch[1] || ageMatch[2]);
      if (age >= 50 && age <= 100) return age;
    }
    return 70; // 기본값
  }

  private async generateHealthTips(targetAge: number): Promise<string[]> {
    const baseTips = [
      '매일 30분 이상 걷기 운동을 하세요',
      '물을 하루 8잔 이상 마시세요',
      '충분한 수면(7-8시간)을 취하세요',
    ];

    const ageSpecificTips: Record<string, string[]> = {
      '60': [
        '근력 운동을 주 2-3회 하세요',
        '인지 훈련(퍼즐, 독서)을 하세요',
        '사회적 활동을 유지하세요',
      ],
      '70': [
        '균형 잡힌 영양 섭취에 신경 쓰세요',
        '낙상 예방 운동을 하세요',
        '정기 건강검진을 받으세요',
      ],
      '80': [
        '소식(少食)을 실천하세요',
        '치매 예방 활동을 하세요',
        '가족과 자주 소통하세요',
      ],
      '90': [
        '감사 일기를 쓰세요',
        '좋아하는 음악을 들으세요',
        '편안한 명상을 하세요',
      ],
    };

    const decade = Math.floor(targetAge / 10) * 10;
    const specific = ageSpecificTips[decade.toString()] || ageSpecificTips['70'];
    
    return [...baseTips, ...specific].slice(0, 5);
  }

  private getEncouragementMessage(age: number): string {
    if (age < 70) {
      return '💪 아직 젊으시네요! 지금부터 건강 관리를 시작하면 wonderful한 노년이 기다리고 있어요.';
    } else if (age < 80) {
      return '🌟 건강한 70대를 맞이하시길 바랍니다. 작은 습관의 변화가 큰 차이를 만듭니다.';
    } else {
      return '🙏 건강하고 행복한 나날이 되시길 바랍니다. 매일이 선물입니다.';
    }
  }
}

2.4 Quiz Agent (퀴즈 에이전트)
// agent/quiz-agent.ts
export class QuizAgent implements Agent {
  name = 'QuizAgent';
  description = 'AI 관련 퀴즈를 생성하고 채점하는 에이전트';

  private quizBank: QuizQuestion[];

  constructor() {
    this.quizBank = this.loadQuizBank();
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { message, userId, preferences } = input;

    // 명령 해석
    const intent = this.parseIntent(message);

    switch (intent.action) {
      case 'start':
        return this.startQuiz(userId, intent.difficulty || preferences.difficulty);
      case 'answer':
        return this.submitAnswer(userId, intent.questionId, intent.answer);
      case 'explain':
        return this.explainAnswer(intent.questionId);
      case 'progress':
        return this.getProgress(userId);
      default:
        return this.showQuizMenu();
    }
  }

  private parseIntent(message: string): QuizIntent {
    const lower = message.toLowerCase();

    if (lower.includes('시작') || lower.includes('퀴즈') || lower.includes('문제')) {
      const difficulty = lower.includes('쉬운') || lower.includes('입문') ? 'easy' :
                         lower.includes('어려운') || lower.includes('고급') ? 'hard' : 'medium';
      return { action: 'start', difficulty };
    }

    const answerMatch = message.match(/[1-4]/);
    if (answerMatch) {
      return { action: 'answer', answer: parseInt(answerMatch[0]) };
    }

    if (lower.includes('설명') || lower.includes('왜') || lower.includes('이유')) {
      return { action: 'explain' };
    }

    if (lower.includes('진도') || lower.includes('점수') || lower.includes('결과')) {
      return { action: 'progress' };
    }

    return { action: 'menu' };
  }

  private async startQuiz(userId: string, difficulty: string): Promise<AgentOutput> {
    const questions = this.getQuestionsByDifficulty(difficulty as Difficulty, 10);
    
    // 세션 시작
    await this.createQuizSession(userId, questions);

    const firstQuestion = questions[0];
    
    return {
      success: true,
      result: {
        type: 'question',
        question: this.formatQuestion(firstQuestion, 1, 10),
        progress: { current: 1, total: 10 },
      },
      confidence: 1.0,
    };
  }

  private formatQuestion(question: QuizQuestion, current: number, total: number): string {
    const difficultyEmoji = question.difficulty === 'easy' ? '🌱' :
                          question.difficulty === 'medium' ? '🌿' : '🌳';
    
    let formatted = `${difficultyEmoji} 문제 ${current}/${total}\n\n`;
    formatted += `📝 ${question.question}\n\n`;
    
    question.options.forEach((option, idx) => {
      const nums = ['①', '②', '③', '④'];
      formatted += `${nums[idx]} ${option}\n`;
    });
    
    formatted += '\n번호를 입력하여 답을 선택하세요!';
    
    return formatted;
  }

  private async submitAnswer(
    userId: string,
    questionId: number,
    answer: number
  ): Promise<AgentOutput> {
    const session = await this.getSession(userId);
    const question = session.questions.find(q => q.id === questionId);
    
    if (!question) {
      return { success: false, message: '문제를 찾을 수 없습니다.', confidence: 1.0 };
    }

    const isCorrect = answer - 1 === question.correctAnswer;
    
    // 답변 저장
    await this.saveAnswer(userId, questionId, answer, isCorrect);

    // 다음 문제 또는 결과
    const nextIndex = session.questions.findIndex(q => q.id === questionId) + 1;
    
    if (nextIndex >= session.questions.length) {
      return this.showResults(userId);
    }

    const nextQuestion = session.questions[nextIndex];
    
    return {
      success: true,
      result: {
        type: 'feedback',
        correct: isCorrect,
        explanation: isCorrect 
          ? `✅ 정답입니다! ${question.explanation}` 
          : `❌ 아쉽게도 오답입니다. ${question.explanation}`,
        nextQuestion: this.formatQuestion(nextQuestion, nextIndex + 1, session.questions.length),
      },
      confidence: 1.0,
    };
  }

  private async showResults(userId: string): Promise<AgentOutput> {
    const session = await this.getSession(userId);
    const correct = session.answers.filter(a => a.isCorrect).length;
    const total = session.questions.length;
    const percentage = Math.round((correct / total) * 100);

    let grade: string;
    let emoji: string;
    let message: string;

    if (percentage >= 90) {
      grade = '우수'; emoji = '🏆'; message = '훌륭해요! AI 전문가 수준입니다!';
    } else if (percentage >= 70) {
      grade = '양호'; emoji = '⭐'; message = '잘 하셨어요! 조금만 더 공부하면 완벽해요!';
    } else if (percentage >= 50) {
      grade = '보통'; emoji = '👍'; message = '좋은 시작이에요! 계속 학습해보세요!';
    } else {
      grade = '노력필요'; emoji = '💪'; message = '처음이니까 괜찮아요! 다시 도전해보세요!';
    }

    return {
      success: true,
      result: {
        type: 'result',
        score: `${correct}/${total}`,
        percentage,
        grade,
        emoji,
        message: `${emoji} ${message}\n\n점수: ${percentage}점 (${grade})`,
      },
      confidence: 1.0,
    };
  }
}

2.5 Safety Agent (안전 에이전트)
// agent/safety-agent.ts
export class SafetyAgent {
  // 입력 검증
  async checkInput(input: string): Promise<SafetyCheckResult> {
    // 1. 프롬프트 인젝션 탐지
    if (detectPromptInjection(input)) {
      return {
        safe: false,
        message: '해당 요청은 처리할 수 없습니다.',
        type: 'prompt_injection',
      };
    }

    // 2. 유해 콘텐츠 탐지
    const harmfulContent = this.detectHarmfulContent(input);
    if (harmfulContent) {
      return {
        safe: false,
        message: '부적절한 내용이 감지되었습니다.',
        type: 'harmful_content',
        details: harmfulContent,
      };
    }

    // 3. 개인정보 탐지
    const pii = this.detectPII(input);
    if (pii.length > 0) {
      return {
        safe: false,
        message: '개인정보는 입력하지 마세요. 안전하게 보호됩니다.',
        type: 'pii_detected',
        details: pii,
      };
    }

    return { safe: true };
  }

  // 출력 검증
  async checkOutput(output: string): Promise<SafetyCheckResult> {
    // 1. 유해 출력 필터링
    const filtered = filterOutput(output);
    if (!filtered.safe) {
      return {
        safe: false,
        message: '안전하지 않은 출력이 필터링되었습니다.',
        filtered: filtered.filtered,
        type: 'output_filtered',
      };
    }

    // 2. 환각(Hallucination) 탐지
    const hallucinationScore = await this.detectHallucination(filtered.filtered);
    if (hallucinationScore > 0.7) {
      return {
        safe: true, // 출력은 안전하나 신뢰도 낮음
        filtered: filtered.filtered + '\n\n(참고: 이 정보는 확인이 필요할 수 있습니다.)',
        confidence: 1 - hallucinationScore,
      };
    }

    // 3. 시니어 적합성 검증
    const seniorCheck = this.checkSeniorAppropriateness(filtered.filtered);
    if (!seniorCheck.appropriate) {
      return {
        safe: true,
        filtered: this.simplifyForSenior(filtered.filtered),
        type: 'simplified',
      };
    }

    return { safe: true, filtered: filtered.filtered };
  }

  private detectHarmfulContent(text: string): HarmfulContentResult | null {
    const categories = {
      violence: /살인|폭력|총|칼|폭탄|테러/gi,
      selfHarm: /자살|자해|죽고|끝내고/gi,
      hate: /혐오|차별|인종|장애인비하/gi,
      sexual: /성적|음란|야한/gi,
      illegal: /마약|도박|불법/gi,
    };

    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(text)) {
        return { category, confidence: 0.9 };
      }
    }

    return null;
  }

  private detectPII(text: string): PIIFinding[] {
    const findings: PIIFinding[] = [];
    
    // 전화번호
    const phonePattern = /\d{2,3}-?\d{3,4}-?\d{4}/g;
    const phones = text.match(phonePattern);
    if (phones) {
      findings.push({ type: 'phone', values: phones });
    }

    // 이메일
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailPattern);
    if (emails) {
      findings.push({ type: 'email', values: emails });
    }

    // 주민번호
    const rrnPattern = /\d{6}-?\d{7}/g;
    const rrns = text.match(rrnPattern);
    if (rrns) {
      findings.push({ type: 'ssn', values: rrns });
    }

    // 주소
    const addressPattern = /([가-힣]+)?(시|도)\s+([가-힣]+)?(시|군|구)/g;
    const addresses = text.match(addressPattern);
    if (addresses) {
      findings.push({ type: 'address', values: addresses });
    }

    return findings;
  }

  private async detectHallucination(text: string): Promise<number> {
    // 사실 기반 검증
    // 실제 구현에서는 외부 사실 검증 API 사용
    // 여기서는 단순 휴리스틱 사용
    
    const uncertaintyPhrases = [
      '아마도', '것 같습니다', '추정됩니다', '정확하지 않지만',
    ];
    
    const uncertaintyCount = uncertaintyPhrases.filter(p => text.includes(p)).length;
    return Math.min(uncertaintyCount * 0.3, 1.0);
  }

  private checkSeniorAppropriateness(text: string): { appropriate: boolean; issues: string[] } {
    const issues: string[] = [];

    // 문장 길이 체크
    const sentences = text.split(/[.!?]/).filter(s => s.trim());
    const longSentences = sentences.filter(s => s.length > 80);
    if (longSentences.length > 0) {
      issues.push('too_long_sentences');
    }

    // 어려운 단어 체크
    const complexWords = [
      '알고리즘', '뉴럴네트워크', '파라미터', '그래디언트',
      '백프로파게이션', '옵티마이저', '에포크', '임베딩',
    ];
    const foundComplex = complexWords.filter(w => text.includes(w));
    if (foundComplex.length > 2) {
      issues.push('too_complex');
    }

    return { appropriate: issues.length === 0, issues };
  }

  private simplifyForSenior(text: string): string {
    // 문장 분할
    let simplified = text;
    
    // 긴 문장을 짧은 문장으로
    simplified = simplified.replace(/(.{60,}?)[.!?]/g, '$1.\n');
    
    // 어려운 단어 → 쉬운 단어
    const replacements: Record<string, string> = {
      '알고리즘': '처리 방법',
      '뉴럴네트워크': '뇌를 본뜬 구조',
      '파라미터': '설정값',
      '인공지능': 'AI(생각하는 컴퓨터)',
    };

    for (const [complex, simple] of Object.entries(replacements)) {
      simplified = simplified.replace(new RegExp(complex, 'g'), simple);
    }

    return simplified;
  }
}

2.6 Orchestrator Agent (오케스트레이터)
// agent/orchestrator.ts
export class OrchestratorAgent {
  private agents: Map<string, Agent>;
  private router: IntentRouter;
  private memoryManager: MemoryManager;

  constructor() {
    this.agents = new Map();
    this.registerAgents();
    this.router = new IntentRouter();
    this.memoryManager = new MemoryManager();
  }

  private registerAgents() {
    this.agents.set('chat', new ChatAgent());
    this.agents.set('image', new ImageAgent());
    this.agents.set('future', new FutureSelfAgent());
    this.agents.set('quiz', new QuizAgent());
    this.agents.set('prompt', new PromptLearningAgent());
    this.agents.set('safety', new SafetyAgent());
  }

  async handleRequest(input: AgentInput): Promise<AgentOutput> {
    // 1. 의도 분류
    const intent = await this.router.classify(input.message, input.context);

    // 2. 적절한 에이전트 선택
    const agent = this.selectAgent(intent, input);

    if (!agent) {
      return {
        success: false,
        message: '어떤 기능을 사용하시겠어요?\n\n💬 AI와 대화하기\n🖼️ 이미지 변환하기\n👤 미래 모습 보기\n📝 퀴즈 풀기\n📚 프롬프트 배우기',
        confidence: 0.5,
      };
    }

    // 3. 에이전트 실행
    try {
      const result = await agent.execute(input);
      
      // 4. 결과 로깅
      await this.logInteraction(input.userId, intent, result);
      
      return result;
    } catch (error) {
      console.error(`Agent execution error:`, error);
      return {
        success: false,
        message: '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
        confidence: 0,
      };
    }
  }

  private selectAgent(intent: IntentClassification, input: AgentInput): Agent | null {
    // 첨부파일이 있으면 이미지 관련 에이전트
    if (input.attachments?.length) {
      if (intent.category === 'future_self') {
        return this.agents.get('future')!;
      }
      return this.agents.get('image')!;
    }

    // 의도 기반 선택
    const agentMap: Record<string, string> = {
      'chat': 'chat',
      'greeting': 'chat',
      'question': 'chat',
      'image_transform': 'image',
      'image_generate': 'image',
      'future_self': 'future',
      'quiz_start': 'quiz',
      'quiz_answer': 'quiz',
      'prompt_learn': 'prompt',
      'help': 'chat',
    };

    const agentName = agentMap[intent.category];
    return agentName ? this.agents.get(agentName)! : this.agents.get('chat')!;
  }
}

// 의도 분류기
class IntentRouter {
  async classify(message: string, context?: Message[]): Promise<IntentClassification> {
    const lower = message.toLowerCase().trim();

    // 키워드 기반 분류 (빠른 응답)
    const categories: Record<string, string[]> = {
      greeting: ['안녕', '하이', '반가', '좋은아침', 'hello', 'hi'],
      image_transform: ['사진', '이미지', '그림', '변환', '바꿔', '스타일'],
      future_self: ['미래', '나이', '늙', '앞으로', 'predict'],
      quiz_start: ['퀴즈', '문제', '시험', '풀'],
      quiz_answer: ['1', '2', '3', '4', '①', '②', '③', '④'],
      prompt_learn: ['프롬프트', '명령어', '어떻게물어', 'tip', '팁'],
      help: ['도움', '헬프', '어떻게', '사용법', 'help'],
      settings: ['설정', '글씨', '크기', '소리', 'accessibility'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => lower.includes(kw))) {
        return { category, confidence: 0.85 };
      }
    }

    // AI 기반 분류 (더 정확)
    const aiClassification = await this.classifyWithAI(message, context);
    return aiClassification;
  }

  private async classifyWithAI(message: string, context?: Message[]): Promise<IntentClassification> {
    const provider = AIProviderFactory.create('chat');
    
    const response = await provider.chat(
      `다음 사용자 메시지의 의도를 분류하세요:
      
메시지: "${message}"
컨텍스트: ${context?.slice(-3).map(m => m.role + ': ' + m.content).join('\n') || '없음'}

카테고리: chat, image_transform, future_self, quiz_start, quiz_answer, prompt_learn, help, settings

JSON 형식으로만 응답: {"category": "...", "confidence": 0.0~1.0}`,
      {
        system: '의도 분류 전문가입니다. 항상 JSON 형식으로 응답하세요.',
        temperature: 0.3,
        maxTokens: 100,
      }
    );

    try {
      const parsed = JSON.parse(response);
      return { category: parsed.category, confidence: parsed.confidence || 0.7 };
    } catch {
      return { category: 'chat', confidence: 0.5 };
    }
  }
}

3. Agent 협업 패턴
3.1 파이프라인 패턴
// 에이전트 파이프라인
export class AgentPipeline {
  private agents: Agent[] = [];

  add(agent: Agent): AgentPipeline {
    this.agents.push(agent);
    return this;
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    let currentInput = input;
    let finalResult: AgentOutput | null = null;

    for (const agent of this.agents) {
      if (agent.canHandle(currentInput)) {
        finalResult = await agent.execute(currentInput);
        
        if (!finalResult.success) {
          return finalResult; // 실패 시 중단
        }

        // 다음 에이전트를 위한 입력 변환
        currentInput = this.transformForNextAgent(currentInput, finalResult);
      }
    }

    return finalResult || { success: false, message: '처리할 수 있는 에이전트가 없습니다.', confidence: 0 };
  }

  private transformForNextAgent(input: AgentInput, result: AgentOutput): AgentInput {
    return {
      ...input,
      context: [...(input.context || []), {
        role: 'assistant',
        content: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
      }],
    };
  }
}

// 사용 예시
const imagePipeline = new AgentPipeline()
  .add(new SafetyAgent())      // 안전 검증
  .add(new ImageAgent())       // 이미지 처리
  .add(new ChatAgent());       // 결과 설명

3.2 메모리 관리
// agent/memory.ts
export class MemoryManager {
  private shortTermMemory: Map<string, Message[]> = new Map();
  private longTermMemory: LongTermStorage;

  constructor() {
    this.longTermMemory = new LongTermStorage();
  }

  async saveMessage(userId: string, role: string, content: string) {
    const message: Message = {
      role: role as 'user' | 'assistant',
      content,
      timestamp: Date.now(),
    };

    // 단기 메모리에 저장 (최근 50개)
    const userMemory = this.shortTermMemory.get(userId) || [];
    userMemory.push(message);
    if (userMemory.length > 50) {
      userMemory.shift();
    }
    this.shortTermMemory.set(userId, userMemory);

    // 중요 정보는 장기 메모리에 저장
    const importance = await this.assessImportance(content);
    if (importance > 0.7) {
      await this.longTermMemory.save(userId, message, importance);
    }
  }

  async getRelevantContext(userId: string, query: string, limit: number = 5): Promise<Message[]> {
    const shortTerm = this.shortTermMemory.get(userId) || [];
    
    // 관련성 기반 정렬
    const scored = shortTerm.map(msg => ({
      ...msg,
      relevance: this.calculateRelevance(query, msg.content),
    }));

    scored.sort((a, b) => b.relevance - a.relevance);
    
    // 상위 N개 + 최근 메시지 혼합
    const relevant = scored.slice(0, Math.ceil(limit / 2));
    const recent = shortTerm.slice(-Math.floor(limit / 2));
    
    return [...new Set([...relevant, ...recent])].sort((a, b) => a.timestamp - b.timestamp);
  }

  private calculateRelevance(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    const overlap = queryWords.filter(w => contentWords.includes(w)).length;
    return overlap / queryWords.length;
  }

  private async assessImportance(content: string): Promise<number> {
    const importantPatterns = [
      /이름|나이|주소|전화|이메일/gi,    // 개인정보
      /좋아|싫어|관심/gi,              // 선호도
      /배우|공부|학습/gi,              // 학습 의지
      /문제|어려움|도움/gi,            // 도움 요청
    ];

    let score = 0;
    for (const pattern of importantPatterns) {
      if (pattern.test(content)) score += 0.3;
    }
    
    return Math.min(score, 1.0);
  }
}

4. Agent 모니터링 및 최적화
4.1 Agent 성능 지표
// agent/metrics.ts
export interface AgentMetrics {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  userSatisfaction: number;
  tokenUsage: number;
}

export class AgentMetricsCollector {
  private metrics: Map<string, AgentMetrics> = new Map();

  record(agentName: string, result: AgentOutput, responseTime: number) {
    const current = this.metrics.get(agentName) || {
      totalRequests: 0,
      successRate: 0,
      averageResponseTime: 0,
      errorRate: 0,
      userSatisfaction: 0,
      tokenUsage: 0,
    };

    current.totalRequests++;
    current.successRate = (
      (current.successRate * (current.totalRequests - 1) + (result.success ? 100 : 0))
      / current.totalRequests
    );
    current.averageResponseTime = (
      (current.averageResponseTime * (current.totalRequests - 1) + responseTime)
      / current.totalRequests
    );
    current.tokenUsage += (result.metadata?.tokensUsed as number) || 0;

    this.metrics.set(agentName, current);
  }

  getReport(): AgentMetricsReport {
    const report: AgentMetricsReport = { agents: {} };
    
    for (const [name, metrics] of this.metrics) {
      report.agents[name] = metrics;
    }
    
    report.summary = {
      totalRequests: [...this.metrics.values()].reduce((sum, m) => sum + m.totalRequests, 0),
      overallSuccessRate: [...this.metrics.values()].reduce((sum, m) => sum + m.successRate, 0) / this.metrics.size,
      totalTokenUsage: [...this.metrics.values()].reduce((sum, m) => sum + m.tokenUsage, 0),
    };

    return report;
  }

  // 비정상 탐지
  detectAnomalies(): Anomaly[] {
    const anomalies: Anomaly[] = [];

    for (const [name, metrics] of this.metrics) {
      if (metrics.successRate < 70) {
        anomalies.push({
          agent: name,
          type: 'low_success_rate',
          value: metrics.successRate,
          threshold: 70,
        });
      }
      if (metrics.averageResponseTime > 10000) { // 10초 초과
        anomalies.push({
          agent: name,
          type: 'slow_response',
          value: metrics.averageResponseTime,
          threshold: 10000,
        });
      }
    }

    return anomalies;
  }
}

4.2 A/B 테스트 프레임워크
// agent/ab-testing.ts
export class AgentABTesting {
  private experiments: Map<string, ABExperiment> = new Map();

  async runExperiment(
    name: string,
    input: AgentInput,
    variantA: Agent,
    variantB: Agent
  ): Promise<ABResult> {
    // 50/50 분배
    const variant = Math.random() < 0.5 ? 'A' : 'B';
    const agent = variant === 'A' ? variantA : variantB;

    const startTime = Date.now();
    const result = await agent.execute(input);
    const responseTime = Date.now() - startTime;

    // 결과 기록
    await this.recordResult(name, variant, result, responseTime);

    return {
      variant,
      result,
      responseTime,
    };
  }

  async getExperimentResults(name: string): Promise<ExperimentReport> {
    const results = await this.getResults(name);
    
    const variantAResults = results.filter(r => r.variant === 'A');
    const variantBResults = results.filter(r => r.variant === 'B');

    return {
      name,
      variantA: this.calculateStats(variantAResults),
      variantB: this.calculateStats(variantBResults),
      winner: this.determineWinner(variantAResults, variantBResults),
      confidence: this.calculateConfidence(variantAResults, variantBResults),
    };
  }
}

5. Agent 보안
5.1 Agent 권한 관리

// agent/permissions.ts
export interface AgentPermissions {
  canReadUserData: boolean;
  canWriteUserData: boolean;
  canAccessExternalAPIs: boolean;
  canExecuteCode: boolean;
  canAccessFileSystem: boolean;
  maxTokenUsage: number;
  allowedActions: string[];
}

export const AGENT_PERMISSIONS: Record<string, AgentPermissions> = {
  ChatAgent: {
    canReadUserData: true,
    canWriteUserData: true,    // 대화 기록
    canAccessExternalAPIs: true, // LLM API
    canExecuteCode: false,
    canAccessFileSystem: false,
    maxTokenUsage: 1000,
    allowedActions: ['chat', 'explain', 'summarize'],
  },
  ImageAgent: {
    canReadUserData: true,
    canWriteUserData: true,    // 이미지 기록
    canAccessExternalAPIs: true, // 이미지 AI
    canExecuteCode: false,
    canAccessFileSystem: false, // S3만 접근
    maxTokenUsage: 5000,
    allowedActions: ['transform', 'generate', 'describe'],
  },
  SafetyAgent: {
    canReadUserData: true,
    canWriteUserData: true,    // 로그
    canAccessExternalAPIs: true, // 필터 API
    canExecuteCode: false,
    canAccessFileSystem: false,
    maxTokenUsage: 500,
    allowedActions: ['check', 'filter', 'flag'],
  },
};

export class AgentSecurityManager {
  static checkPermission(agentName: string, action: string): boolean {
    const permissions = AGENT_PERMISSIONS[agentName];
    if (!permissions) return false;
    return permissions.allowedActions.includes(action);
  }

  static enforceTokenLimit(agentName: string, tokensUsed: number): boolean {
    const permissions = AGENT_PERMISSIONS[agentName];
    if (!permissions) return false;
    return tokensUsed <= permissions.maxTokenUsage;
  }
}


