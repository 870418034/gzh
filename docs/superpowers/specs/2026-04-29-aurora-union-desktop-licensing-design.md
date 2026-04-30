# Aurora Union Workbench 桌面版（Electron + SQLite + 离线许可证）设计稿

**日期**：2026-04-29  
**目标**：将现有 Web MVP 改造成 Windows 桌面安装版（NSIS，带卸载/桌面快捷方式），实现开箱即用（内置 SQLite、内置后端），并增加离线授权（你称“注册机”）：**离线许可证文件 + 机器绑定 + 到期时间 + 签名校验**。

> 说明：离线授权无法做到“绝对防破解”，但可以做到**难度足够高**（签名校验 + 机器绑定 + 反篡改/混淆/调试检测），使破解成本显著上升。

---

## 1. 交付物

### 1.1 最终交付
1) **桌面安装包（NSIS）**：`AuroraWorkbench-Setup.exe`
   - 安装/卸载
   - 桌面快捷方式
   - 首次启动引导导入许可证

2) **许可证生成器（你称注册机）**
   - 目标输出：`AuroraLicenseGen.exe`（Windows 可执行文件）
   - 能输入：到期时间、机器码/机器指纹、产品版本/权限项
   - 输出：`license.json`（含签名）

3) 文档
   - Windows 安装与使用说明
   - 许可证发放流程说明（你如何给客户生成 license）

---

## 2. 总体架构

### 2.1 Electron 桌面架构（推荐）
- **主进程（Main）**
  - 启动内置后端（NestJS）在 `127.0.0.1` 随机端口
  - 设置环境变量（SQLite 路径、加密主密钥、运行模式）
  - 创建 BrowserWindow 加载前端页面
  - 管理退出时的后端关闭

- **渲染进程（Renderer）**
  - 现有 Next.js Web UI（尽量少改动）
  - `NEXT_PUBLIC_API_BASE_URL` 指向主进程启动的本地 API 端口

- **数据库**
  - SQLite 文件：放在 `app.getPath('userData')/workbench.db`
  - 不再依赖 Postgres/Docker

### 2.2 为什么不用“内置 Postgres”
可行但不推荐：体积更大、启动慢、端口/权限/杀软误报/残留进程风险显著上升。SQLite 更适合“桌面单机工作台”。

---

## 3. 数据库从 Postgres → SQLite 的改造

### 3.1 Prisma datasource 调整
- `schema.prisma` 的 datasource 改为：
  - `provider = "sqlite"`
  - `url = env("DATABASE_URL")`

### 3.2 数据文件路径
- Electron 主进程生成并注入：
  - `DATABASE_URL=file:<userData>/workbench.db`

### 3.3 迁移策略
桌面版优先使用 **Prisma migrate deploy**（更可控）或首次启动 `db push`（更简单但可控性差）。  
推荐：
1) 开发期用 `prisma migrate dev`
2) 打包时带上 `migrations/`
3) 运行期首次启动执行 `prisma migrate deploy`

---

## 4. 离线授权（License）设计

### 4.1 许可证文件格式（license.json）
```json
{
  "version": 1,
  "product": "aurora-union-workbench",
  "licenseId": "uuid-or-cuid",
  "issuedAt": "2026-04-29T00:00:00.000Z",
  "expiresAt": "2027-04-29T00:00:00.000Z",
  "machine": {
    "fingerprintHash": "sha256-hex",
    "hint": "optional-short-hint"
  },
  "features": {
    "copywriting": true,
    "storyboard": true,
    "digitalHuman": true,
    "industryPopular": true
  },
  "signature": "base64(ed25519_sign(canonical_json_without_signature))"
}
```

### 4.2 签名方案
- **Ed25519**（推荐，现代且简单）
- 私钥只存在于 **许可证生成器** 中；桌面端只内置公钥
- 校验流程：
  1) 读取 license.json
  2) 移除 `signature` 字段，做 canonical JSON 序列化
  3) 用公钥验签
  4) 校验 `expiresAt`
  5) 计算本机 fingerprintHash 并对比

### 4.3 机器指纹（Windows）
目标：足够稳定且不易伪造，同时避免泄露隐私。

策略：
- 采集多个来源（尽量用系统级稳定标识），例如：
  - MachineGuid（注册表）
  - 主硬盘序列号/或主板信息（视可获得性与权限）
  - CPU 信息（作为辅助）
- 将采集信息拼接后做 `SHA-256` 得到 `fingerprintHash`
- license 里只保存 hash（不保存原始硬件信息）

### 4.4 启动门禁（Activation）
- App 启动时：
  - 如果本地没有 license 或校验失败：进入 **激活页面**
  - 激活页面显示：
    - 机器码（fingerprintHash 的短显示形式）
    - “导入 license.json”按钮
    - 校验结果提示（不过度暴露细节，避免给攻击者提示）
  - 校验通过后：保存 license 到 `userData/license.json` 并进入主界面

### 4.5 反破解“提高成本”的工程措施（不做绝对承诺）
- 构建：生产环境打包后启用混淆/压缩（JS obfuscation，按需）
- 运行时：
  - 基础调试检测（devtools 打开提示/限制关键功能）
  - 关键校验路径做多处校验（前后端双校验：Electron 主进程 + API 层）
- 注意：不实现任何“恶意行为”，只做授权校验与合理保护

---

## 5. “注册机”实现形态（许可证生成器）

### 5.1 功能
- 输入：
  - 到期时间（日期选择）
  - 机器码（fingerprintHash）
  - 功能开关（features）
- 输出：
  - `license.json` 文件（含签名）

### 5.2 技术选型（推荐）
两种都可行：
1) **Node CLI + pkg 打包成 exe**
   - 优点：体积小、实现快
   - 缺点：UI 简单（命令行）
2) **小型 Electron 工具（带 UI）**
   - 优点：有表单 UI，非技术人员也能用
   - 缺点：体积更大

MVP 推荐：**Node CLI + pkg**，后续可升级为带 UI 的 Electron 版本。

---

## 6. 桌面打包与安装（NSIS）

### 6.1 electron-builder
- target：`nsis`
- 配置桌面快捷方式与卸载
- 输出：`AuroraWorkbench-Setup.exe`

### 6.2 自动更新（可选，后续）
MVP 不做自动更新；后续可加 `electron-updater`。

---

## 7. 需要改动的现有模块

### 7.1 Web 与 API 通讯方式
现有 Web 通过 `NEXT_PUBLIC_API_BASE_URL` 指向 `http://localhost:4000`。  
桌面版改为：
- Electron 启动 API 随机端口 `http://127.0.0.1:<port>`
- 将端口注入给前端（环境变量或 preload bridge）

### 7.2 数据库与用户体系
- 继续保留 MVP `x-user-id` 简化模式（桌面单用户可固定 `demo-user`）
- 后续如果需要多账号：再做真正的登录体系

---

## 8. 验收标准（Definition of Done）

1) Windows 安装包安装完成后，双击桌面图标打开应用  
2) 首次打开要求导入 license.json（或未授权提示）  
3) 导入合法 license 后进入主界面  
4) 人设/文案/分镜/行业爆款/数字人占位任务均可创建并在任务页查看结果  
5) 关闭应用后不会残留后台进程  
6) 数据保存在本机 SQLite 文件中，重启后数据仍在  
7) 许可证到期或机器不匹配时，会阻止进入主界面（并提示更新 license）

