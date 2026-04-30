"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPut } from "@/lib/api";

type RouterRules = unknown;

const recommended = {
  version: 1,
  global: {
    candidates: [
      {
        // 来自 /settings/ai-connections 列表里的 id
        connectionId: "REPLACE_WITH_CONNECTION_ID",
        model: "gpt-4o-mini",
      },
    ],
    fallback: {
      maxAttempts: 3,
      switchOn: ["timeout", "429", "5xx"],
    },
  },
  byFeature: {
    copywriting: {
      candidates: [
        {
          connectionId: "REPLACE_WITH_CONNECTION_ID",
          model: "gpt-4o-mini",
        },
      ],
    },
  },
};

export default function RouterSettingsPage() {
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    const rules = await apiGet<RouterRules>("/router/profile");
    setRaw(JSON.stringify(rules, null, 2));
  }

  useEffect(() => {
    load().catch((e) => setErr(String(e?.message || e)));
  }, []);

  const parsed = useMemo(() => {
    try {
      return raw.trim() ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [raw]);

  async function onSave() {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      if (!raw.trim()) throw new Error("routing_rules 不能为空");
      const body = JSON.parse(raw);
      await apiPut("/router/profile", body);
      setMsg("保存成功（后端会按 RouterRulesSchema 校验并持久化）");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  function fillRecommended() {
    setRaw(JSON.stringify(recommended, null, 2));
    setMsg(null);
    setErr(null);
  }

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>/settings/router</h2>
      <p className="muted" style={{ marginTop: 6 }}>
        这里直接编辑 <code>routing_rules</code> JSON（后端：<code>GET/PUT /router/profile</code>）。
      </p>

      <div className="panel" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>推荐提示（MVP）</div>
        <ul className="muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>
            <code>global.candidates</code> 至少 1 个：用于所有场景的默认候选模型。
          </li>
          <li>
            <code>byFeature.copywriting.candidates</code> 可选：覆盖 copywriting 特性（本 MVP 的文案任务会走{" "}
            <code>copywriting</code>）。
          </li>
          <li>
            <code>connectionId</code> 来自 <code>/settings/ai-connections</code> 列表里的连接 id。
          </li>
        </ul>
        <div style={{ marginTop: 10 }}>
          <button className="btn" type="button" onClick={fillRecommended}>
            一键填充推荐模板
          </button>
        </div>
      </div>

      {msg ? (
        <pre className="panel" style={{ borderColor: "rgba(110,168,254,0.6)", marginTop: 12 }}>
          {msg}
        </pre>
      ) : null}
      {err ? (
        <pre className="panel" style={{ borderColor: "rgba(255,99,132,0.6)", marginTop: 12 }}>
          {err}
        </pre>
      ) : null}

      <div className="field" style={{ marginTop: 12 }}>
        <label>routing_rules JSON</label>
        <textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="{ ... }" />
      </div>

      <div className="row" style={{ alignItems: "center" }}>
        <button className="btn btnPrimary" type="button" onClick={onSave} disabled={loading}>
          {loading ? "保存中..." : "保存"}
        </button>
        <span className="muted" style={{ fontSize: 12 }}>
          {raw.trim() && !parsed ? "JSON 解析失败：请修复格式后再保存" : " "}
        </span>
      </div>
    </div>
  );
}

