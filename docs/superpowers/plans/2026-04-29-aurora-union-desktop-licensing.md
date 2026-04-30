# Aurora Union Workbench Desktop + Licensing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 Web MVP 改造成 Windows 桌面安装版（Electron + NSIS）并做到开箱即用（内置 SQLite + 内置后端），新增离线许可证授权（机器绑定 + 到期 + Ed25519 签名校验）与“许可证生成器（注册机）”。

**Architecture:** Electron 主进程负责：计算机器指纹、校验许可证、启动内置 NestJS API（随机端口、本地回环）、设置 SQLite 路径；渲染进程加载前端 UI（复用现有 Next.js 页面）。API 与 UI 均受 License Gate 保护；许可证生成器使用 Node CLI（Ed25519 私钥签名）并通过 `pkg` 在 Windows 打包为 exe。

**Tech Stack:** Electron, electron-builder(NSIS), NestJS, Next.js, Prisma(SQLite), TypeScript, tweetnacl(ed25519), node-machine-id, pkg

---

## 0) 文件结构变更（锁定边界）

### 新增目录
```
apps/desktop/                 # Electron 主进程与打包配置
apps/license-gen/             # 许可证生成器（Node CLI）
packages/licensing/           # 共享：license 格式、canonicalize、验签/签名、machineId hash
```

### 关键改动目录
```
apps/api/                     # Postgres -> SQLite；增加 license gate
apps/web/                     # 增加激活页面/状态提示（轻量）
```

---

## Task 1: 新增 packages/licensing（共享许可证协议）

**Files:**
- Create: `/workspace/packages/licensing/package.json`
- Create: `/workspace/packages/licensing/src/index.ts`
- Create: `/workspace/packages/licensing/src/license.ts`
- Create: `/workspace/packages/licensing/src/canonicalJson.ts`
- Create: `/workspace/packages/licensing/src/crypto.ts`
- Create: `/workspace/packages/licensing/src/machineFingerprint.ts`
- Test: `/workspace/packages/licensing/src/license.spec.ts`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "@aurora/licensing",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "tweetnacl": "^1.0.3",
    "tweetnacl-util": "^0.15.1",
    "zod": "^3.24.0"
  }
}
```

- [ ] **Step 2: 定义 license schema（zod）**

`/workspace/packages/licensing/src/license.ts`
```ts
import { z } from "zod";

export const LicenseSchema = z.object({
  version: z.literal(1),
  product: z.literal("aurora-union-workbench"),
  licenseId: z.string().min(8),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  machine: z.object({
    fingerprintHash: z.string().min(16),
    hint: z.string().optional()
  }),
  features: z.record(z.string(), z.boolean()).default({}),
  signature: z.string().min(16)
});

export type License = z.infer<typeof LicenseSchema>;

export type LicensePayload = Omit<License, "signature">;
```

- [ ] **Step 3: Canonical JSON（稳定签名输入）**

`/workspace/packages/licensing/src/canonicalJson.ts`
```ts
export function canonicalize(obj: any): string {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonicalize).join(",")}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",")}}`;
}
```

- [ ] **Step 4: Ed25519 签名/验签**

`/workspace/packages/licensing/src/crypto.ts`
```ts
import nacl from "tweetnacl";
import { decodeBase64, encodeBase64 } from "tweetnacl-util";
import type { LicensePayload } from "./license";
import { canonicalize } from "./canonicalJson";

export function signLicensePayload(payload: LicensePayload, privateKeyBase64: string): string {
  const msg = new TextEncoder().encode(canonicalize(payload));
  const sk = decodeBase64(privateKeyBase64);
  const sig = nacl.sign.detached(msg, sk);
  return encodeBase64(sig);
}

export function verifyLicensePayload(payload: LicensePayload, signatureBase64: string, publicKeyBase64: string): boolean {
  const msg = new TextEncoder().encode(canonicalize(payload));
  const sig = decodeBase64(signatureBase64);
  const pk = decodeBase64(publicKeyBase64);
  return nacl.sign.detached.verify(msg, sig, pk);
}
```

- [ ] **Step 5: machine fingerprint（hash，不泄露原始信息）**

`/workspace/packages/licensing/src/machineFingerprint.ts`
```ts
import crypto from "crypto";

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export function fingerprintHashFromMachineId(machineId: string): string {
  return sha256Hex(`aurora|${machineId}`);
}
```

- [ ] **Step 6: 单元测试**

