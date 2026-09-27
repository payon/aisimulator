'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, Trophy, RotateCcw, ChevronRight, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { QuizQuestion, Difficulty } from '@/types';
import { useCmsContent } from '@/hooks/use-cms-content';
import { useMockMode } from '@/hooks/use-mock-mode';
import MockModeIndicator from '@/components/features/MockModeIndicator';

const DIFFICULTY_CONFIG = [
  { id: 'easy' as Difficulty, label: '초급', emoji: '🌱', description: 'AI 기초 지식', color: 'bg-green-100 text-green-700' },
  { id: 'medium' as Difficulty, label: '중급', emoji: '🌿', description: 'AI 활용 능력', color: 'bg-amber-100 text-amber-700' },
  { id: 'hard' as Difficulty, label: '고급', emoji: '🌳', description: 'AI 심화 이해', color: 'bg-red-100 text-red-700' },
];

export default function QuizPanel() {
  const { getContent } = useCmsContent();
  const { mockMode } = useMockMode();
  const [phase, setPhase] = useState<'select' | 'playing' | 'result'>('select');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const startQuiz = async (diff: Difficulty) => {
    setDifficulty(diff);
    setIsLoading(true);
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty: diff, count: 5 }),
      });

      const data = await response.json();

      if (data.success && data.questions?.length > 0) {
        setQuestions(data.questions);
        setCurrentIndex(0);
        setScore(0);
        setAnswers([]);
        setSelectedAnswer(null);
        setShowExplanation(false);
        setPhase('playing');
      } else {
        toast.error(data.error || '퀴즈를 불러오지 못했습니다.');
      }
    } catch {
      toast.error('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(optionIndex);
    setShowExplanation(true);

    const isCorrect = optionIndex === questions[currentIndex].correctAnswer;
    if (isCorrect) setScore((prev) => prev + 1);
    setAnswers((prev) => [...prev, optionIndex]);
  };

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setPhase('result');
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const resetQuiz = () => {
    setPhase('select');
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  const getScoreMessage = () => {
    const pct = Math.round((score / questions.length) * 100);
    if (pct >= 80) return { emoji: '🏆', message: '훌륭합니다! AI 전문가가 될 수 있어요!' };
    if (pct >= 60) return { emoji: '👍', message: '잘했어요! 더 연습하면 완벽해질 거예요!' };
    if (pct >= 40) return { emoji: '💪', message: '괜찮아요! 다시 도전해보세요!' };
    return { emoji: '📚', message: 'AI 기초를 더 공부해보세요!' };
  };

  const currentQuestion = questions[currentIndex];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b bg-card">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-semibold text-sm">{getContent('quiz.title', 'AI 퀴즈')}</h2>
          <p className="text-xs text-muted-foreground">{getContent('quiz.subtitle', 'AI 지식을 테스트해보세요')}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto">
          {/* 시뮬레이션 모드 안내 */}
          {mockMode && (
            <MockModeIndicator feature="quiz" />
          )}
          <AnimatePresence mode="wait">
            {/* Difficulty Selection */}
            {phase === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-center py-8">
                  <motion.div
                    className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <GraduationCap className="w-10 h-10 text-primary" />
                  </motion.div>
                  <h3 className="text-xl font-bold">AI 퀴즈에 도전하세요!</h3>
                  <p className="text-muted-foreground mt-2">난이도를 선택하여 시작합니다</p>
                </div>

                <div className="grid gap-4">
                  {DIFFICULTY_CONFIG.map((config) => (
                    <Card
                      key={config.id}
                      className="cursor-pointer hover:shadow-md transition-all"
                      onClick={() => !isLoading && startQuiz(config.id)}
                    >
                      <CardContent className="flex items-center gap-4 p-6">
                        <span className="text-4xl">{config.emoji}</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{config.label}</h3>
                          <p className="text-sm text-muted-foreground">{config.description}</p>
                        </div>
                        <Badge variant="secondary" className={config.color}>
                          {config.id === 'easy' ? '5문제' : config.id === 'medium' ? '5문제' : '5문제'}
                        </Badge>
                        {mockMode && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-0">
                            시뮬레이션
                          </Badge>
                        )}
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {isLoading && (
                  <div className="flex justify-center py-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    >
                      <Sparkles className="w-8 h-8 text-primary" />
                    </motion.div>
                    <span className="ml-3 text-muted-foreground">퀴즈를 생성하고 있어요...</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Playing */}
            {phase === 'playing' && currentQuestion && (
              <motion.div
                key={`q-${currentIndex}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      {currentIndex + 1} / {questions.length}문제
                    </span>
                    <Badge variant="outline">
                      {DIFFICULTY_CONFIG.find((d) => d.id === difficulty)?.emoji}{' '}
                      {DIFFICULTY_CONFIG.find((d) => d.id === difficulty)?.label}
                    </Badge>
                  </div>
                  <Progress value={((currentIndex + 1) / questions.length) * 100} />
                </div>

                {/* Question */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{currentQuestion.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h3 className="text-lg font-medium leading-relaxed">{currentQuestion.question}</h3>
                  </CardContent>
                </Card>

                {/* Options */}
                <div className="space-y-3">
                  {currentQuestion.options.map((option, idx) => {
                    let optionStyle = 'hover:border-primary/50 cursor-pointer';
                    if (selectedAnswer !== null) {
                      if (idx === currentQuestion.correctAnswer) {
                        optionStyle = 'border-green-500 bg-green-50';
                      } else if (idx === selectedAnswer && idx !== currentQuestion.correctAnswer) {
                        optionStyle = 'border-red-500 bg-red-50';
                      } else {
                        optionStyle = 'opacity-50';
                      }
                    }

                    return (
                      <Card
                        key={idx}
                        className={`transition-all ${optionStyle}`}
                        onClick={() => handleAnswer(idx)}
                      >
                        <CardContent className="flex items-center gap-3 p-4">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              selectedAnswer !== null && idx === currentQuestion.correctAnswer
                                ? 'bg-green-500 text-white'
                                : selectedAnswer === idx && idx !== currentQuestion.correctAnswer
                                  ? 'bg-red-500 text-white'
                                  : 'bg-muted'
                            }`}
                          >
                            {selectedAnswer !== null && idx === currentQuestion.correctAnswer ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : selectedAnswer === idx && idx !== currentQuestion.correctAnswer ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              String.fromCharCode(65 + idx)
                            )}
                          </div>
                          <span className="text-sm">{option}</span>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Explanation */}
                <AnimatePresence>
                  {showExplanation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium mb-1">해설</p>
                          <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
                        </CardContent>
                      </Card>
                      <div className="flex justify-center mt-4">
                        <Button onClick={nextQuestion} className="px-8">
                          {currentIndex + 1 >= questions.length ? '결과 보기' : '다음 문제'}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Result */}
            {phase === 'result' && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6 text-center py-8"
              >
                <motion.div
                  className="text-6xl"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  {getScoreMessage().emoji}
                </motion.div>

                <Card className="max-w-md mx-auto">
                  <CardContent className="p-8 space-y-4">
                    <h3 className="text-2xl font-bold">
                      {score} / {questions.length} 정답
                    </h3>
                    <Progress
                      value={(score / questions.length) * 100}
                      className="h-3"
                    />
                    <p className="text-muted-foreground">{getScoreMessage().message}</p>
                    <Badge variant="outline" className="text-sm">
                      {DIFFICULTY_CONFIG.find((d) => d.id === difficulty)?.emoji}{' '}
                      {DIFFICULTY_CONFIG.find((d) => d.id === difficulty)?.label} 완료
                    </Badge>
                  </CardContent>
                </Card>

                <div className="flex gap-3 justify-center">
                  <Button onClick={resetQuiz} variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    다시 선택하기
                  </Button>
                  <Button onClick={() => startQuiz(difficulty)}>
                    <Trophy className="w-4 h-4 mr-2" />
                    같은 난이도 재도전
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
