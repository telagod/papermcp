export interface PlatformLimit {
  concurrent: number;
  intervalMs: number;
  tier: 1 | 2 | 3 | 4;
}

export const platformLimits: Record<string, PlatformLimit> = {
  // Tier 1: 高可用性
  semantic: { concurrent: 3, intervalMs: 500, tier: 1 },
  crossref: { concurrent: 3, intervalMs: 500, tier: 1 },
  pmc: { concurrent: 3, intervalMs: 500, tier: 1 },
  arxiv: { concurrent: 2, intervalMs: 1000, tier: 1 },

  // Tier 2: 中等可用性
  pubmed: { concurrent: 2, intervalMs: 1000, tier: 2 },
  biorxiv: { concurrent: 1, intervalMs: 2000, tier: 2 },
  medrxiv: { concurrent: 1, intervalMs: 2000, tier: 2 },
  iacr: { concurrent: 2, intervalMs: 1000, tier: 2 },

  // Tier 3: 低可用性（严格限制）
  'google-scholar': { concurrent: 1, intervalMs: 5000, tier: 3 },
  researchgate: { concurrent: 1, intervalMs: 3000, tier: 3 },
  jstor: { concurrent: 1, intervalMs: 3000, tier: 3 },
  acm: { concurrent: 1, intervalMs: 2000, tier: 3 },

  // Tier 4: 需要认证
  wos: { concurrent: 2, intervalMs: 1000, tier: 4 },
  scopus: { concurrent: 2, intervalMs: 1000, tier: 4 },
  core: { concurrent: 2, intervalMs: 1000, tier: 4 },
  'microsoft-academic': { concurrent: 2, intervalMs: 1000, tier: 4 },
};

export const getPlatformLimit = (platform: string): PlatformLimit => {
  return platformLimits[platform] || { concurrent: 1, intervalMs: 2000, tier: 3 };
};

export const getPlatformTier = (platform: string): number => {
  return getPlatformLimit(platform).tier;
};

export const getRecommendedPlatforms = (field?: string): string[] => {
  const recommendations: Record<string, string[]> = {
    biomedical: ['pmc', 'pubmed', 'biorxiv', 'medrxiv'],
    'computer-science': ['arxiv', 'semantic', 'acm'],
    physics: ['arxiv', 'semantic'],
    mathematics: ['arxiv', 'semantic'],
    cryptography: ['iacr', 'arxiv'],
    'open-access': ['pmc', 'core', 'semantic'],
  };

  if (field && recommendations[field]) {
    return recommendations[field];
  }

  // 默认推荐 Tier 1 平台
  return ['semantic', 'crossref', 'arxiv', 'pmc'];
};
