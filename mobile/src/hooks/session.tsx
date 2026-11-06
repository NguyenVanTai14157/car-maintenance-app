import React, { createContext, useContext, useEffect, useState } from "react";
import { api, onExpired, restoreToken, saveToken } from "../services/api";
import { startRealtime, subscribeChanges } from "../services/realtime";
import { clearReminders, syncPersonalReminders } from "../services/reminders";
const Context = createContext<any>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [startupError, setStartupError] = useState("");
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    const stop = startRealtime();
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      void Promise.all([api("/plans"), api("/settings")])
        .then(([plans, settings]) => {
          if (active)
            void syncPersonalReminders(plans, settings, userId).catch(() => {});
        })
        .catch(() => {});
    };
    sync();
    const unsubscribe = subscribeChanges((resources) => {
      if (resources.includes("profile") || resources.includes("*"))
        void api("/auth/me")
          .then((next) => {
            if (active) setUser(next);
          })
          .catch(() => {});
      if (
        resources.some((r) =>
          ["*", "plans", "vehicles", "records", "settings"].includes(r),
        )
      ) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(sync, 150);
      }
    });
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      unsubscribe();
      stop();
    };
  }, [userId]);
  async function restore() {
    try {
      if (await restoreToken()) setUser(await api("/auth/me"));
    } catch (e: any) {
      setStartupError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    onExpired(() => {
      setUser(null);
      void saveToken(null);
      void clearReminders().catch(() => {});
    });
    restoreToken()
      .then(async (saved) => {
        if (saved) setUser(await api("/auth/me"));
      })
      .catch((error) => setStartupError(error.message))
      .finally(() => setLoading(false));
  }, []);
  async function login(result: any) {
    await saveToken(result.accessToken);
    setUser(result.user);
  }
  async function logout() {
    await api("/auth/logout", "POST");
    // Notification availability must not prevent ending a revoked session.
    await clearReminders().catch(() => {});
    await saveToken(null);
    setUser(null);
  }
  return (
    <Context.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        logout,
        startupError,
        retry: restore,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  return useContext(Context);
}
