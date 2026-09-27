'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useClientValue } from '@/hooks/use-hydrated';

// === TTS 상태 타입 ===
export type TtsStatus =
  | 'unsupported'    // 브라우저가 SpeechSynthesis 미지원
  | 'finding-voice'  // 한국어 음성 탐색 중
  | 'warming-up'     // iOS Safari 웜업 중
  | 'ready'          // 재생 준비 완료
  | 'speaking'       // 재생 중
  | 'paused'         // 일시정지
  | 'error';         // 에러 발생

// === 한국어 음성 우선순위 정의 ===
const KOREAN_VOICE_PRIORITIES = [
  // 1. Google Cloud 원격 음성 (최고 품질)
  { test: (v: SpeechSynthesisVoice) => v.lang === 'ko-KR' && v.localService === false && v.name.includes('Google') },
  // 2. Microsoft 한국어 (Windows 로컬, 품질 좋음)
  { test: (v: SpeechSynthesisVoice) => v.lang === 'ko-KR' && v.localService && v.name.includes('Microsoft') },
  // 3. Samsung 한국어 (Android 로컬)
  { test: (v: SpeechSynthesisVoice) => v.lang === 'ko-KR' && v.localService && v.name.includes('Samsung') },
  // 4. 기타 ko-KR 원격 음성
  { test: (v: SpeechSynthesisVoice) => v.lang === 'ko-KR' && v.localService === false },
  // 5. 기타 ko-KR 로컬 음성
  { test: (v: SpeechSynthesisVoice) => v.lang === 'ko-KR' && v.localService },
  // 6. ko로 시작하는 음성 (ko-KP 등)
  { test: (v: SpeechSynthesisVoice) => v.lang.startsWith('ko') && v.lang !== 'ko-KR' },
  // 7. 영어 원격 음성 (한국어가 전혀 없을 때 대안)
  { test: (v: SpeechSynthesisVoice) => v.lang.startsWith('en') && v.localService === false },
  // 8. 영어 로컬 음성
  { test: (v: SpeechSynthesisVoice) => v.lang.startsWith('en') && v.localService },
];

// === 한국어 문장 종결 어미 패턴 ===
// 이 패턴들은 한국어 문장의 끝을 나타내며, 청크 분할 시 문장 단위로 자르기 위해 사용
const KOREAN_SENTENCE_ENDINGS = [
  '습니다.', '십니다.', '입니다.', '됩니다.', '합니다.',
  '셨습니다.', '겠습니다.', '요.', '죠.', '네.', '다.',
  '까?', '니?', '죠?', '네?', '다?',
  '어.', '아.', '에.', '지.',
];

// === 유틸리티: iOS/Safari 감지 ===
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

