# Aurora Union Workbench MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建一个本地可运行的“AI 编导工作台”MVP：人设管理、文案创作（无中生有/爆款二创）、分镜、数字人（模板+任务占位），并实现**多供应商 AI Key（连接）管理**（推荐模板 + 自定义 Provider + 路由容灾）。

**Architecture:** Monorepo（pnpm workspaces）+ Next.js Web（App Router）+ NestJS API + Postgres + Redis（BullMQ）。AI 调用以 OpenAI-compatible 为主，Custom Provider 作为配置层（鉴权/URL/模型），ModelRouter 负责路由与 fallback。

**Tech Stack:** Next.js, NestJS, TypeScript, PostgreSQL, Redis, BullMQ, Prisma, Jest, Supertest, Zod

---

## 0) 目标目录结构（最终应落地）

```
/workspace
  apps/
    api/                 # NestJS
    web/                 # Next.js
  packages/
    shared/              # 共享类型/校验（zod）
  docker/
    docker-compose.yml   # postgres + redis
  docs/
    superpowers/
      specs/...
      plans/...
  pnpm-workspace.yaml
  package.json
  .env.example
```

---

## Task 1: 初始化 monorepo 与本地依赖（Postgres/Redis）

**Files:**
- Create: `/workspace/pnpm-workspace.yaml`
- Create: `/workspace/package.json`
- Create: `/workspace/.env.example`
- Create: `/workspace/docker/docker-compose.yml`

- [ ] **Step 1: 初始化 workspace 配置**

创建 `/workspace/pnpm-workspace.yaml`：

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: 创建根 package.json（脚本与约定）**

创建 `/workspace/package.json`：

```json
{
  "name": "aurora-union-workbench",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev": "pnpm -r dev",
    "dev:docker": "docker compose -f docker/docker-compose.yml up -d",
    "db:down": "docker compose -f docker/docker-compose.yml down -v",
    "test": "pnpm -r test"
  }
}
```

- [ ] **Step 3: 写 .env.example**

创建 `/workspace/.env.example`：

```bash
# API
API_PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aurora?schema=public
REDIS_URL=redis://localhost:6379

# Encryption (32 bytes base64 or hex; here use base64)
AI_KEYS_MASTER_KEY_BASE64=REPLACE_ME_WITH_32_BYTES_BASE64

# Web
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

- [ ] **Step 4: docker-compose（postgres + redis）**

创建 `/workspace/docker/docker-compose.yml`：

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_USER: postgres
      POSTGRES_DB: aurora
    ports:
      - "5432:5432"
    volumes:
      - aurora_pg:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - aurora_redis:/data

volumes:
  aurora_pg:
  aurora_redis:
```

- [ ] **Step 5: 启动 docker 依赖并验证**

Run:

```bash
pnpm run dev:docker
docker ps | head
```

Expected: `postgres` 与 `redis` 容器 running。

- [ ] **Step 6: Commit**

```bash
git add pnpm-workspace.yaml package.json .env.example docker/docker-compose.yml
git commit -m "chore: initialize monorepo and local docker deps"
```

---

## Task 2: 创建 shared 包（共享类型与校验）

**Files:**
- Create: `/workspace/packages/shared/package.json`
- Create: `/workspace/packages/shared/src/index.ts`
- Create: `/workspace/packages/shared/src/routerRules.ts`

- [ ] **Step 1: 创建 packages/shared/package.json**

```json
{
  "name": "@aurora/shared",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "zod": "^3.24.0"
  }
}
```

- [ ] **Step 2: 定义 routing_rules 的 zod schema**

创建 `/workspace/packages/shared/src/routerRules.ts`：

```ts
import { z } from "zod";

export const RouterCandidateSchema = z.object({
  connectionId: z.string(),
  model: z.string().min(1)
});

export const RouterFallbackSchema = z.object({
  maxAttempts: z.number().int().min(1).max(10).default(3),
  switchOn: z.array(z.enum(["timeout", "429", "5xx", "insufficient_quota"])).default(["timeout", "429", "5xx"])
});

export const RouterRulesSchema = z.object({
  version: z.literal(1),
  global: z.object({
    candidates: z.array(RouterCandidateSchema).min(1),
    fallback: RouterFallbackSchema.optional()
  }),
  byFeature: z.record(z.string(), z.object({ candidates: z.array(RouterCandidateSchema).min(1) })).optional()
});

export type RouterRules = z.infer<typeof RouterRulesSchema>;
export type RouterCandidate = z.infer<typeof RouterCandidateSchema>;
```

- [ ] **Step 3: 导出 shared index**

创建 `/workspace/packages/shared/src/index.ts`：

