import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../lib/apiClient";
import {
  Save,
  X,
  Eye,
  EyeOff,
  Trash2,
  Check,
  AlertCircle,
  Loader,
  BookOpen,
  Star,
} from "lucide-react";
import Layout from "../components/Layout";

// ─── Dark mode palette — matches Favorites/Notes pages exactly ────────────
// Hero/header panel:  dark:border-slate-800  dark:bg-[#161b22]
// Cards / panels:     dark:border-slate-800  dark:bg-[#161b22]
// Inputs/selects:     dark:border-slate-700  dark:bg-slate-900
// Secondary buttons:  dark:border-slate-700  dark:bg-slate-800
// Preview panel:      dark:bg-slate-900 (inline code block feel)
// ─────────────────────────────────────────────────────────────────────────

function getNoteId(note) {
  return note?._id || note?.id || note?.noteId || null;
}

function extractNoteData(payload) {
  return payload?.note || payload?.data || payload || {};
}

export default function CreateNote() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState("");
  const [formDirty, setFormDirty] = useState(false);

  const autoSaveTimer = useRef(null);
  const hasLoadedNote = useRef(false);

  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    content: "",
    tags: [],
  });

  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  const subjects = useMemo(
    () => [
      "Mathematics", "Physics", "Chemistry", "Biology", "English",
      "History", "Geography", "Computer Science", "Economics", "Psychology", "Other",
    ],
    []
  );

  const fetchNote = useCallback(async () => {
    if (!isEditMode || !id) return;
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/notes/${id}`);
      const noteData = extractNoteData(res?.data);
      setFormData({
        title: noteData.title || "",
        subject: noteData.subject || "",
        content: noteData.content || "",
        tags: Array.isArray(noteData.tags) ? noteData.tags : [],
      });
      setIsFavorite(Boolean(noteData.isFavorite || noteData.favorite || noteData.starred));
      hasLoadedNote.current = true;
      setFormDirty(false);
    } catch (error) {
      console.error("Error fetching note:", error);
      setErrors({ general: "Failed to load note" });
    } finally {
      setIsLoading(false);
    }
  }, [id, isEditMode]);

  useEffect(() => { fetchNote(); }, [fetchNote]);

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

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    else if (formData.title.length < 3) newErrors.title = "Title must be at least 3 characters";
    else if (formData.title.length > 200) newErrors.title = "Title must be less than 200 characters";
    if (!formData.subject) newErrors.subject = "Subject is required";
    if (!formData.content.trim()) newErrors.content = "Content is required";
    else if (formData.content.length < 10) newErrors.content = "Content must be at least 10 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((tag) => tag !== tagToRemove) }));
  };

  const handleSaveNote = async () => {
    if (!validateForm()) return;
    try {
      setIsLoading(true);
      setErrors({});
      setSuccessMessage("");
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
      setSuccessMessage(isEditMode ? "Note updated successfully!" : "Note created successfully!");
      navigate(`/notes/${noteId}`, { replace: true });
    } catch (error) {
      console.error("Error saving note:", error);
      setErrors({ general: error?.response?.data?.message || "Failed to save note" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!id) return;
    try {
      await apiClient.put(`/notes/favorite/${id}`);
      setIsFavorite((prev) => !prev);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleClearForm = () => {
    setFormData({ title: "", subject: "", content: "", tags: [] });
    setTagInput("");
    setErrors({});
    setFormDirty(true);
  };

  const handleCancel = () => { navigate("/notes"); };

  const handleDelete = async () => {
    if (!isEditMode || !id) return;
    const confirmed = window.confirm("Delete this note?");
    if (!confirmed) return;
    try {
      setIsLoading(true);
      await apiClient.delete(`/notes/${id}`);
      navigate("/notes", { replace: true });
    } catch (error) {
      console.error("Delete error:", error);
      setErrors({ general: error?.response?.data?.message || "Failed to delete note" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && isEditMode && !hasLoadedNote.current) {
    return (
      <Layout>
        <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center">
          <div className="text-center">
            <Loader className="mx-auto mb-4 h-12 w-12 animate-spin text-violet-500 dark:text-violet-300" />
            <p className="text-slate-600 dark:text-slate-400">Loading note...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ── Header ── */}
        <section className="rounded-3xl border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5 shadow-sm dark:border-slate-800 dark:from-[#161b22] dark:via-[#161b22] dark:to-[#11151c] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                  {isEditMode ? "Edit Note" : "Create New Note"}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Write, preview, and save your note in one place.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Auto-save status */}
              {lastAutoSave && !autoSaveStatus && (
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-300">
                  <Check className="h-4 w-4" /> Saved
                </div>
              )}
              {autoSaveStatus && (
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-sm text-violet-600 dark:text-violet-300">
                  <Loader className="h-4 w-4 animate-spin" /> {autoSaveStatus}
                </div>
              )}

              {/* Favorite toggle (edit mode only) */}
              {isEditMode && (
                <button
                  onClick={handleToggleFavorite}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition ${
                    isFavorite
                      ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-300"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                  }`}
                  aria-label="Toggle favorite"
                >
                  <Star className={`h-4 w-4 ${isFavorite ? "fill-yellow-500 dark:fill-yellow-300" : ""}`} />
                </button>
              )}

              {/* Cancel */}
              <button
                onClick={handleCancel}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                aria-label="Cancel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* ── Left: form ── */}
          <div className="space-y-5 xl:col-span-2">

            {/* Error / success banners */}
            {errors.general && (
              <div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-500 dark:text-rose-300" />
                <p className="text-sm text-rose-700 dark:text-rose-200">{errors.general}</p>
              </div>
            )}
            {successMessage && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <Check className="h-5 w-5 flex-shrink-0 text-emerald-500 dark:text-emerald-300" />
                <p className="text-sm text-emerald-700 dark:text-emerald-200">{successMessage}</p>
              </div>
            )}

            {/* Form card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-6">
              <div className="space-y-5">

                {/* Title */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Note Title{" "}
                    <span className="normal-case tracking-normal font-normal text-slate-400 dark:text-slate-500">
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
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Tags <span className="normal-case tracking-normal font-normal text-slate-400 dark:text-slate-500">— press Enter to add</span>
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
                          className="flex items-center rounded-full transition hover:text-violet-500 dark:hover:text-violet-100"
                          aria-label={`Remove tag ${tag}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Content */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Content{" "}
                      <span className="normal-case tracking-normal font-normal text-slate-400 dark:text-slate-500">
                        {formData.content.length} chars · {formData.content.split(/\s+/).filter(Boolean).length} words
                      </span>
                    </label>
                    <button
                      onClick={() => setShowPreview((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-600 transition hover:text-violet-500 dark:text-violet-300 dark:hover:text-violet-200"
                    >
                      {showPreview ? <><EyeOff className="h-3.5 w-3.5" /> Hide Preview</> : <><Eye className="h-3.5 w-3.5" /> Show Preview</>}
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
                  <button
                    onClick={handleSaveNote}
                    disabled={isLoading}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-500/25 transition hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading ? (
                      <><Loader className="h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="h-4 w-4" /> {isEditMode ? "Update Note" : "Save Note"}</>
                    )}
                  </button>

                  <button
                    onClick={handleClearForm}
                    disabled={isLoading}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                  >
                    <Trash2 className="h-4 w-4" /> Clear Form
                  </button>

                  <button
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                </div>

                {/* Delete (edit mode) */}
                {isEditMode && (
                  <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                    <button
                      onClick={handleDelete}
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15"
                    >
                      <Trash2 className="h-4 w-4" /> Delete Note
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* ── Right: preview ── */}
          {showPreview && (
            <div className="xl:col-span-1">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161b22] xl:sticky xl:top-6">

                <h3 className="mb-5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Live Preview
                </h3>

                <div className="space-y-5">
                  {/* Title */}
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Title</p>
                    <p className="text-base font-bold leading-snug text-slate-900 dark:text-white">
                      {formData.title || <span className="font-normal italic text-slate-400 dark:text-slate-600">No title yet</span>}
                    </p>
                  </div>

                  {/* Subject */}
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Subject</p>
                    {formData.subject ? (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
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
                          Start typing to see a preview here...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Characters</p>
                        <p className="mt-1 text-xl font-bold text-violet-600 dark:text-violet-300">
                          {formData.content.length}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Words</p>
                        <p className="mt-1 text-xl font-bold text-violet-600 dark:text-violet-300">
                          {formData.content.split(/\s+/).filter(Boolean).length}
                        </p>
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