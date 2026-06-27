import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import apiClient from "../lib/apiClient";
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  Sparkles,
  BookOpenText,
  Loader2,
} from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate("/forgot-password", { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (!isSuccess) return;
    const timer = setTimeout(() => {
      navigate("/login", { replace: true });
    }, 2000);
    return () => clearTimeout(timer);
  }, [isSuccess, navigate]);

  const validate = () => {
    if (!otp.trim()) return "OTP is required.";
    if (!/^\d{6}$/.test(otp.trim())) return "OTP must be exactly 6 digits.";
    if (!password.trim()) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return "";
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post("/auth/reset-password", {
        email,
        otp: otp.trim(),
        password,
      });

      setSuccess(res.data?.message || "Password reset successfully.");
      setIsSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to reset password"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || resendLoading) return;

    setResendLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await apiClient.post("/auth/forgot-password", { email });
      setSuccess(res.data?.message || "OTP resent successfully.");
      setCountdown(30);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to resend OTP"
      );
    } finally {
      setResendLoading(false);
    }
  };

  const title = useMemo(() => "Reset Password", []);

  return (
    <div className="relative h-svh overflow-y-auto overflow-x-hidden bg-white transition-colors duration-300 dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-0 md:bg-fixed bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(196,181,253,0.18),transparent_35%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_35%)]" />
      <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-violet-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />

      <div className="relative flex min-h-full items-center justify-center px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-4 text-center sm:mb-5">
            <div className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 shadow-lg shadow-violet-500/25">
              <BookOpenText className="h-6 w-6 text-white" />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-violet-700 shadow-sm backdrop-blur dark:border-violet-500/20 dark:bg-slate-900/70 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              AI Study Notes
            </div>

            {!isSuccess ? (
              <>
                <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
                  {title}
                </h1>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                  Enter the OTP sent to your email and choose a new password.
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto mt-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 shadow-sm">
                  <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
                  Password Reset Successfully
                </h1>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                  Your password has been updated successfully.
                </p>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_50px_rgba(124,58,237,0.10)] backdrop-blur-xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:p-5">
            {!isSuccess ? (
              <>
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

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="otp"
                      className="text-xs font-medium text-slate-700 dark:text-slate-300 sm:text-sm"
                    >
                      OTP
                    </label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        placeholder="Enter 6-digit OTP"
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="password"
                      className="text-xs font-medium text-slate-700 dark:text-slate-300 sm:text-sm"
                    >
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        placeholder="Enter new password"
                        autoComplete="new-password"
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="confirmPassword"
                      className="text-xs font-medium text-slate-700 dark:text-slate-300 sm:text-sm"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
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
                        Resetting...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                        Reset Password
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendLoading || countdown > 0}
                    className="w-full text-sm font-medium text-violet-600 transition-colors hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-violet-400 dark:hover:text-violet-300"
                  >
                    {resendLoading
                      ? "Resending..."
                      : countdown > 0
                        ? `Resend OTP in ${countdown}s`
                        : "Resend OTP"}
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
              </>
            ) : (
              <div className="space-y-4 text-center">
                <button
                  type="button"
                  onClick={() => navigate("/login", { replace: true })}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:from-violet-500 hover:to-purple-500 hover:shadow-xl hover:shadow-violet-500/30"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                  Go to Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}