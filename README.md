# Aurora Union Workbench（MVP）

这是一个“AI 编导工作台”原型：人设管理、行业爆款素材库、文案创作（无中生有/爆款二创）、分镜、数字人（模板+任务记录占位）、多供应商 AI Key 管理（用户自带 Key）与路由容灾。

当前版本支持两种运行形态：
1) **Web 开发模式**：`apps/api` + `apps/web`（本机运行）
2) **Windows 桌面端**：`apps/desktop`（Electron + SQLite + 内置后端 + NSIS 安装包）

> 本项目已从 Postgres 切换为 **SQLite 文件数据库**，默认不需要 Docker、也不需要安装数据库服务。

---

## 1) 前置依赖（Windows）

### 1.1 安装 Node.js（推荐 LTS）
- 下载并安装 Node.js LTS（建议 20+）
- 验证：
```powershell
node -v
npm -v
```

### 1.2 安装 pnpm
```powershell
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm -v
```

---

## 2) 配置后端环境变量（SQLite + 离线许可证）

在 `apps/api` 目录复制环境变量文件：

```powershell
copy ..\..\.env.example .env
```

编辑 `apps/api/.env`，至少设置（SQLite 默认落在 `apps/api/data/dev.db`）：

```env
API_PORT=4000
DATABASE_URL=file:./data/dev.db
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

# 32 bytes base64（用于加密保存你的 AI Key）
AI_KEYS_MASTER_KEY_BASE64=<下面 2.3 生成的值>

# 离线许可证校验（Ed25519 公钥 base64）
# 桌面端会自动注入；Web 模式下需你自行配置
AURORA_LICENSE_PUBLIC_KEY_BASE64=<从 public.key 读取的 base64>
```

### 2.1 生成 AI_KEYS_MASTER_KEY_BASE64
用 PowerShell 生成 32 字节随机数并转 base64：

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

把输出填进 `apps/api/.env` 的 `AI_KEYS_MASTER_KEY_BASE64`。

### 2.2 安装依赖
在项目根目录：
```powershell
pnpm install
```

### 2.3 建表（Prisma，SQLite）
```powershell
pnpm --filter api exec prisma db push
```

---

## 3) 启动项目（本机）

### 3.1 启动后端 API
```powershell
pnpm --filter api start:dev
```

健康检查：
- 打开：http://localhost:4000/health  
应返回：`{"ok":true}`

### 3.2 启动前端 Web
另开一个终端：
```powershell
pnpm --filter web dev
```

打开：http://localhost:3000

### 3.3 启动桌面端 Desktop（Electron，内置 SQLite + 内置 API）
> Desktop 会自行确定 userData 目录，并使用 sqlite：`DATABASE_URL=file:<userData>/workbench.db`。  
> 首次启动会生成 `AI_KEYS_MASTER_KEY_BASE64` 并写入 `<userData>/config.json`。

开发模式（Web 仍用 Next dev server）：
```powershell
# 终端 1：启动 Web dev server
pnpm --filter web dev

# 终端 2：启动 Desktop（会自动 build 并以随机端口启动 API）
pnpm --filter desktop dev
```

打包 Windows 安装包（NSIS）：
```powershell
pnpm --filter desktop build:win
```
该命令会依次执行 `pnpm --filter api build`、`pnpm --filter web build`，并调用 `electron-builder --win nsis` 产出安装包。

---

## 4) 最小可用测试流程（手工）

0) **激活（必须）**：
- 访问：`/activate`
- 拿到机器码（fingerprintHash）后，用 `apps/license-gen` 生成 license.json 并导入

1) **Settings → AI Connections**：新增一个连接（建议先用 OpenAI-compatible 供应商/网关）
2) **Settings → Router**：把 `global.candidates[0]` 指向你新增的 connectionId 与 model
3) **Character**：创建一个人设
4) **Copywriting / Storyboard**：创建任务 → 自动跳转 `/tasks/[id]` 查看结果

> 说明：数字人当前为“模板 + 任务记录占位”，不做真实视频合成（后续可接第三方）。

---

## 5) 常见问题

### Q1: 我没有 OpenAI-compatible 的供应商怎么办？
当前 MVP 的模型调用走 `POST {baseUrl}/chat/completions`（OpenAI-compatible）。  
如果你的供应商不是兼容接口，建议使用 OpenRouter/OneAPI/自建网关把接口转成兼容再接入。

### Q2: 没有 license 导入会怎样？
API 会拒绝除 `/health` 与 `/license/*` 外的所有请求；前端会提示“未激活”，需要先去 `/activate` 导入许可证。
