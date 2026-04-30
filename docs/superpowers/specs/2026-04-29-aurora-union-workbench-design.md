# Aurora Union 同类产品（工作台）设计稿

**日期**：2026-04-29  
**目标**：实现一个本地可运行的 Web 应用原型，功能形态对齐“人设管理 / 行业爆款 / 文案创作（无中生有、爆款二创）/ 脚本分镜 / 数字人（模板选择+任务）”，并改为**多供应商 AI Key 管理（用户自带 Key）**，支持“推荐模板 + 自定义 Provider + 路由与容灾”。

---

## 1. 范围（MVP）

### 1.1 必做功能
1) **账号体系**
- 注册/登录/退出（本地运行可先做 email+password；后续可接短信/企业SSO）
- Session/JWT 鉴权

2) **多供应商 AI 连接（AI Connections）**
- 创建/编辑/禁用/删除连接
- 支持两种接入：
  - **OpenAI-Compatible**（baseUrl + apiKey + model）
  - **自定义 Provider（Custom HTTP）**：自定义鉴权方式（Bearer / X-API-Key / Query Param）+ baseUrl + model
- **推荐模板**：选择模板自动填充 baseUrl/鉴权方式/推荐模型说明
- “测试连接”按钮：执行一次轻量请求并展示结果（成功/失败原因/耗时）

3) **模型路由（Model Router）**
- 支持“全局默认”与“按功能（feature）”配置候选连接列表
- 容灾：超时/429/5xx/余额不足（若能识别）→ 重试 → 切换候选连接/模型
- 记录每次任务实际使用的 provider/model/connectionId/耗时/错误码

4) **人设管理（Character）**
- 创建人设：至少支持字段
  - 所属行业、核心身份、主营产品、客户地区（演示对齐字段）
- 人设列表/详情/编辑/删除
- 人设可作为生成任务的强依赖（copywriting/storyboard 任务关联 personaId）

5) **文案创作（Copywriting）**
- **无中生有（create-from-nothing）**：三步向导
  1. 选择类别/选题模板（如：提问式、九宫格等）
  2. 生成钩子/大纲（多候选）
  3. 生成成品文案（标题+口播脚本+要点）
- **爆款二创（viral-second-creation）**
  - 输入：链接（可选）+ 原文案/字幕（必填兜底）
  - 输出：二创文案多版本 + 结构化亮点拆解
  - 支持“一键迁移到我的IP资产库”（保存为可复用资产）

6) **脚本分镜（Storyboard）**
- 输入：文案脚本 + 模板类型
- 输出：分镜表（镜头号/画面/台词/时长/字幕）
- MVP 只需实现 1-2 个模板与基本可编辑/复制导出（JSON/CSV）

7) **数字人（Digital Human）**
- **模板选择页面**：展示“视频风格模板”（如新闻体等）
- **任务提交与记录**：
  - 输入：脚本/选模板/可选上传背景
  - 输出：生成任务记录（pending/running/succeeded/failed）
- MVP 可只做“占位任务”（不接真实合成服务），或接一个第三方合成 API（后续迭代）

### 1.2 非目标（MVP 不做）
- 不做“算力点数/每日免费次数”计费体系
- 不承诺“与对方输出逐字逐句一致”
- 不做复杂的数据抓取/反爬（行业爆款先做手工导入/简单列表占位）
- 数字人不做自研训练（最多对接第三方）

---

## 2. 关键页面信息架构（IA）

1) `/` 首页：粘贴视频链接入口（可直接跳转到“爆款二创”并带入链接）
2) `/character` 人设管理：列表 + 创建/编辑表单
3) `/industry-popular` 行业爆款：列表 + 筛选（MVP 可为静态/导入数据）
4) `/copywriting/create-from-nothing` 无中生有三步向导
5) `/copywriting/viral-second-creation` 爆款二创（原文案输入 + 生成区 + 保存到资产库）
6) `/storyboard` 脚本分镜生成 + 分镜表
7) `/digital-human` 数字人：模板选择 + 创建任务 + 任务记录
8) `/settings/ai-connections` AI 连接管理（推荐模板 + 自定义）
9) `/settings/router` 路由设置（全局默认 + 按功能配置候选列表）

---

## 3. 技术架构

