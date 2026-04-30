"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost } from "@/lib/api";

export default function StoryboardPage() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [personaId, setPersonaId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      if (!prompt.trim()) throw new Error("prompt 必填");
      const body: any = { prompt: prompt.trim() };
      if (personaId.trim()) body.personaId = personaId.trim();

      const res = await apiPost<{ taskId: string }>("/storyboard/generate", body);
      router.push(`/tasks/${res.taskId}`);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>/storyboard</h2>
      <p className="muted" style={{ marginTop: 6 }}>
        提交后会创建任务并跳转到 <code>/tasks/[id]</code>；后端接口：<code>POST /storyboard/generate</code>。
        任务输出为 <code>{"{shots:[{index,durationSec,visual,narration,onScreenText?,camera?}]}"}</code>。
      </p>

      {err ? (
        <pre className="panel" style={{ borderColor: "rgba(255,99,132,0.6)", marginTop: 12 }}>
          {err}
        </pre>
      ) : null}

      <form onSubmit={onSubmit} style={{ marginTop: 12 }}>
        <div className="field">
          <label>prompt *</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例如：把“SOLO 是什么 + 核心优势”拆成 8 个镜头的短视频分镜"
          />
        </div>

        <div className="field">
          <label>personaId（可选）</label>
          <input value={personaId} onChange={(e) => setPersonaId(e.target.value)} placeholder="可填 /character 的 personaId" />
        </div>

        <button className="btn btnPrimary" disabled={loading} type="submit">
          {loading ? "创建中..." : "创建任务并查看"}
        </button>
      </form>
    </div>
  );
}

