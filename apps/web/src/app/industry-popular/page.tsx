"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiRequest } from "@/lib/api";

type Item = {
  id: string;
  platform: string | null;
  industry: string | null;
  title: string;
  sourceUrl: string | null;
  notes: string | null;
  createdAt: string;
};

export default function IndustryPopularPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [platform, setPlatform] = useState("");
  const [industry, setIndustry] = useState("");
  const [q, setQ] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newPlatform, setNewPlatform] = useState("");
  const [newIndustry, setNewIndustry] = useState("");

  const [bulkJson, setBulkJson] = useState(`[
  {
    "platform": "douyin",
    "industry": "装修建材",
    "title": "示例爆款标题",
    "sourceUrl": "https://example.com",
    "notes": "可选备注"
  }
]`);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (platform.trim()) params.set("platform", platform.trim());
    if (industry.trim()) params.set("industry", industry.trim());
    if (q.trim()) params.set("q", q.trim());
    params.set("limit", "50");
    return params.toString();
  }, [platform, industry, q]);

  async function refresh() {
    setErr(null);
    const data = await apiGet<Item[]>(`/industry-popular/items?${query}`);
    setItems(data);
  }

  useEffect(() => {
    refresh().catch((e) => setErr(String(e?.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function createOne(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      await apiPost("/industry-popular/items", {
        title: newTitle,
        ...(newUrl.trim() ? { sourceUrl: newUrl.trim() } : {}),
        ...(newNotes.trim() ? { notes: newNotes.trim() } : {}),
        ...(newPlatform.trim() ? { platform: newPlatform.trim() } : {}),
        ...(newIndustry.trim() ? { industry: newIndustry.trim() } : {}),
      });
      setNewTitle("");
      setNewUrl("");
      setNewNotes("");
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function importBulk() {
    setLoading(true);
    setErr(null);
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error("请输入 JSON 数组");
      await apiPost("/industry-popular/import", { items: parsed });
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("确认删除？")) return;
    setErr(null);
    try {
      await apiRequest(`/industry-popular/items/${id}`, { method: "DELETE" });
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  return (
    <div className="row" style={{ alignItems: "flex-start" }}>
      <section className="panel" style={{ flex: 1, minWidth: 420 }}>
        <h2 style={{ marginTop: 0 }}>/industry-popular</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          MVP：做成“爆款素材库（手工/导入）”。后续可接第三方数据源或授权采集。
        </p>

        {err ? (
          <pre className="panel" style={{ borderColor: "rgba(255,99,132,0.6)" }}>
            {err}
          </pre>
        ) : null}

        <div className="row" style={{ marginTop: 12 }}>
          <div className="field" style={{ flex: 1, minWidth: 180 }}>
            <label>platform</label>
            <input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="douyin/xhs/bilibili..." />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 180 }}>
            <label>industry</label>
            <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="装修建材/餐饮..." />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 220 }}>
            <label>关键词</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜标题/备注/链接" />
          </div>
        </div>

        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>title</th>
              <th>platform</th>
              <th>industry</th>
              <th>sourceUrl</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>
                  <div>{it.title}</div>
                  {it.notes ? (
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {it.notes}
                    </div>
                  ) : null}
                </td>
                <td className="muted" style={{ fontSize: 12 }}>
                  {it.platform || "-"}
                </td>
                <td className="muted" style={{ fontSize: 12 }}>
                  {it.industry || "-"}
                </td>
                <td className="muted" style={{ fontSize: 12 }}>
                  {it.sourceUrl ? (
                    <a href={it.sourceUrl} target="_blank" rel="noreferrer">
                      打开
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td style={{ width: 1, whiteSpace: "nowrap" }}>
                  <button className="btn btnDanger" onClick={() => remove(it.id)}>
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  暂无数据。你可以先在右侧“新增/导入”。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="panel" style={{ flex: 1, minWidth: 420 }}>
        <h3 style={{ marginTop: 0 }}>新增 / 导入</h3>

        <form onSubmit={createOne}>
          <div className="field">
            <label>title *</label>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="爆款标题/主题" />
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1, minWidth: 180 }}>
              <label>platform（可选）</label>
              <input value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} placeholder="douyin" />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 180 }}>
              <label>industry（可选）</label>
              <input value={newIndustry} onChange={(e) => setNewIndustry(e.target.value)} placeholder="装修建材" />
            </div>
          </div>
          <div className="field">
            <label>sourceUrl（可选）</label>
            <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="field">
            <label>notes（可选）</label>
            <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={3} placeholder="备注/拆解要点" />
          </div>
          <button className="btn btnPrimary" disabled={loading} type="submit">
            {loading ? "提交中..." : "新增一条"}
          </button>
        </form>

        <hr style={{ margin: "16px 0", opacity: 0.2 }} />

        <div className="field">
          <label>批量导入（JSON 数组）</label>
          <textarea value={bulkJson} onChange={(e) => setBulkJson(e.target.value)} rows={10} />
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            字段：platform/industry/title/sourceUrl/notes/meta（meta 任意 JSON）。
          </div>
        </div>
        <button className="btn" disabled={loading} onClick={importBulk}>
          {loading ? "导入中..." : "导入"}
        </button>
      </section>
    </div>
  );
}

