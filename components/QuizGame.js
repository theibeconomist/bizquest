"use client";
import { useState, useEffect, useRef } from "react";
import {
  Loader2, Users, Trophy, ChevronRight, X, Copy, Check, Trash2, Play, Monitor, Smartphone,
} from "lucide-react";
import { getQuizQuestions, maxQuestionsFor } from "@/lib/quiz-bank";
import {
  createQuizGame, updateQuizGame, deleteQuizGame, loadQuizTeams, subscribeToQuizGame, loadMyClasses,
} from "@/lib/db";
import { DifficultyBadge, AnswerFeedbackModal, Scoreboard, OptionButton, OPTION_LETTERS, OPTION_COLORS, shuffleOptions, Confetti } from "@/components/QuizShared";

const NAVY = "#15396B";
const GOLD = "#C9A24B";
const GREEN = "#2E8B84";
const RED = "#B3392C";

const SUBUNIT_OPTIONS = [
  { id: "1.1", label: "1.1 What is a business?" },
  { id: "1.2", label: "1.2 Types of business entities" },
  { id: "1.3", label: "1.3 Business objectives" },
  { id: "1.4", label: "1.4 Stakeholders" },
  { id: "1.5", label: "1.5 Growth and evolution" },
  { id: "1.6", label: "1.6 Multinational companies" },
];
const BASE_COUNT_OPTIONS = [5, 8, 10, 12, 15, 20];
const ALL_UNIT_COUNT_OPTIONS = [10, 15, 20, 30, 40, 50];

function pickRandomTeamId(teams, excludeId) {
  const pool = teams.length > 1 && excludeId != null ? teams.filter((t) => t.id !== excludeId) : teams;
  const list = pool.length > 0 ? pool : teams;
  const picked = list[Math.floor(Math.random() * list.length)];
  return picked ? picked.id : null;
}

