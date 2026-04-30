"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

type TaskRow = {
  id: string;
  type: string;
  status: string;
  inputJson: unknown;
  outputJson: unknown;
  provider: string | null;
  model: string | null;
  aiConnectionId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  latencyMs: number | null;
  createdAt: string;
  updatedAt: string;
};

const terminalStatuses = new Set(["succeeded", "failed", "canceled"]);

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [task, setTask] = useState<TaskRow | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);
  const timerRef = useRef<number | null>(null);

  const pretty = useMemo(() => JSON.stringify(task, null, 2), [task]);

  async function fetchOnce() {
    if (!id) return;
    const t = await apiGet<TaskRow>(`/tasks/${id}`);
    setTask(t);
    if (terminalStatuses.has(t.status)) setPolling(false);
  }

  useEffect(() => {
    setErr(null);
    setTask(null);
    setPolling(true);

    fetchOnce().catch((e) => setErr(String(e?.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (!polling) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    timerRef.current = window.setInterval(() => {
      fetchOnce().catch((e) => setErr(String(e?.message || e)));
    }, 1200);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, polling]);

  async function cancel() {
    if (!id) return;
    if (!confirm("确认取消该任务？")) return;
    setErr(null);
    try {
      await apiPost(`/tasks/${id}/cancel`);
      await fetchOnce();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>/tasks/{id}</h2>
      <p className="muted" style={{ marginTop: 6 }}>
        该页面会轮询 <code>GET /tasks/:id</code> 并展示 JSON。
      </p>

      {err ? (
        <pre className="panel" style={{ borderColor: "rgba(255,99,132,0.6)", marginTop: 12 }}>
          {err}
        </pre>
      ) : null}

      <div className="row" style={{ marginTop: 12, alignItems: "center" }}>
        <button className="btn" type="button" onClick={() => fetchOnce().catch((e) => setErr(String(e)))}>
          手动刷新
        </button>
        <button className="btn" type="button" onClick={() => setPolling((v) => !v)}>
          {polling ? "暂停轮询" : "继续轮询"}
        </button>
        <button className="btn btnDanger" type="button" onClick={cancel} disabled={!task || terminalStatuses.has(task.status)}>
          取消任务
        </button>
        <span className="muted" style={{ fontSize: 12 }}>
          {task ? `status: ${task.status}` : "loading..."}
        </span>
      </div>

      <pre className="panel" style={{ marginTop: 12, overflowX: "auto" }}>
        {task ? pretty : "加载中..."}
      </pre>
    </div>
  );
}

