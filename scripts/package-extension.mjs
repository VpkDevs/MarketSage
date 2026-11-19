#!/usr/bin/env node
/**
 * Deterministic, cross-platform Chrome Web Store / Edge Add-ons release
 * packager for MarketSage.
 *
 * Zero external npm or OS binary dependencies (uses Node built-ins only).
 *
 * Steps:
 *  1. Runs a clean production build (`npm run build`) unless `--skip-build` is passed.
 *  2. Runs the MV3 manifest + `dist/` integrity audit (fails fast if any
 *     referenced asset/icon/script is missing or if `.env`/`.map`/source files leak).
 *  3. Writes a deterministic store-ready `.zip` archive to:
 *       release/marketsage-v<version>.zip
 *     plus its companion SHA-256 checksum file:
 *       release/marketsage-v<version>.zip.sha256
 *  4. Prints exact file count, archive size, SHA-256 checksum, manifest version,
 *     and packaged entries.
 *
 * Usage:
 *   npm run package
 *   node scripts/package-extension.mjs [--skip-build] [--audit-only]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { auditDist } = require('./audit-dist.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const RELEASE_DIR = path.join(ROOT_DIR, 'release');

// Fixed DOS timestamp (2026-01-01 00:00:00) for reproducible ZIP SHA-256 checksums
const FIXED_DOS_TIME = 0x0000;
const FIXED_DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

// Standard IEEE 802.3 CRC-32 table (works across Node 18/20/22/24)
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Create a deterministic PKZIP 2.0 archive buffer from sorted relative file entries.
 * Uses DEFLATE when compression reduces size, and STORE otherwise (e.g. small PNGs).
 */
export function buildDeterministicZip(baseDir, relFiles) {
  const sortedFiles = [...relFiles].sort();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const relPath of sortedFiles) {
    const fullPath = path.join(baseDir, relPath);
    const rawData = fs.readFileSync(fullPath);
    const checksum = crc32(rawData);
    const deflated = zlib.deflateRawSync(rawData, { level: 9 });
    const useDeflate = deflated.length < rawData.length;
    const method = useDeflate ? 8 : 0;
    const payload = useDeflate ? deflated : rawData;
    const nameBuf = Buffer.from(relPath, 'utf8');

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed: 2.0
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(FIXED_DOS_TIME, 10);
    localHeader.writeUInt16LE(FIXED_DOS_DATE, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(rawData.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length

    localParts.push(localHeader, nameBuf, payload);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE((3 << 8) | 20, 4); // Unix + 2.0
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(FIXED_DOS_TIME, 12);
    centralHeader.writeUInt16LE(FIXED_DOS_DATE, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(rawData.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk start
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE((0o100644 << 16) >>> 0, 38); // regular file rw-r--r--
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + payload.length;
  }

  const centralDir = Buffer.concat(centralParts);

  // End of Central Directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(sortedFiles.length, 8);
  eocd.writeUInt16LE(sortedFiles.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

function main() {
  const args = new Set(process.argv.slice(2));
  const skipBuild = args.has('--skip-build');
  const auditOnly = args.has('--audit-only');

  if (!skipBuild) {
    console.log('1/3 Running clean production build...');
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
  } else {
    console.log('1/3 Skipping build (--skip-build).');
  }

  console.log('\n2/3 Running MV3 manifest & dist/ integrity audit...');
  const report = auditDist(DIST_DIR, ROOT_DIR);
  if (report.warnings.length > 0) {
    for (const warning of report.warnings) {
      console.warn(`  WARN: ${warning}`);
    }
  }
  if (!report.ok) {
    console.error('\nPackaging aborted — dist/ integrity audit failed:');
    for (const err of report.errors) {
      console.error(`  FAIL: ${err}`);
    }
    process.exit(1);
  }

  const version = report.manifest.version;
  console.log(
    `  OK: ${report.manifest.name} v${version} (MV${report.manifest.manifest_version}) — ${report.files.length} files, ${report.checkedReferences.length} manifest references verified.`
  );

  if (auditOnly) {
    console.log('\nAudit-only mode complete.');
    return;
  }

  console.log('\n3/3 Creating deterministic Chrome Web Store / Edge Add-ons release bundle...');
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
  const zipFileName = `marketsage-v${version}.zip`;
  const zipPath = path.join(RELEASE_DIR, zipFileName);
  const shaPath = `${zipPath}.sha256`;

  const zipBuffer = buildDeterministicZip(DIST_DIR, report.files);
  fs.writeFileSync(zipPath, zipBuffer);

  const sha256 = crypto.createHash('sha256').update(zipBuffer).digest('hex');
  fs.writeFileSync(shaPath, `${sha256}  ${zipFileName}\n`, 'utf8');

  const sizeKiB = (zipBuffer.length / 1024).toFixed(2);
  console.log('\n=== MarketSage Release Package Ready ===');
  console.log(`  Artifact:         ${path.relative(ROOT_DIR, zipPath)}`);
  console.log(`  Checksum file:    ${path.relative(ROOT_DIR, shaPath)}`);
  console.log(`  Manifest version: ${version} (Manifest V${report.manifest.manifest_version})`);
  console.log(`  File count:       ${report.files.length}`);
  console.log(`  Archive size:     ${zipBuffer.length} bytes (${sizeKiB} KiB)`);
  console.log(`  SHA-256:          ${sha256}`);
  console.log('  Packaged entries:');
  for (const entry of report.files) {
    const fileSize = fs.statSync(path.join(DIST_DIR, entry)).size;
    console.log(`    - ${entry} (${fileSize} bytes)`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
