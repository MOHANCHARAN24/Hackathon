import axios from "axios";

const BASE =
  (import.meta.env.VITE_API_URL || "").trim() || "http://127.0.0.1:8000";

const api = axios.create({ baseURL: BASE, timeout: 30000 });

const getAdminPassword = () =>
  sessionStorage.getItem("campusai_admin_password");

const adminHeaders = () => {
  const password = getAdminPassword();
  if (!password) {
    throw new Error("Admin password not set in session");
  }
  return { "X-Admin-Password": password };
};

api.interceptors.request.use(
  (config) => config,
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      alert("Incorrect admin password");
    }
    console.error("API response error:", error);
    return Promise.reject(error);
  },
);

export const sendMessage = (chatRequest) => api.post("/chat", chatRequest);

export const submitFeedback = (req) => api.post("/feedback", req);

export const getModules = () => api.get("/modules");

export const getAdminStats = () =>
  api.get("/admin/stats", { headers: adminHeaders() });

export const getAdminDocuments = () =>
  api.get("/admin/documents", { headers: adminHeaders() });

export const uploadDocument = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/admin/upload-document", formData, {
    headers: {
      ...adminHeaders(),
      "Content-Type": "multipart/form-data",
    },
  });
};

export const deleteDocument = (filename) =>
  api.delete(`/admin/documents/${encodeURIComponent(filename)}`, {
    headers: adminHeaders(),
  });

export const reindexDocuments = () =>
  api.post("/admin/reindex", {}, { headers: adminHeaders() });

export const getUnanswered = () =>
  api.get("/admin/unanswered", { headers: adminHeaders() });

export const clearHistory = (sessionId) =>
  api.post(`/chat/clear-history/${encodeURIComponent(sessionId)}`);

export const checkHealth = () => api.get("/health");

export default api;
