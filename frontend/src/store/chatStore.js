import { create } from "zustand";

const MESSAGES_KEY = "campusai_messages_by_module";
const SESSIONS_KEY = "campusai_sessions_by_module";

const loadJson = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const persistJson = (key, value) => {
  sessionStorage.setItem(key, JSON.stringify(value));
};

const getModuleKey = (moduleId) => moduleId || "general";

const useChatStore = create((set, get) => ({
  messages: [],
  messagesByModule: loadJson(MESSAGES_KEY, {}),
  isLoading: false,
  activeModule: null,
  modules: [],
  language: localStorage.getItem("campusai_language") || "en",
  studentProfile: {
    name: localStorage.getItem("campusai_name") || "Student",
    department: localStorage.getItem("campusai_dept") || "",
    year: localStorage.getItem("campusai_year") || "",
    rollNumber: localStorage.getItem("campusai_roll") || "",
  },
  sessionIdsByModule: loadJson(SESSIONS_KEY, {}),
  sessionId: crypto.randomUUID(),
  showAdmin: false,
  showProfileSetup: false,
  bookmarks: JSON.parse(localStorage.getItem("campusai_bookmarks") || "[]"),
  isDarkMode: localStorage.getItem("campusai_dark") === "true",
  showBookmarks: false,

  addMessage: (msg) =>
    set((s) => {
      const moduleKey = getModuleKey(s.activeModule);
      const nextMessages = [...s.messages, msg];
      const nextMessagesByModule = {
        ...s.messagesByModule,
        [moduleKey]: nextMessages,
      };
      persistJson(MESSAGES_KEY, nextMessagesByModule);
      return {
        messages: nextMessages,
        messagesByModule: nextMessagesByModule,
      };
    }),
  updateLastMessage: (updates) =>
    set((s) => {
      if (!s.messages.length) {
        return { messages: s.messages };
      }
      const msgs = [...s.messages];
      msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...updates };
      const moduleKey = getModuleKey(s.activeModule);
      const nextMessagesByModule = {
        ...s.messagesByModule,
        [moduleKey]: msgs,
      };
      persistJson(MESSAGES_KEY, nextMessagesByModule);
      return { messages: msgs, messagesByModule: nextMessagesByModule };
    }),
  setLoading: (v) => set({ isLoading: v }),
  setModule: (m) =>
    set((s) => {
      const moduleKey = getModuleKey(m);
      const existingMessages = s.messagesByModule[moduleKey] || [];
      const existingSession =
        s.sessionIdsByModule[moduleKey] || crypto.randomUUID();
      const nextSessionIds = {
        ...s.sessionIdsByModule,
        [moduleKey]: existingSession,
      };
      persistJson(SESSIONS_KEY, nextSessionIds);
      return {
        activeModule: m,
        messages: existingMessages,
        sessionId: existingSession,
        sessionIdsByModule: nextSessionIds,
      };
    }),
  setModules: (m) => set({ modules: Array.isArray(m) ? m : [] }),
  setLanguage: (l) => set({ language: l }),
  setStudentProfile: (p) => {
    localStorage.setItem("campusai_name", p.name || "");
    localStorage.setItem("campusai_dept", p.department || "");
    localStorage.setItem("campusai_year", p.year || "");
    localStorage.setItem("campusai_roll", p.rollNumber || "");
    set({ studentProfile: p });
  },
  toggleAdmin: () => set((s) => ({ showAdmin: !s.showAdmin })),
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.isDarkMode;
      localStorage.setItem("campusai_dark", String(next));
      return { isDarkMode: next };
    }),
  clearChat: () =>
    set((s) => {
      const moduleKey = getModuleKey(s.activeModule);
      const nextMessagesByModule = {
        ...s.messagesByModule,
        [moduleKey]: [],
      };
      const nextSessionIds = {
        ...s.sessionIdsByModule,
        [moduleKey]: crypto.randomUUID(),
      };
      persistJson(MESSAGES_KEY, nextMessagesByModule);
      persistJson(SESSIONS_KEY, nextSessionIds);
      return {
        messages: [],
        messagesByModule: nextMessagesByModule,
        sessionIdsByModule: nextSessionIds,
        sessionId: nextSessionIds[moduleKey],
      };
    }),
  addBookmark: (msg) =>
    set((s) => {
      const exists = s.bookmarks.some((b) => b.id === msg.id);
      if (exists) {
        return { bookmarks: s.bookmarks };
      }
      const bm = [...s.bookmarks, msg];
      localStorage.setItem("campusai_bookmarks", JSON.stringify(bm));
      return { bookmarks: bm };
    }),
  removeBookmark: (id) =>
    set((s) => {
      const bm = s.bookmarks.filter((b) => b.id !== id);
      localStorage.setItem("campusai_bookmarks", JSON.stringify(bm));
      return { bookmarks: bm };
    }),
  initSession: () => {
    const s = get();
    const moduleKey = getModuleKey(s.activeModule);
    const existingSession =
      s.sessionIdsByModule[moduleKey] || crypto.randomUUID();
    const nextSessionIds = {
      ...s.sessionIdsByModule,
      [moduleKey]: existingSession,
    };
    persistJson(SESSIONS_KEY, nextSessionIds);

    const existingMessages = s.messagesByModule[moduleKey] || [];
    set({
      sessionId: existingSession,
      sessionIdsByModule: nextSessionIds,
      messages: existingMessages,
    });
  },

  setShowProfileSetup: (show) => set({ showProfileSetup: show }),
  openBookmarks: () => set({ showBookmarks: true }),
  closeBookmarks: () => set({ showBookmarks: false }),
  toggleBookmarks: () => set((s) => ({ showBookmarks: !s.showBookmarks })),
}));

export default useChatStore;
