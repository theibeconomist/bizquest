"use client";
import { useState, useEffect, useRef } from "react";
import { Loader2, Trophy, CheckCircle2, XCircle, Users } from "lucide-react";
import { joinQuizByCode, submitQuizAnswer, loadQuizGame, loadQuizTeams, subscribeToQuizGame } from "@/lib/db";

const NAVY = "#15396B";
const GOLD = "#C9A24B";
const GREEN = "#2E8B84";
const RED = "#B3392C";

function JoinForm({ onJoined }) {
  const [code, setCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim() || !teamName.trim() || joining) return;
    setJoining(true);
    setError("");
    try {
      const result = await joinQuizByCode(code.trim(), teamName.trim());
      onJoined(result);
    } catch (err) {
      setError(err.message || "Could not join. Check the code and try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#FAF8F5" }}>
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-xl border border-stone-200 shadow-sm p-8">
        <h1 className="text-[20px] font-semibold mb-1 text-center" style={{ fontFamily: "'Lora', serif", color: NAVY }}>Join the quiz</h1>
        <p className="text-[13px] text-stone-500 mb-6 text-center">Enter your teacher&apos;s game code and pick a team name.</p>
        <div className="mb-3">
          <label className="block text-[12px] font-medium text-stone-600 mb-1">Game code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. 7F3KQZ"
            maxLength={8}
            className="w-full rounded-md border border-stone-300 px-3 py-2.5 text-[18px] font-mono uppercase tracking-widest text-center focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": NAVY }}
            autoFocus
          />
        </div>
        <div className="mb-4">
          <label className="block text-[12px] font-medium text-stone-600 mb-1">Team name</label>
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. The Overachievers"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-[14px] focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": NAVY }}
          />
        </div>
        {error && <p className="text-[12.5px] text-red-600 mb-3">{error}</p>}
        <button
          type="submit"
          disabled={joining}
          className="w-full rounded-md py-2.5 text-[14px] font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: NAVY }}
        >
          {joining ? <Loader2 size={16} className="animate-spin inline" /> : "Join"}
        </button>
      </form>
    </div>
  );
}

function TeamPlayer({ teamId, gameId }) {
  const [game, setGame] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answeredIndex, setAnsweredIndex] = useState(null); // question_index this team last answered
  const [pickedOption, setPickedOption] = useState(null);
  const unsubRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [g, t] = await Promise.all([loadQuizGame(gameId), loadQuizTeams(gameId)]);
      if (cancelled) return;
      setGame(g);
      setTeams(t);
      setLoading(false);
      unsubRef.current = subscribeToQuizGame(gameId, {
        onGame: (updated) => {
          setGame((prev) => {
            // Reset local "already answered" tracking whenever the question changes.
            if (prev && prev.current_index !== updated.current_index) {
              setAnsweredIndex(null);
              setPickedOption(null);
            }
            return updated;
          });
        },
        onTeams: (updated) => setTeams(updated),
      });
    })();
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [gameId]);

  if (loading || !game) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 size={20} className="animate-spin text-stone-400" /></div>;
  }

  const myTeam = teams.find((t) => t.id === teamId);

  if (game.status === "lobby") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ backgroundColor: "#FAF8F5" }}>
        <Users size={28} className="text-stone-400 mb-3" />
        <h2 className="text-[17px] font-semibold text-stone-700 mb-1">You&apos;re in as {myTeam?.name}</h2>
        <p className="text-[13px] text-stone-500">Waiting for your teacher to start the game…</p>
      </div>
    );
  }

  if (game.status === "finished") {
    const sorted = [...teams].sort((a, b) => b.score - a.score);
    const myRank = sorted.findIndex((t) => t.id === teamId) + 1;
    const winner = sorted[0];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ backgroundColor: "#FAF8F5" }}>
        <Trophy size={36} style={{ color: GOLD }} className="mb-3" />
        <h2 className="text-[19px] font-semibold mb-1" style={{ fontFamily: "'Lora', serif", color: NAVY }}>
          {winner?.id === teamId ? "You won! 🎉" : `${winner?.name} wins!`}
        </h2>
        <p className="text-[13px] text-stone-500 mb-5">{myTeam?.name} finished #{myRank} with {myTeam?.score} point{myTeam?.score !== 1 ? "s" : ""}</p>
        <div className="space-y-1.5 w-full max-w-xs">
          {sorted.map((t, i) => (
            <div key={t.id} className="flex items-center justify-between rounded-md px-3 py-1.5 text-[13px]" style={{ backgroundColor: t.id === teamId ? "#EAF1F8" : "#fff" }}>
              <span className="text-stone-600">{i + 1}. {t.name}</span>
              <span className="font-semibold text-stone-700">{t.score}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Active game
  const question = game.questions[game.current_index];
  const isMyTurn = game.current_team_id === teamId;
  const alreadyAnswered = answeredIndex === game.current_index;

  const choose = async (optIdx) => {
    if (alreadyAnswered || !isMyTurn) return;
    setPickedOption(optIdx);
    setAnsweredIndex(game.current_index);
    try {
      await submitQuizAnswer({
        gameId, teamId, questionIndex: game.current_index,
        selectedOption: optIdx, isCorrect: optIdx === question.correct,
      });
    } catch {
      // best-effort — if this fails the teacher can still see/verify manually
    }
  };

  if (!isMyTurn) {
    const upTeam = teams.find((t) => t.id === game.current_team_id);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ backgroundColor: "#FAF8F5" }}>
        <div className="text-[13px] text-stone-400 mb-2">Question {game.current_index + 1} of {game.questions.length}</div>
        <h2 className="text-[17px] font-semibold text-stone-700 mb-1">{upTeam?.name} is up!</h2>
        <p className="text-[13px] text-stone-500">Watching — you&apos;ll get your turn on another question.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#FAF8F5" }}>
      <div className="max-w-md mx-auto">
        <div className="text-[12.5px] text-stone-500 mb-1">Question {game.current_index + 1} of {game.questions.length} · {myTeam?.name}</div>
        <h2 className="text-[17px] font-semibold text-stone-800 mb-5">{question.q}</h2>
        <div className="space-y-2.5">
          {question.options.map((opt, i) => {
            let style = { borderColor: "#e7e2d8" };
            const showResult = game.revealed || alreadyAnswered;
            if (showResult && i === question.correct) style = { borderColor: GREEN, backgroundColor: "#EAF5F3" };
            else if (alreadyAnswered && i === pickedOption && i !== question.correct) style = { borderColor: RED, backgroundColor: "#FBEFED" };
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={alreadyAnswered}
                className="w-full text-left rounded-lg border bg-white px-4 py-3 text-[14.5px] text-stone-700 disabled:cursor-default"
                style={style}
              >
                <span className="inline-flex items-center gap-2">
                  {alreadyAnswered && i === pickedOption && (i === question.correct ? <CheckCircle2 size={15} className="text-green-600" /> : <XCircle size={15} className="text-red-600" />)}
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
        {alreadyAnswered && <p className="text-center text-[12.5px] text-stone-400 mt-4">Answer submitted — waiting for your teacher to move on.</p>}
      </div>
    </div>
  );
}

export default function QuizPlayClient() {
  const [joined, setJoined] = useState(null); // { teamId, gameId }

  if (!joined) return <JoinForm onJoined={setJoined} />;
  return <TeamPlayer teamId={joined.teamId} gameId={joined.gameId} />;
}
