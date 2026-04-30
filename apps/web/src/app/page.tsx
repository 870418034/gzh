import Link from "next/link";

export default function HomePage() {
  return (
    <div className="panel">
      <h1 style={{ marginTop: 0 }}>MVP 导航</h1>
      <p className="muted">
        建议顺序：先去 <Link className="link" href="/settings/ai-connections">/settings/ai-connections</Link>{" "}
        创建连接，再去 <Link className="link" href="/settings/router">/settings/router</Link>{" "}
        配置 routing_rules，然后创建人设并发起任务。
      </p>

      <ul style={{ lineHeight: 1.9 }}>
        <li>
          <Link className="link" href="/settings/ai-connections">
            /settings/ai-connections
          </Link>{" "}
          （列表 + 新增表单，含推荐模板）
        </li>
        <li>
          <Link className="link" href="/settings/router">
            /settings/router
          </Link>{" "}
          （textarea 编辑 routing_rules JSON + 推荐提示文案）
        </li>
        <li>
          <Link className="link" href="/character">
            /character
          </Link>{" "}
          （人设列表 + 创建表单）
        </li>
        <li>
          <Link className="link" href="/activate">
            /activate
          </Link>{" "}
          （导入离线许可证，激活软件）
        </li>
        <li>
          <Link className="link" href="/industry-popular">
            /industry-popular
          </Link>{" "}
          （行业爆款素材库：手工/批量导入 + 列表筛选）
        </li>
        <li>
          <Link className="link" href="/copywriting/create-from-nothing">
            /copywriting/create-from-nothing
          </Link>{" "}
          （表单创建任务并跳转任务页）
        </li>
        <li>
          <Link className="link" href="/copywriting/viral-second-creation">
            /copywriting/viral-second-creation
          </Link>{" "}
          （rawText 输入创建任务）
        </li>
        <li>
          <Link className="link" href="/storyboard">
            /storyboard
          </Link>{" "}
          （分镜生成：创建任务并跳转任务页）
        </li>
        <li>
          <Link className="link" href="/digital-human">
            /digital-human
          </Link>{" "}
          （数字人：模板列表 + 创建 job + jobs 列表）
        </li>
      </ul>
    </div>
  );
}
