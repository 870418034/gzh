import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { app } from "electron";

export type DesktopConfig = {
  AI_KEYS_MASTER_KEY_BASE64: string;
};

export function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

export function readJsonIfExists<T>(p: string): T | null {
  try {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  } catch {
    return null;
  }
}

export function writeJsonAtomic(p: string, obj: unknown) {
  ensureDir(path.dirname(p));
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  fs.renameSync(tmp, p);
}

export function getUserDataDir(): string {
  const dir = app.getPath("userData");
  ensureDir(dir);
  return dir;
}

export function loadOrCreateDesktopConfig(userDataDir: string): DesktopConfig {
  const configPath = path.join(userDataDir, "config.json");
  const existing = readJsonIfExists<Partial<DesktopConfig>>(configPath) || {};

  let b64 = (existing.AI_KEYS_MASTER_KEY_BASE64 || "").trim();
  if (!b64) {
    b64 = crypto.randomBytes(32).toString("base64");
  }

  const next: DesktopConfig = { ...existing, AI_KEYS_MASTER_KEY_BASE64: b64 } as DesktopConfig;
  writeJsonAtomic(configPath, next);
  return next;
}

export function getRepoRoot(): string {
  // dev: app.getAppPath() = <repo>/apps/desktop
  return path.resolve(app.getAppPath(), "..", "..");
}

/**
 * prod: process.resourcesPath
 * dev: repo root（用于读 apps/api/dist、apps/web/.next 等）
 */
export function getRuntimeRoot(): string {
  return app.isPackaged ? process.resourcesPath : getRepoRoot();
}

export function readLicensePublicKeyBase64(runtimeRoot: string): string {
  const candidates = [
    // 优先：license-gen 产物（与注册机一致）
    path.join(runtimeRoot, "apps", "license-gen", "assets", "keys", "public.key"),
    // 兜底：desktop 内置公钥
    path.join(runtimeRoot, "apps", "desktop", "assets", "public.key"),
    path.join(app.getAppPath(), "assets", "public.key"),
  ];

  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const v = fs.readFileSync(p, "utf8").trim();
      if (v) return v;
    } catch {
      // ignore
    }
  }
  throw new Error(
    `找不到公钥文件 public.key（尝试过：${candidates.join(", ")}）。请确认存在 apps/license-gen/assets/keys/public.key 或 apps/desktop/assets/public.key`,
  );
}

