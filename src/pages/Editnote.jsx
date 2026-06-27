import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import Layout from "../components/Layout";
import apiClient from "../lib/apiClient";
import {
  ArrowLeft,
  Save,
  X,
  PenSquare,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  CalendarDays,
  Hash,
} from "lucide-react";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return "—"; }
}

function getTitle(note)   { return note?.title || note?.name || note?.fileName || note?.originalName || ""; }
function getSubject(note) { return note?.subject || note?.category || note?.folder || ""; }
function getContent(note) { return note?.content || note?.body || note?.text || note?.summary || ""; }
function getTagsValue(note) {
  if (Array.isArray(note?.tags)) return note.tags.join(", ");
  if (typeof note?.tags === "string") return note.tags;
  return "";
}

/* ── Toast ── */
function Toast({ toast, onClose }) {
  if (!toast) return null;
  const tone =
    toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
    : toast.type === "error" ? "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
    : "bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-300";
  const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? AlertCircle : Info;
  return (
    <div className={`fixed right-3 top-3 left-3 z-50 flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur sm:left-auto sm:right-4 sm:top-4 sm:w-[calc(100vw-2rem)] sm:max-w-sm ${tone}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1 text-sm leading-5">{toast.message}</div>
      <button onClick={onClose} className="shrink-0 transition-opacity hover:opacity-100" aria-label="Close toast">
        <X size={16} />
      </button>
    </div>
  );
}

/* ── Loading skeleton ── */
function SkeletonLine({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700/50 ${className}`} />;
}
function EditSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-6 lg:p-8">
      <div className="grid gap-5">
        <div className="grid gap-5 md:grid-cols-2">
          <SkeletonLine className="h-20 w-full" />
          <SkeletonLine className="h-20 w-full" />
        </div>
        <SkeletonLine className="h-52 w-full" />
        <SkeletonLine className="h-16 w-full" />
        <div className="flex justify-end gap-3 pt-2">
          <SkeletonLine className="h-10 w-24" />
          <SkeletonLine className="h-10 w-36" />
        </div>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function EditNote() {
  const { darkMode } = useTheme();
  const navigate   = useNavigate();
  const { id }     = useParams();

  const [loading, setLoading]           = useState(true);
  const [saving,  setSaving]            = useState(false);
  const [toast,   setToast]             = useState(null);
  const [form,    setForm]              = useState({ title: "", subject: "", content: "", tags: "" });
  const [originalNote, setOriginalNote] = useState(null);
  const [errors,  setErrors]            = useState({});

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const loadNote = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res  = await apiClient.get(`/notes/${id}`);
      const note = res?.data?.note || res?.data || {};
      setOriginalNote(note);
      setForm({
        title:   getTitle(note),
        subject: getSubject(note),
        content: getContent(note),
        tags:    getTagsValue(note),
      });
    } catch (err) {
      showToast(err?.response?.data?.message || "Could not load this note.", "error");
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => { loadNote(); }, [loadNote]);

  const validate = useCallback(() => {
    const next = {};
    if (!form.title.trim())   next.title   = "Title is required.";
    if (!form.content.trim()) next.content = "Content is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form.title, form.content]);

  const handleChange = useCallback((key) => (e) => {
    setForm((prev)   => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const handleCancel = useCallback(() => {
    if (id) navigate(`/notes/${id}`);
    else    navigate("/notes");
  }, [id, navigate]);

  const handleSave = useCallback(async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        title:   form.title.trim(),
        subject: form.subject.trim(),
        content: form.content.trim(),
        tags:    form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      await apiClient.put(`/notes/${id}`, payload);
      showToast("Note updated successfully.", "success");
      navigate(`/notes/${id}`);
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to save changes.", "error");
    } finally {
      setSaving(false);
    }
  }, [form, id, navigate, showToast, validate]);

  const updatedLabel = useMemo(() => {
    if (!originalNote) return "—";
    return formatDate(originalNote.updatedAt || originalNote.lastUpdated || originalNote.createdAt);
  }, [originalNote]);

  /* ── field class helpers ── */
  const inputBase = "mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const inputNormal = "border-slate-200 bg-white hover:border-violet-300 focus:border-violet-500 dark:border-slate-700 dark:bg-[#0d1117] dark:hover:border-violet-500/50 dark:focus:border-violet-500/70";
  const inputError  = "border-rose-300 bg-rose-50 focus:border-rose-400 dark:border-rose-500/40 dark:bg-rose-500/10";
  const inputCls = (hasError) => `${inputBase} ${hasError ? inputError : inputNormal}`;

  return (
    <Layout>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="space-y-6 pb-8 lg:space-y-8">

        {/* ── Hero ── */}
        <section className="rounded-3xl border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-4 shadow-sm dark:border-slate-800 dark:from-[#161b22] dark:via-[#161b22] dark:to-[#11151c] sm:p-6 lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

            {/* Left */}
            <div className="min-w-0">
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-50 dark:border-violet-500/20 dark:bg-[#161b22] dark:text-violet-300 dark:hover:bg-violet-500/10"
              >
                <ArrowLeft size={13} /> Back
              </button>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm dark:border-violet-500/20 dark:bg-[#161b22] dark:text-violet-300">
                <PenSquare size={11} /> Edit Note
              </div>

              <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl lg:text-3xl">
                Update your note
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Edit the title, subject, content, and tags, then save your changes back to the library.
              </p>
            </div>

            {/* Right — stat cards: side-by-side on all sizes */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:min-w-[280px] lg:max-w-[320px]">
              <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-[#161b22] sm:p-4">
                <div className="mb-2 flex items-center justify-between gap-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">Note ID</p>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300 sm:h-7 sm:w-7 sm:rounded-xl">
                    <Hash size={12} />
                  </span>
                </div>
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{id ? `…${id.slice(-6)}` : "—"}</p>
              </div>
              <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-[#161b22] sm:p-4">
                <div className="mb-2 flex items-center justify-between gap-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">Updated</p>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-300 sm:h-7 sm:w-7 sm:rounded-xl">
                    <CalendarDays size={12} />
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{updatedLabel}</p>
              </div>
            </div>

          </div>
        </section>

        {/* ── Form / skeleton ── */}
        {loading ? <EditSkeleton /> : (
          <form
            onSubmit={handleSave}
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-6 lg:p-8"
          >
            <div className="grid gap-5 sm:gap-6">

              {/* Section label */}
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
                  <PenSquare size={10} /> Note Details
                </div>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
              </div>

              {/* Title + Subject row */}
              <div className="grid gap-4 sm:gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={form.title}
                    onChange={handleChange("title")}
                    placeholder="Enter note title"
                    className={inputCls(errors.title)}
                  />
                  {errors.title && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                      <AlertCircle size={11} /> {errors.title}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Subject
                  </label>
                  <input
                    value={form.subject}
                    onChange={handleChange("subject")}
                    placeholder="e.g. Mathematics, Physics"
                    className={inputCls(false)}
                  />
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={form.content}
                  onChange={handleChange("content")}
                  placeholder="Write your note content..."
                  rows={13}
                  className={`${inputCls(errors.content)} resize-y`}
                />
                {errors.content && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                    <AlertCircle size={11} /> {errors.content}
                  </p>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tags
                </label>
                <input
                  value={form.tags}
                  onChange={handleChange("tags")}
                  placeholder="Tag1, Tag2, Tag3"
                  className={inputCls(false)}
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Separate multiple tags with commas.</p>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100 dark:border-slate-800" />

              {/* Actions */}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#161b22] dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/60"
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>

            </div>
          </form>
        )}

      </div>
    </Layout>
  );
}