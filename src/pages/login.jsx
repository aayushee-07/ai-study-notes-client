import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  BookOpenText,
  LogIn,
} from "lucide-react";

export default function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await apiClient.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      const userData = {
        ...res.data.user,
        token: res.data.token,
      };

      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", res.data.token);

      if (setUser) setUser(userData);

      if (userData.role === "admin") navigate("/admin-dashboard");
      else navigate("/dashboard");
    } catch (err) {
      const serverMsg =
        err.response?.data?.message || err.response?.data?.error || "";

      // This backend returns 400 + "Invalid Email" when no account exists
      // for that email (as opposed to "Invalid Password" for a wrong
      // password). Treat that case as "please register first".
      const isUnregistered =
        /invalid email|not found|no account|not registered|does not exist|no user/i.test(
          serverMsg
        );

      if (isUnregistered) {
        setError("No account found with this email. Please register first.");
      } else {
        setError(serverMsg || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen overflow-hidden bg-white transition-colors duration-300 dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(196,181,253,0.16),transparent_35%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_35%)]" />
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-fuchsia-400/10 blur-3xl" />

      <div className="relative flex h-full items-center justify-center px-4 sm:px-6 lg:px-8">
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
              Welcome Back 👋
            </h1>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
              Sign in to continue your learning journey.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_50px_rgba(124,58,237,0.10)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:p-5">
            {error && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 sm:text-sm">
                {error}
                {error.toLowerCase().includes("register") && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() => navigate("/register")}
                      className="font-semibold underline underline-offset-2 hover:text-rose-700 dark:hover:text-rose-200"
                    >
                      Register now
                    </button>
                  </>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-slate-700 dark:text-slate-300 sm:text-sm">
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

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="password" className="text-xs font-medium text-slate-700 dark:text-slate-300 sm:text-sm">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-[11px] font-medium text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 sm:text-xs"
                  >
                    Forgot Password?
                  </button>
                </div>

                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
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

              <div className="flex items-center justify-between gap-4 pt-0.5">
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 dark:border-slate-700"
                  />
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.75 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:from-violet-500 hover:to-purple-500 hover:shadow-xl hover:shadow-violet-500/30 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="my-3.5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-[11px] text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            <p className="text-center text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="font-semibold text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
              >
                Create Account
              </button>
            </p>
          </div>

          <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} AI Study Notes
          </p>
        </div>
      </div>
    </div>
  );
}