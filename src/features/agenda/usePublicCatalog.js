import { useEffect, useState } from "react";
import { api } from "./api";
export default function usePublicCatalog() {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(""); setCatalog(null);
    api("/catalog", { signal: controller.signal }).then(setCatalog).catch(e => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => controller.abort();
  }, [attempt]);
  return { catalog, error, retry: () => setAttempt(n => n + 1) };
}