// ============================================================
// Setup screen — shared by both modes
// ============================================================
function QuizSetup({ onStartSingleScreen, onStartMultiDevice, creatingGame, initialSubunitId }) {
  const [subunitId, setSubunitId] = useState(initialSubunitId && SUBUNIT_OPTIONS.some((s) => s.id === initialSubunitId) ? initialSubunitId : "1.1");
  const [allUnit, setAllUnit] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [mode, setMode] = useState("single_screen");
  const [teamNames, setTeamNames] = useState(["Team 1", "Team 2"]);
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadMyClasses();
        if (!cancelled) { setClasses(data); if (data.length > 0) setClassId(data[0].id); }
      } finally {
        if (!cancelled) setLoadingClasses(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const countOptions = allUnit ? ALL_UNIT_COUNT_OPTIONS : BASE_COUNT_OPTIONS;
  const maxAvailable = maxQuestionsFor(subunitId, allUnit);

  // Clamps the selected count to whatever's actually valid for the current pool —
  // done directly in the handlers below (not as a reactive effect), since this is a
  // direct response to the user's own action, not a sync with an external system.
  const clampCount = (isAllUnit, sid) => {
    const opts = isAllUnit ? ALL_UNIT_COUNT_OPTIONS : BASE_COUNT_OPTIONS;
    const max = maxQuestionsFor(sid, isAllUnit);
    const valid = opts.filter((n) => n <= max);
    setQuestionCount(valid[valid.length - 1] || max);
  };
  const onToggleAllUnit = (checked) => { setAllUnit(checked); clampCount(checked, subunitId); };
  const onChangeSubunit = (id) => { setSubunitId(id); clampCount(allUnit, id); };

  const updateTeamName = (i, val) => setTeamNames((prev) => prev.map((t, idx) => (idx === i ? val : t)));
  const addTeam = () => setTeamNames((prev) => [...prev, `Team ${prev.length + 1}`]);
  const removeTeam = (i) => setTeamNames((prev) => prev.filter((_, idx) => idx !== i));

  const onStart = () => {
    const questions = getQuizQuestions(subunitId, questionCount, { allUnit }).map(shuffleOptions);
    const label = allUnit ? "All of Unit 1" : subunitId;
    if (mode === "single_screen") {
      const names = teamNames.map((t) => t.trim()).filter(Boolean);
      if (names.length < 2) { alert("Add at least 2 teams."); return; }
      onStartSingleScreen({ subunitId: label, questions, teamNames: names });
    } else {
      onStartMultiDevice({ subunitId: label, questions, classId: classId || null });
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl border border-stone-200 p-6">
      <h2 className="text-[18px] font-semibold mb-5" style={{ fontFamily: "'Lora', serif", color: NAVY }}>Set up a quiz game</h2>

      <div className="mb-4">
        <label className="flex items-center gap-2 text-[12.5px] font-medium text-stone-600 mb-2">
          <input type="checkbox" checked={allUnit} onChange={(e) => onToggleAllUnit(e.target.checked)} className="rounded" />
          Mix questions from all of Unit 1 (1.1–1.6)
        </label>
        {!allUnit && (
          <select value={subunitId} onChange={(e) => onChangeSubunit(e.target.value)} className="w-full rounded-md border border-stone-300 px-3 py-2 text-[14px]">
            {SUBUNIT_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        )}
      </div>

      <div className="mb-5">
        <label className="block text-[12.5px] font-medium text-stone-600 mb-1.5">Number of questions</label>
        <div className="flex gap-2 flex-wrap">
          {countOptions.filter((n) => n <= maxAvailable).map((n) => (
            <button
              key={n}
              onClick={() => setQuestionCount(n)}
              className={`rounded-md border px-3 py-1.5 text-[13.5px] font-medium ${questionCount === n ? "text-white border-transparent" : "text-stone-600 border-stone-300 hover:bg-stone-50"}`}
              style={questionCount === n ? { backgroundColor: NAVY } : {}}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-stone-400">{maxAvailable} question{maxAvailable !== 1 ? "s" : ""} available in this pool.</p>
      </div>

      <div className="mb-5">
        <label className="block text-[12.5px] font-medium text-stone-600 mb-1.5">How will teams answer?</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("single_screen")}
            className={`rounded-lg border p-3 text-left ${mode === "single_screen" ? "border-transparent text-white" : "border-stone-300 text-stone-700 hover:bg-stone-50"}`}
            style={mode === "single_screen" ? { backgroundColor: NAVY } : {}}
          >
            <Monitor size={16} className="mb-1" />
            <div className="text-[13px] font-semibold">Single screen</div>
            <div className={`text-[11px] ${mode === "single_screen" ? "text-white/80" : "text-stone-500"}`}>You run it on your laptop/projector</div>
          </button>
          <button
            onClick={() => setMode("multi_device")}
            className={`rounded-lg border p-3 text-left ${mode === "multi_device" ? "border-transparent text-white" : "border-stone-300 text-stone-700 hover:bg-stone-50"}`}
            style={mode === "multi_device" ? { backgroundColor: NAVY } : {}}
          >
            <Smartphone size={16} className="mb-1" />
            <div className="text-[13px] font-semibold">Teams&apos; own devices</div>
            <div className={`text-[11px] ${mode === "multi_device" ? "text-white/80" : "text-stone-500"}`}>They join with a code, live</div>
          </button>
        </div>
      </div>

      {mode === "single_screen" && (
        <div className="mb-5">
          <label className="block text-[12.5px] font-medium text-stone-600 mb-1.5">Team names</label>
          <div className="space-y-2">
            {teamNames.map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => updateTeamName(i, e.target.value)}
                  className="flex-1 rounded-md border border-stone-300 px-2.5 py-1.5 text-[13.5px]"
                />
                {teamNames.length > 2 && (
                  <button onClick={() => removeTeam(i)} className="text-stone-400 hover:text-red-600"><Trash2 size={15} /></button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addTeam} className="mt-2 text-[12.5px] font-medium hover:underline" style={{ color: NAVY }}>+ Add another team</button>
        </div>
      )}
      {mode === "multi_device" && (
        <div className="mb-5">
          <label className="block text-[12.5px] font-medium text-stone-600 mb-1.5">Which class is this for?</label>
          {loadingClasses ? (
            <div className="text-[12.5px] text-stone-400 flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Loading your classes…</div>
          ) : classes.length === 0 ? (
            <p className="text-[12.5px] text-amber-700 bg-amber-50 rounded-md px-3 py-2">
              You don&apos;t have a class set up yet, so any approved student account will be able to join with the code. Set up a class first if you&apos;d rather restrict it.
            </p>
          ) : (
            <>
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full rounded-md border border-stone-300 px-3 py-2 text-[14px]">
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="mt-1.5 text-[11.5px] text-stone-400">Only approved students in this class can join with the code — they&apos;ll need to be signed in to BizQuest already.</p>
            </>
          )}
        </div>
      )}

      <button
        onClick={onStart}
        disabled={creatingGame}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md py-2.5 text-[14.5px] font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: NAVY }}
      >
        {creatingGame ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Start
      </button>
    </div>
  );
}

// ============================================================
// Single-screen mode — pure client state, no backend at all
// ============================================================
function SingleScreenGame({ subunitId, questions, teamNames, onExit }) {
  const [teams, setTeams] = useState(teamNames.map((name, i) => ({ id: i, name, score: 0 })));
  const [index, setIndex] = useState(0);
  const [currentTeamId, setCurrentTeamId] = useState(() => teams[Math.floor(Math.random() * teams.length)].id);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState(null); // { correct, points } while the popup shows
  const [finished, setFinished] = useState(false);

  const question = questions[index];
  const currentTeam = teams.find((t) => t.id === currentTeamId);

  const choose = (optIdx) => {
    if (revealed) return;
    const correct = optIdx === question.correct;
    setSelected(optIdx);
    setRevealed(true);
    if (correct) {
      setTeams((prev) => prev.map((t) => (t.id === currentTeamId ? { ...t, score: t.score + question.points } : t)));
    }
    setFeedback({ correct, points: question.points });
  };

  const next = () => {
    if (index + 1 >= questions.length) { setFinished(true); return; }
    const prevTeamId = currentTeamId;
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
    setCurrentTeamId(pickRandomTeamId(teams, prevTeamId));
  };

  if (finished) {
    const sorted = [...teams].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    const isTie = sorted.length > 1 && sorted[1].score === winner.score;
    return (
      <div className="relative max-w-lg mx-auto bg-white rounded-xl border border-stone-200 p-8 text-center overflow-hidden">
        {!isTie && <Confetti />}
        <Trophy size={40} style={{ color: GOLD }} className="mx-auto mb-3" />
        <h2 className="text-[20px] font-semibold mb-1" style={{ fontFamily: "'Lora', serif", color: NAVY }}>
          {isTie ? "It's a tie!" : `${winner.name} wins!`}
        </h2>
        <p className="text-[13px] text-stone-500 mb-5">{SUBUNIT_OPTIONS.find((s) => s.id === subunitId)?.label || subunitId}</p>
        <div className="space-y-2 mb-6">
          {sorted.map((t, i) => (
            <div key={t.id} className="flex items-center justify-between rounded-md px-3 py-2" style={{ backgroundColor: i === 0 ? "#FBF4E2" : "#FAF8F5" }}>
              <span className="text-[14px] font-medium text-stone-700">{i + 1}. {t.name}</span>
              <span className="text-[14px] font-semibold" style={{ color: NAVY }}>{t.score} pts</span>
            </div>
          ))}
        </div>
        <button onClick={onExit} className="rounded-md px-4 py-2 text-[13.5px] font-semibold text-white" style={{ backgroundColor: NAVY }}>
          New game
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {feedback && (
        <AnswerFeedbackModal correct={feedback.correct} points={feedback.points} teamName={currentTeam?.name} onDismiss={() => setFeedback(null)} />
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[12.5px] text-stone-500">Question {index + 1} of {questions.length}</div>
        <button onClick={onExit} className="text-stone-400 hover:text-stone-600"><X size={18} /></button>
      </div>

      <Scoreboard teams={teams} currentTeamId={currentTeamId} />

      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12.5px] font-semibold" style={{ color: NAVY }}>
            {currentTeam?.name}&apos;s question
          </div>
          <DifficultyBadge question={question} />
        </div>
        <h3 className="text-[17px] font-semibold text-stone-800 mb-5">{question.q}</h3>
        <div className="space-y-2.5">
          {question.options.map((opt, i) => {
            const isCorrectOpt = i === question.correct;
            const isChosen = i === selected;
            let state = "idle";
            if (revealed && isCorrectOpt) state = "correct";
            else if (revealed && isChosen) state = "incorrect";
            else if (revealed) state = "muted";
            return (
              <OptionButton
                key={i}
                letter={OPTION_LETTERS[i]}
                color={OPTION_COLORS[i]}
                text={opt}
                onClick={() => choose(i)}
                disabled={revealed}
                state={state}
              />
            );
          })}
        </div>
        {revealed && (
          <div className="mt-5 flex justify-end">
            <button onClick={next} className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13.5px] font-semibold text-white" style={{ backgroundColor: NAVY }}>
              {index + 1 >= questions.length ? "See results" : "Next question"} <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
      <p className="text-center text-[12px] text-stone-400 mt-3">Read the question aloud, then tap the option {currentTeam?.name} chose.</p>
    </div>
  );
}

// ============================================================
// Multi-device mode — host screen (real-time via Supabase)
// ============================================================
function MultiDeviceHost({ subunitId, questions, classId, onExit }) {
  const [game, setGame] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const unsubRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const created = await createQuizGame({ subunitId, questions, classId });
        if (cancelled) return;
        setGame(created);
        setLoading(false);
        unsubRef.current = subscribeToQuizGame(created.id, {
          onGame: (g) => setGame(g),
          onTeams: (t) => setTeams(t),
        });
        setTeams(await loadQuizTeams(created.id));
      } catch (err) {
        setError(err.message || "Could not create game.");
        setLoading(false);
      }
    })();
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [subunitId, questions, classId]);

  const startGame = async () => {
    if (teams.length < 2) { alert("Wait for at least 2 teams to join."); return; }
    const firstTeamId = pickRandomTeamId(teams, null);
    await updateQuizGame(game.id, { status: "active", current_index: 0, current_team_id: firstTeamId, revealed: false });
  };

  const revealAnswer = async () => {
    await updateQuizGame(game.id, { revealed: true });
  };

  const nextQuestion = async () => {
    const nextIndex = game.current_index + 1;
    if (nextIndex >= questions.length) {
      await updateQuizGame(game.id, { status: "finished" });
      return;
    }
    const nextTeamId = pickRandomTeamId(teams, game.current_team_id);
    await updateQuizGame(game.id, { current_index: nextIndex, current_team_id: nextTeamId, revealed: false });
  };

  const exitAndCleanup = async () => {
    if (game) await deleteQuizGame(game.id);
    onExit();
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(game.join_code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-stone-400" /></div>;
  }
  if (error) {
    return <div className="max-w-md mx-auto text-center text-[13px] text-red-600">{error}</div>;
  }

  if (game.status === "lobby") {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-xl border border-stone-200 p-8 text-center">
        <div className="text-[12.5px] text-stone-500 mb-1">{SUBUNIT_OPTIONS.find((s) => s.id === subunitId)?.label || subunitId}</div>
        <div className="text-[13px] text-stone-500 mb-2">Join code</div>
        <button onClick={copyCode} className="inline-flex items-center gap-2 mb-6 rounded-lg border-2 border-dashed px-6 py-3" style={{ borderColor: NAVY }}>
          <span className="text-[32px] font-bold tracking-widest font-mono" style={{ color: NAVY }}>{game.join_code}</span>
          {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} className="text-stone-400" />}
        </button>
        <div className="flex items-center justify-center gap-1.5 text-[13px] text-stone-500 mb-3">
          <Users size={14} /> {teams.length} team{teams.length !== 1 ? "s" : ""} joined
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-6 min-h-[32px]">
          {teams.map((t) => (
            <span key={t.id} className="rounded-full bg-stone-100 px-3 py-1 text-[12.5px] text-stone-600">{t.name}</span>
          ))}
        </div>
        <div className="flex gap-2 justify-center">
          <button onClick={exitAndCleanup} className="rounded-md px-3 py-2 text-[13px] font-medium text-stone-600 hover:bg-stone-100">Cancel</button>
          <button
            onClick={startGame}
            disabled={teams.length < 2}
            className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13.5px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: NAVY }}
          >
            <Play size={14} /> Start game
          </button>
        </div>
      </div>
    );
  }

  if (game.status === "finished") {
    const sorted = [...teams].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    const isTie = sorted.length > 1 && sorted[1]?.score === winner?.score;
    return (
      <div className="relative max-w-lg mx-auto bg-white rounded-xl border border-stone-200 p-8 text-center overflow-hidden">
        {!isTie && <Confetti />}
        <Trophy size={40} style={{ color: GOLD }} className="mx-auto mb-3" />
        <h2 className="text-[20px] font-semibold mb-5" style={{ fontFamily: "'Lora', serif", color: NAVY }}>
          {isTie ? "It's a tie!" : `${winner?.name} wins!`}
        </h2>
        <div className="space-y-2 mb-6">
          {sorted.map((t, i) => (
            <div key={t.id} className="flex items-center justify-between rounded-md px-3 py-2" style={{ backgroundColor: i === 0 ? "#FBF4E2" : "#FAF8F5" }}>
              <span className="text-[14px] font-medium text-stone-700">{i + 1}. {t.name}</span>
              <span className="text-[14px] font-semibold" style={{ color: NAVY }}>{t.score} pts</span>
            </div>
          ))}
        </div>
        <button onClick={exitAndCleanup} className="rounded-md px-4 py-2 text-[13.5px] font-semibold text-white" style={{ backgroundColor: NAVY }}>
          New game
        </button>
      </div>
    );
  }

  const question = questions[game.current_index];
  const currentTeam = teams.find((t) => t.id === game.current_team_id);
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[12.5px] text-stone-500">Question {game.current_index + 1} of {questions.length} · Code {game.join_code}</div>
        <button onClick={exitAndCleanup} className="text-stone-400 hover:text-stone-600"><X size={18} /></button>
      </div>

      <Scoreboard teams={teams} currentTeamId={game.current_team_id} />

      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12.5px] font-semibold" style={{ color: NAVY }}>{currentTeam?.name}&apos;s question — on their device now</div>
          <DifficultyBadge question={question} />
        </div>
        <h3 className="text-[17px] font-semibold text-stone-800 mb-5">{question.q}</h3>
        <div className="space-y-2.5">
          {question.options.map((opt, i) => (
            <OptionButton
              key={i}
              letter={OPTION_LETTERS[i]}
              color={OPTION_COLORS[i]}
              text={opt}
              disabled
              state={game.revealed && i === question.correct ? "correct" : "idle"}
            />
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          {!game.revealed ? (
            <button onClick={revealAnswer} className="rounded-md px-4 py-2 text-[13.5px] font-semibold text-white" style={{ backgroundColor: GOLD }}>
              Reveal answer
            </button>
          ) : (
            <button onClick={nextQuestion} className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13.5px] font-semibold text-white" style={{ backgroundColor: NAVY }}>
              {game.current_index + 1 >= questions.length ? "See results" : "Next question"} <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuizGame({ initialSubunitId }) {
  const [phase, setPhase] = useState("setup"); // "setup" | "single" | "multi"
  const [config, setConfig] = useState(null);
  const [creatingGame, setCreatingGame] = useState(false);

  const startSingle = (cfg) => { setConfig(cfg); setPhase("single"); };
  const startMulti = (cfg) => { setConfig(cfg); setPhase("multi"); };
  const exit = () => { setPhase("setup"); setConfig(null); setCreatingGame(false); };

  if (phase === "single") return <SingleScreenGame {...config} onExit={exit} />;
  if (phase === "multi") return <MultiDeviceHost {...config} onExit={exit} />;
  return <QuizSetup onStartSingleScreen={startSingle} onStartMultiDevice={startMulti} creatingGame={creatingGame} initialSubunitId={initialSubunitId} />;
}
