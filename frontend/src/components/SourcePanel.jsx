import { useState } from "react";

const topicBadgeMap = {
  financial: "bg-green-100 text-green-700",
  academic: "bg-blue-100 text-blue-700",
  campus: "bg-amber-100 text-amber-700",
  support: "bg-teal-100 text-teal-700",
};

const truncate = (text, max = 150) => {
  if (!text) {
    return "";
  }
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max).trim()}...`;
};

export default function SourcePanel({ sources = [] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2 w-full text-xs">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
      >
        📄 Sources ({sources.length})
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          expanded ? "max-h-[420px]" : "max-h-0"
        }`}
      >
        <div className="mt-2 space-y-2">
          {!sources.length && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              No source snippets for this response.
            </div>
          )}

          {sources.map((source, index) => {
            const badgeClass =
              topicBadgeMap[source.topic] || "bg-slate-100 text-slate-700";
            const confidence = Math.max(0, Math.min(100, Math.round((source.confidence || 0) * 100)));

            return (
              <div
                key={`${source.filename}-${source.page}-${index}`}
                className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-600 dark:bg-slate-800"
              >
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>
                  {source.filename}
                </span>
                <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">
                  {truncate(source.snippet, 150)}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-1.5 rounded-full bg-blue-500"
                    style={{ width: `${confidence}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
