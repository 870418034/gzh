"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiRequest } from "@/lib/api";

type AiConnectionRow = {
  id: string;
  name: string;
  type: string;
  baseUrl: string | null;
  defaultModel: string | null;
  status: string | null;
  createdAt: string;
};

type AuthConfig =
  | { type: "bearer"; apiKey: string }
  | { type: "header"; headerName: string; apiKey: string }
  | { type: "query"; queryName: string; apiKey: string };

type CreateAiConnectionBody = {
  name: string;
  type: "openai_compatible" | "custom_http";
  baseUrl?: string;
  defaultModel?: string;
  auth: AuthConfig;
};

const templates: Array<{ label: string; value: Partial<CreateAiConnectionBody> }> = [
  {
    label: "OpenAI Compatible（示例）",
    value: {
      name: "OpenAI Compatible",
      type: "openai_compatible",
      baseUrl: "https://api.openai.com/v1",
      defaultModel: "gpt-4o-mini",
      auth: { type: "bearer", apiKey: "" },
    },
  },
  {
    label: "DeepSeek（示例）",
    value: {
      name: "DeepSeek",
      type: "openai_compatible",
      baseUrl: "https://api.deepseek.com/v1",
      defaultModel: "deepseek-chat",
      auth: { type: "bearer", apiKey: "" },
    },
  },
  {
    label: "Ollama 本地（示例）",
    value: {
      name: "Ollama Local",
      type: "openai_compatible",
      baseUrl: "http://localhost:11434/v1",
      defaultModel: "llama3.1",
      auth: { type: "bearer", apiKey: "ollama" },
    },
  },
];