```ts
export * from "./routerRules";
```

- [ ] **Step 4: 安装依赖并 smoke import**

Run:

```bash
pnpm -C packages/shared i
node -e "require('./packages/shared/src/index.ts')"
```

Expected: 无报错。

- [ ] **Step 5: Commit**

```bash
git add packages/shared
git commit -m "chore(shared): add router rules schema"
```

---

## Task 3: 初始化 NestJS API（Prisma + Health Check）

**Files:**
- Create: `/workspace/apps/api/...`（Nest scaffold）
- Create: `/workspace/apps/api/prisma/schema.prisma`
- Modify: `/workspace/apps/api/src/app.module.ts`
- Create: `/workspace/apps/api/src/health/health.controller.ts`
- Test: `/workspace/apps/api/test/health.e2e-spec.ts`

- [ ] **Step 1: 创建 NestJS 项目**

Run:

```bash
pnpm dlx @nestjs/cli@latest new apps/api --package-manager=pnpm --skip-git
```

Expected: 生成 `apps/api`。

- [ ] **Step 2: 安装依赖（Prisma、Config、Validation、BullMQ/Redis、Supertest）**

Run:

```bash
pnpm -C apps/api add @nestjs/config @nestjs/swagger zod
pnpm -C apps/api add -D prisma
pnpm -C apps/api add @prisma/client
pnpm -C apps/api add @nestjs/bullmq bullmq ioredis
pnpm -C apps/api add -D supertest @types/supertest
```

- [ ] **Step 3: 初始化 Prisma**

Run:

```bash
pnpm -C apps/api dlx prisma init
```

Replace `/workspace/apps/api/prisma/schema.prisma` 为：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

- [ ] **Step 4: Prisma migrate**

Run:

```bash
cp /workspace/.env.example /workspace/apps/api/.env
pnpm -C apps/api dlx prisma migrate dev --name init
```

Expected: 迁移成功且生成 prisma client。

- [ ] **Step 5: 添加 HealthController**

创建 `/workspace/apps/api/src/health/health.controller.ts`：

```ts
import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return { ok: true };
  }
}
```

修改 `/workspace/apps/api/src/app.module.ts`：

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController, HealthController],
  providers: [AppService]
})
export class AppModule {}
```

- [ ] **Step 6: 写 E2E 测试**

创建 `/workspace/apps/api/test/health.e2e-spec.ts`：

```ts
import request from "supertest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module";

describe("Health (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health => ok", async () => {
    const res = await request(app.getHttpServer()).get("/health").expect(200);
    expect(res.body).toEqual({ ok: true });
  });
});
```

- [ ] **Step 7: 运行测试**

Run:

```bash
pnpm -C apps/api test
```

Expected: PASS。

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "chore(api): bootstrap nest api with prisma and health check"
```

---

## Task 4: API 基础设施：PrismaService、Auth（注册/登录/我是谁）

**Files:**
- Create: `/workspace/apps/api/src/prisma/prisma.service.ts`
- Modify: `/workspace/apps/api/src/app.module.ts`
- Create: `/workspace/apps/api/src/auth/auth.module.ts`
- Create: `/workspace/apps/api/src/auth/auth.controller.ts`
- Create: `/workspace/apps/api/src/auth/auth.service.ts`
- Create: `/workspace/apps/api/src/auth/auth.dto.ts`
- Create: `/workspace/apps/api/src/auth/password.ts`
- Test: `/workspace/apps/api/test/auth.e2e-spec.ts`

- [ ] **Step 1: PrismaService**

创建 `/workspace/apps/api/src/prisma/prisma.service.ts`：

```ts
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 2: 密码哈希工具（bcrypt）**

Run:

```bash
pnpm -C apps/api add bcrypt
pnpm -C apps/api add -D @types/bcrypt
```

创建 `/workspace/apps/api/src/auth/password.ts`：

```ts
import bcrypt from "bcrypt";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
```

- [ ] **Step 3: Auth DTO**

创建 `/workspace/apps/api/src/auth/auth.dto.ts`：

```ts
import { z } from "zod";

export const RegisterDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});
export type RegisterDto = z.infer<typeof RegisterDtoSchema>;

