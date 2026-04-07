import { useEffect, useState } from "react";

const USERNAME_KEY = "campusai_username";
const SESSION_KEY = "campusai_session_id";

export default function useSession() {
  const [username, setUsernameState] = useState("Student");
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    const storedUsername = localStorage.getItem(USERNAME_KEY);
    const storedSessionId = localStorage.getItem(SESSION_KEY);

    const finalUsername =
      storedUsername && storedUsername.trim() ? storedUsername : "Student";
    const finalSessionId = storedSessionId || crypto.randomUUID();

    localStorage.setItem(USERNAME_KEY, finalUsername);
    localStorage.setItem(SESSION_KEY, finalSessionId);

    setUsernameState(finalUsername);
    setSessionId(finalSessionId);
  }, []);

  const setUsername = (name) => {
    const safeName = name && name.trim() ? name.trim() : "Student";
    localStorage.setItem(USERNAME_KEY, safeName);
    setUsernameState(safeName);
  };

  return { username, sessionId, setUsername };
}
