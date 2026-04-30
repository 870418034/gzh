const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * setupFiles：在每个测试环境初始化前运行，用于注入 globalSetup 生成的 env。
 */
(() => {
  const envJsonPath = path.join(os.tmpdir(), 'aurora-api-jest-prisma-env.json');
  if (!fs.existsSync(envJsonPath)) return;

  try {
    const raw = fs.readFileSync(envJsonPath, 'utf8');
    const data = JSON.parse(raw);
    if (data?.DATABASE_URL) process.env.DATABASE_URL = data.DATABASE_URL;
    if (data?.TEST_SQLITE_DB_FILE) process.env.TEST_SQLITE_DB_FILE = data.TEST_SQLITE_DB_FILE;
    if (data?.TEST_SQLITE_TMP_DIR) process.env.TEST_SQLITE_TMP_DIR = data.TEST_SQLITE_TMP_DIR;
  } catch {
    // ignore
  }
})();

