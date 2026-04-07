import { useEffect } from "react";

import { getModules } from "../api/client";
import useChatStore from "../store/chatStore";
import LanguageToggle from "./LanguageToggle";

export default function ModuleSidebar({
  isMobileOpen,
  onCloseMobile,
  onOpenBookmarks,
}) {
  const activeModule = useChatStore((state) => state.activeModule);
  const modules = useChatStore((state) => state.modules);
  const setModules = useChatStore((state) => state.setModules);
  const setModule = useChatStore((state) => state.setModule);
  const clearChat = useChatStore((state) => state.clearChat);
  const toggleDarkMode = useChatStore((state) => state.toggleDarkMode);
  const isDarkMode = useChatStore((state) => state.isDarkMode);

  useEffect(() => {
    let cancelled = false;
    const loadModules = async () => {
      try {
        const response = await getModules();
        if (cancelled) {
          return;
        }
        const list = Array.isArray(response.data) ? response.data : [];
        setModules(list);
      } catch {
        if (!cancelled) {
          setModules([]);
        }
      }
    };

    loadModules();
    return () => {
      cancelled = true;
    };
  }, [setModules]);

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white/95 p-4 backdrop-blur transition-transform dark:border-slate-700 dark:bg-slate-900/95 md:static md:z-10 md:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              CampusAI Modules
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Select a module to open its dedicated chat history.
            </p>
          </div>

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
            {modules.map((module) => {
              const isActive = activeModule === module.id;
              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => {
                    setModule(module.id);
                    if (window.innerWidth < 768) {
                      onCloseMobile();
                    }
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    isActive
                      ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: "24px", lineHeight: "1" }}>
                      {module.icon}
                    </span>
                    <span className="text-[14px] font-medium text-slate-900 dark:text-slate-100">
                      {module.name}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-300">
                    {module.description}
                  </p>
                </button>
              );
            })}

            {!modules.length && (
              <div className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-300">
                Loading modules...
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
            <button
              type="button"
              onClick={onOpenBookmarks}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              🔖 Saved Answers
            </button>

            <LanguageToggle />

            <button
              type="button"
              onClick={toggleDarkMode}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {isDarkMode ? "☀ Light Mode" : "🌙 Dark Mode"}
            </button>

            <button
              type="button"
              onClick={clearChat}
              className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-left text-sm text-rose-700 dark:border-rose-400/40 dark:bg-rose-900/20 dark:text-rose-300"
            >
              Clear This Module Chat
            </button>
          </div>
        </div>
      </aside>

      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
        />
      )}
    </>
  );
}