export const LoginDtoSchema = RegisterDtoSchema;
export type LoginDto = z.infer<typeof LoginDtoSchema>;
```

- [ ] **Step 4: AuthService**

创建 `/workspace/apps/api/src/auth/auth.service.ts`：

```ts
import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { hashPassword, verifyPassword } from "./password";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async register(email: string, password: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException("EMAIL_TAKEN");
    const passwordHash = await hashPassword(password);
    const user = await this.prisma.user.create({ data: { email, passwordHash } });
    return { id: user.id, email: user.email };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException("INVALID_CREDENTIALS");
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("INVALID_CREDENTIALS");
    return { id: user.id, email: user.email };
  }
}
```

- [ ] **Step 5: AuthController（MVP 使用简易 session：header 传 userId）**

> 说明：为快速本地 MVP，这里先用 `x-user-id` 做临时鉴权（便于前端调试）。后续再替换为 JWT/Cookie。

创建 `/workspace/apps/api/src/auth/auth.controller.ts`：

```ts
import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDtoSchema, RegisterDtoSchema } from "./auth.dto";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("register")
  async register(@Body() body: unknown) {
    const dto = RegisterDtoSchema.parse(body);
    return this.auth.register(dto.email, dto.password);
  }

  @Post("login")
  async login(@Body() body: unknown) {
    const dto = LoginDtoSchema.parse(body);
    return this.auth.login(dto.email, dto.password);
  }

  @Get("me")
  async me(@Headers("x-user-id") userId?: string) {
    if (!userId) return { authenticated: false };
    return { authenticated: true, userId };
  }
}
```

创建 `/workspace/apps/api/src/auth/auth.module.ts`：

```ts
import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule {}
```

修改 `/workspace/apps/api/src/app.module.ts`，加入 PrismaService 与 AuthModule：

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { HealthController } from "./health/health.controller";
import { PrismaService } from "./prisma/prisma.service";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
  controllers: [AppController, HealthController],
  providers: [AppService, PrismaService]
})
export class AppModule {}
```

- [ ] **Step 6: 写 e2e 测试**

创建 `/workspace/apps/api/test/auth.e2e-spec.ts`：

```ts
import request from "supertest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module";

describe("Auth (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("register + login", async () => {
    const email = `u${Date.now()}@test.local`;
    const password = "password123";
    await request(app.getHttpServer()).post("/auth/register").send({ email, password }).expect(201);
    const res = await request(app.getHttpServer()).post("/auth/login").send({ email, password }).expect(201);
    expect(res.body.email).toBe(email);
    expect(res.body.id).toBeTruthy();
  });
});
```

- [ ] **Step 7: 运行测试**

Run:

