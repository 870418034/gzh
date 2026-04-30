import { contextBridge } from "electron";

/**
 * Next（renderer）端需要动态拿到 API Base URL（桌面端会随机端口启动 API）。
 * 这里通过 preload 注入到页面环境中，供 `apps/web/src/lib/api.ts` 读取。
 */
contextBridge.exposeInMainWorld(
  "__AURORA_API_BASE_URL",
  (process.env.AURORA_API_BASE_URL || "").trim(),
);

