import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import fs from 'node:fs';
import path from 'node:path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 兼容：
  // - API_PORT: 旧配置
  // - PORT: 通用配置（desktop 会传 PORT=0 以请求随机端口）
  const requestedPort = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '127.0.0.1';

  await app.listen(requestedPort, host);

  // 当 requestedPort=0 时，Node 会自动分配一个可用端口；这里取实际监听端口并输出/落盘，
  // 方便桌面端（Electron）消费。
  const address = app.getHttpServer().address();
  const actualPort =
    typeof address === 'object' && address && 'port' in address ? Number(address.port) : requestedPort;

  const portLine = String(actualPort);
  // stdout：给人类/日志看，也可被父进程解析
  process.stdout.write(`AURORA_API_PORT=${portLine}\n`);

  // 可选：写 portfile/pidfile（desktop 推荐用文件方式拿端口，避免解析日志）
  const portFile = process.env.AURORA_API_PORT_FILE;
  if (portFile) {
    fs.mkdirSync(path.dirname(portFile), { recursive: true });
    fs.writeFileSync(portFile, portLine, 'utf8');
  }
  const pidFile = process.env.AURORA_API_PID_FILE;
  if (pidFile) {
    fs.mkdirSync(path.dirname(pidFile), { recursive: true });
    fs.writeFileSync(pidFile, String(process.pid), 'utf8');
  }
}
bootstrap();