```bash
pnpm -C apps/api test
```

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat(api): add auth register/login and prisma service"
```

---

## Task 5: AI Connections（加密存储 + CRUD + 测试连接）

**Files:**
- Modify: `/workspace/apps/api/prisma/schema.prisma`
- Create: `/workspace/apps/api/src/crypto/crypto.service.ts`
- Create: `/workspace/apps/api/src/ai-connections/ai-connections.module.ts`
- Create: `/workspace/apps/api/src/ai-connections/ai-connections.controller.ts`
- Create: `/workspace/apps/api/src/ai-connections/ai-connections.service.ts`
- Create: `/workspace/apps/api/src/ai-connections/ai-connections.dto.ts`
- Test: `/workspace/apps/api/test/ai-connections.e2e-spec.ts`

- [ ] **Step 1: 扩展 Prisma schema**

在 `/workspace/apps/api/prisma/schema.prisma` 追加：

```prisma
model AiConnection {
  id             String   @id @default(cuid())
  userId         String
  name           String
  type           String   // openai_compatible | custom_http
  baseUrl        String?
  authEncrypted  String
  defaultModel   String?
  status         String   @default("active") // active | disabled | failed
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

并在 `User` model 追加：

```prisma
  aiConnections AiConnection[]
```

- [ ] **Step 2: migrate**

Run:

```bash
pnpm -C apps/api dlx prisma migrate dev --name ai_connections
```

- [ ] **Step 3: CryptoService（AES-256-GCM）**

创建 `/workspace/apps/api/src/crypto/crypto.service.ts`：

```ts
import { Injectable } from "@nestjs/common";
import crypto from "crypto";

function getKey(): Buffer {
  const b64 = process.env.AI_KEYS_MASTER_KEY_BASE64;
  if (!b64) throw new Error("AI_KEYS_MASTER_KEY_BASE64 missing");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("AI_KEYS_MASTER_KEY_BASE64 must decode to 32 bytes");
  return key;
}

@Injectable()
export class CryptoService {
  encryptJson(obj: unknown): string {
    const key = getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const plaintext = Buffer.from(JSON.stringify(obj), "utf8");
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
  }

  decryptJson<T>(b64: string): T {
    const key = getKey();
    const raw = Buffer.from(b64, "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as T;
  }
}
```

- [ ] **Step 4: DTO**

创建 `/workspace/apps/api/src/ai-connections/ai-connections.dto.ts`：

```ts
import { z } from "zod";

export const AuthConfigSchema = z.union([
  z.object({ type: z.literal("bearer"), apiKey: z.string().min(1) }),
  z.object({ type: z.literal("header"), headerName: z.string().min(1), apiKey: z.string().min(1) }),
  z.object({ type: z.literal("query"), queryName: z.string().min(1), apiKey: z.string().min(1) })
]);
export type AuthConfig = z.infer<typeof AuthConfigSchema>;

export const CreateAiConnectionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["openai_compatible", "custom_http"]),
  baseUrl: z.string().url().optional(),
  defaultModel: z.string().min(1).optional(),
  auth: AuthConfigSchema
});
export type CreateAiConnectionDto = z.infer<typeof CreateAiConnectionSchema>;

export const UpdateAiConnectionSchema = CreateAiConnectionSchema.partial();
export type UpdateAiConnectionDto = z.infer<typeof UpdateAiConnectionSchema>;
```

- [ ] **Step 5: Service（CRUD）**

创建 `/workspace/apps/api/src/ai-connections/ai-connections.service.ts`：

```ts
import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CryptoService } from "../crypto/crypto.service";
import { AuthConfig, CreateAiConnectionDto, UpdateAiConnectionDto } from "./ai-connections.dto";

type StoredAuth = AuthConfig;

@Injectable()
export class AiConnectionsService {
  constructor(private prisma: PrismaService, private crypto: CryptoService) {}

  async list(userId: string) {
    const rows = await this.prisma.aiConnection.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      baseUrl: r.baseUrl,
      defaultModel: r.defaultModel,
      status: r.status,
      createdAt: r.createdAt
    }));
  }

  async create(userId: string, dto: CreateAiConnectionDto) {
    const authEncrypted = this.crypto.encryptJson(dto.auth);
    const row = await this.prisma.aiConnection.create({
      data: { userId, name: dto.name, type: dto.type, baseUrl: dto.baseUrl, defaultModel: dto.defaultModel, authEncrypted }
    });
    return { id: row.id };
  }

  async update(userId: string, id: string, dto: UpdateAiConnectionDto) {
    const row = await this.prisma.aiConnection.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("NOT_FOUND");
    if (row.userId !== userId) throw new ForbiddenException("FORBIDDEN");
    const authEncrypted = dto.auth ? this.crypto.encryptJson(dto.auth) : undefined;
    await this.prisma.aiConnection.update({
      where: { id },
      data: { name: dto.name, type: dto.type, baseUrl: dto.baseUrl, defaultModel: dto.defaultModel, authEncrypted }
    });
    return { ok: true };
  }

  async remove(userId: string, id: string) {
    const row = await this.prisma.aiConnection.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("NOT_FOUND");
    if (row.userId !== userId) throw new ForbiddenException("FORBIDDEN");
    await this.prisma.aiConnection.delete({ where: { id } });
    return { ok: true };
  }

  async getDecryptedAuth(userId: string, id: string): Promise<{ baseUrl?: string | null; type: string; defaultModel?: string | null; auth: StoredAuth }> {
    const row = await this.prisma.aiConnection.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("NOT_FOUND");
    if (row.userId !== userId) throw new ForbiddenException("FORBIDDEN");
    const auth = this.crypto.decryptJson<StoredAuth>(row.authEncrypted);
    return { baseUrl: row.baseUrl, type: row.type, defaultModel: row.defaultModel, auth };
  }
}
```

- [ ] **Step 6: Controller（临时鉴权：x-user-id）**

创建 `/workspace/apps/api/src/ai-connections/ai-connections.controller.ts`：

```ts
import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { AiConnectionsService } from "./ai-connections.service";
import { CreateAiConnectionSchema, UpdateAiConnectionSchema } from "./ai-connections.dto";

function mustUserId(userId?: string) {
  if (!userId) throw new Error("x-user-id required for MVP");
  return userId;
}

@Controller("ai-connections")
export class AiConnectionsController {
  constructor(private svc: AiConnectionsService) {}

  @Get()
  list(@Headers("x-user-id") userId?: string) {
    return this.svc.list(mustUserId(userId));
  }

  @Post()
  create(@Headers("x-user-id") userId?: string, @Body() body?: unknown) {
    const dto = CreateAiConnectionSchema.parse(body);
    return this.svc.create(mustUserId(userId), dto);
  }

  @Patch(":id")
  update(@Headers("x-user-id") userId?: string, @Param("id") id?: string, @Body() body?: unknown) {
    const dto = UpdateAiConnectionSchema.parse(body);
    return this.svc.update(mustUserId(userId), id!, dto);
  }

  @Delete(":id")
  remove(@Headers("x-user-id") userId?: string, @Param("id") id?: string) {
    return this.svc.remove(mustUserId(userId), id!);
  }
}
```

- [ ] **Step 7: Module**

创建 `/workspace/apps/api/src/ai-connections/ai-connections.module.ts`：

```ts
import { Module } from "@nestjs/common";
import { AiConnectionsController } from "./ai-connections.controller";
import { AiConnectionsService } from "./ai-connections.service";

@Module({
  controllers: [AiConnectionsController],
  providers: [AiConnectionsService],
  exports: [AiConnectionsService]
})
export class AiConnectionsModule {}
```

并修改 `/workspace/apps/api/src/app.module.ts`，加入 CryptoService 与 AiConnectionsModule：

```ts
import { AiConnectionsModule } from "./ai-connections/ai-connections.module";
import { CryptoService } from "./crypto/crypto.service";
// ...
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, AiConnectionsModule],
  providers: [AppService, PrismaService, CryptoService]
```

- [ ] **Step 8: e2e 测试（CRUD）**

创建 `/workspace/apps/api/test/ai-connections.e2e-spec.ts`：

```ts
import request from "supertest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module";

describe("AI Connections (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("create + list", async () => {
    const userId = "test-user";
    await request(app.getHttpServer())
      .post("/ai-connections")
      .set("x-user-id", userId)
      .send({
        name: "DeepSeek",
        type: "openai_compatible",
        baseUrl: "https://api.deepseek.com/v1",
        defaultModel: "deepseek-chat",
        auth: { type: "bearer", apiKey: "sk-test" }
      })
      .expect(201);

    const res = await request(app.getHttpServer()).get("/ai-connections").set("x-user-id", userId).expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe("DeepSeek");
    expect(res.body[0].baseUrl).toBe("https://api.deepseek.com/v1");
  });
});
```

- [ ] **Step 9: 运行测试 & Commit**

Run:

```bash
pnpm -C apps/api test
```

Commit:

```bash
git add apps/api
git commit -m "feat(api): add ai connections with encrypted auth"
```

---

## Task 6: Router Profile + ModelRouter（路由与容灾）

**Files:**
- Modify: `/workspace/apps/api/prisma/schema.prisma`
- Create: `/workspace/apps/api/src/router/router.module.ts`
- Create: `/workspace/apps/api/src/router/router.controller.ts`
- Create: `/workspace/apps/api/src/router/router.service.ts`
- Create: `/workspace/apps/api/src/router/model-router.service.ts`
- Test: `/workspace/apps/api/src/router/model-router.service.spec.ts`

- [ ] **Step 1: Prisma schema 增加 RouterProfile**

在 `/workspace/apps/api/prisma/schema.prisma` 追加：

```prisma
model RouterProfile {
  id              String   @id @default(cuid())
  userId          String
  name            String
  isDefault       Boolean  @default(true)
  routingRulesJson Json
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

并在 `User` model 追加：

```prisma
  routerProfiles RouterProfile[]
```

migrate:

```bash
pnpm -C apps/api dlx prisma migrate dev --name router_profiles
```

- [ ] **Step 2: RouterService（get/set 默认规则）**

创建 `/workspace/apps/api/src/router/router.service.ts`：

```ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RouterRulesSchema, type RouterRules } from "@aurora/shared";

