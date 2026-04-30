"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type DigitalHumanTemplate = {
  id: string;
  name: string;
  description?: string;
};

type TaskRow = {
  id: string;
  type: string;
  status: string;
  inputJson: unknown;
  outputJson: unknown;
  createdAt: string;
  updatedAt: string;
};

export default function DigitalHumanPage() {
  const router = useRouter();

  const [templates, setTemplates] = useState<DigitalHumanTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [script, setScript] = useState("");

  const [jobs, setJobs] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setErr(null);
    const [tpls, rows] = await Promise.all([
      apiGet<DigitalHumanTemplate[]>("/digital-human/templates"),
      apiGet<TaskRow[]>("/digital-human/jobs"),
    ]);
    setTemplates(tpls);
    if (!templateId && tpls[0]?.id) setTemplateId(tpls[0].id);
    setJobs(rows);
  }

  useEffect(() => {
    refresh().catch((e) => setErr(String(e?.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      if (!templateId) throw new Error("templateId 必填");
      const body: any = { templateId };
      if (script.trim()) body.script = script.trim();

      const res = await apiPost<{ taskId: string }>("/digital-human/jobs", body);
      router.push(`/tasks/${res.taskId}`);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="row" style={{ alignItems: "flex-start" }}>
      <section className="panel" style={{ flex: 1, minWidth: 360 }}>
        <h2 style={{ marginTop: 0 }}>/digital-human</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          后端接口：<code>GET /digital-human/templates</code>、<code>POST /digital-human/jobs</code>、<code>GET /digital-human/jobs</code>。
          创建后会跳转到 <code>/tasks/[id]</code>。
        </p>

        {err ? (
          <pre className="panel" style={{ borderColor: "rgba(255,99,132,0.6)", marginTop: 12 }}>
            {err}
          </pre>
        ) : null}

        <div className="row" style={{ marginTop: 12, alignItems: "center" }}>
          <button className="btn" type="button" onClick={() => refresh().catch((e) => setErr(String(e)))}>
            刷新 jobs
          </button>
          <span className="muted" style={{ fontSize: 12 }}>
            提示：jobs 本质上是 type=<code>digital_human_job</code> 的 tasks 列表
          </span>
        </div>

        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>id</th>
              <th>status</th>
              <th>inputJson</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td className="muted" style={{ fontSize: 12 }}>
                  {j.id}
                </td>
                <td>{j.status}</td>
                <td className="muted" style={{ fontSize: 12, maxWidth: 360 }}>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(j.inputJson, null, 2)}</pre>
                </td>
                <td style={{ width: 1, whiteSpace: "nowrap" }}>
                  <Link className="btn" href={`/tasks/${j.id}`}>
                    打开任务页
                  </Link>
                </td>
              </tr>
            ))}
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  暂无 jobs。可在右侧创建一个。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="panel" style={{ flex: 1, minWidth: 360 }}>
        <h3 style={{ marginTop: 0 }}>创建 digital-human job</h3>

        <form onSubmit={onSubmit} style={{ marginTop: 12 }}>
          <div className="field">
            <label>templateId *</label>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.id})
                </option>
              ))}
            </select>
            {templates.length ? (
              <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                {templates.find((t) => t.id === templateId)?.description || ""}
              </div>
            ) : null}
          </div>

          <div className="field">
            <label>script（可选）</label>
            <textarea value={script} onChange={(e) => setScript(e.target.value)} placeholder="可填一段要数字人口播的脚本" />
          </div>

          <button className="btn btnPrimary" disabled={loading} type="submit">
            {loading ? "创建中..." : "创建任务并查看"}
          </button>
        </form>
      </section>
    </div>
  );
}

