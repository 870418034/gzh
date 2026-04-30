"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type PersonaRow = {
  id: string;
  industry: string | null;
  identity: string | null;
  product: string | null;
  region: string | null;
  extraJson: unknown;
  createdAt: string;
};

export default function CharacterPage() {
  const [rows, setRows] = useState<PersonaRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [industry, setIndustry] = useState("");
  const [identity, setIdentity] = useState("");
  const [product, setProduct] = useState("");
  const [region, setRegion] = useState("");
  const [extraJson, setExtraJson] = useState("");

  async function refresh() {
    setErr(null);
    const data = await apiGet<PersonaRow[]>("/personas");
    setRows(data);
  }

  useEffect(() => {
    refresh().catch((e) => setErr(String(e?.message || e)));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const body: any = {};
      if (industry.trim()) body.industry = industry.trim();
      if (identity.trim()) body.identity = identity.trim();
      if (product.trim()) body.product = product.trim();
      if (region.trim()) body.region = region.trim();
      if (extraJson.trim()) body.extraJson = JSON.parse(extraJson);
      await apiPost<{ id: string }>("/personas", body);

      setIndustry("");
      setIdentity("");
      setProduct("");
      setRegion("");
      setExtraJson("");
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="row" style={{ alignItems: "flex-start" }}>
      <section className="panel" style={{ flex: 1, minWidth: 360 }}>
        <h2 style={{ marginTop: 0 }}>/character（人设）</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          该页面对应后端资源：<code>/personas</code>。
        </p>
        {err ? (
          <pre className="panel" style={{ borderColor: "rgba(255,99,132,0.6)" }}>
            {err}
          </pre>
        ) : null}

        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>id</th>
              <th>industry</th>
              <th>identity</th>
              <th>product</th>
              <th>region</th>
              <th>extraJson</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="muted" style={{ fontSize: 12 }}>
                  {r.id}
                </td>
                <td>{r.industry || "-"}</td>
                <td>{r.identity || "-"}</td>
                <td>{r.product || "-"}</td>
                <td>{r.region || "-"}</td>
                <td className="muted" style={{ fontSize: 12, maxWidth: 320 }}>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                    {r.extraJson ? JSON.stringify(r.extraJson, null, 2) : "-"}
                  </pre>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  暂无人设。创建后可用于{" "}
                  <Link className="link" href="/copywriting/create-from-nothing">
                    文案任务
                  </Link>
                  。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="panel" style={{ flex: 1, minWidth: 360 }}>
        <h3 style={{ marginTop: 0 }}>创建人设</h3>
        <form onSubmit={onSubmit}>
          <div className="row">
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <label>industry（可选）</label>
              <input value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <label>identity（可选）</label>
              <input value={identity} onChange={(e) => setIdentity(e.target.value)} />
            </div>
          </div>

          <div className="row">
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <label>product（可选）</label>
              <input value={product} onChange={(e) => setProduct(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <label>region（可选）</label>
              <input value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>extraJson（可选，JSON）</label>
            <textarea
              value={extraJson}
              onChange={(e) => setExtraJson(e.target.value)}
              placeholder='例如：{"tone":"轻松幽默","targetAudience":"程序员"}'
            />
          </div>

          <button className="btn btnPrimary" disabled={loading} type="submit">
            {loading ? "创建中..." : "创建"}
          </button>
        </form>
      </section>
    </div>
  );
}