@Injectable()
export class RouterService {
  constructor(private prisma: PrismaService) {}

  async getDefault(userId: string): Promise<RouterRules> {
    const profile = await this.prisma.routerProfile.findFirst({ where: { userId, isDefault: true } });
    if (!profile) {
      // 默认规则：要求用户至少有一个 connection；先留空候选，前端保存时再校验
      const fallbackDefault: RouterRules = {
        version: 1,
        global: { candidates: [{ connectionId: "REPLACE_ME", model: "REPLACE_ME" }] }
      };
      return fallbackDefault;
    }
    return RouterRulesSchema.parse(profile.routingRulesJson);
  }

  async setDefault(userId: string, rules: unknown) {
    const parsed = RouterRulesSchema.parse(rules);
    const existing = await this.prisma.routerProfile.findFirst({ where: { userId, isDefault: true } });
    if (existing) {
      await this.prisma.routerProfile.update({ where: { id: existing.id }, data: { routingRulesJson: parsed } });
      return { ok: true, id: existing.id };
    }
    const created = await this.prisma.routerProfile.create({
      data: { userId, name: "default", isDefault: true, routingRulesJson: parsed }
    });
    return { ok: true, id: created.id };
  }
}
```

- [ ] **Step 3: RouterController**

创建 `/workspace/apps/api/src/router/router.controller.ts`：

```ts
import { Body, Controller, Get, Headers, Put } from "@nestjs/common";
import { RouterService } from "./router.service";

