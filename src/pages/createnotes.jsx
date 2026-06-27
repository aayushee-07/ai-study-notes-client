import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../lib/apiClient";
import {
  Save, X, Eye, EyeOff, Trash2, Check, AlertCircle,
  Loader, BookOpen, Star, Sparkles, Info, CheckCircle2, ArrowLeft,
} from "lucide-react";
import Layout from "../components/Layout";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getNoteId(note) {
  return note?._id || note?.id || note?.noteId || null;
}

function extractNoteData(payload) {
  return payload?.note || payload?.data || payload || {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast — typed, matches Notes.jsx exactly
// ─────────────────────────────────────────────────────────────────────────────

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const tone =
    toast.type === "success"
      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
      : toast.type === "error"
        ? "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
        : "bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-300";
  const Icon =
    toast.type === "success" ? CheckCircle2 : toast.type === "error" ? AlertCircle : Info;
  return (
    <div
      className={`fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur sm:w-auto ${tone}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1 text-sm leading-5">{toast.message}</div>
      <button onClick={onClose} aria-label="Close toast" className="transition-opacity hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmDeleteModal — matches Notes.jsx / UploadPDF.jsx exactly
// ─────────────────────────────────────────────────────────────────────────────

function ConfirmDeleteModal({ open, loading, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
            <Trash2 size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete note?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              This will permanently delete this note and cannot be undone.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl border border-rose-200 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-700 transition-colors hover:bg-rose-500/15 disabled:opacity-60 dark:border-rose-500/20 dark:text-rose-200"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function CreateNote() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const isEditMode = Boolean(id);

  const [isLoading,      setIsLoading]      = useState(false);
  const [isSaving,       setIsSaving]       = useState(false);
  const [showPreview,    setShowPreview]     = useState(true);
  const [lastAutoSave,   setLastAutoSave]    = useState(null);
  const [autoSaveStatus, setAutoSaveStatus]  = useState("");
  const [formDirty,      setFormDirty]       = useState(false);
  const [isFavorite,     setIsFavorite]      = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingNote,   setDeletingNote]    = useState(false);

  const [toast,   setToast]   = useState(null);
  const [errors,  setErrors]  = useState({});

  const toastTimer    = useRef(null);
  const autoSaveTimer = useRef(null);
  const hasLoadedNote = useRef(false);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(toastTimer.current);
    window.clearTimeout(autoSaveTimer.current);
  }, []);

  const [formData, setFormData] = useState({
    title: "", subject: "", content: "", tags: [],
  });
  const [tagInput, setTagInput] = useState("");

  const subjects = useMemo(() => [
    "Mathematics", "Physics", "Chemistry", "Biology", "English",
    "History", "Geography", "Computer Science", "Economics", "Psychology", "Other",
  ], []);

  // ── Load note in edit mode ───────────────────────────────────────────────

  const fetchNote = useCallback(async () => {
    if (!isEditMode || !id) return;
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/notes/${id}`);
      const noteData = extractNoteData(res?.data);
      setFormData({
        title:   noteData.title   || "",
        subject: noteData.subject || "",
        content: noteData.content || "",
        tags: Array.isArray(noteData.tags) ? noteData.tags : [],
      });
      setIsFavorite(Boolean(noteData.isFavorite || noteData.favorite || noteData.starred));
      hasLoadedNote.current = true;
      setFormDirty(false);
    } catch (error) {
      console.error("Error fetching note:", error);
      showToast("Failed to load note.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [id, isEditMode, showToast]);

  useEffect(() => { fetchNote(); }, [fetchNote]);

  // ── Autosave ─────────────────────────────────────────────────────────────

  const performAutoSave = useCallback(async () => {
    if (!isEditMode || !id || !hasLoadedNote.current || !formDirty) return;
    try {
      setIsSaving(true);
      setAutoSaveStatus("Saving...");
      await apiClient.put(`/notes/${id}`, formData);
      setLastAutoSave(new Date());
      setAutoSaveStatus("Saved");
      setTimeout(() => setAutoSaveStatus(""), 1200);
    } catch (error) {
      console.error("Autosave error:", error);
      setAutoSaveStatus("Autosave failed");
      setTimeout(() => setAutoSaveStatus(""), 1500);
    } finally {
      setIsSaving(false);
    }
  }, [formData, formDirty, id, isEditMode]);

  useEffect(() => {
    if (!isEditMode || !id || !hasLoadedNote.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { performAutoSave(); }, 3000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [formData, performAutoSave, id, isEditMode]);

  // ── Form handlers ─────────────────────────────────────────────────────────

  const validateForm = () => {
    const e = {};
    if (!formData.title.trim())          e.title = "Title is required";
    else if (formData.title.length < 3)  e.title = "Title must be at least 3 characters";
    else if (formData.title.length > 200) e.title = "Title must be less than 200 characters";
    if (!formData.subject)               e.subject = "Subject is required";
    if (!formData.content.trim())        e.content = "Content is required";
    else if (formData.content.length < 10) e.content = "Content must be at least 10 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormDirty(true);
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleTagAdd = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      setFormData((prev) =>
        prev.tags.includes(newTag) ? prev : { ...prev, tags: [...prev.tags, newTag] }
      );
      setTagInput("");
      setFormDirty(true);
    }
  };

  const handleTagRemove = (tagToRemove) => {
    setFormDirty(true);
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tagToRemove) }));
  };

  const handleSaveNote = async () => {
    if (!validateForm()) return;
    try {
      setIsLoading(true);
      setErrors({});
      let saved;
      if (isEditMode && id) {
        const res = await apiClient.put(`/notes/${id}`, formData);
        saved = extractNoteData(res?.data);
      } else {
        const res = await apiClient.post("/notes/create", formData);
        saved = extractNoteData(res?.data);
      }
      const noteId = getNoteId(saved) || id;
      if (!noteId) throw new Error("Saved note id missing");
      if (formData.tags.length > 0) {
        await apiClient.put(`/notes/tags/${noteId}`, { tags: formData.tags });
      }
      showToast(isEditMode ? "Note updated successfully!" : "Note created successfully!", "success");
      navigate(`/notes/${noteId}`, { replace: true });
    } catch (error) {
      console.error("Error saving note:", error);
      const msg = error?.response?.data?.message || "Failed to save note";
      setErrors({ general: msg });
      showToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!id) return;
    try {
      await apiClient.put(`/notes/favorite/${id}`);
      setIsFavorite((prev) => !prev);
      showToast(isFavorite ? "Removed from favorites" : "Added to favorites", "success");
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showToast("Failed to update favorite.", "error");
    }
  };

  const handleClearForm = () => {
    setFormData({ title: "", subject: "", content: "", tags: [] });
    setTagInput("");
    setErrors({});
    setFormDirty(true);
  };

  const handleDeleteConfirm = async () => {
    if (!isEditMode || !id) return;
    try {
      setDeletingNote(true);
      await apiClient.delete(`/notes/${id}`);
      setShowDeleteModal(false);
      navigate("/notes", { replace: true });
    } catch (error) {
      console.error("Delete error:", error);
      showToast(error?.response?.data?.message || "Failed to delete note.", "error");
    } finally {
      setDeletingNote(false);
    }
  };

  // ── Loading screen ────────────────────────────────────────────────────────

  if (isLoading && isEditMode && !hasLoadedNote.current) {
    return (
      <Layout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <Loader className="mx-auto mb-4 h-12 w-12 animate-spin text-violet-500 dark:text-violet-300" />
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading note…</p>
          </div>
        </div>
      </Layout>
    );
  }

  const wordCount = formData.content.split(/\s+/).filter(Boolean).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDeleteModal
        open={showDeleteModal}
        loading={deletingNote}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Outer wrapper — matches Notes.jsx: space-y-6 lg:space-y-8, no max-width */}
      <div className="space-y-6 lg:space-y-8">

        {/* ── Hero — violet gradient, Sparkles pill, matches Notes.jsx exactly ── */}
        <section className="rounded-3xl border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5 shadow-sm dark:border-slate-800 dark:from-[#161b22] dark:via-[#161b22] dark:to-[#11151c] sm:p-7 lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm dark:border-violet-500/20 dark:bg-slate-900 dark:text-violet-300">
                <Sparkles size={11} /> {isEditMode ? "Edit Note" : "Create Note"}
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {isEditMode ? "Edit Note" : "Create New Note"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Write, preview, and save your note in one place.
              </p>
            </div>

            {/* Header actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Autosave status */}
              {lastAutoSave && !autoSaveStatus && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-600 dark:text-emerald-300">
                  <Check size={14} /> Saved
                </div>
              )}
              {autoSaveStatus && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-sm text-violet-600 dark:text-violet-300">
                  <Loader size={14} className="animate-spin" /> {autoSaveStatus}
                </div>
              )}

              {/* Favorite toggle (edit mode only) */}
              {isEditMode && (
                <button
                  onClick={handleToggleFavorite}
                  aria-label="Toggle favorite"
                  className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition ${
                    isFavorite
                      ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-300"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <Star size={14} className={isFavorite ? "fill-yellow-500 dark:fill-yellow-300" : ""} />
                </button>
              )}

              {/* Back — matches NoteDetails back button style */}
              <button
                onClick={() => navigate("/notes")}
                className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-50 dark:border-violet-500/20 dark:bg-slate-900 dark:text-violet-300 dark:hover:bg-violet-500/10"
              >
                <ArrowLeft size={14} /> Back
              </button>
            </div>
          </div>
        </section>

        {/* ── Main grid: form + preview ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* ── Form column ── */}
          <div className="space-y-5 xl:col-span-2">

            {/* Error banner */}
            {errors.general && (
              <div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                <AlertCircle size={18} className="shrink-0 text-rose-500 dark:text-rose-300" />
                <p className="text-sm text-rose-700 dark:text-rose-200">{errors.general}</p>
              </div>
            )}

            {/* Form panel — rounded-3xl matching Notes.jsx panels */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-6">
              <div className="space-y-5">

                {/* Title */}
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Note Title{" "}
                    <span className="normal-case font-normal tracking-normal text-slate-400 dark:text-slate-500">
                      {formData.title.length}/200
                    </span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter a descriptive title for your note..."
                    className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 dark:text-white dark:placeholder-slate-500 ${
                      errors.title
                        ? "border-rose-500/50 bg-rose-50 dark:bg-rose-500/10"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                    }`}
                  />
                  {errors.title && <p className="mt-1.5 text-xs text-rose-500">{errors.title}</p>}
                </div>

                {/* Subject + Tags */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Subject
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 dark:text-white ${
                        errors.subject
                          ? "border-rose-500/50 bg-rose-50 dark:bg-rose-500/10"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                      }`}
                    >
                      <option value="">Select a subject...</option>
                      {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.subject && <p className="mt-1.5 text-xs text-rose-500">{errors.subject}</p>}
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Tags{" "}
                      <span className="normal-case font-normal tracking-normal text-slate-400 dark:text-slate-500">
                        — press Enter to add
                      </span>
                    </label>
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagAdd}
                      placeholder="Add tags and press Enter..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                    />
                  </div>
                </div>

                {/* Tag pills */}
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <div
                        key={tag}
                        className="flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-300"
                      >
                        <span>{tag}</span>
                        <button
                          onClick={() => handleTagRemove(tag)}
                          aria-label={`Remove tag ${tag}`}
                          className="flex items-center rounded-full transition hover:text-violet-500 dark:hover:text-violet-100"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Content */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Content{" "}
                      <span className="normal-case font-normal tracking-normal text-slate-400 dark:text-slate-500">
                        {formData.content.length} chars · {wordCount} words
                      </span>
                    </label>
                    <button
                      onClick={() => setShowPreview((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-600 transition hover:text-violet-500 dark:text-violet-300 dark:hover:text-violet-200"
                    >
                      {showPreview
                        ? <><EyeOff size={12} /> Hide Preview</>
                        : <><Eye size={12} /> Show Preview</>}
                    </button>
                  </div>

                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    placeholder="Write your note content here..."
                    rows={16}
                    className={`w-full resize-y rounded-3xl border px-4 py-4 font-mono text-sm leading-relaxed text-slate-900 outline-none transition focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 dark:text-white dark:placeholder-slate-500 ${
                      errors.content
                        ? "border-rose-500/50 bg-rose-50 dark:bg-rose-500/10"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                    }`}
                  />
                  {errors.content && <p className="mt-1.5 text-xs text-rose-500">{errors.content}</p>}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                  {/* Primary CTA — rounded-full gradient matching Notes.jsx */}
                  <button
                    onClick={handleSaveNote}
                    disabled={isLoading}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading
                      ? <><Loader size={15} className="animate-spin" /> Saving…</>
                      : <><Save size={15} /> {isEditMode ? "Update Note" : "Save Note"}</>}
                  </button>

                  {/* Secondary — rounded-xl outline matching Notes.jsx secondary buttons */}
                  <button
                    onClick={handleClearForm}
                    disabled={isLoading}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                  >
                    <Trash2 size={15} /> Clear Form
                  </button>

                  <button
                    onClick={() => navigate("/notes")}
                    disabled={isLoading}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                  >
                    <X size={15} /> Cancel
                  </button>
                </div>

                {/* Delete — edit mode only, rose tone matching Notes.jsx delete button */}
                {isEditMode && (
                  <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15"
                    >
                      <Trash2 size={15} /> Delete Note
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* ── Preview column ── */}
          {showPreview && (
            <div className="xl:col-span-1">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161b22] xl:sticky xl:top-6">
                <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Live Preview
                </h3>

                <div className="space-y-5">

                  {/* Title */}
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Title</p>
                    <p className="text-base font-bold leading-snug text-slate-900 dark:text-white">
                      {formData.title || (
                        <span className="font-normal italic text-slate-400 dark:text-slate-600">No title yet</span>
                      )}
                    </p>
                  </div>

                  {/* Subject */}
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Subject</p>
                    {formData.subject ? (
                      <span className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-300">
                        {formData.subject}
                      </span>
                    ) : (
                      <p className="text-sm italic text-slate-400 dark:text-slate-600">No subject selected</p>
                    )}
                  </div>

                  {/* Tags */}
                  {formData.tags.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-700 dark:text-violet-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Content</p>
                    <div className="max-h-[26rem] overflow-y-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {formData.content || (
                        <span className="italic text-slate-400 dark:text-slate-600">
                          Start typing to see a preview here…
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats — match Notes.jsx StatCard: text-3xl font-bold text-slate-900 */}
                  <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161b22]">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Characters</span>
                        <span className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                          {formData.content.length}
                        </span>
                      </div>
                      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161b22]">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Words</span>
                        <span className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                          {wordCount}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}