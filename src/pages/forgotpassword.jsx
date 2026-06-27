import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient";
import {
  Mail,
  ShieldCheck,
  Sparkles,
  BookOpenText,
  Loader2,
  ArrowLeft,
} from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await apiClient.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      setSuccess(res.data?.message || "OTP sent successfully.");
      navigate("/reset-password", {
        state: { email: email.trim().toLowerCase() },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to send OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-svh overflow-hidden bg-white transition-colors duration-300 dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-0 md:bg-fixed bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(196,181,253,0.18),transparent_35%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_35%)]" />
      <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-violet-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />

      <div className="relative flex h-full items-center justify-center px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-4 text-center sm:mb-5">
            <div className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 shadow-lg shadow-violet-500/25">
              <BookOpenText className="h-6 w-6 text-white" />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-violet-700 shadow-sm backdrop-blur dark:border-violet-500/20 dark:bg-slate-900/70 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              AI Study Notes
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
              Forgot Password
            </h1>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
              Enter your email to receive an OTP for resetting your password.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_50px_rgba(124,58,237,0.10)] backdrop-blur-xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:p-5">
            {error && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 sm:text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 sm:text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 sm:text-sm"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:from-violet-500 hover:to-purple-500 hover:shadow-xl hover:shadow-violet-500/30 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    Send OTP
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                Back to Login
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}