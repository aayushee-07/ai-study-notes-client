import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Star,
  Upload,
  User,
  Menu,
  X,
  Moon,
  Sun,
  Shield,
  LogOut,
  ChevronRight,
} from "lucide-react";
import apiClient from "../lib/apiClient";
import { useTheme } from "../context/ThemeContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/notes", label: "All Notes", icon: BookOpen },
  { to: "/favorites", label: "Favorites", icon: Star },
  { to: "/upload", label: "Upload PDF", icon: Upload },
  { to: "/profile", label: "Profile", icon: User },
];

function getInitials(name) {
  const text = (name || "U").trim();
  if (!text) return "U";
  const parts = text.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts[1]?.[0] || "";
  return `${first}${second}`.toUpperCase();
}

function formatRole(role) {
  if (!role) return "User";
  return String(role)
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Uses apiClient.defaults.baseURL — no hardcoded URLs
function resolveAvatarUrl(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  const base = (apiClient.defaults?.baseURL || "")
    .replace("/api", "")
    .replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  // Bust cache by tracking a refresh timestamp
  const [avatarTs, setAvatarTs] = useState(() => Date.now());

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/auth/profile");
      setProfile(data?.user || data?.profile || data || null);
      setAvatarError(false);
      setAvatarTs(Date.now()); // force avatar img to re-fetch
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const handleProfileUpdate = (e) => {
      // Apply new avatar immediately from event detail — no API wait
      const newAvatar = e?.detail?.avatar;
      if (newAvatar) {
        setProfile((prev) =>
          prev ? { ...prev, avatarUrl: newAvatar, avatar: newAvatar } : prev
        );
        setAvatarError(false);
        setAvatarTs(Date.now());
      }
      // Then re-fetch to stay fully in sync
      loadProfile();
    };
    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("profile-updated", handleProfileUpdate);
  }, [loadProfile]);

  // Lock body scroll while the mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  const isActiveRoute = (to) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  const navClass = (to) => {
    const active = isActiveRoute(to);
    return active
      ? "bg-violet-500/15 text-violet-300 border-violet-500/20 shadow-[0_0_0_1px_rgba(139,92,246,0.15)]"
      : darkMode
        ? "text-slate-300 hover:bg-white/5 border-transparent"
        : "text-slate-600 hover:bg-slate-100 border-transparent";
  };

  const name = profile?.name || profile?.fullName || profile?.username || "User";
  const email = profile?.email || "No email";
  const role = formatRole(profile?.role);

  const avatarRaw =
    profile?.avatarUrl ||
    profile?.avatar ||
    profile?.image ||
    profile?.profileImage ||
    "";

  // avatarSrc uses apiClient baseURL + cache-bust timestamp
  const avatarSrc = useMemo(() => {
    const resolved = resolveAvatarUrl(avatarRaw);
    if (!resolved) return "";
    const sep = resolved.includes("?") ? "&" : "?";
    return `${resolved}${sep}t=${avatarTs}`;
  }, [avatarRaw, avatarTs]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("refreshToken");
    closeMobile();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className={`fixed left-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-xl border shadow-lg transition lg:hidden ${
          darkMode
            ? "bg-[#0f1117] border-white/10 text-white"
            : "bg-white border-slate-200 text-slate-900"
        }`}
        style={{ top: "calc(1rem + env(safe-area-inset-top, 0px))" }}
        aria-label="Open sidebar"
      >
        <Menu size={18} />
      </button>

      <aside
        className={`
          fixed top-0 left-0 z-30 h-[100dvh] w-[250px] max-w-[85vw] shrink-0 border-r transition-transform duration-300 ease-out
          ${darkMode ? "bg-[#0f1117] border-white/5" : "bg-white border-slate-200"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* overflow-hidden on outer: prevents the whole sidebar from scrolling.
            Header and footer are shrink-0 (pinned); only the nav list in the
            middle scrolls internally, and only if it ever needs to. */}
        <div className="flex h-full flex-col overflow-hidden">

          {/* Logo — pinned at top */}
          <div
            className={`flex shrink-0 items-center justify-between border-b px-4 py-3 ${
              darkMode ? "border-white/5" : "border-slate-200"
            }`}
            style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
          >
            <Link to="/dashboard" className="flex min-w-0 items-center gap-3" onClick={closeMobile}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-600/15">
                <span className="font-semibold text-violet-300">A</span>
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold leading-tight text-slate-900 dark:text-white">
                  AI Study Notes
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  Learn smarter, not harder
                </div>
              </div>
            </Link>

            <button
              onClick={() => setMobileOpen(false)}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition lg:hidden ${
                darkMode
                  ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  : "bg-white border-slate-200 text-slate-900 hover:bg-slate-50"
              }`}
              aria-label="Close sidebar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Nav — middle, flexible; scrolls internally (scrollbar hidden) if content
              ever exceeds available height, so the sidebar itself never needs to scroll. */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-1.5 p-2.5 sm:space-y-2 sm:p-3">
              <button
                onClick={toggleTheme}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 font-medium transition-all duration-200 hover:translate-y-[-1px] sm:py-2.5 ${
                  darkMode
                    ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-900"
                }`}
              >
                <span className="inline-flex items-center gap-2 text-sm">
                  {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                  {darkMode ? "Light mode" : "Dark mode"}
                </span>
                <ChevronRight size={16} />
              </button>

              <nav className="space-y-1 pt-1">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={closeMobile}
                    className={() =>
                      `group flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-all duration-200 sm:py-2.5 ${navClass(to)}`
                    }
                  >
                    <Icon
                      size={16}
                      className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                    <span className="truncate font-medium">{label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>

          {/* Profile + Logout — pinned at bottom */}
          <div
            className={`shrink-0 space-y-2 border-t p-2.5 sm:p-3 ${
              darkMode ? "border-white/5" : "border-slate-200"
            }`}
            style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div
              className={`rounded-2xl border p-2.5 ${
                darkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar: updates instantly via event detail + cache-bust ts */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-violet-500/20 bg-violet-600/15">
                  {avatarSrc && !avatarError ? (
                    <img
                      key={avatarSrc}
                      src={avatarSrc}
                      alt={name}
                      className="h-full w-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <span className="text-sm font-semibold text-violet-300">
                      {getInitials(name)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {name}
                  </div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {email}
                  </div>
                  <div
                    className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
                      darkMode
                        ? "border-white/10 bg-white/5 text-slate-300"
                        : "border-slate-200 bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Shield size={10} />
                    {role}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 font-medium transition ${
                darkMode
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-300 hover:bg-rose-500/15"
                  : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
              }`}
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}
    </>
  );
}