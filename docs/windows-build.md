# Windows 打包交付指南（安装包 + 注册机）

目标产物：
- 桌面安装包（NSIS）：`AuroraWorkbench-Setup.exe`
- 注册机（许可证生成器）：`AuroraLicenseGen.exe`

---

## 0) 前置

1) 安装 Node.js 20+（LTS）
2) 启用 pnpm（仓库根目录执行）：
```powershell
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm -v
```

3) 安装依赖：
```powershell
pnpm install
```

---

## 1) 生成许可证密钥对（只做一次）

在仓库根目录执行：
```powershell
pnpm --filter license-gen dev -- keygen --out apps\license-gen\assets\keys
```

这会生成：
- `apps/license-gen/assets/keys/private.key`（私钥，**不要提交**，只在你发证时使用）
- `apps/license-gen/assets/keys/public.key`（公钥）

然后把公钥同步到桌面端兜底位置（可选，但推荐）：
```powershell
copy apps\license-gen\assets\keys\public.key apps\desktop\assets\public.key
```

---

## 2) 打包“注册机”（许可证生成器 exe）

```powershell
pnpm --filter license-gen build:exe
```

输出（默认）：
- `apps/license-gen/dist/AuroraLicenseGen.exe`

---

## 3) 打包桌面安装包（NSIS）

```powershell
pnpm --filter desktop build:win
```

该命令会自动执行：
- `pnpm --filter api build`
- `pnpm --filter web build`
- `pnpm --filter desktop build`
- `electron-builder --win nsis`

输出（electron-builder 默认 dist 目录）：
- `apps/desktop/dist/*Setup*.exe`（安装包）

---

## 4) 发放许可证（给最终用户）

1) 用户打开桌面端或 web，进入 `/activate` 查看 **机器码（fingerprintHash）**
2) 你在自己的电脑上运行注册机生成 license：

```powershell
apps\license-gen\dist\AuroraLicenseGen.exe --machine <用户机器码> --expires 2027-12-31 --out license.json
```

（可选）指定 features：
```powershell
apps\license-gen\dist\AuroraLicenseGen.exe --machine <用户机器码> --expires 2027-12-31 --features "{\"copywriting\":true,\"storyboard\":true}" --out license.json
```

3) 把 `license.json` 发给用户，用户在 `/activate` 页面粘贴导入即可。

