import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Dumbbell,
  Flame,
  Heart,
  Lock,
  Music,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import type { CurriculumNode } from '../../lib/dashboard/curriculum';
import { expProgress } from '../../lib/dashboard/curriculum';
import {
  DRILL_TIMEOUT_SEC,
  MAX_CONSECUTIVE_MISSES,
  MAX_HEARTS,
  RHYTHM_PASS_ACCURACY_THRESHOLD,
  THEORY_QUIZ_HEART_RESTORE_THRESHOLD,
  type HeartDepletionReason,
  type HeartDepletionResult,
} from '../../lib/gamification';
import type { CompleteLessonParams, SessionCompletionSummary } from '../../hooks/useGamification';
import LessonModule from '../theory/LessonModule';
import { SAMPLE_LESSON, type Lesson as TheoryLessonModel } from '../../lib/theory/lesson';
import type { QuizResult } from '../../lib/theory/quiz';

interface LessonSessionModalProps {
  lesson: CurriculumNode;
  hearts: number;
  streak: number;
  exp: number;
  nextHeartLabel: string;
  onClose: () => void;
  onComplete: (params: CompleteLessonParams) => SessionCompletionSummary;
  onLoseHeart: (reason: HeartDepletionReason) => HeartDepletionResult;
  onSwitchToTheory?: () => void;
}

function buildTheoryLessonForNode(node: CurriculumNode): TheoryLessonModel {
  return {
    ...SAMPLE_LESSON,
    id: node.id,
    title: node.title,
  };
}

