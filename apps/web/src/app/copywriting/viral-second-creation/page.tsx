"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type PersonaRow = {
  id: string;
  industry: string | null;
  identity: string | null;
  product: string | null;
  region: string | null;
};

export default function CopywritingViralSecondCreationPage() {
  const router = useRouter();

  const [personas, setPersonas] = useState<PersonaRow[]>([]);
  const [personaId, setPersonaId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [rawText, setRawText] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiGet<PersonaRow[]>("/personas")
      .then((rows) => {
        setPersonas(rows);
        if (rows[0]?.id) setPersonaId(rows[0].id);
      })
      .catch((e) => setErr(String(e?.message || e)));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      if (!personaId) throw new Error("personaId 必填，请先创建人设");
      if (!rawText.trim()) throw new Error("rawText 必填");

      const body: any = {
        personaId,
        rawText: rawText.trim(),
      };
      if (sourceUrl.trim()) body.sourceUrl = sourceUrl.trim();

      const res = await apiPost<{ taskId: string }>("/copywriting/viral-second-creation", body);
      router.push(`/tasks/${res.taskId}`);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>/copywriting/viral-second-creation</h2>
      <p className="muted" style={{ marginTop: 6 }}>
        输入 rawText 创建任务并跳转到 <code>/tasks/[id]</code>；后端接口：{" "}
        <code>POST /copywriting/viral-second-creation</code>。
      </p>

      {personas.length === 0 ? (
        <div className="panel" style={{ marginTop: 12 }}>
          <div>当前没有可选人设。</div>
          <div className="muted" style={{ marginTop: 6 }}>
            请先去{" "}
            <Link className="link" href="/character">
              /character
            </Link>{" "}
            创建一个。
          </div>
        </div>
      ) : null}

      {err ? (
        <pre className="panel" style={{ borderColor: "rgba(255,99,132,0.6)", marginTop: 12 }}>
          {err}
        </pre>
      ) : null}

      <form onSubmit={onSubmit} style={{ marginTop: 12 }}>
        <div className="field">
          <label>personaId *</label>
          <select value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id}{" "}
                {p.identity
                  ? `(${p.identity})`
                  : p.industry
                    ? `(${p.industry})`
                    : p.product
                      ? `(${p.product})`
                      : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>sourceUrl（可选，必须是 URL）</label>
          <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." />
        </div>

        <div className="field">
          <label>rawText *</label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="粘贴需要二创的原文（必须）"
          />
        </div>

        <button className="btn btnPrimary" disabled={loading || personas.length === 0} type="submit">
          {loading ? "创建中..." : "创建任务并查看"}
        </button>
      </form>
    </div>
  );
}

