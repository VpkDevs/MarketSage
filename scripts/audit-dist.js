#!/usr/bin/env node
/**
 * MV3 Manifest & Built Extension (`dist/`) Integrity Auditor for MarketSage.
 *
 * Verifies:
 *  - dist/manifest.json is valid MV3 and its version matches package.json
 *  - Every file referenced in manifest.json exists in dist/ and is non-empty
 *    (background.service_worker, action.default_popup, action.default_icon,
 *    icons, content_scripts, options_page/options_ui, side_panel,
 *    web_accessible_resources)
 *  - PNG icons have valid PNG signatures and match declared pixel dimensions
 *  - Popup HTML references only existing local assets and has no inline scripts
 *  - No forbidden/leaked artifacts (.env*, .map, .ts/.tsx, OS metadata, keys)
 *    exist anywhere inside dist/
 *  - API host permissions enforce HTTPS
 *
 * Usage:
 *   node scripts/audit-dist.js [distDir]
 */
const fs = require('fs');
const path = require('path');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const FORBIDDEN_FILE_PATTERNS = [
  { regex: /(^|\/)\.env(\..+)?$/i, reason: 'environment secret file (.env*)' },
  { regex: /\.map$/i, reason: 'source map (.map)' },
  { regex: /\.tsx?$/i, reason: 'TypeScript source file (.ts/.tsx)' },
  { regex: /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/i, reason: 'OS metadata file' },
  { regex: /(^|\/)\.git/i, reason: 'git metadata file' },
  { regex: /\.(pem|key|p12|pfx)$/i, reason: 'private key or certificate file' }
];

const MV2_FORBIDDEN_KEYS = ['browser_action', 'page_action'];

function toPosix(relPath) {
  return relPath.split(path.sep).join('/');
}

function walkFiles(dir, baseDir = dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      results.push(toPosix(path.relative(baseDir, fullPath)));
    }
  }
  return results.sort();
}

function globToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLE_STAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function validateManifest(manifest, packageJson) {
  const errors = [];
  const warnings = [];

  if (!manifest || typeof manifest !== 'object') {
    return { ok: false, errors: ['manifest.json must be a JSON object'], warnings };
  }

  if (manifest.manifest_version !== 3) {
    errors.push(`manifest_version must be 3 (got ${JSON.stringify(manifest.manifest_version)})`);
  }

  for (const key of ['name', 'version', 'description']) {
    if (typeof manifest[key] !== 'string' || manifest[key].trim().length === 0) {
      errors.push(`manifest.json is missing required non-empty field "${key}"`);
    }
  }

  if (typeof manifest.version === 'string' && !/^\d+(\.\d+){0,3}$/.test(manifest.version)) {
    errors.push(
      `manifest.version "${manifest.version}" is not a valid Chrome extension version (1-4 dot-separated integers)`
    );
  }

  if (
    packageJson &&
    typeof packageJson.version === 'string' &&
    typeof manifest.version === 'string' &&
    manifest.version !== packageJson.version
  ) {
    errors.push(
      `Version mismatch: manifest.json has "${manifest.version}" but package.json has "${packageJson.version}"`
    );
  }

  if (typeof manifest.description === 'string' && manifest.description.length > 132) {
    errors.push(
      `manifest.description is ${manifest.description.length} chars (Chrome Web Store max is 132)`
    );
  }

  for (const mv2Key of MV2_FORBIDDEN_KEYS) {
    if (mv2Key in manifest) {
      errors.push(`MV2 key "${mv2Key}" is not valid in Manifest V3`);
    }
  }

  if (manifest.background) {
    if ('scripts' in manifest.background || 'persistent' in manifest.background) {
      errors.push('MV3 background must use "service_worker", not MV2 "scripts"/"persistent"');
    }
    if (!manifest.background.service_worker) {
      errors.push('manifest.background is missing "service_worker"');
    }
  }

  if (Array.isArray(manifest.host_permissions)) {
    for (const perm of manifest.host_permissions) {
      if (
        typeof perm === 'string' &&
        perm.includes('generativelanguage.googleapis.com') &&
        !perm.startsWith('https://')
      ) {
        errors.push(
          `API host permission "${perm}" must enforce HTTPS (use "https://generativelanguage.googleapis.com/*")`
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

function validatePngIcon(filePath, expectedSize, label) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return `${label} (${filePath}) is not a valid PNG file`;
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (expectedSize && (width !== expectedSize || height !== expectedSize)) {
    return `${label} declares ${expectedSize}x${expectedSize} but PNG dimensions are ${width}x${height}`;
  }
  return null;
}

function auditHtmlPage(distDir, relPath, errors) {
  const fullPath = path.join(distDir, relPath);
  const html = fs.readFileSync(fullPath, 'utf8');

  // Verify all local <script src="..."> and <link rel="stylesheet" href="..."> exist inside dist/
  const scriptTagRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptTagRegex.exec(html)) !== null) {
    const attrs = match[1];
    const body = match[2].trim();
    const srcMatch = /\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i.exec(attrs);
    if (!srcMatch) {
      if (body.length > 0) {
        errors.push(`${relPath} contains an inline <script> block, which violates MV3 CSP`);
      }
      continue;
    }
    const src = srcMatch[1] || srcMatch[2] || srcMatch[3];
    if (/^https?:\/\//i.test(src)) {
      errors.push(`${relPath} loads remote script "${src}", which violates MV3 CSP`);
      continue;
    }
    const resolved = path.resolve(path.dirname(fullPath), src);
    if (!resolved.startsWith(path.resolve(distDir))) {
      errors.push(`${relPath} script src "${src}" escapes dist/ directory`);
    } else if (!fs.existsSync(resolved) || fs.statSync(resolved).size === 0) {
      errors.push(`${relPath} references missing or empty script "${src}"`);
    }
  }
}

function auditDist(distDir, rootDir = path.resolve(__dirname, '..')) {
  const resolvedDist = path.resolve(distDir);
  const errors = [];
  const warnings = [];
  const checkedReferences = [];

  if (!fs.existsSync(resolvedDist) || !fs.statSync(resolvedDist).isDirectory()) {
    return {
      ok: false,
      errors: [`Build output directory does not exist: ${resolvedDist}`],
      warnings,
      manifest: null,
      files: [],
      checkedReferences
    };
  }

  const files = walkFiles(resolvedDist);

  // 1. Check for forbidden/leaked artifacts anywhere inside dist/
  for (const relFile of files) {
    for (const rule of FORBIDDEN_FILE_PATTERNS) {
      if (rule.regex.test(relFile)) {
        errors.push(`Forbidden file leaked into dist/: "${relFile}" (${rule.reason})`);
      }
    }
  }

  // 2. Load and validate dist/manifest.json
  const manifestPath = path.join(resolvedDist, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return {
      ok: false,
      errors: [...errors, 'dist/manifest.json is missing'],
      warnings,
      manifest: null,
      files,
      checkedReferences
    };
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    return {
      ok: false,
      errors: [...errors, `dist/manifest.json is invalid JSON: ${err.message}`],
      warnings,
      manifest: null,
      files,
      checkedReferences
    };
  }

  let packageJson = null;
  const packageJsonPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    } catch (err) {
      errors.push(`package.json is invalid JSON: ${err.message}`);
    }
  }

  const manifestValidation = validateManifest(manifest, packageJson);
  errors.push(...manifestValidation.errors);
  warnings.push(...manifestValidation.warnings);

  // Helper to verify a single relative asset exists inside dist/ and is non-empty
  const assertAsset = (relPath, label, expectedPngSize = null) => {
    if (typeof relPath !== 'string' || relPath.trim().length === 0) {
      errors.push(`${label} must be a non-empty relative path`);
      return;
    }
    const normalized = toPosix(relPath.replace(/^\/+/, ''));
    const fullPath = path.resolve(resolvedDist, normalized);
    checkedReferences.push({ label, path: normalized });

    if (!fullPath.startsWith(resolvedDist + path.sep) && fullPath !== resolvedDist) {
      errors.push(`${label} path "${relPath}" escapes dist/`);
      return;
    }
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      errors.push(`${label} references missing file "${normalized}" in dist/`);
      return;
    }
    if (fs.statSync(fullPath).size === 0) {
      errors.push(`${label} references empty file "${normalized}" in dist/`);
      return;
    }
    if (normalized.toLowerCase().endsWith('.png')) {
      const pngError = validatePngIcon(fullPath, expectedPngSize, label);
      if (pngError) errors.push(pngError);
    }
  };

  // 3. Verify every manifest-referenced asset exists inside dist/
  if (manifest.background?.service_worker) {
    assertAsset(manifest.background.service_worker, 'background.service_worker');
  }

  if (manifest.action?.default_popup) {
    assertAsset(manifest.action.default_popup, 'action.default_popup');
    const popupFull = path.resolve(resolvedDist, manifest.action.default_popup);
    if (fs.existsSync(popupFull) && fs.statSync(popupFull).isFile()) {
      auditHtmlPage(resolvedDist, toPosix(manifest.action.default_popup), errors);
    }
  }

  if (manifest.action?.default_icon) {
    if (typeof manifest.action.default_icon === 'string') {
      assertAsset(manifest.action.default_icon, 'action.default_icon');
    } else if (typeof manifest.action.default_icon === 'object') {
      for (const [size, iconPath] of Object.entries(manifest.action.default_icon)) {
        const numericSize = /^\d+$/.test(size) ? Number(size) : null;
        assertAsset(iconPath, `action.default_icon[${size}]`, numericSize);
      }
    }
  }

  if (manifest.icons && typeof manifest.icons === 'object') {
    for (const [size, iconPath] of Object.entries(manifest.icons)) {
      const numericSize = /^\d+$/.test(size) ? Number(size) : null;
      assertAsset(iconPath, `icons[${size}]`, numericSize);
    }
  }

  if (Array.isArray(manifest.content_scripts)) {
    manifest.content_scripts.forEach((entry, idx) => {
      if (Array.isArray(entry.js)) {
        entry.js.forEach((jsPath, j) =>
          assertAsset(jsPath, `content_scripts[${idx}].js[${j}]`)
        );
      }
      if (Array.isArray(entry.css)) {
        entry.css.forEach((cssPath, c) =>
          assertAsset(cssPath, `content_scripts[${idx}].css[${c}]`)
        );
      }
    });
  }

  if (manifest.options_page) {
    assertAsset(manifest.options_page, 'options_page');
  }
  if (manifest.options_ui?.page) {
    assertAsset(manifest.options_ui.page, 'options_ui.page');
  }
  if (manifest.side_panel?.default_path) {
    assertAsset(manifest.side_panel.default_path, 'side_panel.default_path');
  }

  if (Array.isArray(manifest.web_accessible_resources)) {
    manifest.web_accessible_resources.forEach((entry, idx) => {
      if (!Array.isArray(entry.resources) || entry.resources.length === 0) {
        errors.push(`web_accessible_resources[${idx}].resources must be a non-empty array`);
        return;
      }
      for (const pattern of entry.resources) {
        const matcher = globToRegex(toPosix(String(pattern).replace(/^\/+/, '')));
        const matched = files.filter(f => matcher.test(f));
        checkedReferences.push({
          label: `web_accessible_resources[${idx}]`,
          path: pattern,
          matchedCount: matched.length
        });
        if (matched.length === 0) {
          errors.push(
            `web_accessible_resources[${idx}] pattern "${pattern}" matched zero files in dist/`
          );
        }
      }
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    manifest,
    files,
    checkedReferences
  };
}

module.exports = {
  auditDist,
  validateManifest,
  walkFiles,
  FORBIDDEN_FILE_PATTERNS
};

if (require.main === module) {
  const rootDir = path.resolve(__dirname, '..');
  const distDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(rootDir, 'dist');
  const report = auditDist(distDir, rootDir);

  console.log(`MV3 dist integrity audit: ${distDir}`);
  console.log(`  Files scanned: ${report.files.length}`);
  console.log(`  Manifest references verified: ${report.checkedReferences.length}`);

  if (report.warnings.length > 0) {
    console.log('\nWarnings:');
    for (const w of report.warnings) console.log(`  - ${w}`);
  }

  if (!report.ok) {
    console.error('\nAudit FAILED:');
    for (const err of report.errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log(
    `Audit PASSED (MV${report.manifest.manifest_version}, ${report.manifest.name} v${report.manifest.version}).`
  );
}
