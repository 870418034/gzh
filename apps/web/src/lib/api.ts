/**
 * Desktop（Electron）场景需要“随机端口”的内置 API：
 * - Electron preload 会注入 `window.__AURORA_API_BASE_URL`
 * - 其次才回退到 Next 的 `NEXT_PUBLIC_API_BASE_URL`
 */
function getRuntimeApiBaseUrl(): string | undefined {
  const g = globalThis as any;
  // preload: contextBridge.exposeInMainWorld('__AURORA_API_BASE_URL', 'http://127.0.0.1:xxxx')
  const injected = g?.__AURORA_API_BASE_URL;
  if (typeof injected === "string" && injected.trim()) return injected.trim().replace(/\/$/, "");
  return undefined;
}

export const API_BASE_URL =
  getRuntimeApiBaseUrl() ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

/**
 * MVP: 后端要求每个请求都带 `x-user-id` 头。
 * 这里提供一个默认值，方便本地快速跑通。
 */
export const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_USER_ID || "demo-user";

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  userId?: string;
  body?: unknown;
};

export async function apiRequest<T>(
  path: string,
  { userId, headers, body, ...init }: ApiRequestOptions = {},
): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const h = new Headers(headers);
  h.set("x-user-id", userId || DEFAULT_USER_ID);

  let requestBody: BodyInit | undefined = undefined;
  if (body !== undefined) {
    h.set("content-type", "application/json");
    requestBody = JSON.stringify(body);
  }

  const res = await fetch(url, {
    ...init,
    headers: h,
    body: requestBody,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  // 某些接口可能返回空 body（但当前 API 都返回 JSON）
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return (undefined as unknown) as T;
  }
  return (await res.json()) as T;
}

export function apiGet<T>(path: string, opts?: ApiRequestOptions) {
  return apiRequest<T>(path, { ...opts, method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown, opts?: ApiRequestOptions) {
  return apiRequest<T>(path, { ...opts, method: "POST", body });
}

export function apiPut<T>(path: string, body?: unknown, opts?: ApiRequestOptions) {
  return apiRequest<T>(path, { ...opts, method: "PUT", body });
}