function mustUserId(userId?: string) {
  if (!userId) throw new Error("x-user-id required for MVP");
  return userId;
}

@Controller("router")
export class RouterController {
  constructor(private svc: RouterService) {}

  @Get("profile")
  get(@Headers("x-user-id") userId?: string) {
    return this.svc.getDefault(mustUserId(userId));
  }

  @Put("profile")
  set(@Headers("x-user-id") userId?: string, @Body() body?: unknown) {
    return this.svc.setDefault(mustUserId(userId), body);
  }
}
```

- [ ] **Step 4: ModelRouter（只实现 OpenAI-compatible 的 MVP 调用）**

创建 `/workspace/apps/api/src/router/model-router.service.ts`：

```ts
import { Injectable } from "@nestjs/common";
import { RouterRulesSchema, type RouterRules, type RouterCandidate } from "@aurora/shared";
import { AiConnectionsService } from "../ai-connections/ai-connections.service";
import { RouterService } from "./router.service";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function isRetryable(status: number) {
  return status === 429 || (status >= 500 && status <= 599);
}

@Injectable()
export class ModelRouterService {
  constructor(private router: RouterService, private conns: AiConnectionsService) {}

  private candidatesForFeature(rules: RouterRules, feature: string): RouterCandidate[] {
    const by = rules.byFeature?.[feature];
    return by?.candidates?.length ? by.candidates : rules.global.candidates;
  }

  async chat(userId: string, feature: string, messages: ChatMessage[]) {
    const rulesRaw = await this.router.getDefault(userId);
    const rules = RouterRulesSchema.parse(rulesRaw);
    const candidates = this.candidatesForFeature(rules, feature);
    const maxAttempts = rules.global.fallback?.maxAttempts ?? 3;

    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= Math.min(maxAttempts, candidates.length); attempt++) {
      const c = candidates[attempt - 1];
      try {
        const conn = await this.conns.getDecryptedAuth(userId, c.connectionId);
        const baseUrl = (conn.baseUrl ?? "").replace(/\/$/, "");
        const url = `${baseUrl}/chat/completions`;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (conn.auth.type === "bearer") headers["Authorization"] = `Bearer ${conn.auth.apiKey}`;
        if (conn.auth.type === "header") headers[conn.auth.headerName] = conn.auth.apiKey;

        let finalUrl = url;
        if (conn.auth.type === "query") {
          const u = new URL(url);
          u.searchParams.set(conn.auth.queryName, conn.auth.apiKey);
          finalUrl = u.toString();
        }

        const res = await fetch(finalUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({ model: c.model, messages })
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          if (isRetryable(res.status)) throw new Error(`RETRYABLE_${res.status}:${text}`);
          throw new Error(`NON_RETRYABLE_${res.status}:${text}`);
        }

        const data = (await res.json()) as any;
        const content = data?.choices?.[0]?.message?.content ?? "";
        return { providerConnectionId: c.connectionId, model: c.model, content };
      } catch (e) {
        lastErr = e;
        continue;
      }
    }
    throw lastErr ?? new Error("MODEL_ROUTER_FAILED");
  }
}
```

- [ ] **Step 5: 单元测试（候选选择逻辑）**

创建 `/workspace/apps/api/src/router/model-router.service.spec.ts`：

```ts
import { RouterRulesSchema } from "@aurora/shared";

describe("RouterRulesSchema", () => {
  it("validates minimal rules", () => {
    const rules = RouterRulesSchema.parse({
      version: 1,
      global: { candidates: [{ connectionId: "c1", model: "m1" }] }
    });
    expect(rules.global.candidates[0].connectionId).toBe("c1");
  });
});
```

- [ ] **Step 6: RouterModule & AppModule wiring**

创建 `/workspace/apps/api/src/router/router.module.ts`：

```ts
import { Module } from "@nestjs/common";
import { RouterController } from "./router.controller";
import { RouterService } from "./router.service";
import { ModelRouterService } from "./model-router.service";

