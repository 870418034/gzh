import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

/**
 * 不在启动阶段主动连接数据库：
 * - Prisma 默认是“按需连接”，只有在执行 query 时才会尝试连库
 * - 使用 sqlite 时，提前确保 DATABASE_URL=file:... 指向的目录存在
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    // PrismaClient 构造本身不会立刻触发连接，但 sqlite 文件的目录需要存在
    ensureSqliteDbDir();
    super();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

function ensureSqliteDbDir() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  if (!url.startsWith("file:")) return;

  // prisma sqlite url: file:./data/dev.db 或 file:/abs/path.db
  const withoutPrefix = url.slice("file:".length);
  if (!withoutPrefix || withoutPrefix === ":memory:") return;

  const [filePathPart] = withoutPrefix.split("?");
  if (!filePathPart) return;

  const resolvedPath = filePathPart.startsWith("/")
    ? filePathPart
    : path.resolve(process.cwd(), filePathPart);

  const dir = path.dirname(resolvedPath);
  if (!dir || dir === "." || dir === "/") return;

  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // best-effort：如果无法创建目录，让 Prisma 在首次 query 时抛错即可
  }
}
