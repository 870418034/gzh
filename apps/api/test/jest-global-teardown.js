const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = async () => {
  const envJsonPath = path.join(os.tmpdir(), 'aurora-api-jest-prisma-env.json');
  if (!fs.existsSync(envJsonPath)) return;

  try {
    const raw = fs.readFileSync(envJsonPath, 'utf8');
    const data = JSON.parse(raw);

    const dbFile = data?.TEST_SQLITE_DB_FILE;
    const tmpDir = data?.TEST_SQLITE_TMP_DIR;

    if (dbFile && fs.existsSync(dbFile)) {
      try {
        fs.unlinkSync(dbFile);
      } catch {}
    }

    if (tmpDir && fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  } finally {
    try {
      fs.unlinkSync(envJsonPath);
    } catch {}
  }
};

