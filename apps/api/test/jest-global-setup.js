const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

/**
 * Jest globalSetup 运行在独立进程中，无法直接把 process.env 变更“传递”给测试进程。
 * 所以这里将 DATABASE_URL 等写入一个约定路径的 JSON 文件，测试侧通过 setupFiles 读取并注入。
 */
module.exports = async () => {
  const envJsonPath = path.join(os.tmpdir(), 'aurora-api-jest-prisma-env.json');

  // 为每次 jest 运行创建独立临时目录，避免复用导致的脏数据
  const runId = crypto.randomBytes(8).toString('hex');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `aurora-api-test-${runId}-`));
  const dbFile = path.join(tmpDir, 'db.sqlite');

  // prisma sqlite 连接串支持绝对路径：file:/tmp/xxx/db.sqlite
  const databaseUrl = `file:${dbFile}`;

  // 记录给 setupFiles / teardown 用
  fs.writeFileSync(
    envJsonPath,
    JSON.stringify(
      {
        DATABASE_URL: databaseUrl,
        TEST_SQLITE_DB_FILE: dbFile,
        TEST_SQLITE_TMP_DIR: tmpDir,
      },
      null,
      2,
    ),
    'utf8',
  );

  const projectRoot = path.resolve(__dirname, '..'); // apps/api
  const prismaBin = path.join(projectRoot, 'node_modules', '.bin', 'prisma');
  const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');

  // db push：保证测试运行前，SQLite 文件存在且 schema 已落库
  execFileSync(
    prismaBin,
    ['db', 'push', '--schema', schemaPath, '--skip-generate', '--accept-data-loss'],
    {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl },
    },
  );
};

