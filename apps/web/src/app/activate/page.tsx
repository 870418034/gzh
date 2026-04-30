"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useRouter } from "next/navigation";

type LicenseStatus = {
  active: boolean;
  reason?: string;
  publicKeyConfigured: boolean;
  licensePath: string;
  machineFingerprintHash: string;
  license?: any;
};

export default function ActivatePage() {
  const router = useRouter();
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [licenseText, setLicenseText] = useState("");

  const prettyMachine = useMemo(() => {
    const v = status?.machineFingerprintHash ?? "";
    if (v.length <= 16) return v;
    return `${v.slice(0, 8)}…${v.slice(-8)}`;
  }, [status?.machineFingerprintHash]);

  async function refresh() {
    const s = await apiGet<LicenseStatus>("/license/status");
    setStatus(s);
    if (s.active) {
      // 已激活：直接回首页
      router.replace("/");
    }
  }

  useEffect(() => {
    refresh().catch((e) => setErr(String(e?.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function importLicense() {
    setErr(null);
    setLoading(true);
    try {
      const obj = JSON.parse(licenseText);
      await apiPost("/license/import", obj);
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>激活</h2>
      <p className="muted" style={{ marginTop: 6 }}>
        该软件需要离线许可证（license.json）才能使用。请把下面机器码发给你自己（或发给发证人员）生成 license，然后粘贴导入。
      </p>

      {err ? (
        <pre className="panel" style={{ borderColor: "rgba(255,99,132,0.6)" }}>
          {err}
        </pre>
      ) : null}

      <div className="row" style={{ marginTop: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div className="field">
            <label>机器码（fingerprintHash）</label>
            <input readOnly value={status?.machineFingerprintHash ?? ""} />
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              短显示：<code>{prettyMachine || "-"}</code>
            </div>
          </div>

          <div className="field">
            <label>当前状态</label>
            <div className="panel" style={{ padding: 10 }}>
              <div>
                <b>{status?.active ? "已激活" : "未激活"}</b>
              </div>
              {!status?.publicKeyConfigured ? (
                <div className="muted" style={{ marginTop: 6 }}>
                  服务端未配置公钥（AURORA_LICENSE_PUBLIC_KEY_BASE64），无法校验许可证。
                </div>
              ) : null}
              {status?.reason ? (
                <div className="muted" style={{ marginTop: 6 }}>
                  原因：{status.reason}
                </div>
              ) : null}
              <div className="muted" style={{ marginTop: 6 }}>
                license 存储路径：<code>{status?.licensePath ?? "-"}</code>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 320 }}>
          <div className="field">
            <label>粘贴 license.json 内容</label>
            <textarea
              rows={14}
              value={licenseText}
              onChange={(e) => setLicenseText(e.target.value)}
              placeholder='粘贴完整 JSON，例如：{"version":1,...,"signature":"..."}'
            />
          </div>
          <button className="btn btnPrimary" onClick={importLicense} disabled={loading || !licenseText.trim()}>
            {loading ? "导入中..." : "导入并激活"}
          </button>{" "}
          <button className="btn" onClick={() => refresh()} disabled={loading}>
            刷新状态
          </button>
        </div>
      </div>
    </div>
  );
}

