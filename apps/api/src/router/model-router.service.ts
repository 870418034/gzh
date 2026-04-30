import { Injectable } from '@nestjs/common';
import {
  RouterRulesSchema,
  type RouterCandidate,
  type RouterRules,
} from '@aurora/shared';
import { AiConnectionsService } from '../ai-connections/ai-connections.service';
import { RouterService } from './router.service';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

function isRetryable(status: number) {
  return status === 429 || (status >= 500 && status <= 599);
}

@Injectable()
export class ModelRouterService {
  constructor(
    private router: RouterService,
    private conns: AiConnectionsService,
  ) {}

  private candidatesForFeature(
    rules: RouterRules,
    feature: string,
  ): RouterCandidate[] {
    const by = rules.byFeature?.[feature];
    return by?.candidates?.length ? by.candidates : rules.global.candidates;
  }

  /**
   * MVP: 仅实现 OpenAI-compatible 的 /chat/completions 调用。
   * 未来扩展：
   * - streaming
   * - tool calls
   * - fallback switchOn（timeout / insufficient_quota 等）
   */
  async chat(userId: string, feature: string, messages: ChatMessage[]) {
    const rulesRaw = await this.router.getDefault(userId);
    const rules = RouterRulesSchema.parse(rulesRaw);

    const candidates = this.candidatesForFeature(rules, feature);
    const maxAttempts = rules.global.fallback?.maxAttempts ?? 3;

    let lastErr: unknown = null;
    for (
      let attempt = 1;
      attempt <= Math.min(maxAttempts, candidates.length);
      attempt++
    ) {
      const c = candidates[attempt - 1];
      try {
        const conn = await this.conns.getDecryptedAuth(userId, c.connectionId);
        const baseUrl = (conn.baseUrl ?? '').replace(/\/$/, '');
        const url = `${baseUrl}/chat/completions`;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (conn.auth.type === 'bearer')
          headers['Authorization'] = `Bearer ${conn.auth.apiKey}`;
        if (conn.auth.type === 'header')
          headers[conn.auth.headerName] = conn.auth.apiKey;

        let finalUrl = url;
        if (conn.auth.type === 'query') {
          const u = new URL(url);
          u.searchParams.set(conn.auth.queryName, conn.auth.apiKey);
          finalUrl = u.toString();
        }

        const res = await fetch(finalUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ model: c.model, messages }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          if (isRetryable(res.status))
            throw new Error(`RETRYABLE_${res.status}:${text}`);
          throw new Error(`NON_RETRYABLE_${res.status}:${text}`);
        }

        const data = (await res.json()) as any;
        const content = data?.choices?.[0]?.message?.content ?? '';
        return { providerConnectionId: c.connectionId, model: c.model, content };
      } catch (e) {
        lastErr = e;
        continue;
      }
    }

    throw lastErr ?? new Error('MODEL_ROUTER_FAILED');
  }
}

