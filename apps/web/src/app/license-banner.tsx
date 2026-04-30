"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { usePathname } from "next/navigation";

type LicenseStatus = {
  active: boolean;
  reason?: string;
};

export default function LicenseBanner() {
  const pathname = usePathname();
  const [status, setStatus] = useState<LicenseStatus | null>(null);

  useEffect(() => {
    apiGet<any>("/license/status")
      .then((s) => setStatus({ active: !!s.active, reason: s.reason }))
      .catch(() => setStatus({ active: false, reason: "无法获取许可证状态" }));
  }, []);

  // 选择 B：在 /activate 本身不显示横幅，避免重复
  if (pathname === "/activate") return null;
  if (!status) return null;
  if (status.active) return null;

  return (
    <div className="panel" style={{ marginBottom: 16, borderColor: "rgba(255,165,0,0.55)" }}>
      <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <b>未激活</b>
          <span className="muted" style={{ marginLeft: 10, fontSize: 12 }}>
            {status.reason ? `原因：${status.reason}` : "需要导入许可证"}
          </span>
        </div>
        <Link className="btn btnPrimary" href="/activate">
          去激活
        </Link>
      </div>
    </div>
  );
}

