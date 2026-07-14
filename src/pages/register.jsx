import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import apiClient from "../lib/apiClient";
import {
  BookOpenText,
  Sparkles,
  UserRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CircleAlert,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

export default function Register({ setUser }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (!password) return { label: "", width: "0%", color: "" };
    if (score <= 1) return { label: "Weak", width: "25%", color: "bg-rose-500" };
    if (score <= 3) return { label: "Fair", width: "55%", color: "bg-amber-500" };
    if (score <= 4) return { label: "Good", width: "80%", color: "bg-violet-500" };
    return { label: "Strong", width: "100%", color: "bg-emerald-500" };
  }, [password]);

  const validateLive = () => {
    if (!name.trim()) return "Full name is required.";
    if (!email.trim()) return "Email is required.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Please enter a valid email.";
    if (!password) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!termsAccepted) return "You must accept the Terms & Privacy Policy.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateLive();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await apiClient.post("/auth/register", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      const { token, user } = res.data;

      // Guard against a backend response that doesn't include a token
      // (e.g. registration succeeded but no session was issued). Without
      // this check we'd store the literal string "undefined" and get
      // bounced straight back to /login after a failed authenticated
      // request on the dashboard.
      if (!token || !user) {
        setError(
          "Account created, but we couldn't log you in automatically. Please sign in."
        );
        navigate("/login");
        return;
      }

      const userData = { ...user, token };
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", token);

      if (setUser) setUser(userData);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-svh overflow-y-auto overflow-x-hidden bg-white transition-colors duration-300 dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-0 md:bg-fixed bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(196,181,253,0.18),transparent_35%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_35%)]" />
      <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-fuchsia-400/10 blur-3xl" />

      <div className="relative flex min-h-full items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
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
              Create Your Account 🚀
            </h1>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
              Start organizing your notes with AI-powered learning.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_50px_rgba(124,58,237,0.10)] backdrop-blur-xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:p-5">
            {error && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 sm:text-sm">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Full Name" icon={<UserRound className="h-4 w-4" />}>
                <input
                  type="text"
                  value={name}
                  placeholder="Jane Smith"
                  required
                  autoComplete="name"
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                />
              </Field>

              <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                <input
                  type="email"
                  value={email}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                />
              </Field>

              <Field label="Password" icon={<Lock className="h-4 w-4" />}>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    placeholder="At least 6 characters"
                    required
                    autoComplete="new-password"
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
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

                {password && (
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Password strength
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>
                  </div>
                )}
              </Field>

              <Field label="Confirm Password" icon={<ShieldCheck className="h-4 w-4" />}>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    placeholder="Repeat your password"
                    required
                    autoComplete="new-password"
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError("");
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <div className="flex items-start gap-3 pt-0.5">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    setError("");
                  }}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 dark:border-slate-700"
                />
                <label htmlFor="terms" className="text-xs leading-5 text-slate-600 dark:text-slate-400 sm:text-sm">
                  I agree to the{" "}
                  <button
                    type="button"
                    className="font-medium text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                  >
                    Terms & Privacy Policy
                  </button>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:from-violet-500 hover:to-purple-500 hover:shadow-xl hover:shadow-violet-500/30 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    Create Account
                  </>
                )}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-[11px] text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            <p className="text-center text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
              >
                Sign In
              </Link>
            </p>
          </div>

          <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} AI Study Notes
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 sm:text-sm">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </div>
        {children}
      </div>
    </div>
  );
}