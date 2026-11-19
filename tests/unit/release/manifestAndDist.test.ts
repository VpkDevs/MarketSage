import fs from 'fs';
import os from 'os';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { auditDist, validateManifest } = require('../../../scripts/audit-dist.js');

const ROOT_DIR = path.resolve(__dirname, '../../..');

function createMinimalPng(size: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from([0x00, 0x00, 0x00, 0x0d]),
    Buffer.from('IHDR', 'ascii'),
    ihdr
  ]);
}

function createValidDistFixture(baseDir: string, version: string): void {
  fs.mkdirSync(path.join(baseDir, 'icons'), { recursive: true });
  fs.writeFileSync(
    path.join(baseDir, 'manifest.json'),
    JSON.stringify(
      {
        manifest_version: 3,
        name: 'MarketSage',
        version,
        minimum_chrome_version: '102',
        description: 'Smart shopping assistant for Chinese marketplaces',
        permissions: ['storage', 'activeTab', 'tabs', 'notifications'],
        host_permissions: [
          '*://*.temu.com/*',
          'https://generativelanguage.googleapis.com/*'
        ],
        background: { service_worker: 'background.js' },
        content_scripts: [{ matches: ['*://*.temu.com/*'], js: ['content.js'] }],
        action: {
          default_popup: 'popup.html',
          default_icon: {
            '16': 'icons/icon16.png',
            '48': 'icons/icon48.png',
            '128': 'icons/icon128.png'
          }
        },
        icons: {
          '16': 'icons/icon16.png',
          '48': 'icons/icon48.png',
          '128': 'icons/icon128.png'
        },
        web_accessible_resources: [
          { resources: ['icons/*'], matches: ['*://*.temu.com/*'] }
        ]
      },
      null,
      2
    )
  );
  fs.writeFileSync(path.join(baseDir, 'background.js'), 'console.log("bg");');
  fs.writeFileSync(path.join(baseDir, 'content.js'), 'console.log("content");');
  fs.writeFileSync(path.join(baseDir, 'popup.js'), 'console.log("popup");');
  fs.writeFileSync(
    path.join(baseDir, 'popup.html'),
    '<!doctype html><html><head><script defer src="popup.js"></script></head><body><div id="root"></div></body></html>'
  );
  fs.writeFileSync(path.join(baseDir, 'icons/icon16.png'), createMinimalPng(16));
  fs.writeFileSync(path.join(baseDir, 'icons/icon48.png'), createMinimalPng(48));
  fs.writeFileSync(path.join(baseDir, 'icons/icon128.png'), createMinimalPng(128));
}

describe('MV3 manifest & dist integrity audit', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  const srcManifest = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'src/manifest.json'), 'utf8')
  );

  it('validates src/manifest.json as clean MV3 matching package.json', () => {
    const result = validateManifest(srcManifest, pkg);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(srcManifest.manifest_version).toBe(3);
    expect(srcManifest.host_permissions).toContain(
      'https://generativelanguage.googleapis.com/*'
    );
    expect(srcManifest.host_permissions).not.toContain(
      '*://generativelanguage.googleapis.com/*'
    );
  });

  describe('auditDist fixture checks', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marketsage-dist-test-'));
      createValidDistFixture(tmpDir, pkg.version);
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('passes on a complete, clean MV3 dist directory', () => {
      const report = auditDist(tmpDir, ROOT_DIR);
      expect(report.errors).toEqual([]);
      expect(report.ok).toBe(true);
    });

    it('fails fast when a manifest-referenced icon is missing', () => {
      fs.unlinkSync(path.join(tmpDir, 'icons/icon48.png'));
      const report = auditDist(tmpDir, ROOT_DIR);
      expect(report.ok).toBe(false);
      expect(report.errors.some((e: string) => e.includes('icons/icon48.png'))).toBe(true);
    });

    it('fails fast when PNG icon dimensions do not match manifest declaration', () => {
      fs.writeFileSync(path.join(tmpDir, 'icons/icon128.png'), createMinimalPng(48));
      const report = auditDist(tmpDir, ROOT_DIR);
      expect(report.ok).toBe(false);
      expect(report.errors.some((e: string) => e.includes('128x128'))).toBe(true);
    });

    it('fails fast when .env or source maps leak into dist/', () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), 'SECRET=123');
      fs.writeFileSync(path.join(tmpDir, 'popup.js.map'), '{}');
      const report = auditDist(tmpDir, ROOT_DIR);
      expect(report.ok).toBe(false);
      expect(report.errors.some((e: string) => e.includes('.env'))).toBe(true);
      expect(report.errors.some((e: string) => e.includes('popup.js.map'))).toBe(true);
    });

    it('fails fast when popup.html contains an inline script (MV3 CSP violation)', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'popup.html'),
        '<!doctype html><html><body><script>alert(1)</script></body></html>'
      );
      const report = auditDist(tmpDir, ROOT_DIR);
      expect(report.ok).toBe(false);
      expect(report.errors.some((e: string) => e.includes('inline <script>'))).toBe(true);
    });

    it('fails fast when Gemini host permission allows non-HTTPS', () => {
      const manifestPath = path.join(tmpDir, 'manifest.json');
      const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      m.host_permissions = ['*://*.temu.com/*', '*://generativelanguage.googleapis.com/*'];
      fs.writeFileSync(manifestPath, JSON.stringify(m));
      const report = auditDist(tmpDir, ROOT_DIR);
      expect(report.ok).toBe(false);
      expect(report.errors.some((e: string) => e.includes('must enforce HTTPS'))).toBe(true);
    });
  });

  it('passes full integrity audit on built dist/ when present', () => {
    const builtDistDir = path.join(ROOT_DIR, 'dist');
    if (!fs.existsSync(path.join(builtDistDir, 'manifest.json'))) {
      // Fresh checkout before `npm run build`: skip dist/ check here;
      // `npm run package` / `npm run audit:dist` enforces it post-build.
      return;
    }
    const report = auditDist(builtDistDir, ROOT_DIR);
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });
});
