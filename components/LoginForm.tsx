"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    let supabase;
    try {
      supabase = createClient();
    } catch (envErr) {
      setLoading(false);
      setError(
        envErr instanceof Error ? envErr.message : "Supabase is not configured.",
      );
      return;
    }

    const { data, error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signErr) {
      let msg = signErr.message || "Sign-in failed.";
      if (/email not confirmed|confirm your email/i.test(msg)) {
        msg +=
          " In Supabase: Authentication → Providers → Email, or disable “Confirm email” for testing.";
      }
      setError(msg);
      return;
    }
    if (!data.session) {
      setError(
        "No session was returned. If email confirmation is required, confirm your address or adjust Auth settings in Supabase.",
      );
      return;
    }
    // Full navigation so auth cookies are sent on the next request (avoids middleware bouncing you back to /).
    window.location.assign("/dashboard");
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-xl">
        <h1 className="font-display text-center text-2xl font-medium tracking-tight text-foreground">
          M & K{" "}
          <span className="italic text-accent">Finances</span>
        </h1>
        <p className="mt-2 text-center text-xs text-muted">Private · Just us</p>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs text-muted">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-accent/30 placeholder:text-muted focus:ring-2"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs text-muted">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-accent/30 placeholder:text-muted focus:ring-2"
            />
          </div>
          {error ? (
            <p className="text-xs text-accent-red" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
