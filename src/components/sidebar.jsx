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

const API_BASE = (import.meta.env.VITE_API_URL || "")
  .replace("/api", "");

function withCacheBuster(url) {
  if (!url) return "";

  const fullUrl = url.startsWith("http")
    ? url
    : `${API_BASE}${url}`;

  const separator = fullUrl.includes("?") ? "&" : "?";

  return `${fullUrl}${separator}t=${Date.now()}`;
}
export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/auth/profile");
      setProfile(data?.user || data?.profile || data || null);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      loadProfile();
    };

    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, [loadProfile]);

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
  const avatarSrc = useMemo(() => withCacheBuster(avatarRaw), [avatarRaw]);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className={`fixed top-4 left-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-xl border shadow-lg transition lg:hidden ${darkMode
          ? "bg-[#0f1117] border-white/10 text-white"
          : "bg-white border-slate-200 text-slate-900"
          }`}
        aria-label="Open sidebar"
      >
        <Menu size={18} />
      </button>

      <aside
        className={`
          fixed top-0 left-0 z-30 h-screen w-[260px] shrink-0 border-r transition-transform duration-300 ease-out
          ${darkMode ? "bg-[#0f1117] border-white/5" : "bg-white border-slate-200"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="flex items-center justify-between border-b border-white/5 p-4">
            <Link to="/dashboard" className="flex items-center gap-3" onClick={closeMobile}>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-600/15">
                <span className="font-semibold text-violet-300">A</span>
              </div>
              <div>
                <div className="font-semibold leading-tight text-slate-900 dark:text-white">
                  AI Study Notes
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Learn smarter, not harder
                </div>
              </div>
            </Link>

            <button
              onClick={() => setMobileOpen(false)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition lg:hidden ${darkMode
                ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                : "bg-white border-slate-200 text-slate-900 hover:bg-slate-50"
                }`}
              aria-label="Close sidebar"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <button
              onClick={toggleTheme}
              className={`w-full inline-flex items-center justify-between rounded-xl px-4 py-3 border font-medium transition-all duration-200 hover:translate-y-[-1px] ${darkMode
                ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-900"
                }`}
            >
              <span className="inline-flex items-center gap-2">
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
                    `group flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200 ${navClass(
                      to
                    )}`
                  }
                >
                  <Icon size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                  <span className="font-medium">{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-4 space-y-4">
            <div
              className={`rounded-2xl border p-4 ${darkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-600/15 shrink-0 overflow-hidden">
                  {avatarRaw ? (
                    <img
                      key={avatarSrc}
                      src={avatarSrc}
                      alt={name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-sm font-semibold text-violet-300">
                      {getInitials(name)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-slate-900 dark:text-white">
                    {name}
                  </div>
                  <div className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {email}
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300">
                    <Shield size={11} />
                    {role}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                localStorage.removeItem("token");
                closeMobile();
                navigate("/login");
              }}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 border font-medium transition ${darkMode
                ? "bg-rose-500/10 border-rose-500/20 text-rose-300 hover:bg-rose-500/15"
                : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                }`}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </aside>

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