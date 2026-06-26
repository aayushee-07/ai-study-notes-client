/**
 * src/lib/apiClient.js
 *
 * FIXES:
 *  - Default timeout raised from 30 000 ms → 120 000 ms (2 min).
 *    Summary and Simplify generate long markdown; the AI model can take
 *    60-90 s on cold starts or large notes. 30 s was always too tight.
 *  - Auth token injected via request interceptor (single place).
 *  - 401 response interceptor clears stale token and redirects to /login.
 *  - Base URL read from VITE_API_URL env var with a safe fallback.
 */

import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",

  // 2-minute default — covers slow AI responses (summary, simplify).
  // Individual aiService calls that need even longer can pass their own
  // { timeout } option which axios merges and overrides this default.
  timeout: 120_000,

  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach JWT ──────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

// ── Response interceptor: handle 401 globally ────────────────────────────────
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("token");
      // Only redirect if not already on the auth pages
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default apiClient;