"use client";
import { useCallback, useEffect, useState } from "react";
import type { CatalogItem, CatalogKind, Page } from "./types";
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch("/api/" + path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const data = await response.json();
  if (!response.ok) {
    if (
      response.status === 401 &&
      !["auth/login", "auth/forgot-password", "auth/reset-password"].includes(
        path,
      )
    )
      window.dispatchEvent(new Event("autocare:session-expired"));
    throw Error(
      Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message || "Không thể thực hiện yêu cầu.",
    );
  }
  return data;
}
export function useData<T>(path: string | null) {
  const [state, setState] = useState<{
      key: string | null;
      data?: T;
      error?: string;
    }>({ key: null }),
    [version, refresh] = useState(0);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    api<T>(path, "GET", undefined, controller.signal)
      .then((data) => setState({ key: path, data }))
      .catch((e) => {
        if (!controller.signal.aborted)
          setState({ key: path, error: e.message });
      });
    return () => controller.abort();
  }, [path, version]);
  const reload = useCallback(() => {
    setState({ key: null });
    refresh((v) => v + 1);
  }, []);
  return {
    data: state.key === path ? state.data : undefined,
    error: state.key === path ? state.error : undefined,
    loading: !!path && state.key !== path,
    reload,
  };
}
export async function allCatalog(kind: CatalogKind) {
  const items: CatalogItem[] = [];
  let page = 1;
  while (true) {
    const result = await api<Page<CatalogItem>>(
      `admin/catalog/${kind}?page=${page}&page_size=100`,
    );
    items.push(...result.items);
    if (!result.items.length || items.length >= result.total) return items;
    page++;
  }
}
export function query(
  values: Record<string, string | number | boolean | null | undefined>,
) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(values))
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  return q.toString();
}
export const number = (value: number) => value.toLocaleString("vi-VN");
export const money = (value: number) => number(value) + " ₫";
export const day = (value: string) =>
  value?.slice(0, 10).split("-").reverse().join("/") || "—";
export const timestamp = (value: string) =>
  new Date(value).toLocaleString("vi-VN", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
