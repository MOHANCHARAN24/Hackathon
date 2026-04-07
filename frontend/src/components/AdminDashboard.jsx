import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  deleteDocument,
  getAdminDocuments,
  getAdminStats,
  getUnanswered,
  reindexDocuments,
  uploadDocument,
} from "../api/client";
import useChatStore from "../store/chatStore";

const toLocal = (value) => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
};

const dayLabel = (isoDate) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString([], { weekday: "short" });
};

const buildLast7Days = (stats) => {
  const map = {};
  (stats?.queries_by_day || []).forEach((row) => {
    map[row.date] = Number(row.count || 0);
  });

  const result = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    result.push({ day: dayLabel(iso), count: map[iso] || 0 });
  }
  return result;
};

export default function AdminDashboard() {
  const toggleAdmin = useChatStore((state) => state.toggleAdmin);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [authorized, setAuthorized] = useState(
    Boolean(sessionStorage.getItem("campusai_admin_password")),
  );
  const [stats, setStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [unanswered, setUnanswered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const refreshAll = async () => {
    setLoading(true);
    setPasswordError("");
    try {
      const [statsRes, docsRes, unansweredRes] = await Promise.all([
        getAdminStats(),
        getAdminDocuments(),
        getUnanswered(),
      ]);
      setStats(statsRes.data);
      setDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);
      const unansweredList = Array.isArray(unansweredRes.data) ? unansweredRes.data : [];
      setUnanswered(unansweredList.slice(0, 20));
      setLastRefreshed(new Date());
    } catch {
      setPasswordError("Wrong password or backend unavailable.");
      setAuthorized(false);
      sessionStorage.removeItem("campusai_admin_password");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      refreshAll();
    }
  }, [authorized]);

  useEffect(() => {
    if (!authorized) {
      return undefined;
    }

    const timer = setInterval(() => {
      refreshAll();
    }, 60000);

    return () => clearInterval(timer);
  }, [authorized]);

  const moduleChartData = useMemo(() => {
    const distribution = stats?.module_distribution || {};
    return [
      { module: "admission", count: Number(distribution.admission || 0) },
      { module: "academic", count: Number(distribution.academic || 0) },
      { module: "financial", count: Number(distribution.financial || 0) },
      { module: "campus", count: Number(distribution.campus || 0) },
      { module: "support", count: Number(distribution.support || 0) },
    ];
  }, [stats]);

  const dayChartData = useMemo(() => buildLast7Days(stats), [stats]);

  const answeredPercent = stats?.total_queries
    ? Math.round((Number(stats.answered_count || 0) / Number(stats.total_queries)) * 100)
    : 0;

  const satisfactionScore = stats?.positive_feedback || stats?.negative_feedback
    ? Math.round(
        (Number(stats.positive_feedback || 0) /
          (Number(stats.positive_feedback || 0) + Number(stats.negative_feedback || 0))) *
          100,
      )
    : 0;

  const handleLogin = async () => {
    sessionStorage.setItem("campusai_admin_password", passwordInput.trim());
    setAuthorized(true);
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setStatusText("Uploading and indexing document...");
    try {
      const response = await uploadDocument(file);
      setStatusText(`Uploaded ${response.data.filename} | chunks: ${response.data.chunks}`);
      await refreshAll();
    } catch {
      setStatusText("Upload failed.");
    }
  };

  const handleDeleteDocument = async (filename) => {
    setStatusText(`Deleting ${filename}...`);
    try {
      await deleteDocument(filename);
      setStatusText(`Deleted ${filename}`);
      await refreshAll();
    } catch {
      setStatusText("Delete failed.");
    }
  };

  const handleReindex = async () => {
    setStatusText("Re-indexing all documents...");
    try {
      const response = await reindexDocuments();
      setStatusText(
        `Re-index complete | chunks: ${response.data.chunks_indexed} | time: ${response.data.time_taken_s}s`,
      );
      await refreshAll();
    } catch {
      setStatusText("Re-index failed.");
    }
  };

  const handleCopyAllUnanswered = async () => {
    const payload = unanswered
      .slice(0, 10)
      .map((item) => `- ${item.question} (${toLocal(item.timestamp)})`)
      .join("\n");

    if (!payload) {
      return;
    }

    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // Clipboard failure can be ignored silently.
    }
  };

  if (!authorized) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Admin Access</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Enter admin password to open CampusAI dashboard.
          </p>
          <input
            type="password"
            value={passwordInput}
            onChange={(event) => setPasswordInput(event.target.value)}
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            placeholder="Admin password"
          />
          {passwordError && <p className="mt-2 text-xs text-red-600">{passwordError}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleLogin}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
            >
              Login
            </button>
            <button
              type="button"
              onClick={toggleAdmin}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              Back to Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">CampusAI Admin Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            Last refreshed: {lastRefreshed ? toLocal(lastRefreshed) : "-"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refreshAll}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={toggleAdmin}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
          >
            Back to Chat
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-300">Total Queries</p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats?.total_queries || 0}</p>
          <p className="text-xs text-slate-500 dark:text-slate-300">Today: {stats?.queries_today || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-300">Answered %</p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{answeredPercent}%</p>
          <p className="text-xs text-slate-500 dark:text-slate-300">Answered: {stats?.answered_count || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-300">Satisfaction Score</p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{satisfactionScore}%</p>
          <p className="text-xs text-slate-500 dark:text-slate-300">👍 {stats?.positive_feedback || 0} | 👎 {stats?.negative_feedback || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-300">Unanswered</p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats?.unanswered_count || 0}</p>
          <p className="text-xs text-slate-500 dark:text-slate-300">need attention</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Queries by module</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moduleChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="module" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#378ADD" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Queries by day (last 7 days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1D9E75" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-400/50 dark:bg-amber-900/25">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            ❓ Unanswered Questions — Add these to your documents
          </h3>
          <button
            type="button"
            onClick={handleCopyAllUnanswered}
            className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-amber-800 dark:border-amber-400/60 dark:bg-amber-950/30 dark:text-amber-100"
          >
            Copy All
          </button>
        </div>
        <div className="space-y-2 text-sm text-amber-900 dark:text-amber-100">
          {(unanswered.slice(0, 10) || []).map((item, index) => (
            <div key={`${item.question}-${index}`} className="rounded-lg border border-amber-200 bg-white p-2 dark:border-amber-500/40 dark:bg-amber-950/25">
              <p>{item.question}</p>
              <p className="text-xs opacity-80">{toLocal(item.timestamp)}</p>
            </div>
          ))}
          {!unanswered.length && <p>No unanswered questions yet.</p>}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          👎 Poor Answers — These need document improvement
        </h3>
        <div className="space-y-2 text-sm text-slate-700 dark:text-slate-100">
          {(stats?.recent_negative || []).map((item, index) => (
            <div key={`${item.question}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-600 dark:bg-slate-800">
              <p className="font-medium">{item.question}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{item.answer_snippet}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{toLocal(item.timestamp)}</p>
            </div>
          ))}
          {!stats?.recent_negative?.length && <p>No negative feedback yet.</p>}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Document Manager</h3>
          <button
            type="button"
            onClick={handleReindex}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
          >
            Re-index All
          </button>
        </div>

        <label className="mb-3 block rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-200">
          Upload document
          <input type="file" className="mt-2 block w-full text-sm" onChange={handleUpload} />
        </label>

        {statusText && (
          <p className="mb-3 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {statusText}
          </p>
        )}

        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.filename}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900 dark:text-slate-100">{doc.filename}</p>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  {doc.topic} | {doc.chunk_count} chunks
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteDocument(doc.filename)}
                className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-400/50 dark:bg-red-900/25 dark:text-red-200"
              >
                Delete
              </button>
            </div>
          ))}

          {!documents.length && (
            <p className="text-sm text-slate-500 dark:text-slate-300">No documents indexed yet.</p>
          )}
        </div>
      </div>

      {loading && <p className="mt-3 text-xs text-slate-500 dark:text-slate-300">Refreshing dashboard...</p>}
    </div>
  );
}
