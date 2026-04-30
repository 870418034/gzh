import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import LicenseBanner from "./license-banner";

export const metadata: Metadata = {
  title: "Aurora Union Workbench (MVP)",
  description: "Next.js App Router MVP",
};

const navItems: Array<{ href: string; label: string }> = [
  { href: "/settings/ai-connections", label: "设置 / AI 连接" },
  { href: "/settings/router", label: "设置 / Router" },
  { href: "/character", label: "人设" },
  { href: "/industry-popular", label: "行业爆款" },
  { href: "/copywriting/create-from-nothing", label: "文案 / 从零生成" },
  { href: "/copywriting/viral-second-creation", label: "文案 / 爆款二创" },
  { href: "/storyboard", label: "分镜 / Storyboard" },
  { href: "/digital-human", label: "数字人" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="container">
          <header className="panel" style={{ marginBottom: 16 }}>
            <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <Link href="/" className="link" style={{ textDecoration: "none" }}>
                  Aurora Union Workbench (MVP)
                </Link>
                <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                  前端：Next.js App Router（最小可跑通页面）
                </div>
              </div>
              <nav className="row" style={{ gap: 10 }}>
                {navItems.map((it) => (
                  <Link key={it.href} href={it.href} className="btn">
                    {it.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>

          <LicenseBanner />

          <main>{children}</main>

          <footer className="muted" style={{ marginTop: 18, fontSize: 12 }}>
            API Base URL 来自 <code>NEXT_PUBLIC_API_BASE_URL</code>；请求头会自动带{" "}
            <code>x-user-id</code>。
          </footer>
        </div>
      </body>
    </html>
  );
}
