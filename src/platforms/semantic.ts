import { readFile, stat, writeFile } from 'node:fs/promises';
import type { DownloadResult, Paper, PaperText, SearchQuery, SearchResult } from '../core/types.js';
import { PlatformError } from '../core/errors.js';
import { requestBuffer, requestJson } from '../utils/http.js';
import { BasePlatformAdapter } from './baseAdapter.js';
import { addAdapterFactory } from './index.js';
import pdfParse from 'pdf-parse';

const BASE_URL = 'https://api.semanticscholar.org/graph/v1';
const USER_AGENT = 'paper-search-mcp-ts/0.1.0 (+https://github.com/openags/paper-search-mcp)';
const DEFAULT_FIELDS = [
  'title',
  'abstract',
  'year',
  'citationCount',
  'influentialCitationCount',
  'authors',
  'url',
  'venue',
  'publicationDate',
  'externalIds',
  'fieldsOfStudy',
  'tldr',
  'isOpenAccess',
  'openAccessPdf',
];

type SemanticAuthor = {
  name?: string;
};

type SemanticOpenAccess = {
  url?: string;
  status?: string;
  disclaimer?: string;
};

type SemanticItem = {
  paperId: string;
  title?: string;
  abstract?: string;
  year?: number;
  citationCount?: number;
  influentialCitationCount?: number;
  url?: string;
  venue?: string;
  publicationDate?: string;
  authors?: SemanticAuthor[];
  externalIds?: Record<string, string>;
  fieldsOfStudy?: string[];
  openAccessPdf?: SemanticOpenAccess | null;
  tldr?: { text?: string } | null;
  isOpenAccess?: boolean;
};

type SemanticSearchResponse = {
  data: SemanticItem[];
};

const sanitizeId = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

const getApiKey = () => {
  const key = process.env.SEMANTIC_SCHOLAR_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : undefined;
};

const buildHeaders = () => {
  const headers: Record<string, string> = {
    'user-agent': USER_AGENT,
  };
  const apiKey = getApiKey();
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  return headers;
};

const toIso = (value?: string | number): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'number') {
    return new Date(value, 0, 1).toISOString();
  }
  const stamp = new Date(value);
  if (Number.isNaN(stamp.getTime())) {
    return undefined;
  }
  return stamp.toISOString();
};

const extractAuthors = (value?: SemanticAuthor[]): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(author => (typeof author.name === 'string' ? author.name : ''))
    .filter(Boolean);
};

const extractPdfUrl = (openAccess?: SemanticOpenAccess | null): string | undefined => {
  if (!openAccess) {
    return undefined;
  }
  if (openAccess.url) {
    return openAccess.url;
  }
  if (!openAccess.disclaimer) {
    return undefined;
  }
  const regex = /https?:\/\/[^\s,)]+/g;
  const matches = openAccess.disclaimer.match(regex);
  if (!matches || matches.length === 0) {
    return undefined;
  }
  const doiLink = matches.find(link => link.includes('doi.org'));
  if (doiLink) {
    return doiLink;
  }
  const alt = matches.find(link => !link.includes('unpaywall.org')) ?? matches[0];
  if (alt && alt.includes('arxiv.org/abs/')) {
    return alt.replace('/abs/', '/pdf/');
  }
  return alt;
};

const toPaper = (item: SemanticItem): Paper => {
  const publishedAt = toIso(item.publicationDate) ?? toIso(item.year);
  const pdfUrl = extractPdfUrl(item.openAccessPdf ?? undefined);
  const doi = item.externalIds?.DOI ?? '';
  return {
    id: item.paperId,
    title: item.title ?? '',
    authors: extractAuthors(item.authors),
    abstract: item.abstract ?? '',
    doi,
    url: item.url ?? '',
    source: 'semantic',
    categories: item.fieldsOfStudy ?? [],
    keywords: [],
    references: [],
    citations: item.citationCount ?? 0,
    extra: {
      externalIds: item.externalIds ?? {},
      venue: item.venue ?? '',
      isOpenAccess: item.isOpenAccess ?? undefined,
      influentialCitationCount: item.influentialCitationCount ?? undefined,
      tldr: item.tldr?.text,
    },
    ...(publishedAt ? { publishedAt, updatedAt: publishedAt } : {}),
    ...(pdfUrl ? { pdfUrl } : {}),
  };
};

const requestSemantic = async <T>(path: string, params: Record<string, string>): Promise<T> => {
  const url = new URL(`${BASE_URL}/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  const headers = buildHeaders();
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await requestJson<T>({ url: url.toString(), method: 'GET', headers });
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts - 1;
      if (isLastAttempt) {
        throw error;
      }
      const backoffMs = 1000 * 2 ** attempt;
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  throw new Error('Semantic Scholar 请求失败');
};

export class SemanticAdapter extends BasePlatformAdapter {
  constructor() {
    super('semantic');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const limit = query.limit ?? 10;
    const params: Record<string, string> = {
      query: query.text,
      limit: String(limit),
      fields: DEFAULT_FIELDS.join(','),
    };
    if (query.filters?.year) {
      params.year = String(query.filters.year);
    }
    if (query.cursor) {
      params.offset = query.cursor;
    } else if (typeof query.filters?.offset === 'number') {
      params.offset = String(query.filters.offset);
    }
    const response = await requestSemantic<SemanticSearchResponse>('paper/search', params);
    const items = response.data?.map(toPaper) ?? [];
    return {
      items,
      source: this.id,
      meta: {
        count: items.length,
        params,
      },
    };
  }

  async download(id: string, dir: string): Promise<DownloadResult> {
    const paper = await this.getPaperDetails(id);
    if (!paper) {
      throw new PlatformError(`未找到论文 ${id}`, this.id);
    }
    if (!paper.pdfUrl) {
      throw new PlatformError(`论文 ${id} 未提供 PDF 链接`, this.id);
    }
    const safeName = `semantic_${sanitizeId(id)}.pdf`;
    const target = this.resolvePath(dir, safeName);
    const info = await stat(target).catch(() => null);
    if (info) {
      return { id, source: this.id, path: target, sizeInBytes: info.size, cached: true };
    }
    await this.ensureDir(dir);
    const buffer = await requestBuffer({ url: paper.pdfUrl, method: 'GET' });
    await writeFile(target, buffer);
    return { id, source: this.id, path: target, sizeInBytes: buffer.byteLength, cached: false };
  }

  async read(id: string, dir: string): Promise<PaperText> {
    const downloadResult = await this.download(id, dir);
    const data = await readFile(downloadResult.path);
    const pdf = await pdfParse(data);
    return {
      id,
      source: this.id,
      text: pdf.text.trim(),
      statistics: {
        pages: pdf.numpages,
        sizeInBytes: downloadResult.sizeInBytes ?? data.byteLength,
      },
    };
  }

  async getPaperDetails(id: string): Promise<Paper | null> {
    const params = {
      fields: DEFAULT_FIELDS.join(','),
    };
    try {
      const response = await requestSemantic<SemanticItem>(`paper/${encodeURIComponent(id)}`, params);
      return toPaper(response);
    } catch (error) {
      throw new PlatformError(`获取论文 ${id} 详情失败: ${String(error)}`, this.id);
    }
  }

  async lookup(id: string): Promise<Paper | null> {
    return this.getPaperDetails(id);
  }
}

addAdapterFactory(() => new SemanticAdapter());