// === 음성 합성 (TTS) 훅 - 한국어 최적화 ===
export function useSpeechSynthesis() {
  // useClientValue로 hydration-safe하게 브라우저 API 값 읽기
  const clientSupported = useClientValue(false, () => 'speechSynthesis' in window);
  const clientInitialStatus = useClientValue<TtsStatus>(
    'finding-voice',
    () => 'speechSynthesis' in window ? 'finding-voice' : 'unsupported',
  );
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState<TtsStatus>('finding-voice');
  // supported는 state 대신 useClientValue 결과를 직접 사용
  const supported = clientSupported;
  // 초기 상태 보정: 클라이언트에서 unsupported면 반영
  const effectiveStatus = status === 'finding-voice' && clientInitialStatus === 'unsupported' ? 'unsupported' : status;
  const [koreanVoice, setKoreanVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const queueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);
  const currentRateRef = useRef(0.9);
  const currentChunkIndexRef = useRef(0);
  const allChunksRef = useRef<string[]>([]);
  const warmedUpRef = useRef(false);
  const retryCountRef = useRef(0);
  const voiceFoundRef = useRef(false);
  const maxRetries = 2;

  // Chrome은 긴 텍스트 재생 중 pause 버그가 있어서 타이머로 resume 해줘야 함
  const chromeResumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // === 한국어 음성 찾기 (우선순위 기반) ===
  const findBestKoreanVoice = useCallback((voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null;

    for (const priority of KOREAN_VOICE_PRIORITIES) {
      const match = voices.find(priority.test);
      if (match) return match;
    }

    // 최후 수단: 첫 번째 사용 가능한 음성
    return voices[0] || null;
  }, []);

  // 음성 로드 effect
  useEffect(() => {
    if (!supported) {
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);

      if (voices.length === 0) return;

      const bestVoice = findBestKoreanVoice(voices);
      if (bestVoice) {
        setKoreanVoice(bestVoice);
        voiceFoundRef.current = true;
        // iOS에서는 warm up이 필요하므로 상태를 분기
        if (isIOS() && isSafari() && !warmedUpRef.current) {
          setStatus('warming-up');
        } else {
          setStatus('ready');
        }
      }
    };

    // 초기 로드 시도
    loadVoices();

    // voiceschanged 이벤트: 일부 브라우저에서는 비동기로 음성이 로드됨
    const handleVoicesChanged = () => {
      loadVoices();
    };

    window.speechSynthesis.onvoiceschanged = handleVoicesChanged;

    // 폴백: 1초 후 다시 시도 (어떤 브라우저는 onvoiceschanged를 발생시키지 않음)
    const fallbackTimer = setTimeout(() => {
      if (!voiceFoundRef.current) {
        loadVoices();
      }
    }, 1000);

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      clearTimeout(fallbackTimer);
    };
  }, [supported, findBestKoreanVoice]);

  // === iOS Safari 웜업 ===
  // iOS Safari에서는 사용자 제스처 이후 첫 번째 speak() 호출이 실패할 수 있음
  // 이 함수를 첫 번째 사용자 인터랙션 시 호출하여 TTS 엔진을 준비시킴
  const warmUp = useCallback(() => {
    if (!supported || typeof window === 'undefined' || !window.speechSynthesis) return;
    if (warmedUpRef.current) return;

    const handleWarmedUp = () => {
      warmedUpRef.current = true;
      setStatus(currentStatus => {
        if (currentStatus === 'warming-up') return 'ready';
        return currentStatus;
      });
    };

    try {
      // 빈(또는 매우 짧은) utterance를 재생하여 엔진을 활성화
      const utterance = new SpeechSynthesisUtterance('\u314B'); // 'ㅋ' - 매우 짧은 한글 음절
      utterance.lang = 'ko-KR';
      utterance.volume = 0; // 소리 없이
      utterance.rate = 2; // 빠르게
      utterance.onend = handleWarmedUp;
      utterance.onerror = handleWarmedUp;
      window.speechSynthesis.speak(utterance);
    } catch {
      handleWarmedUp();
    }
  }, [supported]);

  // === 텍스트 정제 (마크다운/이모지 제거) ===
  const cleanText = useCallback((text: string): string => {
    return text
      .replace(/#{1,6}\s/g, '')           // 마크다운 헤더
      .replace(/\*\*/g, '')               // 볼드
      .replace(/\*/g, '')                 // 이탤릭
      .replace(/```[\s\S]*?```/g, '')     // 코드 블록
      .replace(/`[^`]+`/g, '')            // 인라인 코드
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 링크 → 텍스트만
      .replace(/[-*]\s/g, '')             // 리스트 마커
      .replace(/\d+\.\s/g, '')            // 번호 리스트 마커
      .replace(/[💡🔮🎨🖌️✏️🌸📸✍️💬🖼️📝⚙️🛡️🏠🎓✨🚀🧠👋🔊👆🎤🌱🌿🌳🏆💪📚👍⚠️✅❌🎯💡🔑📱💻🌍⭐❓]/g, '')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // 이모지 유니코드 범위
      .replace(/\n{2,}/g, '. ')          // 빈 줄 → 마침표
      .replace(/\n/g, ' ')               // 줄바꿈 → 공백
      .replace(/\s{2,}/g, ' ')           // 연속 공백 축소
      .trim();
  }, []);

  // === 텍스트를 문장 단위로 분할 (Chrome 200자 제한 대응, 한국어 문장 경계 개선) ===
  const splitIntoChunks = useCallback((text: string, maxLen: number = 180): string[] => {
    const cleaned = cleanText(text);

    if (cleaned.length <= maxLen) return cleaned.length > 0 ? [cleaned] : [];

    const chunks: string[] = [];
    let remaining = cleaned;

    while (remaining.length > 0) {
      if (remaining.length <= maxLen) {
        chunks.push(remaining);
        break;
      }

      // 1차: 한국어 문장 종결 어미로 자르기 (최우선)
      let splitPoint = -1;
      for (const ending of KOREAN_SENTENCE_ENDINGS) {
        const idx = remaining.lastIndexOf(ending, maxLen);
        if (idx !== -1) {
          const endIdx = idx + ending.length;
          if (endIdx > splitPoint) splitPoint = endIdx;
        }
      }

      // 2차: 일반 문장 부호로 자르기 (. ! ? 。)
      if (splitPoint === -1 || splitPoint < maxLen * 0.3) {
        for (const sep of ['.', '!', '?', '。', '！', '？', '~']) {
          const idx = remaining.lastIndexOf(sep, maxLen);
          if (idx !== -1) {
            const endIdx = idx + 1;
            if (endIdx > splitPoint) splitPoint = endIdx;
          }
        }
      }

      // 3차: 쉼표나 세미콜론으로 자르기
      if (splitPoint === -1 || splitPoint < maxLen * 0.3) {
        for (const sep of [',', '，', ';', '；']) {
          const idx = remaining.lastIndexOf(sep, maxLen);
          if (idx !== -1) {
            const endIdx = idx + 1;
            if (endIdx > splitPoint) splitPoint = endIdx;
          }
        }
      }

      // 4차: 공백으로 자르기
      if (splitPoint === -1 || splitPoint < maxLen * 0.3) {
        const idx = remaining.lastIndexOf(' ', maxLen);
        if (idx !== -1 && idx > splitPoint) splitPoint = idx + 1;
      }

      // 최후 수단: maxLen에서 자름
      if (splitPoint === -1) splitPoint = maxLen;

      const chunk = remaining.slice(0, splitPoint).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      remaining = remaining.slice(splitPoint).trim();
    }

    return chunks.filter(c => c.length > 0);
  }, [cleanText]);

  // === Chrome pause 버그 해결: 재생 중 주기적으로 resume 호출 ===
  const startChromeResumeTimer = useCallback(() => {
    if (chromeResumeIntervalRef.current) return;
    chromeResumeIntervalRef.current = setInterval(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (window.speechSynthesis.paused && isSpeakingRef.current) {
          window.speechSynthesis.resume();
        }
      }
    }, 5000);
  }, []);

  const stopChromeResumeTimer = useCallback(() => {
    if (chromeResumeIntervalRef.current) {
      clearInterval(chromeResumeIntervalRef.current);
      chromeResumeIntervalRef.current = null;
    }
  }, []);

  // === 큐에서 다음 청크 재생 (ref로 자기 참조 방지) ===
  const playNextRef = useRef<() => void>(() => {});

  useEffect(() => {
    playNextRef.current = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      if (queueRef.current.length === 0) {
        isSpeakingRef.current = false;
        setSpeaking(false);
        setStatus('ready');
        stopChromeResumeTimer();
        retryCountRef.current = 0;
        return;
      }

      const text = queueRef.current.shift()!;
      currentChunkIndexRef.current += 1;
      const utterance = new SpeechSynthesisUtterance(text);

      // 항상 한국어 lang 설정 - 음성이 영어더라도 한국어 발음 유도
      utterance.lang = 'ko-KR';
      utterance.rate = currentRateRef.current;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      if (koreanVoice) {
        utterance.voice = koreanVoice;
      }

      utterance.onstart = () => {
        setStatus('speaking');
      };

      utterance.onend = () => {
        retryCountRef.current = 0; // 성공 시 리셋
        playNextRef.current();
      };

      utterance.onerror = (e) => {
        const errorEvent = e as SpeechSynthesisErrorEvent;

        // 'interrupted'나 'canceled'는 정상적인 정지이므로 에러로 처리하지 않음
        if (errorEvent.error === 'interrupted' || errorEvent.error === 'canceled') {
          isSpeakingRef.current = false;
          setSpeaking(false);
          setStatus('ready');
          stopChromeResumeTimer();
          return;
        }

        console.warn('TTS chunk error:', errorEvent.error, 'chunk:', text.substring(0, 30));

        // 에러 복구: 실패한 청크 재시도 (최대 maxRetries회)
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current += 1;
          console.info(`TTS retry ${retryCountRef.current}/${maxRetries} for chunk`);

          // 실패한 청크를 큐 앞에 다시 넣기
          queueRef.current.unshift(text);

          // 약간의 지연 후 재시도
          setTimeout(() => {
            playNextRef.current();
          }, 300);
          return;
        }

        // 재시도 한계 초과: 다음 청크로 이동
        retryCountRef.current = 0;
        setStatus('error');

        // 1초 후 에러 상태 복구 시도
        setTimeout(() => {
          if (queueRef.current.length > 0) {
            setStatus('speaking');
            playNextRef.current();
          } else {
            setStatus('ready');
          }
        }, 1000);
      };

      isSpeakingRef.current = true;
      window.speechSynthesis.speak(utterance);
    };
  }, [koreanVoice, stopChromeResumeTimer]);

  // === speak: 텍스트 음성 재생 ===
  const speak = useCallback((text: string, rate: number = 0.9) => {
    if (!supported || typeof window === 'undefined' || !window.speechSynthesis) return;

    // 빈 텍스트 무시
    if (!text || text.trim().length === 0) return;

    // 기존 재생 중지
    window.speechSynthesis.cancel();
    stopChromeResumeTimer();
    queueRef.current = [];
    isSpeakingRef.current = false;
    retryCountRef.current = 0;

    // rate 저장 (ref로 현재 재생 속도 유지)
    // 한국어는 영어보다 빠르게 발음되므로 기본 속도를 0.8~0.9로 제한
    currentRateRef.current = Math.max(0.5, Math.min(1.2, rate));

    // 텍스트 분할
    const chunks = splitIntoChunks(text);
    if (chunks.length === 0) return;

    queueRef.current = chunks;
    allChunksRef.current = chunks;
    currentChunkIndexRef.current = 0;

    setSpeaking(true);
    setStatus('speaking');

    // 지연 후 재생 시작
    // Chrome 버그 대응: cancel() 후 바로 speak()하면 동작하지 않는 경우 있음
    // iOS Safari: 첫 호출이 실패할 수 있으므로 약간 더 긴 지연
    const delay = (isIOS() && isSafari()) ? 300 : 150;
    setTimeout(() => {
      startChromeResumeTimer();
      playNextRef.current();
    }, delay);
  }, [supported, splitIntoChunks, startChromeResumeTimer, stopChromeResumeTimer]);

  // === 서버 TTS 폴백 (브라우저 음성 엔진이 없을 때) ===
  const serverAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopServerAudio = useCallback(() => {
    if (serverAudioRef.current) {
      try {
        serverAudioRef.current.pause();
        serverAudioRef.current.src = '';
      } catch { /* ignore */ }
      serverAudioRef.current = null;
    }
  }, []);

  /** 서버 음성 합성 후 재생. 성공 시 true */
  const speakServer = useCallback(async (text: string): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    if (!text || text.trim().length === 0) return false;
    stopServerAudio();
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.url) return false;
      const audio = new Audio(data.url);
      serverAudioRef.current = audio;
      setSpeaking(true);
      setStatus('speaking');
      audio.onended = () => {
        setSpeaking(false);
        setStatus(supported ? 'ready' : 'unsupported');
        if (serverAudioRef.current === audio) serverAudioRef.current = null;
      };
      audio.onerror = () => {
        setSpeaking(false);
        setStatus(supported ? 'ready' : 'unsupported');
        if (serverAudioRef.current === audio) serverAudioRef.current = null;
      };
      await audio.play();
      return true;
    } catch {
      setSpeaking(false);
      return false;
    }
  }, [stopServerAudio, supported]);

  // === stop: 재생 중지 ===
  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    stopChromeResumeTimer();
    stopServerAudio();
    queueRef.current = [];
    allChunksRef.current = [];
    currentChunkIndexRef.current = 0;
    isSpeakingRef.current = false;
    retryCountRef.current = 0;
    setSpeaking(false);
    setStatus(supported ? 'ready' : 'unsupported');
  }, [supported, stopChromeResumeTimer, stopServerAudio]);

  // === 컴포넌트 언마운트 시 정리 ===
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      stopChromeResumeTimer();
      stopServerAudio();
    };
  }, [stopChromeResumeTimer]);

  // 브라우저 엔진 사용 가능 여부 (ready/speaking/paused/warming-up)
  const engineReady =
    supported && (effectiveStatus === 'ready' || effectiveStatus === 'speaking' || effectiveStatus === 'paused' || effectiveStatus === 'warming-up');

  return {
    speak,
    stop,
    speaking,
    supported,
    koreanVoiceFound: !!koreanVoice,
    voiceName: koreanVoice?.name || null,
    availableVoices,
    status: effectiveStatus,
    warmUp,
    engineReady,
    speakServer,
    stopServer: stopServerAudio,
  };
}

// === 음성 인식 (STT) 훅 ===
export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'ko-KR';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      setTranscript(finalTranscript);
    };

    recognition.onerror = (e) => {
      const errorEvent = e as SpeechRecognitionErrorEvent;
      if (errorEvent.error === 'no-speech') {
        setError('음성이 감지되지 않았습니다. 더 가까이서 말씀해주세요.');
      } else if (errorEvent.error === 'not-allowed') {
        setError('마이크 접근이 거부되었습니다. 브라우저 설정에서 허용해주세요.');
      } else if (errorEvent.error === 'aborted') {
        // 수동 중지로 인한 abort는 에러 아님
        if (!isStoppingRef.current) {
          setError('음성 인식이 중단되었습니다.');
        }
      } else {
        setError('음성 인식에 실패했습니다. 다시 시도해주세요.');
      }
      setIsListening(false);
      isStoppingRef.current = false;
    };

    recognition.onend = () => {
      setIsListening(false);
      isStoppingRef.current = false;
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setError(null);
      setTranscript('');
      isStoppingRef.current = false;
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn('STT start error:', e);
        setError('음성 인식을 시작할 수 없습니다.');
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      isStoppingRef.current = true;
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('STT stop error:', e);
      }
      setIsListening(false);
    }
  }, []);

  return { isListening, transcript, error, startListening, stopListening };
}
