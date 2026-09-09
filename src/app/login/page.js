"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { postData } from "@/lib/api";
import { storeSession } from "@/lib/auth";
import { extractApiMessage, showError, showSuccess } from "@/lib/toast";

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
      showError(extractApiMessage(error, "Sign-in failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <form onSubmit={handleLogin} className="glass-strong w-full max-w-md rounded-3xl p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ornatelogo.png" alt="Ornate Solar" className="mb-4 h-14 w-auto object-contain" />
          <h1 className="text-3xl font-bold text-slate-800">Krishna Box</h1>
          <p className="mt-2 text-slate-500">Sign in to your monitoring portal</p>
        </div>

        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
          Email
        </label>
        <div className="mb-4 flex items-center rounded-xl border border-white/70 bg-white/55 px-4 focus-within:border-orange-400">
          <Mail size={20} className="text-slate-400" />
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

        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
          Password
        </label>
        <div className="mb-6 flex items-center rounded-xl border border-white/70 bg-white/55 px-4 focus-within:border-orange-400">
          <Lock size={20} className="text-slate-400" />
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
            className="text-slate-500"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl bg-linear-to-r from-orange-500 to-red-600 py-4 text-lg font-bold text-white transition hover:opacity-95 disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin" /> : "Sign In"}
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-bold text-orange-500 hover:text-orange-600">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}
