export type PlatformID =
  | 'arxiv'
  | 'pubmed'
  | 'pmc'
  | 'biorxiv'
  | 'medrxiv'
  | 'google-scholar'
  | 'iacr'
  | 'semantic'
  | 'crossref'
  | 'sci-hub'
  | 'libgen'
  | 'oa-button'
  | 'unpaywall'
  | 'science-direct'
  | 'springer-link'
  | 'ieee-xplore'
  | 'acm'
  | 'wos'
  | 'scopus'
  | 'jstor'
  | 'researchgate'
  | 'core'
  | 'microsoft-academic';

export interface Paper extends Record<string, unknown> {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  doi?: string;
  publishedAt?: string;
  updatedAt?: string;
  pdfUrl?: string;
  url?: string;
  source: PlatformID;
  categories: string[];
  keywords: string[];
  citations?: number;
  references: string[];
  extra?: Record<string, unknown>;
}

export interface PaperText extends Record<string, unknown> {
  id: string;
  source: PlatformID;
  text: string;
  statistics: {
    pages?: number;
    sizeInBytes?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface DownloadResult extends Record<string, unknown> {
  id: string;
  source: PlatformID;
  path: string;
  sizeInBytes?: number;
  cached: boolean;
}

export interface SearchQuery {
  text: string;
  limit?: number;
  cursor?: string;
  year?: string;
  filters?: Record<string, string | number | boolean>;
}

export interface SearchResult extends Record<string, unknown> {
  items: Paper[];
  nextCursor?: string;
  source: PlatformID;
  meta?: Record<string, unknown>;
}

export interface PlatformAdapter {
  id: PlatformID;
  search(query: SearchQuery): Promise<SearchResult>;
  download(id: string, dir: string): Promise<DownloadResult>;
  read(id: string, dir: string): Promise<PaperText>;
  lookup?(id: string): Promise<Paper | null>;
}

export interface PluginModule {
  id: PlatformID;
  enabled: boolean;
  create(config: Record<string, unknown>): Promise<PlatformAdapter>;
}
