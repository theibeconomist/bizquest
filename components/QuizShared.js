"use client";
import { useState, useEffect } from "react";
import { Trophy, Shuffle, Sparkles } from "lucide-react";

export const QUIZ_NAVY = "#15396B";
export const QUIZ_GOLD = "#C9A24B";
export const QUIZ_GREEN = "#2E8B84";
export const QUIZ_RED = "#B3392C";
const DIFFICULTY_COLOR = { easy: QUIZ_GREEN, medium: QUIZ_GOLD, hard: QUIZ_RED };

// Small badge showing a question's difficulty/points, or BONUS for case-study questions.
export function DifficultyBadge({ question }) {
  if (question.type === "bonus") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ backgroundColor: QUIZ_GOLD }}>
        <Sparkles size={11} /> BONUS · {question.points} pts
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white capitalize" style={{ backgroundColor: DIFFICULTY_COLOR[question.difficulty] }}>
      {question.difficulty} · {question.points} pt{question.points !== 1 ? "s" : ""}
    </span>
  );
}

// Lightweight CSS confetti burst — no external library, just a handful of animated dots.
export function Confetti() {
  const colors = [QUIZ_GOLD, QUIZ_GREEN, QUIZ_NAVY, QUIZ_RED, "#ffffff"];
  const [pieces] = useState(() =>
    Array.from({ length: 22 }, (_, i) => ({
      left: Math.random() * 100,
      duration: 0.9 + Math.random() * 0.7,
      delay: Math.random() * 0.35,
      color: colors[i % colors.length],
      round: i % 2 === 0,
    }))
  );
  return (
    <>
      <style>{`@keyframes quizConfettiFall { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1; } 100% { transform: translateY(180px) rotate(360deg); opacity: 0; } }`}</style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        {pieces.map((p, i) => (
          <span
            key={i}
            style={{
              position: "absolute", left: `${p.left}%`, top: "-10px",
              width: 7, height: 7, backgroundColor: p.color,
              borderRadius: p.round ? "50%" : "2px",
              animation: `quizConfettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
            }}
          />
        ))}
      </div>
    </>
  );
}

// Celebration / consolation popup shown right after a team answers. Auto-dismisses.
export function AnswerFeedbackModal({ correct, points, teamName, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2200);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onDismiss}>
      <div className="relative rounded-2xl px-10 py-9 text-center shadow-2xl" style={{ backgroundColor: correct ? QUIZ_GREEN : "#57534e", minWidth: 260 }}>
        {correct && <Confetti />}
        {correct ? (
          <>
            <div className="text-[42px] mb-1">🎉</div>
            <div className="text-[23px] font-bold text-white mb-1">Correct!</div>
            <div className="text-[15px] text-white/90">{teamName ? `${teamName} ` : ""}+{points} point{points !== 1 ? "s" : ""}</div>
          </>
        ) : (
          <>
            <div className="text-[36px] mb-1">😕</div>
            <div className="text-[20px] font-bold text-white mb-1">Not quite!</div>
            <div className="text-[14px] text-white/80">Better luck next time</div>
          </>
        )}
      </div>
    </div>
  );
}

// A clear, always-visible running scoreboard — sorted by score, leader gets a trophy.
export function Scoreboard({ teams, currentTeamId }) {
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-3 mb-4">
      <div className="text-[10.5px] font-semibold text-stone-400 uppercase tracking-wide mb-2 px-1">Scoreboard</div>
      <div className="space-y-1">
        {sorted.map((t, i) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-md px-3 py-2"
            style={{ backgroundColor: t.id === currentTeamId ? "#EAF1F8" : "transparent" }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {i === 0 && t.score > 0 && <Trophy size={13} style={{ color: QUIZ_GOLD }} className="shrink-0" />}
              <span className="text-[13.5px] font-medium text-stone-700 truncate">{t.name}</span>
              {t.id === currentTeamId && (
                <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: QUIZ_NAVY }}>
                  <Shuffle size={9} /> Up now
                </span>
              )}
            </div>
            <span className="text-[16px] font-bold shrink-0 ml-2" style={{ color: QUIZ_NAVY }}>{t.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
