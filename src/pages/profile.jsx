import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient";
import Layout from "../components/Layout";
import { useTheme } from "../context/ThemeContext";
import {
  User,
  Mail,
  Shield,
  Calendar,
  CheckCircle,
  Edit2,
  Lock,
  FileText,
  Star,
  Sparkles,
  HelpCircle,
  Layers,
  Clock,
  Loader2,
  AlertCircle,
  X,
  ArrowRight,
  MessageSquare,
  Upload,
  Heart,
  Settings,
  LogIn,
  PenLine,
  BadgeInfo,
  ChevronRight,
  Camera,
  Activity,
  CheckCircle2,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNoteType(note) {
  const source = String(note?.source || note?.fileType || note?.type || "").toLowerCase();
  const name = String(note?.fileName || note?.originalName || note?.title || "").toLowerCase();
  if (source.includes("pdf") || name.endsWith(".pdf") || note?.pdfUrl || note?.fileUrl) return "PDF";
  if (note?.aiGenerated || note?.generatedByAI || source.includes("ai")) return "AI Note";
  return "Manual Note";
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatJoined(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `Joined ${d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const tone =
    toast.type === "success"
      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
      : toast.type === "error"
        ? "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
        : "bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-300";
  const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? AlertCircle : BadgeInfo;
  return (
    <div className={`fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur sm:w-auto ${tone}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1 text-sm leading-5">{toast.message}</div>
      <button onClick={onClose} className="transition-opacity hover:opacity-100"><X size={16} /></button>
    </div>
  );
}

/** Matches Favorites StatCard exactly */
function StatCard({ label, value, icon, valueColor, iconBg, muted }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-[#161b22]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${valueColor}`}>{value ?? 0}</p>
      {muted ? <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{muted}</p> : null}
    </div>
  );
}

function NoteTypeBadge({ type }) {
  const key = String(type || "").toLowerCase();
  const isPdf = key.includes("pdf");
  const isAi = key.includes("ai");
  const cls = isPdf
    ? "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400"
    : isAi
      ? "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300"
      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  const label = isPdf ? "PDF" : isAi ? "AI Note" : "Manual Note";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${cls}`}>
      <FileText size={10} /> {label}
    </span>
  );
}

function Field({ label, icon: Icon, type = "text", value, onChange, placeholder, darkMode = true }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-zinc-300">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          style={{ paddingLeft: Icon ? 40 : 16 }}
        />
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-[#111114]">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-300">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyCard({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-800 dark:bg-[#161b22]">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
        <Icon size={20} />
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

function StatusRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      <span className="truncate text-right text-sm font-medium text-slate-900 dark:text-white">{value || "—"}</span>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${active
        ? "bg-indigo-600 text-white"
        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
    >
      {label}
    </button>
  );
}

function SkeletonBlock({ className }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <SkeletonBlock className="h-40 rounded-3xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => <SkeletonBlock key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => <SkeletonBlock key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SkeletonBlock className="h-72" />
        <SkeletonBlock className="h-72" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Profile() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const avatarInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("recent");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("general");
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [pwForm, setPwForm] = useState({ oldPassword: "", newPassword: "", confirm: "" });

  const [dashboard, setDashboard] = useState({
    profile: null,
    stats: {},
    recentNotes: [],
    favoriteNotes: [],
    aiHistory: [],
    recentChats: [],
  });

  const notify = (message, type = "success") => setToast({ message, type, id: Date.now() });
  const getErrorMessage = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

  const fetchDashboard = useCallback(async ({ isRefresh = false } = {}) => {
    if (!isRefresh) setLoading(true);
    try {
      const [profileRes, statsRes, recentRes, favoritesRes, aiUsageRes, recentChatsRes] = await Promise.all([
        apiClient.get("/auth/profile"),
        apiClient.get("/notes/dashboard"),
        apiClient.get("/notes/recent"),
        apiClient.get("/notes/favorites"),
        apiClient.get("/ai/ai-usage"),
        apiClient.get("/ai/recent-chats"),
      ]);
      const profile = profileRes.data?.user || profileRes.data?.profile || profileRes.data || null;
      const stats = statsRes.data || {};
      const recentNotes = (recentRes.data || []).slice(0, 6);
      const favoriteNotes = (favoritesRes.data || []).slice(0, 6);
      const aiHistory = Array.isArray(aiUsageRes.data) ? aiUsageRes.data : aiUsageRes.data?.activities || [];
      const recentChats = Array.isArray(recentChatsRes.data) ? recentChatsRes.data : [];
      setDashboard({
        profile,
        stats: {
          totalNotes: stats.totalNotes ?? 0,
          favoriteNotes: stats.favoriteNotes ?? 0,
          aiGenerations: stats.aiGenerations ?? 0,
          pdfUploads: stats.pdfUploads ?? 0,
          quizGenerated: stats.quizGenerated ?? stats.quizzes ?? 0,
          flashcardsGenerated: stats.flashcardsGenerated ?? stats.flashcards ?? 0,
          lastLoginAt: profile?.lastLoginAt || profile?.lastLogin || "",
          lastAIGenerationAt: stats.lastAIGenerationAt || "",
        },
        recentNotes,
        favoriteNotes,
        aiHistory,
        recentChats,
      });
      setEditForm({ name: profile?.name || profile?.fullName || "", email: profile?.email || "" });
    } catch (err) {
      notify(getErrorMessage(err, "Failed to load profile."), "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const profile = dashboard.profile || {};
  const stats = dashboard.stats || {};
  const recentNotes = dashboard.recentNotes || [];
  const favoriteNotes = dashboard.favoriteNotes || [];
  const aiHistoryPreview = (dashboard.aiHistory || []).slice(0, 4);
  const recentChatsPreview = (dashboard.recentChats || []).slice(0, 3);

  const completion = useMemo(() => {
    const fields = [profile?.name, profile?.email, profile?.role, profile?.avatarUrl || profile?.avatar, profile?.createdAt || profile?.joinDate];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100) || 0;
  }, [profile]);

  const activeNotes = tab === "recent" ? recentNotes : favoriteNotes;
  const visibleNotes = activeNotes.slice(0, 6);

  const quickActions = [
    { label: "Create Note", icon: PenLine, onClick: () => navigate("/notes/create"), color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" },
    { label: "Upload PDF", icon: Upload, onClick: () => navigate("/upload"), color: "bg-sky-500/10 text-sky-600 dark:text-sky-300" },
    {
      label: "AI Chat",
      icon: MessageSquare,
      onClick: () => {
        const latest = recentChatsPreview[0] || recentNotes[0];
        const noteId = latest?.noteId || latest?.note?._id || latest?.note?.id || latest?._id || latest?.id;
        if (noteId) navigate(`/notes/${noteId}`);
        else notify("No note available for AI chat yet.", "error");
      },
      color: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    },
    { label: "Favorites", icon: Heart, onClick: () => navigate("/favorites"), color: "bg-rose-500/10 text-rose-600 dark:text-rose-300" },
  ];

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    setSavingAvatar(true);
    try {
      const res = await apiClient.post("/auth/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const updatedAvatar = res?.data?.avatarUrl || res?.data?.user?.avatarUrl || res?.data?.user?.avatar || res?.data?.avatar || URL.createObjectURL(file);
      setDashboard((prev) => ({ ...prev, profile: { ...(prev.profile || {}), avatarUrl: updatedAvatar, avatar: updatedAvatar } }));
      notify("Avatar updated successfully.");

      window.dispatchEvent(
        new CustomEvent("profile-updated", {
          detail: {
            avatar: updatedAvatar,
          },
        })
      );

      await fetchDashboard({ isRefresh: true });
    } catch (err) {
      notify(getErrorMessage(err, "Could not upload avatar."), "error");
    } finally {
      setSavingAvatar(false);
      e.target.value = "";
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await apiClient.put("/auth/profile", { name: editForm.name, email: editForm.email });
      notify("Profile updated successfully.");

      window.dispatchEvent(new Event("profile-updated"));

      setEditOpen(false);

      await fetchDashboard({ isRefresh: true });
    } catch (err) {
      notify(getErrorMessage(err, "Could not update profile."), "error");
    } finally {
      setEditLoading(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return notify("Passwords do not match.", "error");
    setPwLoading(true);
    try {
      await apiClient.put("/auth/change-password", { oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      notify("Password changed successfully.");
      setPwOpen(false);
      setPwForm({ oldPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      notify(getErrorMessage(err, "Could not change password."), "error");
    } finally {
      setPwLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return notify('Type "DELETE" to confirm.', "error");
    setDeleteLoading(true);
    try {
      await apiClient.delete("/auth/delete-account");
      notify("Account deleted successfully.");
      localStorage.removeItem("token");
      navigate("/login");
    } catch (err) {
      notify(getErrorMessage(err, "Could not delete account."), "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Layout>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="space-y-6 lg:space-y-8">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* ── Profile Header ──────────────────────────────────────────── */}
            <section className="rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 shadow-sm dark:border-slate-800 dark:from-[#161b22] dark:via-[#161b22] dark:to-[#11151c] sm:p-7 lg:p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {/* Avatar */}
                  <div className="relative shrink-0 self-start">
                    {profile?.avatarUrl || profile?.avatar ? (
                      <img
                        src={`http://localhost:5000${profile.avatarUrl || profile.avatar}`}
                        alt="Profile avatar"
                        className="h-16 w-16 rounded-2xl border border-white/20 object-cover shadow-md sm:h-20 sm:w-20"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-xl font-bold text-white shadow-lg sm:h-20 sm:w-20 sm:text-2xl">
                        {(profile?.name || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-indigo-600 text-white shadow-md transition hover:bg-indigo-700"
                    >
                      {savingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>

                  {/* Identity */}
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700 shadow-sm dark:border-indigo-500/20 dark:bg-slate-900 dark:text-indigo-300">
                      PROFILE
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                        {profile?.name || "Your Profile"}
                      </h1>
                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm dark:border-indigo-500/20 dark:bg-slate-900 dark:text-indigo-300">
                        <Shield size={11} /> {profile?.role || "User"}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${profile?.status === "inactive"
                        ? "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                        : "border-emerald-200 bg-white text-emerald-700 dark:border-emerald-500/20 dark:bg-slate-900 dark:text-emerald-300"
                        }`}>
                        <CheckCircle size={11} /> {profile?.status === "inactive" ? "Inactive" : "Active"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5"><Mail size={13} /><span className="truncate">{profile?.email || "—"}</span></span>
                      <span className="inline-flex items-center gap-1.5"><Calendar size={13} />{formatJoined(profile?.joinDate || profile?.createdAt)}</span>
                    </div>
                    {/* Completion bar */}
                    <div className="mt-3 w-full max-w-xs">
                      <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Profile completion</span>
                        <span>{completion}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all" style={{ width: `${completion}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <button
                    onClick={() => setEditOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-indigo-600 hover:to-violet-600 hover:shadow-md"
                  >
                    <Edit2 size={14} /> Edit Profile
                  </button>
                  <button
                    onClick={() => setPwOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-50 dark:border-indigo-500/20 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                  >
                    <Lock size={14} /> Password
                  </button>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                  >
                    <Settings size={14} /> Settings
                  </button>
                </div>
              </div>
            </section>

            {/* ── Activity Overview (4-col stat cards) ─────────────────────── */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Last Login"
                value={formatDateTime(stats.lastLoginAt)}
                icon={<LogIn size={18} />}
                valueColor="text-indigo-600 dark:text-indigo-300"
                iconBg="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                muted="Most recent session"
              />
              <StatCard
                label="AI Activity"
                value={formatDateTime(stats.lastAIGenerationAt)}
                icon={<Sparkles size={18} />}
                valueColor="text-violet-600 dark:text-violet-300"
                iconBg="bg-violet-500/10 text-violet-600 dark:text-violet-300"
                muted="Latest generated output"
              />
              <StatCard
                label="Account Status"
                value={profile?.status || "Active"}
                icon={<BadgeInfo size={18} />}
                valueColor="text-emerald-600 dark:text-emerald-300"
                iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                muted="Current account state"
              />
              <StatCard
                label="Completion"
                value={`${completion}%`}
                icon={<CheckCircle size={18} />}
                valueColor="text-sky-600 dark:text-sky-300"
                iconBg="bg-sky-500/10 text-sky-600 dark:text-sky-300"
                muted="Profile fields filled"
              />
            </section>

            {/* ── Statistics (6 cards) ─────────────────────────────────────── */}
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-5 lg:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Statistics</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Your study activity at a glance</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  { label: "Total Notes", value: stats.totalNotes, icon: <FileText size={18} />, iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300", color: "text-indigo-600 dark:text-indigo-300" },
                  { label: "Favorite Notes", value: stats.favoriteNotes, icon: <Star size={18} />, iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-300", color: "text-amber-600 dark:text-amber-300" },
                  { label: "AI Generations", value: stats.aiGenerations, icon: <Sparkles size={18} />, iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-300", color: "text-violet-600 dark:text-violet-300" },
                  { label: "PDF Uploads", value: stats.pdfUploads, icon: <Upload size={18} />, iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-300", color: "text-sky-600 dark:text-sky-300" },
                  { label: "Quizzes Generated", value: stats.quizGenerated, icon: <HelpCircle size={18} />, iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300", color: "text-emerald-600 dark:text-emerald-300" },
                  { label: "Flashcards Generated", value: stats.flashcardsGenerated, icon: <Layers size={18} />, iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-300", color: "text-rose-600 dark:text-rose-300" },
                ].map(({ label, value, icon, iconBg, color }) => (
                  <div key={label} className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>{icon}</span>
                    </div>
                    <p className={`text-3xl font-bold ${color}`}>{value ?? 0}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Quick Actions + Recent AI Chats (2-col) ─────────────────── */}
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {/* Quick Actions */}
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-5 lg:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Quick Actions</h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Shortcuts to key features</p>
                  </div>
                  <ArrowRight size={16} className="text-slate-400 dark:text-slate-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.label}
                        onClick={action.onClick}
                        className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60"
                      >
                        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${action.color}`}>
                          <Icon size={16} />
                        </span>
                        <span className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{action.label}</span>
                        <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Open {action.label.toLowerCase()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recent Chats */}
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-5 lg:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Recent Chats</h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Latest AI conversations</p>
                  </div>
                  <MessageSquare size={16} className="text-slate-400 dark:text-slate-500" />
                </div>
                {recentChatsPreview.length === 0 ? (
                  <EmptyCard icon={MessageSquare} title="No recent chats" description="AI conversations will appear here after you start chatting." />
                ) : (
                  <div className="space-y-3">
                    {recentChatsPreview.map((chat, idx) => {
                      const noteId = chat.noteId || chat.note?._id || chat.note?.id || chat._id || chat.id;
                      return (
                        <article key={chat.chatId || idx} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                            <MessageSquare size={15} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{chat.title || "AI Chat"}</span>
                              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">Chat</span>
                            </div>
                            {chat.preview || chat.message ? (
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{chat.preview || chat.message}</p>
                            ) : null}
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                                <Clock size={11} /> {formatDateTime(chat.updatedAt || chat.createdAt)}
                              </span>
                              {noteId && (
                                <button onClick={() => navigate(`/notes/${noteId}`)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-indigo-700">
                                  Open <ArrowRight size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* ── Notes (tabbed) ───────────────────────────────────────────── */}
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-5 lg:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Notes</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Recent and starred notes</p>
                </div>
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
                  <TabButton active={tab === "recent"} onClick={() => setTab("recent")} label="Recent" />
                  <TabButton active={tab === "favorite"} onClick={() => setTab("favorite")} label="Favorites" />
                </div>
              </div>
              {visibleNotes.length === 0 ? (
                <EmptyCard icon={FileText} title={tab === "recent" ? "No recent notes" : "No favorite notes"} description="Notes will appear here after you create or favorite them." />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleNotes.map((note) => (
                    <article key={note._id || note.id} className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-violet-500/20">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                          <FileText size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <NoteTypeBadge type={note.type} />
                          </div>
                          <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">{note.title || "Untitled Note"}</h3>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{note.preview || note.content || "No preview available."}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                              <Clock size={11} /> {formatDateTime(note.createdAt)}
                            </span>
                            <button onClick={() => navigate(`/notes/${note._id || note.id}`)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-indigo-700">
                              View <ArrowRight size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* ── AI Usage History + Account Status (2-col) ───────────────── */}
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {/* AI Usage History */}
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-5 lg:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">AI Usage History</h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Last 4 AI operations</p>
                  </div>
                  <Sparkles size={16} className="text-slate-400 dark:text-slate-500" />
                </div>
                {aiHistoryPreview.length === 0 ? (
                  <EmptyCard icon={Sparkles} title="No AI activity yet" description="Your AI usage timeline will appear here once you generate content." />
                ) : (
                  <div className="space-y-3">
                    {aiHistoryPreview.map((item, idx) => (
                      <div key={item._id || item.id || idx} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                          <Sparkles size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.title || item.type || "AI Generation"}</span>
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
                              {item.toolType || item.model || "AI"}
                            </span>
                          </div>
                          {(item.prompt || item.description) && (
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.prompt || item.description}</p>
                          )}
                          <span className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                            <Clock size={11} /> {formatDateTime(item.createdAt || item.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Account Status */}
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-5 lg:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Account Status</h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Your account details</p>
                  </div>
                  <BadgeInfo size={16} className="text-slate-400 dark:text-slate-500" />
                </div>
                <div className="space-y-2.5">
                  <StatusRow label="Email" value={profile?.email} />
                  <StatusRow label="Role" value={profile?.role} />
                  <StatusRow label="Join Date" value={formatJoined(profile?.joinDate || profile?.createdAt)} />
                  <StatusRow label="Last Login" value={formatDateTime(stats.lastLoginAt)} />
                  <StatusRow label="Last AI Generation" value={formatDateTime(stats.lastAIGenerationAt)} />
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {editOpen && (
        <Modal title="Edit Profile" onClose={() => setEditOpen(false)}>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <Field label="Name" icon={User} value={editForm.name} onChange={(v) => setEditForm((p) => ({ ...p, name: v }))} />
            <Field label="Email" icon={Mail} type="email" value={editForm.email} onChange={(v) => setEditForm((p) => ({ ...p, email: v }))} />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditOpen(false)} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Cancel
              </button>
              <button type="submit" disabled={editLoading} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
                {editLoading && <Loader2 size={14} className="animate-spin" />} Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pwOpen && (
        <Modal title="Change Password" onClose={() => setPwOpen(false)}>
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <Field label="Current Password" type="password" value={pwForm.oldPassword} onChange={(v) => setPwForm((p) => ({ ...p, oldPassword: v }))} />
            <Field label="New Password" type="password" value={pwForm.newPassword} onChange={(v) => setPwForm((p) => ({ ...p, newPassword: v }))} />
            <Field label="Confirm Password" type="password" value={pwForm.confirm} onChange={(v) => setPwForm((p) => ({ ...p, confirm: v }))} />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setPwOpen(false)} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Cancel
              </button>
              <button type="submit" disabled={pwLoading} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
                {pwLoading && <Loader2 size={14} className="animate-spin" />} Update Password
              </button>
            </div>
          </form>
        </Modal>
      )}

      {settingsOpen && (
        <Modal title="Settings" onClose={() => setSettingsOpen(false)}>
          <div className="mb-4 flex gap-2">
            <TabButton active={settingsTab === "general"} onClick={() => setSettingsTab("general")} label="General" />
            <TabButton active={settingsTab === "security"} onClick={() => setSettingsTab("security")} label="Security" />
            <TabButton active={settingsTab === "danger"} onClick={() => setSettingsTab("danger")} label="Danger Zone" />
          </div>

          {settingsTab === "general" && (
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <span className="inline-flex items-center gap-2"><Camera size={14} /> Update Avatar</span>
              <span className="text-xs text-slate-400">Upload</span>
            </button>
          )}

          {settingsTab === "security" && (
            <button
              onClick={() => { setSettingsOpen(false); setPwOpen(true); }}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <span className="inline-flex items-center gap-2"><Lock size={14} /> Change Password</span>
              <ChevronRight size={14} className="text-slate-400" />
            </button>
          )}

          {settingsTab === "danger" && (
            <div className="space-y-4">
              <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-300" />
                <p className="text-sm leading-5 text-rose-700 dark:text-rose-200">This action is permanent. All notes, AI usage history, and account data will be removed.</p>
              </div>
              <Field label='Type DELETE to confirm' value={deleteConfirmText} onChange={setDeleteConfirmText} placeholder="DELETE" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSettingsOpen(false)} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Cancel
                </button>
                <button type="button" onClick={handleDeleteAccount} disabled={deleteLoading || deleteConfirmText !== "DELETE"} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50">
                  {deleteLoading && <Loader2 size={14} className="animate-spin" />} Delete Permanently
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </Layout>
  );
}