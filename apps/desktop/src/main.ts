import { app, BrowserWindow } from "electron";
import path from "node:path";
import fs from "node:fs";
import net from "node:net";
import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import {
  getRuntimeRoot,
  getUserDataDir,
  loadOrCreateDesktopConfig,
  readLicensePublicKeyBase64,
} from "./env";

type Proc = ChildProcessByStdio<null, Readable, Readable>;
let apiProc: Proc | null = null;
let webProc: Proc | null = null;

function isDev() {
  return !app.isPackaged || process.env.NODE_ENV === "development";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForFile(filePath: string, timeoutMs: number) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (fs.existsSync(filePath)) return;
    await sleep(100);
  }
  throw new Error(`等待文件超时：${filePath}`);
}

async function getFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (typeof addr === "object" && addr && "port" in addr) {
        const port = Number(addr.port);
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error("无法获取随机端口")));
      }
    });
  });
}

function attachLogs(prefix: string, p: Proc) {
  p.stdout.on("data", (buf) => process.stdout.write(`[${prefix}] ${String(buf)}`));
  p.stderr.on("data", (buf) => process.stderr.write(`[${prefix}] ${String(buf)}`));
}

function killChild(p: Proc | null) {
  if (!p || p.killed) return;
  try {
    p.kill("SIGTERM");
  } catch {
    // ignore
  }
}

async function startApi(runtimeRoot: string, userDataDir: string) {
  const apiMain = path.join(runtimeRoot, "apps", "api", "dist", "main.js");
  if (!fs.existsSync(apiMain)) {
    throw new Error(
      [
        "找不到 API dist，请先 build：",
        "  pnpm --filter api build",
        `缺失文件：${apiMain}`,
      ].join("\n"),
    );
  }

  const portFile = path.join(userDataDir, "api-port.txt");
  const pidFile = path.join(userDataDir, "api-pid.txt");
  try {
    fs.rmSync(portFile, { force: true });
    fs.rmSync(pidFile, { force: true });
  } catch {
    // ignore
  }

  // 用 Electron 自带的 Node runtime 启动（等价于 `node ...`，但无需用户机器上额外安装 node）
  const proc = spawn(process.execPath, [apiMain], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOST: "127.0.0.1",
      PORT: "0", // 关键：请求随机端口
      AURORA_API_PORT_FILE: portFile,
      AURORA_API_PID_FILE: pidFile,
    },
  });
  apiProc = proc;
  attachLogs("api", proc);

  await waitForFile(portFile, 15_000);
  const actualPort = Number(fs.readFileSync(portFile, "utf8").trim());
  if (!Number.isFinite(actualPort) || actualPort <= 0) {
    throw new Error(`API 端口解析失败：${portFile}`);
  }
  const apiBaseUrl = `http://127.0.0.1:${actualPort}`;

  return { apiPort: actualPort, apiBaseUrl };
}

async function startWebProd(runtimeRoot: string, apiBaseUrl: string) {
  const webDir = path.join(runtimeRoot, "apps", "web");
  const nextDir = path.join(webDir, ".next");
  if (!fs.existsSync(nextDir)) {
    throw new Error(
      [
        "找不到 Web 的 .next（生产启动需要），请先 build：",
        "  pnpm --filter web build",
        `缺失目录：${nextDir}`,
      ].join("\n"),
    );
  }

  const nextBin = path.join(runtimeRoot, "node_modules", "next", "dist", "bin", "next");
  if (!fs.existsSync(nextBin)) {
    throw new Error(
      [
        "找不到 next 可执行脚本（node_modules/next/...）。",
        "desktop 的 electron-builder.yml 已把工作区 node_modules 打包为 extraResources；如果你在 dev 环境运行，请先在仓库根目录执行 pnpm install。",
        `缺失文件：${nextBin}`,
      ].join("\n"),
    );
  }

  const webPort = await getFreePort();

  const proc = spawn(process.execPath, [nextBin, "start", "-p", String(webPort), "-H", "127.0.0.1"], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    cwd: webDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      // 注入给 Next server（以及可能的 server components）使用
      NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
      // 兼容某些依赖用 NODE_PATH 作为兜底 module search path
      NODE_PATH: path.join(runtimeRoot, "node_modules"),
    },
  });
  webProc = proc;
  attachLogs("web", proc);

  const webBaseUrl = `http://127.0.0.1:${webPort}`;

  // 简单探活：最多等 20s
  const started = Date.now();
  while (Date.now() - started < 20_000) {
    try {
      const res = await fetch(`${webBaseUrl}/`);
      if (res.ok) break;
    } catch {
      // ignore
    }
    await sleep(200);
  }

  return { webPort, webBaseUrl };
}

async function decideInitialPath(apiBaseUrl: string): Promise<string> {
  try {
    const res = await fetch(`${apiBaseUrl}/license/status`, { headers: { "content-type": "application/json" } });
    if (!res.ok) return "/activate";
    const data = (await res.json()) as { active?: boolean };
    return data?.active ? "/" : "/activate";
  } catch {
    return "/activate";
  }
}

async function createMainWindow(webBaseUrl: string, initialPath: string) {
  const preloadPath = path.join(app.getAppPath(), "dist", "preload.js");
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const url = `${webBaseUrl}${initialPath.startsWith("/") ? initialPath : `/${initialPath}`}`;
  await win.loadURL(url);
  if (isDev()) {
    win.webContents.openDevTools({ mode: "detach" });
  }
}

async function bootstrap() {
  const runtimeRoot = getRuntimeRoot();
  const userDataDir = getUserDataDir();

  // 1) 持久化 AI_KEYS_MASTER_KEY_BASE64（首次启动生成）
  const cfg = loadOrCreateDesktopConfig(userDataDir);

  // 2) 设置后端必需 env
  process.env.AURORA_USER_DATA_DIR = userDataDir;
  process.env.DATABASE_URL = `file:${path.join(userDataDir, "workbench.db")}`;
  process.env.AI_KEYS_MASTER_KEY_BASE64 = cfg.AI_KEYS_MASTER_KEY_BASE64;
  process.env.AURORA_LICENSE_PUBLIC_KEY_BASE64 = readLicensePublicKeyBase64(runtimeRoot);

  // 3) 启动内置 API（随机端口）
  const { apiBaseUrl } = await startApi(runtimeRoot, userDataDir);
  process.env.AURORA_API_BASE_URL = apiBaseUrl;

  // 4) 启动/选择 Web
  let webBaseUrl: string;
  if (isDev()) {
    // dev：由开发者自己在外部跑 `pnpm --filter web dev`
    webBaseUrl = "http://localhost:3000";
  } else {
    const prod = await startWebProd(runtimeRoot, apiBaseUrl);
    webBaseUrl = prod.webBaseUrl;
  }

  // 5) 根据 /license/status 决定首屏
  const initialPath = await decideInitialPath(apiBaseUrl);
  await createMainWindow(webBaseUrl, initialPath);
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  killChild(webProc);
  killChild(apiProc);
});

app
  .whenReady()
  .then(bootstrap)
  .catch((e) => {
    console.error(String(e?.stack || e));
    app.quit();
  });

