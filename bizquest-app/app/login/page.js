"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setInfo("Check your email to confirm your account, then sign in.");
        setMode("signin");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#FAF8F5" }}>
      <div className="w-full max-w-sm bg-white rounded-xl border border-stone-200 shadow-sm p-8">
        <h1 className="text-[22px] font-semibold mb-1" style={{ fontFamily: "'Lora', serif", color: "#15396B" }}>
          BizQuest
        </h1>
        <p className="text-[13px] text-stone-500 mb-6">IB DP Business Management Self Study</p>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-stone-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-[14px] focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "#15396B" }}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-stone-600 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-[14px] focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "#15396B" }}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>

          {error && <p className="text-[13px] text-red-600">{error}</p>}
          {info && <p className="text-[13px] text-green-700">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md py-2 text-[14px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "#15396B" }}
          >
            {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(null); setInfo(null); }}
          className="mt-4 text-[13px] text-stone-500 underline w-full text-center"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}