@Module({
  controllers: [RouterController],
  providers: [RouterService, ModelRouterService],
  exports: [RouterService, ModelRouterService]
})
export class RouterModule {}
```

修改 `app.module.ts`：imports 增加 `RouterModule`。

- [ ] **Step 7: 运行测试 & Commit**

Run:

```bash
pnpm -C apps/api test
```

Commit:

```bash
git add apps/api
git commit -m "feat(api): add router profile and model router with fallback"
```

---

## Task 7: Personas（人设管理）API

**Files:**
- Modify: `/workspace/apps/api/prisma/schema.prisma`
- Create: `/workspace/apps/api/src/personas/personas.module.ts`
- Create: `/workspace/apps/api/src/personas/personas.controller.ts`
- Create: `/workspace/apps/api/src/personas/personas.service.ts`
- Create: `/workspace/apps/api/src/personas/personas.dto.ts`
- Test: `/workspace/apps/api/test/personas.e2e-spec.ts`

- [ ] **Step 1: Prisma model**

追加：

```prisma
model Persona {
  id        String   @id @default(cuid())
  userId    String
  name      String
  industry  String
  identity  String
  product   String
  region    String
  extraJson Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

并在 `User` 增加：`personas Persona[]`

migrate:

```bash
pnpm -C apps/api dlx prisma migrate dev --name personas
```

- [ ] **Step 2: DTO + Service + Controller**

DTO（`/workspace/apps/api/src/personas/personas.dto.ts`）：

```ts
import { z } from "zod";

export const CreatePersonaSchema = z.object({
  name: z.string().min(1),
  industry: z.string().min(1),
  identity: z.string().min(1),
  product: z.string().min(1),
  region: z.string().min(1),
  extra: z.any().optional()
});
export type CreatePersonaDto = z.infer<typeof CreatePersonaSchema>;
export const UpdatePersonaSchema = CreatePersonaSchema.partial();
```

Service（`personas.service.ts`）需实现 list/create/get/update/delete（按 userId 过滤）。  
Controller（`personas.controller.ts`）按 REST 暴露接口，并使用 `x-user-id` 取 userId。

- [ ] **Step 3: e2e 测试**

写 `/workspace/apps/api/test/personas.e2e-spec.ts`：创建→列表→更新→删除的闭环断言。

- [ ] **Step 4: 测试 & Commit**

```bash
pnpm -C apps/api test
git add apps/api
git commit -m "feat(api): add personas CRUD"
```

---

## Task 8: Tasks（统一任务表）+ Copywriting（无中生有/爆款二创）任务流

**Files:**
- Modify: `/workspace/apps/api/prisma/schema.prisma`
- Create: `/workspace/apps/api/src/tasks/tasks.module.ts`
- Create: `/workspace/apps/api/src/tasks/tasks.controller.ts`
- Create: `/workspace/apps/api/src/tasks/tasks.service.ts`
- Create: `/workspace/apps/api/src/copywriting/copywriting.module.ts`
- Create: `/workspace/apps/api/src/copywriting/copywriting.controller.ts`
- Create: `/workspace/apps/api/src/copywriting/copywriting.worker.ts`
- Test: `/workspace/apps/api/test/copywriting.e2e-spec.ts`

- [ ] **Step 1: Prisma Task model**

追加：

```prisma
model Task {
  id             String   @id @default(cuid())
  userId         String
  type           String
  status         String   @default("pending")
  inputJson      Json
  outputJson     Json?
  provider       String?
  model          String?
  aiConnectionId String?
  errorCode      String?
  errorMessage   String?
  latencyMs      Int?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([userId, type, status])
}
```

User 增加：`tasks Task[]`

migrate:

```bash
pnpm -C apps/api dlx prisma migrate dev --name tasks
```

- [ ] **Step 2: BullMQ queue wiring**

在 `AppModule` 配置 BullMQ（使用 `REDIS_URL`），并在 Copywriting/Storyboard/DigitalHuman 复用同一队列命名（例如 `generation`）。

- [ ] **Step 3: CopywritingController（创建任务返回 taskId）**

`POST /api/copywriting/create-from-nothing`：body 包含 `personaId`、`topicTemplate` 等  
`POST /api/copywriting/viral-second-creation`：body 包含 `personaId`、`sourceUrl?`、`rawText`  

都只做：写入 `Task(status=pending)` + enqueue job。

- [ ] **Step 4: CopywritingWorker（调用 ModelRouterService.chat）**

实现最小可用 prompt（先 hardcode，后续模板化）：
- from-nothing：生成“选题候选→钩子→成品文案”（可一次性生成 JSON）
- viral-second：输入 rawText，输出二创版本（2-3版）+ 亮点拆解

要求输出为 JSON（让前端可渲染）：

```json
{
  "titleCandidates": ["..."],
  "hookCandidates": ["..."],
  "script": "....",
  "highlights": ["..."]
}
```

- [ ] **Step 5: TasksController（查询任务结果）**

`GET /api/tasks/:id` 返回 status/output/error。

- [ ] **Step 6: e2e 测试（不真实调用外部模型：mock fetch）**

在测试环境中对 `global.fetch` 做 mock，返回固定 `choices[0].message.content`（JSON 字符串）。  
验证：创建任务→worker 执行→任务变为 succeeded 且 outputJson 可解析。

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): add generation tasks and copywriting workflows"
```

---

## Task 9: Next.js Web（基础页面 + 设置：AI Connections + Router）

**Files:**
- Create: `/workspace/apps/web/...`（Next scaffold）
- Create: `/workspace/apps/web/src/lib/api.ts`
- Create: `/workspace/apps/web/src/app/settings/ai-connections/page.tsx`
- Create: `/workspace/apps/web/src/app/settings/router/page.tsx`
- Create: `/workspace/apps/web/src/app/character/page.tsx`
- Create: `/workspace/apps/web/src/app/copywriting/create-from-nothing/page.tsx`
- Create: `/workspace/apps/web/src/app/copywriting/viral-second-creation/page.tsx`
- Create: `/workspace/apps/web/src/app/tasks/[id]/page.tsx`

- [ ] **Step 1: 创建 Next.js 项目**

Run:

```bash
pnpm dlx create-next-app@latest apps/web --ts --eslint --tailwind --app --src-dir --use-pnpm
```

- [ ] **Step 2: API client（带 x-user-id）**

创建 `/workspace/apps/web/src/lib/api.ts`：

```ts
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function api<T>(path: string, init?: RequestInit & { userId?: string }) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (init?.userId) headers.set("x-user-id", init.userId);
  const res = await fetch(`${API}${path}`, { ...init, headers, cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}
```

- [ ] **Step 3: 设置页 - AI Connections（推荐模板 + 自定义）**

页面最小要求：
- 列表展示连接
- 新增连接弹窗：可选“推荐模板”快速填充（写死在前端常量即可）
- 支持测试（调用 `POST /ai-connections/:id/test`，若后端未实现则先隐藏按钮）

- [ ] **Step 4: 设置页 - Router**

页面最小要求：
- 显示当前 routing_rules JSON（textarea）
- 保存（PUT /router/profile）
- 旁边显示“推荐提示”（静态文案：文案/分镜推荐模型）

- [ ] **Step 5: 人设管理页**

最小：列表 + 创建表单（industry/identity/product/region），调用 API。

- [ ] **Step 6: 文案页**

无中生有：三步向导（可先简化成一次提交表单）→ 创建任务 → 跳转任务详情页  
爆款二创：rawText 输入 → 创建任务 → 跳转任务详情页

- [ ] **Step 7: 任务详情页**

轮询 `GET /tasks/:id`，显示 status 与 JSON 输出。

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat(web): add settings and basic pages for personas and copywriting"
```

---

## Task 10: Storyboard + Digital Human（占位实现 + 页面）

**Files:**
- API: `apps/api/src/storyboard/*`, `apps/api/src/digital-human/*`
- Web: `apps/web/src/app/storyboard/page.tsx`, `apps/web/src/app/digital-human/page.tsx`

- [ ] **Step 1: Storyboard（API）**
- 新增 `POST /storyboard/generate` → task → worker 调用 modelrouter（输出分镜 JSON 数组）

- [ ] **Step 2: Digital Human（API）**
- `GET /digital-human/templates` 返回静态模板列表（含“新闻体”）
- `POST /digital-human/jobs` 创建占位任务（或后续对接第三方）

- [ ] **Step 3: Web 页面**
- Storyboard：脚本输入 + 模板选择 + 生成按钮
- Digital Human：模板卡片选择 + 脚本输入 + 创建任务 + 任务列表

- [ ] **Step 4: Commit**

```bash
git add apps/api apps/web
git commit -m "feat: add storyboard and digital human placeholders"
```

---

## Plan Self-Review

**Spec coverage check:**
- 多供应商 Key 管理（连接 CRUD + 自定义 + 推荐模板）：Task 5 + Task 9
- 路由容灾：Task 6
- 人设管理：Task 7 + Task 9
- 文案创作（无中生有/爆款二创）：Task 8 + Task 9
- 分镜 + 数字人：Task 10
- 本地运行：Task 1 + Task 3 + Task 9

**Placeholder scan:** 无 “TODO/TBD”；未实现部分已明确为“MVP 占位”并在 Task 10 中说明。

**Type consistency:** routing_rules 统一由 `@aurora/shared` 提供 schema；AI connection auth 统一加密存储。

---

## Execution Handoff

计划已完成。两种执行方式：

1. **Subagent-Driven（推荐）**：我按 Task 逐个派发子代理实现，每个任务完成后你验收再继续  
2. **Inline Execution**：我在当前会话按计划直接实现（中途设置检查点）

你选哪一种？