export default function AiConnectionsPage() {
  const [rows, setRows] = useState<AiConnectionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResultById, setTestResultById] = useState<Record<string, any>>({});

  const [name, setName] = useState("");
  const [type, setType] = useState<"openai_compatible" | "custom_http">("openai_compatible");
  const [baseUrl, setBaseUrl] = useState("");
  const [defaultModel, setDefaultModel] = useState("");

  const [authType, setAuthType] = useState<AuthConfig["type"]>("bearer");
  const [apiKey, setApiKey] = useState("");
  const [headerName, setHeaderName] = useState("Authorization");
  const [queryName, setQueryName] = useState("api_key");

  async function refresh() {
    setErr(null);
    const data = await apiGet<AiConnectionRow[]>("/ai-connections");
    setRows(data);
  }

  useEffect(() => {
    refresh().catch((e) => setErr(String(e?.message || e)));
  }, []);

  const auth: AuthConfig = useMemo(() => {
    if (authType === "bearer") return { type: "bearer", apiKey };
    if (authType === "header") return { type: "header", headerName, apiKey };
    return { type: "query", queryName, apiKey };
  }, [authType, apiKey, headerName, queryName]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const body: CreateAiConnectionBody = {
        name,
        type,
        ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
        ...(defaultModel.trim() ? { defaultModel: defaultModel.trim() } : {}),
        auth,
      };
      await apiPost<{ id: string }>("/ai-connections", body);
      setName("");
      setApiKey("");
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("确认删除这个连接？")) return;
    setErr(null);
    try {
      await apiRequest("/ai-connections/" + id, { method: "DELETE" });
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function testConnection(id: string) {
    setErr(null);
    setTestingId(id);
    try {
      const res = await apiPost(`/ai-connections/${id}/test`, {});
      setTestResultById((m) => ({ ...m, [id]: res }));
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setTestingId(null);
    }
  }

  function applyTemplate(t: Partial<CreateAiConnectionBody>) {
    if (t.name !== undefined) setName(t.name);
    if (t.type !== undefined) setType(t.type as any);
    if (t.baseUrl !== undefined) setBaseUrl(t.baseUrl);
    if (t.defaultModel !== undefined) setDefaultModel(t.defaultModel);
    if (t.auth) {
      setAuthType(t.auth.type);
      setApiKey(t.auth.apiKey || "");
      if (t.auth.type === "header") setHeaderName(t.auth.headerName);
      if (t.auth.type === "query") setQueryName(t.auth.queryName);
    }
  }

  return (
    <div className="row" style={{ alignItems: "flex-start" }}>
      <section className="panel" style={{ flex: 1, minWidth: 360 }}>
        <h2 style={{ marginTop: 0 }}>/settings/ai-connections</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          后端接口：<code>/ai-connections</code>（需 <code>x-user-id</code>）
        </p>
        {err ? (
          <pre className="panel" style={{ borderColor: "rgba(255,99,132,0.6)" }}>
            {err}
          </pre>
        ) : null}

        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>name</th>
              <th>type</th>
              <th>baseUrl</th>
              <th>defaultModel</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <>
                <tr key={r.id}>
                  <td>
                    <div>{r.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      id: {r.id}
                    </div>
                  </td>
                  <td>{r.type}</td>
                  <td className="muted" style={{ fontSize: 12 }}>
                    {r.baseUrl || "-"}
                  </td>
                  <td className="muted" style={{ fontSize: 12 }}>
                    {r.defaultModel || "-"}
                  </td>
                  <td style={{ width: 1, whiteSpace: "nowrap" }}>
                    <button className="btn" onClick={() => testConnection(r.id)} disabled={testingId === r.id}>
                      {testingId === r.id ? "测试中..." : "测试"}
                    </button>{" "}
                    <button className="btn btnDanger" onClick={() => remove(r.id)}>
                      删除
                    </button>
                  </td>
                </tr>
                {testResultById[r.id] ? (
                  <tr key={r.id + "-test"}>
                    <td colSpan={5}>
                      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                        测试结果（不会返回/显示你的 key）：
                      </div>
                      <pre className="panel" style={{ marginTop: 6 }}>
                        {JSON.stringify(testResultById[r.id], null, 2)}
                      </pre>
                    </td>
                  </tr>
                ) : null}
              </>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  暂无连接。请先新增一个（并在 /settings/router 里引用 connectionId）。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="panel" style={{ flex: 1, minWidth: 360 }}>
        <h3 style={{ marginTop: 0 }}>新增连接</h3>

        <div className="row" style={{ marginBottom: 12 }}>
          {templates.map((t) => (
            <button key={t.label} className="btn" type="button" onClick={() => applyTemplate(t.value)}>
              套用：{t.label}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit}>
          <div className="field">
            <label>name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：OpenAI" />
          </div>

          <div className="row">
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <label>type *</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="openai_compatible">openai_compatible</option>
                <option value="custom_http">custom_http</option>
              </select>
            </div>
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <label>defaultModel（可选）</label>
              <input
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                placeholder="例如：gpt-4o-mini"
              />
            </div>
          </div>

          <div className="field">
            <label>baseUrl（可选，必须是 URL）</label>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://.../v1" />
          </div>

          <div className="row">
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <label>auth.type *</label>
              <select value={authType} onChange={(e) => setAuthType(e.target.value as any)}>
                <option value="bearer">bearer</option>
                <option value="header">header</option>
                <option value="query">query</option>
              </select>
            </div>
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <label>auth.apiKey *</label>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="粘贴 API Key"
              />
            </div>
          </div>

          {authType === "header" ? (
            <div className="field">
              <label>auth.headerName *</label>
              <input value={headerName} onChange={(e) => setHeaderName(e.target.value)} />
            </div>
          ) : null}

          {authType === "query" ? (
            <div className="field">
              <label>auth.queryName *</label>
              <input value={queryName} onChange={(e) => setQueryName(e.target.value)} />
            </div>
          ) : null}

          <button className="btn btnPrimary" disabled={loading} type="submit">
            {loading ? "提交中..." : "创建连接"}
          </button>
        </form>
      </section>
    </div>
  );
}
