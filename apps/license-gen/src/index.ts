#!/usr/bin/env node
/* eslint-disable no-console */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  base64ToBytes,
  bytesToBase64,
  getPublicKey,
  signLicense,
  type License,
} from "@aurora/licensing";

type Features = {
  copywriting: boolean;
  storyboard: boolean;
  digitalHuman: boolean;
  industryPopular: boolean;
};

const DEFAULT_FEATURES: Features = {
  copywriting: true,
  storyboard: true,
  digitalHuman: true,
  industryPopular: true,
};

function printHelp(): void {
  const help = `
Aurora License Generator (license-gen)

Usage:
  license-gen keygen [--out <dir>]
  license-gen --machine <fingerprintHash> --expires <YYYY-MM-DD> [--out <path>] [--features <json>]

Key storage:
  - keygen 默认仅输出到 stdout；指定 --out 时会写入:
      <dir>/private.key   (32-byte Ed25519 seed, base64)
      <dir>/public.key    (Ed25519 public key, base64)
  - 生成 license 时默认从环境变量读取:
      AURORA_LICENSE_PRIVATE_KEY_BASE64
    否则会尝试读取当前目录的 ./private.key

Options:
  --machine     机器指纹 hash（必填）
  --expires     到期日 YYYY-MM-DD（必填，按 UTC 当天 23:59:59.999 计算）
  --out         输出路径（默认：license.json）
  --features    JSON 字符串，可覆盖默认 features（copywriting/storyboard/digitalHuman/industryPopular）
  --help        显示帮助
`.trim();
  console.log(help);
}

function die(msg: string, code = 1): never {
  console.error(msg);
  process.exit(code);
}

function parseArgv(argv: string[]): { command: string | null; opts: Record<string, string> } {
  const args = argv.slice(2);
  const opts: Record<string, string> = {};

  let command: string | null = null;
  if (args.length > 0 && !args[0].startsWith("-")) {
    command = args[0];
  }

  const start = command ? 1 : 0;
  for (let i = start; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) continue;

    const eqIdx = a.indexOf("=");
    if (eqIdx >= 0) {
      const k = a.slice(2, eqIdx);
      const v = a.slice(eqIdx + 1);
      opts[k] = v;
      continue;
    }

    const k = a.slice(2);
    const v = args[i + 1];
    if (v == null || v.startsWith("--")) {
      opts[k] = "true";
      continue;
    }
    opts[k] = v;
    i++;
  }

  return { command, opts };
}

async function writeFileEnsuringDir(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

function parseExpiresToISOString(expires: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expires)) {
    throw new Error(`--expires 需要 YYYY-MM-DD，收到：${expires}`);
  }
  const dt = new Date(`${expires}T23:59:59.999Z`);
  const ts = dt.getTime();
  if (!Number.isFinite(ts)) throw new Error(`--expires 日期非法：${expires}`);
  return dt.toISOString();
}

function parseFeatures(raw: string | undefined): Features {
  if (!raw) return { ...DEFAULT_FEATURES };
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (e: any) {
    throw new Error(`--features 不是合法 JSON：${String(e?.message ?? e)}`);
  }

  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`--features 必须是 JSON object`);
  }

  const merged: any = { ...DEFAULT_FEATURES, ...parsed };
  for (const k of Object.keys(DEFAULT_FEATURES) as (keyof Features)[]) {
    if (typeof merged[k] !== "boolean") {
      throw new Error(`--features.${k} 必须为 boolean`);
    }
  }
  return merged as Features;
}

async function cmdKeygen(opts: Record<string, string>): Promise<void> {
  const outDir = opts.out;

  const seed = crypto.randomBytes(32);
  const seedBytes = new Uint8Array(seed);
  const publicKeyBytes = await getPublicKey(seedBytes);

  const privateKeySeedBase64 = bytesToBase64(seedBytes);
  const publicKeyBase64 = bytesToBase64(publicKeyBytes);

  console.log(
    JSON.stringify(
      {
        privateKeySeedBase64,
        publicKeyBase64,
      },
      null,
      2,
    ),
  );

  if (outDir) {
    const privatePath = path.resolve(outDir, "private.key");
    const publicPath = path.resolve(outDir, "public.key");
    await writeFileEnsuringDir(privatePath, `${privateKeySeedBase64}\n`);
    await writeFileEnsuringDir(publicPath, `${publicKeyBase64}\n`);
    console.error(`Wrote: ${privatePath}`);
    console.error(`Wrote: ${publicPath}`);
  }
}

async function readPrivateKeySeedBase64(opts: Record<string, string>): Promise<string> {
  const env = process.env.AURORA_LICENSE_PRIVATE_KEY_BASE64;
  if (env && env.trim()) return env.trim();

  const keyPath = opts["private-key"] ? path.resolve(opts["private-key"]) : path.resolve("private.key");
  const raw = await fs.readFile(keyPath, "utf8");
  return raw.trim();
}

async function cmdGenerateLicense(opts: Record<string, string>): Promise<void> {
  const machine = opts.machine;
  const expires = opts.expires;
  const outPath = path.resolve(opts.out ?? "license.json");

  if (!machine) throw new Error(`缺少参数：--machine <fingerprintHash>`);
  if (!expires) throw new Error(`缺少参数：--expires <YYYY-MM-DD>`);

  const expiresAt = parseExpiresToISOString(expires);
  const issuedAt = new Date().toISOString();
  const licenseId = crypto.randomBytes(8).toString("hex");

  const features = parseFeatures(opts.features);

  const privateSeedBase64 = await readPrivateKeySeedBase64(opts);
  const privateSeedBytes = base64ToBytes(privateSeedBase64);
  if (privateSeedBytes.length !== 32) {
    throw new Error(
      `private key seed 必须为 32-byte base64（当前解码后长度=${privateSeedBytes.length}）`,
    );
  }

  const unsigned = {
    version: 1 as const,
    product: "aurora-union-workbench" as const,
    licenseId,
    issuedAt,
    expiresAt,
    machine: { fingerprintHash: machine },
    features,
  };

  const license: License = await signLicense(unsigned as any, privateSeedBytes);
  await writeFileEnsuringDir(outPath, `${JSON.stringify(license, null, 2)}\n`);
  console.error(`Wrote: ${outPath}`);
}

async function main(): Promise<void> {
  const { command, opts } = parseArgv(process.argv);

  if (opts.help === "true" || command === "help") {
    printHelp();
    return;
  }

  if (command === "keygen") {
    await cmdKeygen(opts);
    return;
  }

  // default: generate license.json
  await cmdGenerateLicense(opts);
}

main().catch((e: any) => {
  if (e?.message) die(String(e.message));
  die(String(e));
});

