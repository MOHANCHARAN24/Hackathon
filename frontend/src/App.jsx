import { useEffect, useState } from "react";

import { getModules } from "./api/client";
import AdminDashboard from "./components/AdminDashboard";
import BookmarksPanel from "./components/BookmarksPanel";
import ChatInput from "./components/ChatInput";
import ChatWindow from "./components/ChatWindow";
import LanguageToggle from "./components/LanguageToggle";
import ModuleSidebar from "./components/ModuleSidebar";
import useChat from "./hooks/useChat";
import useChatStore from "./store/chatStore";

export default function App() {
  const { sendMessage, isLoading } = useChat();
  const showAdmin = useChatStore((state) => state.showAdmin);
  const toggleAdmin = useChatStore((state) => state.toggleAdmin);
  const isDarkMode = useChatStore((state) => state.isDarkMode);
  const toggleDarkMode = useChatStore((state) => state.toggleDarkMode);
  const initSession = useChatStore((state) => state.initSession);
  const setLanguage = useChatStore((state) => state.setLanguage);
  const setModules = useChatStore((state) => state.setModules);
  const showBookmarks = useChatStore((state) => state.showBookmarks);
  const openBookmarks = useChatStore((state) => state.openBookmarks);
  const closeBookmarks = useChatStore((state) => state.closeBookmarks);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    initSession();

    const savedLanguage = localStorage.getItem("campusai_language");
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }

    const loadModules = async () => {
      try {
        const response = await getModules();
        setModules(Array.isArray(response.data) ? response.data : []);
      } catch {
        setModules([]);
      }
    };

    loadModules();
  }, [initSession, setLanguage, setModules]);

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="flex h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <ModuleSidebar
          isMobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onOpenBookmarks={openBookmarks}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm md:hidden dark:border-slate-600"
              >
                ≡
              </button>
              <div>
                <h1 className="text-lg font-semibold">CampusAI</h1>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  Vignan University
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LanguageToggle />
              <button
                type="button"
                onClick={toggleDarkMode}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
              >
                {isDarkMode ? "☀" : "🌙"}
              </button>
              <button
                type="button"
                onClick={toggleAdmin}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
              >
                {showAdmin ? "Back" : "Admin"}
              </button>
            </div>
          </header>

          {showAdmin ? (
            <AdminDashboard />
          ) : (
            <>
              <ChatWindow onSelectSuggestion={(text) => sendMessage(text)} />
              <ChatInput
                onSend={(text) => sendMessage(text)}
                disabled={isLoading}
              />
            </>
          )}
        </div>
      </div>

      <BookmarksPanel open={showBookmarks} onClose={closeBookmarks} />
    </div>
  );
}
