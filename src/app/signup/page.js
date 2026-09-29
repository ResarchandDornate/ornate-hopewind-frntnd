"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, Phone, ShieldCheck, User } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { postData } from "@/lib/api";
import { storeSession } from "@/lib/auth";
import { showApiError, showError, showSuccess } from "@/lib/toast";

/**
 * Two-step registration, matching the backend's flow: signup creates an
 * unverified account and emails an OTP; verify-otp marks it verified and
 * returns the tokens. Both steps live on one page so a failed OTP does not
 * lose the form state behind a navigation.
 */
export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState("details");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    contact_number: "",
    department: "",
    password: "",
  });

  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSignup = async (event) => {
    event.preventDefault();
    if (!form.email || !form.password || !form.first_name || !form.last_name) {
      showError("Name, email and password are required");
      return;
    }

    setLoading(true);
    try {
      await postData("/auth/signup/", form);
      showSuccess("Account created — check your email for the OTP");
      setStep("otp");
    } catch (error) {
      showApiError(error, "Could not create the account.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!otp) {
      showError("Enter the 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const response = await postData("/auth/verify-otp/", { email: form.email, otp });
      // Verification returns tokens, so a verified user lands straight in the
      // portal instead of being bounced to the login form.
      storeSession(response);
      showSuccess("Account verified");
      router.replace("/dashboard");
    } catch (error) {
      showApiError(error, "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await postData("/auth/send-otp/", { email: form.email });
      showSuccess("A new code is on its way");
    } catch (error) {
      showApiError(error, "Could not resend the code.");
    }
  };

  const inputWrap =
    "mb-4 flex items-center rounded-lg border border-(--border-solid) bg-(--surface-solid) px-4 transition focus-within:border-orange-400";
  const inputClass = "ml-3 flex-1 bg-transparent py-3 text-slate-800 outline-none";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="glass-strong w-full max-w-md rounded-2xl p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ornatelogo.png"
            alt="Ornate Solar"
            className="mb-4 h-14 w-auto object-contain invert dark:invert-0"
          />
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
            {step === "details" ? "Create Account" : "Verify Email"}
          </h1>
          <p className="hud-label mt-2">
            {step === "details" ? "Krishna Box Portal · Registration" : "Identity Verification"}
          </p>
          {step === "otp" && (
            <p className="mt-2 text-sm text-slate-500">
              We sent a 6-digit code to <span className="readout text-slate-700">{form.email}</span>
            </p>
          )}
        </div>

        {step === "details" ? (
          <form onSubmit={handleSignup}>
            <div className="grid grid-cols-2 gap-3">
              <div className={inputWrap}>
                <User size={18} className="text-slate-400" />
                <input
                  value={form.first_name}
                  onChange={update("first_name")}
                  placeholder="First name"
                  autoComplete="given-name"
                  className={inputClass}
                />
              </div>
              <div className={inputWrap}>
                <User size={18} className="text-slate-400" />
                <input
                  value={form.last_name}
                  onChange={update("last_name")}
                  placeholder="Last name"
                  autoComplete="family-name"
                  className={inputClass}
                />
              </div>
            </div>

            <div className={inputWrap}>
              <Mail size={18} className="text-slate-400" />
              <input
                type="email"
                value={form.email}
                onChange={update("email")}
                placeholder="you@ornatesolar.com"
                autoComplete="email"
                className={inputClass}
              />
            </div>

            <div className={inputWrap}>
              <Phone size={18} className="text-slate-400" />
              <input
                value={form.contact_number}
                onChange={update("contact_number")}
                placeholder="Contact number (optional)"
                autoComplete="tel"
                className={inputClass}
              />
            </div>

            <div className={inputWrap}>
              <Lock size={18} className="text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={update("password")}
                placeholder="Password (min 8 characters)"
                autoComplete="new-password"
                className={inputClass}
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
              className="mt-2 flex w-full items-center justify-center rounded-lg bg-brand py-3 text-sm font-semibold text-on-brand transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Create Account"}
            </button>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already registered?{" "}
              <Link href="/login" className="font-semibold text-orange-500 hover:text-orange-600">
                Sign in
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <div className={inputWrap}>
              <ShieldCheck size={18} className="text-slate-400" />
              <input
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                className={`${inputClass} readout text-lg tracking-[0.2em]`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-brand py-3 text-sm font-semibold text-on-brand transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Verify & Continue"}
            </button>

            <div className="mt-6 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setStep("details")}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <button
                type="button"
                onClick={handleResend}
                className="font-semibold text-orange-500 hover:text-orange-600"
              >
                Resend code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
