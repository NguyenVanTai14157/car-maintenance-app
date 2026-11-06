import { useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { io, Socket } from "socket.io-client";
import { API_URL, expireSession, getToken } from "./api";
type Listener = (resources: string[]) => void;
const listeners = new Set<Listener>();
const statusListeners = new Set<() => void>();
let socket: Socket | undefined;
let connected = false;
function status(value: boolean) {
  connected = value;
  statusListeners.forEach((fn) => fn());
}
function refresh(resources: string[]) {
  listeners.forEach((fn) => fn(resources));
}
export function subscribeChanges(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function isRealtimeConnected() {
  return connected;
}
export function useRealtimeConnected() {
  return useSyncExternalStore(
    (fn) => {
      statusListeners.add(fn);
      return () => {
        statusListeners.delete(fn);
      };
    },
    () => connected,
    () => false,
  );
}
export function startRealtime() {
  const token = getToken();
  if (!token) return () => {};
  socket?.disconnect();
  const current = io(API_URL + "/realtime", {
    auth: { token },
    transports: ["websocket", "polling"],
    tryAllTransports: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
  socket = current;
  current.on("connect", () => {
    status(true);
    refresh(["*"]);
  });
  current.on("disconnect", () => status(false));
  current.on("data:changed", (event: { resources?: unknown }) => {
    if (Array.isArray(event?.resources))
      refresh(
        event.resources.filter((r): r is string => typeof r === "string"),
      );
  });
  current.on("session:expired", () => expireSession());
  current.on("connect_error", (error) => {
    status(false);
    if (error.message === "SESSION_EXPIRED") expireSession();
  });
  const appState = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      if (!current.connected) current.connect();
      refresh(["*"]);
    }
  });
  return () => {
    appState.remove();
    current.removeAllListeners();
    current.disconnect();
    if (socket === current) {
      socket = undefined;
      status(false);
    }
  };
}
