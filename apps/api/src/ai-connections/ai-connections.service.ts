import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import type {
  AuthConfig,
  CreateAiConnectionDto,
  UpdateAiConnectionDto,
} from './ai-connections.dto';

type StoredAuth = AuthConfig;

@Injectable()
export class AiConnectionsService {
  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
  ) {}

  async list(userId: string) {
    const rows = await this.prisma.aiConnection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      baseUrl: r.baseUrl,
      defaultModel: r.defaultModel,
      status: r.status,
      createdAt: r.createdAt,
    }));
  }

  async create(userId: string, dto: CreateAiConnectionDto) {
    const authEncrypted = this.crypto.encryptJson(dto.auth);
    const row = await this.prisma.aiConnection.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        baseUrl: dto.baseUrl,
        defaultModel: dto.defaultModel,
        authEncrypted,
      },
    });

    return { id: row.id };
  }

  async update(userId: string, id: string, dto: UpdateAiConnectionDto) {
    const row = await this.prisma.aiConnection.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('NOT_FOUND');
    if (row.userId !== userId) throw new ForbiddenException('FORBIDDEN');

    const authEncrypted = dto.auth
      ? this.crypto.encryptJson(dto.auth)
      : undefined;

    await this.prisma.aiConnection.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        baseUrl: dto.baseUrl,
        defaultModel: dto.defaultModel,
        authEncrypted,
      },
    });

    return { ok: true };
  }

  async remove(userId: string, id: string) {
    const row = await this.prisma.aiConnection.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('NOT_FOUND');
    if (row.userId !== userId) throw new ForbiddenException('FORBIDDEN');

    await this.prisma.aiConnection.delete({ where: { id } });
    return { ok: true };
  }

  async getDecryptedAuth(userId: string, id: string): Promise<{
    baseUrl?: string | null;
    type: string;
    defaultModel?: string | null;
    auth: StoredAuth;
  }> {
    const row = await this.prisma.aiConnection.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('NOT_FOUND');
    if (row.userId !== userId) throw new ForbiddenException('FORBIDDEN');

    const auth = this.crypto.decryptJson<StoredAuth>(row.authEncrypted);
    return {
      baseUrl: row.baseUrl,
      type: row.type,
      defaultModel: row.defaultModel,
      auth,
    };
  }

  async testConnection(userId: string, id: string, model?: string) {
    const conn = await this.getDecryptedAuth(userId, id);
    const baseUrl = (conn.baseUrl ?? '').replace(/\/$/, '');
    if (!baseUrl) {
      return { ok: false, error: 'BASE_URL_REQUIRED' };
    }

    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (conn.auth.type === 'bearer') headers['authorization'] = `Bearer ${conn.auth.apiKey}`;
    if (conn.auth.type === 'header') headers[conn.auth.headerName] = conn.auth.apiKey;

    const withQueryAuth = (url: string) => {
      if (conn.auth.type !== 'query') return url;
      const u = new URL(url);
      u.searchParams.set(conn.auth.queryName, conn.auth.apiKey);
      return u.toString();
    };

    const timeoutMs = 6000;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();

    try {
      // 1) 优先尝试 /models（成本更低）
      const modelsUrl = withQueryAuth(`${baseUrl}/models`);
      const res = await fetch(modelsUrl, { method: 'GET', headers, signal: controller.signal });
      if (res.ok) {
        const json = (await res.json().catch(() => null)) as any;
        const count = Array.isArray(json?.data) ? json.data.length : undefined;
        return { ok: true, latencyMs: Date.now() - started, mode: 'models', modelCount: count };
      }

      // 2) fallback：做一次最小 chat/completions（max_tokens=1）
      const m = model ?? conn.defaultModel ?? '';
      if (!m) return { ok: false, error: 'MODEL_REQUIRED', hint: '请在连接里填写 defaultModel 或在测试请求里传 model' };

      const chatUrl = withQueryAuth(`${baseUrl}/chat/completions`);
      const res2 = await fetch(chatUrl, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: m,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
      });

      if (!res2.ok) {
        const text = await res2.text().catch(() => '');
        return { ok: false, latencyMs: Date.now() - started, mode: 'chat', status: res2.status, message: text.slice(0, 500) };
      }

      return { ok: true, latencyMs: Date.now() - started, mode: 'chat', model: m };
    } catch (e: any) {
      return { ok: false, latencyMs: Date.now() - started, error: 'REQUEST_FAILED', message: String(e?.message || e) };
    } finally {
      clearTimeout(t);
    }
  }
}