`/workspace/packages/licensing/src/license.spec.ts`
```ts
import nacl from "tweetnacl";
import { encodeBase64 } from "tweetnacl-util";
import { signLicensePayload, verifyLicensePayload } from "./crypto";

test("sign/verify", () => {
  const kp = nacl.sign.keyPair();
  const sk = encodeBase64(kp.secretKey);
  const pk = encodeBase64(kp.publicKey);
  const payload = {
    version: 1,
    product: "aurora-union-workbench",
    licenseId: "lic_test_12345678",
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400_000).toISOString(),
    machine: { fingerprintHash: "abc" },
    features: { copywriting: true }
  } as any;
  const sig = signLicensePayload(payload, sk);
  expect(verifyLicensePayload(payload, sig, pk)).toBe(true);
});
```

- [ ] **Step 7: Commit**
```bash
git add packages/licensing
git commit -m "chore(licensing): add offline license schema and ed25519 signing"
```

---

## Task 2: 将 apps/api 从 Postgres 切换为 SQLite（内置 DB 文件）

**Files:**
- Modify: `/workspace/apps/api/prisma/schema.prisma`
- Modify: `/workspace/.env.example`
- Modify: `/workspace/apps/api/src/prisma/prisma.service.ts`
- Modify: `/workspace/apps/api/package.json`

- [ ] **Step 1: 修改 Prisma datasource 为 sqlite**

`/workspace/apps/api/prisma/schema.prisma`：
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

- [ ] **Step 2: 更新 .env.example**

根目录 `.env.example` 中将 `DATABASE_URL` 改为示例：
```bash
DATABASE_URL="file:./workbench.db"
```

- [ ] **Step 3: Prisma client regenerate**

Run:
```bash
pnpm --filter api exec prisma generate
```

- [ ] **Step 4: API 启动时确保 db 文件目录存在**

修改 `apps/api/src/prisma/prisma.service.ts`：在构造时读取 `DATABASE_URL`，若是 file 路径且目录不存在则创建（仅创建目录，不创建 DB 表）。

- [ ] **Step 5: Commit**
```bash
git add apps/api prisma .env.example
git commit -m "feat(api): switch prisma datasource to sqlite"
```

---

## Task 3: 在 apps/api 增加 License Gate（API 层强制授权）

**Files:**
- Create: `/workspace/apps/api/src/license/license.module.ts`
- Create: `/workspace/apps/api/src/license/license.service.ts`
- Create: `/workspace/apps/api/src/license/license.controller.ts`
- Create: `/workspace/apps/api/src/license/license.guard.ts`
- Modify: `/workspace/apps/api/src/app.module.ts`
- Modify: `/workspace/apps/api/src/common/mvp-user.middleware.ts`

- [ ] **Step 1: 引入 @aurora/licensing**

在 `/workspace/apps/api/package.json` 增加：
```json
"@aurora/licensing": "workspace:*",
"node-machine-id": "^1.1.12"
```

- [ ] **Step 2: LicenseService**

职责：
1) 计算 machine fingerprintHash（使用 `node-machine-id` 获取 machineId）
2) 从 `AURORA_USER_DATA_DIR/license.json` 读取许可证（Electron 会设置该 env）
3) 验签、公钥校验、到期校验、机器绑定校验

输出：
- `getStatus()`：`{ activated: boolean, reason?: string, machineHash: string, expiresAt?: string }`

- [ ] **Step 3: LicenseController**

提供：
- `GET /license/status`：返回 status + machineHash（用于激活页面显示机器码）
- `POST /license/import`：body `{ licenseJson: object }`，写入 `license.json` 后立即校验并返回 status

- [ ] **Step 4: LicenseGuard**

对所有业务接口启用：
- 放行：`/health`、`/auth/*`（如果保留）、`/license/*`
- 其余：必须 `activated=true`

- [ ] **Step 5: AppModule wiring**

在 `AppModule` imports 增加 `LicenseModule`，并把 Guard 作为全局 guard（或在 controller 层 apply）。

- [ ] **Step 6: Commit**
```bash
git add apps/api
git commit -m "feat(api): add offline license gate with machine binding"
```

---

## Task 4: apps/web 增加“激活页面”（未授权时引导导入 license）

**Files:**
- Create: `/workspace/apps/web/src/app/activate/page.tsx`
- Modify: `/workspace/apps/web/src/app/layout.tsx`
- Modify: `/workspace/apps/web/src/lib/api.ts`

- [ ] **Step 1: 激活页**

页面行为：
- 调 `GET /license/status` 获取 `machineHash` 与是否已激活
- 未激活：显示 machineHash + 一个 textarea 粘贴 license.json 内容 + 导入按钮（POST /license/import）
- 导入成功：跳回 `/`

- [ ] **Step 2: Layout Gate（前端软门禁）**

在 layout 中启动时查询 `license/status`：
- 未激活：显示顶部提示与“去激活”按钮
- 允许用户访问 `/activate` 与设置页

> 强门禁在 API 层，前端这里只做体验优化。