### 3.1 Tech Stack
- 前端：Next.js（App Router）+ TypeScript + Tailwind（或等价 UI 方案）
- 后端：NestJS + TypeScript
- DB：PostgreSQL
- 队列：BullMQ（Redis）用于异步生成任务（MVP 可先用内存队列，建议直接上 Redis）
- ORM：Prisma（推荐）或 TypeORM

### 3.2 模块划分（后端）
1) Auth 模块：用户、会话、密码哈希
2) AI Connections 模块：连接 CRUD、加密存储、连通性测试
3) Model Router 模块：按规则选路由、容灾、统一调用接口
4) Generation 模块：copywriting/storyboard/digital-human 任务创建、执行、记录
5) Persona 模块：人设 CRUD

---

## 4. 数据模型（草案）

### 4.1 Users
- `users(id, email, password_hash, created_at, updated_at)`

### 4.2 AI Connections（用户自带 Key）
- `ai_connections(id, user_id, name, type, base_url, auth_encrypted, default_model, model_allowlist_json, status, limits_json, last_tested_at, last_error, created_at)`
  - `type`: `openai_compatible | custom_http`
  - `auth_encrypted`：整段加密（包含 apiKey / headerName / queryName 等）

### 4.3 Router Profile
- `router_profiles(id, user_id, name, is_default, routing_rules_json, created_at)`

### 4.4 Personas
- `personas(id, user_id, name, industry, identity, product, region, extra_json, created_at, updated_at)`

### 4.5 Assets（爆款素材/迁移到IP）
- `assets(id, user_id, type, source_url, raw_text, meta_json, created_at)`
  - `type`: `viral_source | rewritten_copy | storyboard | ...`

### 4.6 Tasks（统一任务表）
- `tasks(id, user_id, type, status, input_json, output_json, provider, model, ai_connection_id, error_code, error_message, latency_ms, created_at, updated_at)`
  - `type`: `copywriting_from_nothing | copywriting_viral_rewrite | storyboard_generate | digital_human_job`
  - `status`: `pending | running | succeeded | failed | canceled`

---

## 5. API 设计（草案）

### 5.1 Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`

### 5.2 AI Connections
- `GET /api/ai-connections`
- `POST /api/ai-connections`
- `PATCH /api/ai-connections/:id`
- `DELETE /api/ai-connections/:id`
- `POST /api/ai-connections/:id/test`

### 5.3 Router
- `GET /api/router/profile`
- `PUT /api/router/profile`（保存 routing_rules_json）

### 5.4 Personas
- `GET /api/personas`
- `POST /api/personas`
- `GET /api/personas/:id`
- `PATCH /api/personas/:id`
- `DELETE /api/personas/:id`

### 5.5 Copywriting
- `POST /api/copywriting/create-from-nothing`（创建任务，返回 taskId）
- `POST /api/copywriting/viral-second-creation`（创建任务，返回 taskId）
- `POST /api/copywriting/save-to-assets`（保存产物到 assets）

### 5.6 Storyboard
- `POST /api/storyboard/generate`（创建任务）

### 5.7 Digital Human
- `GET /api/digital-human/templates`
- `POST /api/digital-human/jobs`（创建任务）
- `GET /api/digital-human/jobs`

### 5.8 Tasks
- `GET /api/tasks?type=&status=`
- `GET /api/tasks/:id`
- `POST /api/tasks/:id/cancel`

---

## 6. 安全与合规（MVP 最低要求）
- AI Key 不回显，仅展示掩码（如 `sk-****abcd`）
- 服务端解密使用；日志禁止打印明文 key
- 基础的请求限流/并发保护（避免用户 key 被打爆）
- 任务输入输出落库（用于排查），但提供“脱敏/清理”能力（后续迭代）

---

## 7. 测试策略（MVP）
- 单元测试：
  - Model Router：路由选择、fallback、错误分类
  - AI Connections：加密/解密、test 逻辑
- 集成测试：
  - 创建连接→测试→设置为默认→发起文案任务→任务成功落库

---

## 8. 里程碑（本地可运行）
1) Week 1：项目骨架 + Auth + DB + AI Connections（CRUD+测试）+ Router Profile
2) Week 2：Personas + Copywriting（无中生有/二创）任务流（队列/执行/记录）
3) Week 3：Storyboard + Assets + 基础 UI 打磨
4) Week 4：Digital Human（模板+任务记录，占位或对接）+ 故障容灾与观测

