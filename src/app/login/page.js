"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { postData } from "@/lib/api";
import { storeSession } from "@/lib/auth";
import { showApiError, showError, showSuccess } from "@/lib/toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!email || !password) {
      showError("Please enter your email and password");
      return;
    }

    setLoading(true);
    try {
      const response = await postData("/auth/signin/", { email, password });
      // storeSession unwraps the backend envelope and throws if no access token
      // came back, so a shape change surfaces here rather than as a silent
      // redirect into a logged-out dashboard.
      storeSession(response);
      showSuccess("Welcome back");
      router.replace("/dashboard");
    } catch (error) {
      // Stays silent when the connection was the problem — the connectivity
      // popup already says so, and "Sign-in failed" on top of it reads as a
      // rejected password.
      showApiError(error, "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "flex items-center rounded-lg border border-(--border-solid) bg-(--surface-solid) px-4 transition focus-within:border-orange-400";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      {/* Theme switch before sign-in: whoever opens this on a wall display
          should not have to authenticate first to turn the lights down. */}
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <form onSubmit={handleLogin} className="glass-strong w-full max-w-md rounded-2xl p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ornatelogo.png"
            alt="Ornate Solar"
            className="mb-4 h-14 w-auto object-contain invert dark:invert-0"
          />
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800">Krishna Box</h1>
          <p className="hud-label mt-2">Monitoring Portal · Secure Access</p>
        </div>

        <label htmlFor="email" className="hud-label mb-2 block">
          Email
        </label>
        <div className={`mb-4 ${fieldClass}`}>
          <Mail size={18} className="text-slate-400" />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@ornatesolar.com"
            autoComplete="email"
            className="ml-3 flex-1 bg-transparent py-3 text-slate-800 outline-none"
          />
        </div>

        <label htmlFor="password" className="hud-label mb-2 block">
          Password
        </label>
        <div className={`mb-6 ${fieldClass}`}>
          <Lock size={18} className="text-slate-400" />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            className="ml-3 flex-1 bg-transparent py-3 text-slate-800 outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="text-slate-500 transition hover:text-slate-700"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-lg bg-brand py-3 text-sm font-semibold text-on-brand transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : "Sign In"}
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-orange-500 hover:text-orange-600">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}