export default function LessonSessionModal({
  lesson,
  hearts,
  streak,
  exp,
  nextHeartLabel,
  onClose,
  onComplete,
  onLoseHeart,
  onSwitchToTheory,
}: LessonSessionModalProps) {
  const [summary, setSummary] = useState<SessionCompletionSummary | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    text: string;
    tone: 'error' | 'warning' | 'success' | 'info';
  } | null>(null);

  // Practice drill state (15s timeout & 3 consecutive misses rule)
  const [drillArmed, setDrillArmed] = useState<boolean>(lesson.kind === 'practice' && hearts > 0);
  const [remainingSec, setRemainingSec] = useState<number>(DRILL_TIMEOUT_SEC);
  const [consecutiveMisses, setConsecutiveMisses] = useState<number>(0);
  const [postureCompliant, setPostureCompliant] = useState<boolean>(true);
  const [postureScore, setPostureScore] = useState<number>(96);
  const [pitchAccuracy, setPitchAccuracy] = useState<number>(100);

  // Rhythm drill state
  const [rhythmTaps, setRhythmTaps] = useState<Array<'Perfect' | 'Good' | 'Miss'>>([]);
  const targetBeats = 8;

  const isLockedOut = hearts <= 0 && lesson.kind !== 'theory';

  // 15-second practice drill countdown timer (SDD 6.3 / SRS 3.1.2.4)
  useEffect(() => {
    if (lesson.kind !== 'practice' || !drillArmed || isLockedOut || summary) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          const res = onLoseHeart('timeout');
          setConsecutiveMisses(0);
          setFeedbackBanner({
            text: res.message,
            tone: 'error',
          });
          if (res.lockedOut) {
            setDrillArmed(false);
            return 0;
          }
          return DRILL_TIMEOUT_SEC;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [lesson.kind, drillArmed, isLockedOut, summary, onLoseHeart]);

  // Handler when a wrong note/chord is played during Practice
  const handlePracticeMiss = () => {
    if (isLockedOut || summary) return;
    const nextMisses = consecutiveMisses + 1;
    setPitchAccuracy((prev) => Math.max(70, prev - 5));

    if (nextMisses >= MAX_CONSECUTIVE_MISSES) {
      const res = onLoseHeart('misses');
      setConsecutiveMisses(0);
      setRemainingSec(DRILL_TIMEOUT_SEC);
      setFeedbackBanner({
        text: res.message,
        tone: 'error',
      });
      if (res.lockedOut) {
        setDrillArmed(false);
      }
    } else {
      setConsecutiveMisses(nextMisses);
      setFeedbackBanner({
        text: `Incorrect chord voicing (${nextMisses}/${MAX_CONSECUTIVE_MISSES} consecutive misses before losing 1 Heart).`,
        tone: 'warning',
      });
    }
  };

  // Handler when the 15s timer expires manually or via simulation
  const handlePracticeTimeout = () => {
    if (isLockedOut || summary) return;
    const res = onLoseHeart('timeout');
    setConsecutiveMisses(0);
    setRemainingSec(res.lockedOut ? 0 : DRILL_TIMEOUT_SEC);
    if (res.lockedOut) {
      setDrillArmed(false);
    }
    setFeedbackBanner({
      text: res.message,
      tone: 'error',
    });
  };

  // Handler when target chord/note is played
  const handlePracticeMatch = () => {
    if (isLockedOut || summary) return;
    if (!postureCompliant) {
      setConsecutiveMisses(0);
      setFeedbackBanner({
        text: 'Acoustic pitch matched, but posture Latch blocked! Keep elbow 80°–110° and wrist 150°–180° within the 400ms window.',
        tone: 'warning',
      });
      return;
    }

    setDrillArmed(false);
    const result = onComplete({
      lesson,
      accuracyPercent: pitchAccuracy,
      postureScore,
      rhythmConsistency: 94,
      durationSec: Math.max(10, DRILL_TIMEOUT_SEC - remainingSec + 25),
    });
    setSummary(result);
  };

  // Handler for Theory Lesson / Quiz completion
  const handleTheoryQuizComplete = (quizResult: QuizResult) => {
    if (quizResult.percent < THEORY_QUIZ_HEART_RESTORE_THRESHOLD) {
      setFeedbackBanner({
        text: `You scored ${quizResult.percent}%. Score at least ${THEORY_QUIZ_HEART_RESTORE_THRESHOLD}% on the Theory Quiz to complete the unit and restore +1 Heart!`,
        tone: 'warning',
      });
      return;
    }

    const result = onComplete({
      lesson,
      accuracyPercent: quizResult.percent,
      postureScore: 96,
      rhythmConsistency: 95,
      durationSec: 60,
    });
    setSummary(result);
  };

  // Handler for Rhythm taps
  const recordRhythmTap = (verdict: 'Perfect' | 'Good' | 'Miss') => {
    if (isLockedOut || summary) return;
    const next = [...rhythmTaps, verdict];
    setRhythmTaps(next);

    if (next.length >= targetBeats) {
      const points = next.reduce(
        (sum, v) => sum + (v === 'Perfect' ? 100 : v === 'Good' ? 70 : 0),
        0,
      );
      const accuracy = Math.round(points / targetBeats);
      const consistency = Math.max(
        50,
        Math.round(
          ((next.filter((v) => v === 'Perfect').length * 100 +
            next.filter((v) => v === 'Good').length * 80) /
            targetBeats),
        ),
      );

      if (accuracy < RHYTHM_PASS_ACCURACY_THRESHOLD) {
        const res = onLoseHeart('rhythm-fail');
        setRhythmTaps([]);
        setFeedbackBanner({
          text: res.message,
          tone: 'error',
        });
        return;
      }

      const result = onComplete({
        lesson,
        accuracyPercent: accuracy,
        rhythmConsistency: consistency,
        postureScore: 95,
        durationSec: 40,
      });
      setSummary(result);
    }
  };

  const tierInfo = expProgress(summary ? summary.nextExp : exp);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-[#0b101e] text-slate-100 shadow-[0_25px_80px_rgba(0,0,0,0.85)]">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/90 bg-[#0f1629] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30">
              {lesson.kind === 'theory' ? (
                <BookOpen className="h-5 w-5" />
              ) : lesson.kind === 'rhythm' ? (
                <Activity className="h-5 w-5" />
              ) : (
                <Dumbbell className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                  Module {lesson.module_index} · Node {lesson.node_index} · {lesson.kind}
                </span>
                {lesson.kind === 'theory' && (
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    Free Stamina · Restores +1 Heart (≥80%)
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white">{lesson.title}</h2>
            </div>
          </div>

          {/* Live HUD Pills inside Modal */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5">
              {Array.from({ length: MAX_HEARTS }).map((_, idx) => (
                <Heart
                  key={idx}
                  className={`h-3.5 w-3.5 transition-all ${
                    idx < (summary ? summary.hearts : hearts)
                      ? 'fill-rose-500 text-rose-500'
                      : 'text-slate-700'
                  }`}
                />
              ))}
              <span className="ml-1 text-xs font-bold tabular-nums text-slate-200">
                {summary ? summary.hearts : hearts}/{MAX_HEARTS}
              </span>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-amber-300">
              <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold tabular-nums">
                {summary ? summary.currentStreak : streak}d
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-white"
              title="Close session"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedbackBanner && !summary && (
          <div
            role="alert"
            className={`flex items-center justify-between border-b px-6 py-3 text-xs font-semibold ${
              feedbackBanner.tone === 'error'
                ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
                : feedbackBanner.tone === 'warning'
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                  : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{feedbackBanner.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-[11px] uppercase tracking-wider opacity-75 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* =================================================================
              STATE A: SESSION COMPLETION SUMMARY (EXP, STREAK, HEARTS, BADGES)
              ================================================================= */}
          {summary ? (
            <div className="mx-auto max-w-2xl space-y-6 py-2">
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest text-emerald-300">
                  {summary.isReplay ? 'Practice Replay Complete' : 'Node Mastered'}
                </span>
                <h3 className="mt-2 text-2xl font-black text-white">{lesson.title} Complete!</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Your progression, daily streak, and performance telemetry have been updated.
                </p>
              </div>

              {/* 3 Gamification Outcome Cards: EXP, Daily Streak, Hearts */}
              <div className="grid gap-4 sm:grid-cols-3">
                {/* EXP Card */}
                <div className="rounded-2xl border border-violet-500/40 bg-violet-950/25 p-4">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-violet-300">
                    <span>EXP Earned</span>
                    <Sparkles className="h-4 w-4 text-violet-400" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-white">
                    +{summary.totalExpAwarded} XP
                  </p>
                  <div className="mt-2 space-y-0.5 text-[11px] text-slate-300">
                    <div className="flex justify-between">
                      <span>Base Lesson:</span>
                      <span className="font-semibold">+{summary.expBreakdown.baseExp} XP</span>
                    </div>
                    {summary.expBreakdown.accuracyBonus > 0 && (
                      <div className="flex justify-between text-emerald-300">
                        <span>Accuracy Bonus:</span>
                        <span className="font-semibold">+{summary.expBreakdown.accuracyBonus} XP</span>
                      </div>
                    )}
                    {summary.expBreakdown.postureBonus > 0 && (
                      <div className="flex justify-between text-sky-300">
                        <span>Posture Bonus:</span>
                        <span className="font-semibold">+{summary.expBreakdown.postureBonus} XP</span>
                      </div>
                    )}
                    {summary.expBreakdown.streakBonus > 0 && (
                      <div className="flex justify-between text-amber-300">
                        <span>Streak Bonus:</span>
                        <span className="font-semibold">+{summary.expBreakdown.streakBonus} XP</span>
                      </div>
                    )}
                    {summary.achievementBonusExp > 0 && (
                      <div className="flex justify-between text-fuchsia-300">
                        <span>Badge Rewards:</span>
                        <span className="font-semibold">+{summary.achievementBonusExp} XP</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Daily Streak Card */}
                <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-300">
                    <span>Daily Streak</span>
                    <Flame className="h-4 w-4 fill-amber-400 text-amber-400" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-white">
                    {summary.currentStreak} {summary.currentStreak === 1 ? 'Day' : 'Days'}
                  </p>
                  <p className="mt-2 text-xs text-amber-200/90">
                    {summary.streakIncremented
                      ? `Streak extended from ${summary.previousStreak} to ${summary.currentStreak} days!`
                      : 'Daily streak active and secured for today.'}
                  </p>
                </div>

                {/* Stamina Hearts Card */}
                <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-4">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-300">
                    <span>Stamina Hearts</span>
                    <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-white">
                    {summary.hearts} / {MAX_HEARTS}
                  </p>
                  <p className="mt-2 text-xs text-rose-200/90">
                    {summary.heartRestored
                      ? '+1 Heart restored for scoring ≥80% on Theory!'
                      : summary.hearts === MAX_HEARTS
                        ? 'Full stamina ready for practice drills.'
                        : `Next passive heart in ${nextHeartLabel}.`}
                  </p>
                </div>
              </div>

              {/* Tier Progress Bar */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-violet-300">
                    {summary.tierLabel}
                    {summary.leveledUp && (
                      <span className="ml-2 rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                        Tier Up!
                      </span>
                    )}
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {summary.nextExp.toLocaleString()} / {tierInfo.nextAt.toLocaleString()} XP (
                    {tierInfo.percent}%)
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-400 to-fuchsia-400 transition-all duration-500"
                    style={{ width: `${Math.max(4, tierInfo.percent)}%` }}
                  />
                </div>
              </div>

              {/* Newly Unlocked Achievement Badges */}
              {summary.newlyUnlockedBadges.length > 0 && (
                <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/10 p-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    <span>
                      Achievement{summary.newlyUnlockedBadges.length > 1 ? 's' : ''} Unlocked!
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {summary.newlyUnlockedBadges.map((badge) => (
                      <div
                        key={badge.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-slate-950/80 p-3.5"
                      >
                        <div>
                          <p className="text-sm font-bold text-white">{badge.title}</p>
                          <p className="mt-0.5 text-xs text-slate-300">{badge.description}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-[10px] font-extrabold text-amber-300">
                          +{badge.expReward} XP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg hover:brightness-110"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : isLockedOut ? (
            /* =================================================================
               STATE B: 0 HEARTS LOCKOUT VIEW (PRACTICE / RHYTHM DISABLED)
               ================================================================= */
            <div className="mx-auto max-w-xl space-y-6 py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/15 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.25)]">
                <Lock className="h-8 w-8" />
              </div>
              <div>
                <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-rose-300">
                  0 / 5 Stamina Hearts
                </span>
                <h3 className="mt-3 text-2xl font-black text-white">
                  Practice Drills Are Locked
                </h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  You have depleted all 5 Stamina Hearts. Practice and Rhythm drills stay paused until a heart regenerates in{' '}
                  <strong className="text-rose-300">{nextHeartLabel}</strong>, or you can complete a{' '}
                  <strong className="text-emerald-300">free Theory lesson</strong> (scoring ≥80%) to recover +1 Heart immediately.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {onSwitchToTheory && (
                  <button
                    type="button"
                    onClick={onSwitchToTheory}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-950 hover:bg-emerald-400"
                  >
                    <BookOpen className="h-4 w-4" />
                    Play Free Theory Lesson (+1 Heart)
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white"
                >
                  Back to Skill Tree
                </button>
              </div>
            </div>
          ) : lesson.kind === 'theory' ? (
            /* =================================================================
               STATE C: INTERACTIVE THEORY LESSON & QUIZ
               ================================================================= */
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-xs text-sky-200">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-sky-400 shrink-0" />
                  <span>
                    Study the interactive staff/keyboard cards, then pass the quiz (≥80%) to earn EXP
                    {hearts < MAX_HEARTS ? ' and restore +1 Stamina Heart!' : '!'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleTheoryQuizComplete({
                      correct: 6,
                      total: 6,
                      percent: 100,
                      allCorrect: true,
                      restoresHeart: true,
                    })
                  }
                  className="rounded-lg border border-sky-400/50 bg-sky-500/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-100 hover:bg-sky-500/30"
                >
                  Quick Complete (100% Quiz)
                </button>
              </div>

              <LessonModule
                lesson={buildTheoryLessonForNode(lesson)}
                onComplete={handleTheoryQuizComplete}
              />
            </div>
          ) : lesson.kind === 'rhythm' ? (
            /* =================================================================
               STATE D: INTERACTIVE RHYTHM BEAT HIGHWAY DRILL
               ================================================================= */
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Beats Judged
                  </span>
                  <p className="mt-1 text-2xl font-black text-white">
                    {rhythmTaps.length} / {targetBeats}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Perfect ≤25ms · Good ≤50ms
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Pass Requirement
                  </span>
                  <p className="mt-1 text-2xl font-black text-amber-300">
                    ≥ {RHYTHM_PASS_ACCURACY_THRESHOLD}%
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Below {RHYTHM_PASS_ACCURACY_THRESHOLD}% costs 1 Heart
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Tap Breakdown
                  </span>
                  <div className="mt-2 flex items-center gap-3 text-xs font-bold">
                    <span className="text-emerald-400">
                      Perfect: {rhythmTaps.filter((t) => t === 'Perfect').length}
                    </span>
                    <span className="text-sky-400">
                      Good: {rhythmTaps.filter((t) => t === 'Good').length}
                    </span>
                    <span className="text-rose-400">
                      Miss: {rhythmTaps.filter((t) => t === 'Miss').length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-center space-y-5">
                <Music className="mx-auto h-10 w-10 text-amber-400" />
                <div>
                  <h3 className="text-lg font-bold text-white">Rhythm Timing Verification</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Tap beats along with the metronome pulse to complete all {targetBeats} beats.
                  </p>
                </div>

                {/* Progress dots */}
                <div className="flex justify-center gap-2">
                  {Array.from({ length: targetBeats }).map((_, idx) => {
                    const tap = rhythmTaps[idx];
                    return (
                      <div
                        key={idx}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-bold ${
                          tap === 'Perfect'
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                            : tap === 'Good'
                              ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                              : tap === 'Miss'
                                ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                                : 'border-slate-800 bg-slate-950 text-slate-500'
                        }`}
                      >
                        {tap ? tap[0] : idx + 1}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => recordRhythmTap('Perfect')}
                    className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 hover:bg-emerald-400"
                  >
                    Tap Perfect Beat (≤25ms)
                  </button>
                  <button
                    type="button"
                    onClick={() => recordRhythmTap('Good')}
                    className="rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 hover:bg-sky-400"
                  >
                    Tap Good Beat (≤50ms)
                  </button>
                  <button
                    type="button"
                    onClick={() => recordRhythmTap('Miss')}
                    className="rounded-xl border border-rose-500/50 bg-rose-500/15 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-500/25"
                  >
                    Simulate Missed Beat (&gt;50ms)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* =================================================================
               STATE E: INTERACTIVE PRACTICE DRILL (WAIT-STATE & HEART RULES)
               ================================================================= */
            <div className="space-y-6">
              {/* Top Telemetry Bar */}
              <div className="grid gap-4 sm:grid-cols-3">
                {/* 15s Drill Timeout Counter */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Wait-State Timer
                    </span>
                    <button
                      type="button"
                      onClick={() => setDrillArmed((a) => !a)}
                      className="text-[10px] font-bold uppercase tracking-wider text-violet-400 hover:text-violet-300"
                    >
                      {drillArmed ? 'Pause Timer' : 'Resume Timer'}
                    </button>
                  </div>
                  <p
                    className={`mt-1 text-2xl font-black tabular-nums ${
                      remainingSec <= 5 ? 'text-rose-400 animate-pulse' : 'text-white'
                    }`}
                  >
                    {remainingSec}s / {DRILL_TIMEOUT_SEC}s
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Timeout (15s) costs 1 Heart & resets timer
                  </p>
                </div>

                {/* Consecutive Misses Counter (0/3) */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Consecutive Misses
                  </span>
                  <p
                    className={`mt-1 text-2xl font-black tabular-nums ${
                      consecutiveMisses >= 2 ? 'text-amber-400' : 'text-white'
                    }`}
                  >
                    {consecutiveMisses} / {MAX_CONSECUTIVE_MISSES}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    3 consecutive misses cost 1 Heart
                  </p>
                </div>

                {/* Posture Stability & Latch Status */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Posture Latch (400ms)
                    </span>
                    <ShieldCheck
                      className={`h-4 w-4 ${
                        postureCompliant ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span
                      className={`text-lg font-black ${
                        postureCompliant ? 'text-emerald-300' : 'text-amber-300'
                      }`}
                    >
                      {postureCompliant ? `Compliant (${postureScore}%)` : 'Misaligned'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPostureCompliant((c) => !c);
                        setPostureScore((s) => (s >= 90 ? 78 : 96));
                      }}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-300 hover:text-white"
                    >
                      Toggle Pose
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Elbow 80°–110° · Wrist 150°–180°
                  </p>
                </div>
              </div>

              {/* Main Practice Execution Card */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <span className="rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                      Dual-Criteria Verification
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-white">{lesson.title}</h3>
                    <p className="mt-1 text-xs text-slate-300">{lesson.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold uppercase text-slate-400">
                      Session Pitch Accuracy
                    </span>
                    <p className="text-2xl font-black text-violet-300">{pitchAccuracy}%</p>
                  </div>
                </div>

                <div className="grid gap-3 pt-2 sm:grid-cols-3">
                  {/* Action 1: Valid Chord + Compliant Posture */}
                  <button
                    type="button"
                    onClick={handlePracticeMatch}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-emerald-500/50 bg-emerald-500/15 p-4 text-center transition hover:bg-emerald-500/25"
                  >
                    <Play className="h-5 w-5 text-emerald-400 fill-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                      Play Target Chord (Match)
                    </span>
                    <span className="text-[11px] text-emerald-300/80">
                      Verifies 400ms latch & completes node
                    </span>
                  </button>

                  {/* Action 2: Wrong Chord / Miss */}
                  <button
                    type="button"
                    onClick={handlePracticeMiss}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-center transition hover:bg-amber-500/20"
                  >
                    <RotateCcw className="h-5 w-5 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
                      Simulate Wrong Attempt
                    </span>
                    <span className="text-[11px] text-amber-300/80">
                      Miss {consecutiveMisses + 1} of {MAX_CONSECUTIVE_MISSES} (-1 Heart at 3)
                    </span>
                  </button>

                  {/* Action 3: 15s Timeout */}
                  <button
                    type="button"
                    onClick={handlePracticeTimeout}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-center transition hover:bg-rose-500/20"
                  >
                    <Heart className="h-5 w-5 text-rose-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-200">
                      Simulate 15s Timeout
                    </span>
                    <span className="text-[11px] text-rose-300/80">
                      Depletes 1 Heart & resets timer
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
