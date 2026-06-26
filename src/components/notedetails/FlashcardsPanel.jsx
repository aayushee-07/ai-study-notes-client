/**
 * src/components/notedetails/FlashcardsPanel.jsx
 *
 * Props: cards={Array}
 *   Each item: { front: string, back: string }
 *
 * Features:
 *  - Click card to flip (front ↔ back)
 *  - Previous / Next navigation
 *  - Progress indicator
 *  - Null-safe: never crashes on missing fields
 *
 * FIX: null-safe — was crashing on data?.flashcards when data was null.
 * Now receives a pre-extracted array from FlashcardsPanelView so it is
 * always a valid array. Internal fields use ?. just in case.
 */

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Layers3 } from "lucide-react";

function cn(...c) { return c.filter(Boolean).join(" "); }

export default function FlashcardsPanel({ cards }) {
  // FIX: always treat as array, never assume non-null
  const items = Array.isArray(cards) ? cards.filter(Boolean) : [];

  const [index,   setIndex]   = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (items.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No flashcards available.</p>;
  }

  const card   = items[index] || {};
  const front  = card?.front || card?.question || card?.term        || "—";
  const back   = card?.back  || card?.answer   || card?.definition  || "—";
  const total  = items.length;

  function prev() { setIndex((i) => (i - 1 + total) % total); setFlipped(false); }
  function next() { setIndex((i) => (i + 1)         % total); setFlipped(false); }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1.5"><Layers3 size={12} />{total} cards</span>
        <span>{index + 1} / {total}</span>
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped((f) => !f)}
        className="relative flex min-h-[200px] cursor-pointer select-none flex-col items-center justify-center rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6 text-center transition-all hover:border-purple-300 hover:shadow-md dark:border-purple-500/30 dark:from-purple-500/5 dark:to-slate-900/60 dark:hover:border-purple-400/40 sm:min-h-[240px]"
      >
        {/* Side label */}
        <span className="absolute left-4 top-4 rounded-lg bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
          {flipped ? "Back" : "Front"}
        </span>

        <p className={cn("text-base font-medium leading-relaxed transition-all",
          flipped ? "text-purple-700 dark:text-purple-300" : "text-slate-800 dark:text-slate-200")}>
          {flipped ? back : front}
        </p>

        <p className="absolute bottom-3 text-xs text-slate-400 dark:text-slate-500">
          Tap to {flipped ? "see front" : "reveal answer"}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={prev}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <ChevronLeft size={16} />
        </button>

        {/* Dot indicators — max 10 shown */}
        <div className="flex gap-1.5">
          {items.slice(0, 10).map((_, i) => (
            <button key={i} onClick={() => { setIndex(i); setFlipped(false); }}
              className={cn("h-2 w-2 rounded-full transition-all",
                i === index ? "bg-purple-600 dark:bg-purple-400" : "bg-slate-200 dark:bg-slate-700")} />
          ))}
          {total > 10 && <span className="text-xs text-slate-400">…</span>}
        </div>

        <button onClick={next}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Reset position */}
      <div className="flex justify-center">
        <button onClick={() => { setIndex(0); setFlipped(false); }}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <RotateCcw size={12} /> Start over
        </button>
      </div>
    </div>
  );
}