- [ ] **Step 3: Commit**
```bash
git add apps/web
git commit -m "feat(web): add activation UI for offline license"
```

---

## Task 5: apps/license-gen（许可证生成器：Node CLI + pkg 打包 exe）

**Files:**
- Create: `/workspace/apps/license-gen/package.json`
- Create: `/workspace/apps/license-gen/src/index.ts`
- Create: `/workspace/apps/license-gen/README.md`
- Create: `/workspace/apps/license-gen/assets/keys/README.md`

- [ ] **Step 1: license-gen CLI**

输入参数：
- `--machine <fingerprintHash>`
- `--expires <YYYY-MM-DD>`
- `--out <path>`（默认 `license.json`）
- `--features <json>`（可选）

输出：写入 `license.json`（含 signature）

- [ ] **Step 2: 密钥管理**

第一次运行支持生成密钥对：
- `license-gen keygen --out keys/`
生成：
- `private.key`（base64 secretKey）
- `public.key`（base64 publicKey）

并在桌面端写死/内置 `public.key`（或 build-time 注入）。

- [ ] **Step 3: pkg 打包**

在 `apps/license-gen/package.json` 配置：
- `bin`
- `pkg` targets：`node20-win-x64`

并提供脚本：
```bash
pnpm --filter license-gen build:exe
```

- [ ] **Step 4: Commit**
```bash
git add apps/license-gen
git commit -m "feat(license-gen): add offline license generator and pkg build"
```

---

## Task 6: apps/desktop（Electron 桌面端 + NSIS 安装包）

**Files:**
- Create: `/workspace/apps/desktop/package.json`
- Create: `/workspace/apps/desktop/electron-builder.yml`
- Create: `/workspace/apps/desktop/src/main.ts`
- Create: `/workspace/apps/desktop/src/preload.ts`
- Create: `/workspace/apps/desktop/src/env.ts`

- [ ] **Step 1: Desktop main**

职责：
- 计算 `userDataDir`
- 设置 env：
  - `AURORA_USER_DATA_DIR=<userDataDir>`
  - `DATABASE_URL=file:<userDataDir>/workbench.db`
  - `AI_KEYS_MASTER_KEY_BASE64=<首次启动生成并写入 userDataDir/config.json>`
- 启动 NestJS API（`import` apps/api 的 `bootstrap`，或 spawn node 子进程）
- 获取实际端口后创建 BrowserWindow

加载页面策略：
- dev：加载 `http://localhost:3000`
- prod：启动内置 Next server（或加载本地 build server）；并将 `NEXT_PUBLIC_API_BASE_URL` 注入

（实现时选择“最少改动、可打包”的方式：优先让 desktop 自己启动一个静态前端 server 并 loadURL）

- [ ] **Step 2: electron-builder NSIS**

配置：
- appId、productName、icon、artifactName
- nsis：`createDesktopShortcut=true`、`oneClick=false`、`allowToChangeInstallationDirectory=true`

- [ ] **Step 3: Build scripts**

提供：
```bash
pnpm --filter desktop dev
pnpm --filter desktop build:win
```

- [ ] **Step 4: Commit**
```bash
git add apps/desktop
git commit -m "feat(desktop): add electron shell and nsis packaging config"
```

---

## Task 7: Windows 打包指南与最终交付脚本

**Files:**
- Modify: `/workspace/README.md`
- Create: `/workspace/docs/windows-build.md`

- [ ] **Step 1: 写清楚在 Windows 上如何生成安装包与注册机 exe**
包含：
- 安装 Node/pnpm
- `pnpm install`
- `pnpm --filter license-gen build:exe`
- `pnpm --filter desktop build:win`
- 输出路径（dist/）

- [ ] **Step 2: Commit**
```bash
git add README.md docs/windows-build.md
git commit -m "docs: add windows build guide for installer and license generator"
```

---

## Plan Self-Review

**Spec coverage check:**
- Electron + SQLite + 内置后端：Task 2 + Task 6
- 离线许可证（签名/机器绑定/到期）：Task 1 + Task 3 + Task 4 + Task 5
- NSIS 安装包：Task 6
- 注册机 exe：Task 5
- Windows 交付指南：Task 7

**Placeholder scan:** 所有任务均给出具体文件路径、实现要点与命令；桌面端加载策略在 Task 6 以“最少改动可打包”为原则明确。

**Type consistency:** License schema version=1、product 固定字符串；签名输入为 canonicalize(payload)；API 与生成器共同使用 `@aurora/licensing`。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-29-aurora-union-desktop-licensing.md`.  
将采用 **Subagent-Driven** 按 Task 逐个实现并在每个 Task 结束做一次快速自检（build/test）。

