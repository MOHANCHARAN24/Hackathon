import useChatStore from "../store/chatStore";

const truncate = (text, max = 100) => {
  if (!text) {
    return "";
  }
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max).trim()}...`;
};

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString();
};

export default function BookmarksPanel({ open, onClose }) {
  const bookmarks = useChatStore((state) => state.bookmarks);
  const removeBookmark = useChatStore((state) => state.removeBookmark);

  const handleCopy = async (bookmark) => {
    const payload = `Q: ${bookmark.question || "Saved answer"}\nA: ${bookmark.answer || ""}`;
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // Clipboard failure can be ignored for UX continuity.
    }
  };

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close bookmarks"
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/30"
        />
      )}

      <aside
        className={`fixed right-0 top-0 z-[60] h-full w-full max-w-md border-l border-slate-200 bg-white p-4 shadow-xl transition-transform dark:border-slate-700 dark:bg-slate-900 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Saved Answers
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            Close
          </button>
        </div>

        {!bookmarks.length && (
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">
            No saved answers yet.
            <br />
            Bookmark helpful answers using the 🔖 button.
          </div>
        )}

        <div className="space-y-3 overflow-y-auto pb-8">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {bookmark.question || "Saved answer"}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {truncate(bookmark.answer, 100)}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                {formatTime(bookmark.timestamp)}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(bookmark)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => removeBookmark(bookmark.id)}
                  className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-400/60 dark:bg-red-900/25 dark:text-red-200"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
