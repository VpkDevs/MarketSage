export class PlatformManager {
  private static readonly SUPPORTED_PLATFORMS = {
    'temu.com': 'TEMU',
    'aliexpress.com': 'ALIEXPRESS',
    'dhgate.com': 'DHGATE'
  };

  private adapters: Map<string, PlatformAdapter> = new Map();

  async initialize(): Promise<void> {
    for (const [domain, platform] of Object.entries(SUPPORTED_PLATFORMS)) {
      this.adapters.set(platform, await this.loadAdapter(platform));
    }
  }

  async analyze(url: string, content: string): Promise<AnalysisResult> {
    const platform = this.detectPlatform(url);
    if (!platform) return null;

    const adapter = this.adapters.get(platform);
    return await ResilientOperation.execute(
      () => adapter.analyze(content),
      () => this.getFallbackAnalysis(content)
    );
  }

  private detectPlatform(url: string): string | null {
    const domain = new URL(url).hostname;
    return Object.entries(SUPPORTED_PLATFORMS)
      .find(([key]) => domain.includes(key))?.[1] || null;
  }
}