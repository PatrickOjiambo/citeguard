// Centralized API client. All backend calls go through here — no direct
// DeepSeek or chain calls from the frontend.

import type {
  Metrics,
  Order,
  StoredVerdict,
  VerifyInput,
  VerifyResponse,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, "Could not reach the CiteGuard API. Is the server running?");
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : null) ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  verify: (input: VerifyInput) =>
    request<VerifyResponse>("/api/verify", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getVerdict: (id: string) => request<StoredVerdict>(`/api/verdicts/${id}`),

  getOrders: (limit = 50) =>
    request<{ orders: Order[] }>(`/api/orders?limit=${limit}`),

  getMetrics: () => request<Metrics>("/api/metrics"),
};

export { ApiError };
