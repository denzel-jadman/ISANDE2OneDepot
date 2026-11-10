import { createContext, useContext, useEffect, useState } from "react";
import { inventoryApi, inventoryMode } from "./inventoryApi.js";
import { clearDemoSession } from "./api.js";

const OwnerSession = createContext(null);

export function useOwnerSession() {
  return useContext(OwnerSession);
}

export function OwnerSessionProvider({ children }) {
  const [status, setStatus] = useState(inventoryMode ? "checking" : "signed-out");

  useEffect(() => {
    if (!inventoryMode) return;
    const check = new AbortController();
    const interceptor = inventoryApi.interceptors.response.use(undefined, (error) => {
      const { url, method } = error.config ?? {};
      if (error.response?.status === 401 && !(url === "/session" && method === "post")) {
        setStatus("signed-out");
      }
      return Promise.reject(error);
    });
    inventoryApi.get("/session", { signal: check.signal })
      .then((response) => {
        if (!check.signal.aborted) setStatus(response.status === 204 ? "signed-in" : "unavailable");
      })
      .catch((error) => {
        if (!check.signal.aborted) setStatus(error.response?.status === 401 ? "signed-out" : "unavailable");
      });
    return () => {
      check.abort();
      inventoryApi.interceptors.response.eject(interceptor);
    };
  }, []);

  async function signIn(credentials) {
    try {
      const result = await inventoryApi.post("/session", credentials);
      if (result.status !== 204) throw new Error("Owner sign-in is unavailable.");
      clearDemoSession();
      setStatus("signed-in");
      return true;
    } catch (error) {
      if (error.response?.status === 401) return false;
      throw error;
    }
  }

  async function signOut() {
    await inventoryApi.delete("/session");
    setStatus("signed-out");
  }

  return <OwnerSession.Provider value={{ status, signIn, signOut }}>{children}</OwnerSession.Provider>;
}
