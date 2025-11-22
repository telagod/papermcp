import { readFile, stat, writeFile } from 'node:fs/promises';
import pdfParse from 'pdf-parse';
import type { DownloadResult, Paper, PaperText, PlatformID, SearchQuery, SearchResult } from '../core/types.js';
import { requestBuffer, requestJson } from '../utils/http.js';
import { BasePlatformAdapter } from './baseAdapter.js';
import { addAdapterFactory } from './index.js';

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

const sanitizeId = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

type RxivConfig = {
  id: PlatformID;
  apiSegment: 'biorxiv' | 'medrxiv';
  siteHost: 'www.biorxiv.org' | 'www.medrxiv.org';
};

type RxivItem = {
  doi?: string;
  title?: string;
  authors?: string;
  abstract?: string;
  category?: string;
  date?: string;
  version?: string;
};

type RxivResponse = {
  collection?: RxivItem[];
};

const parseAuthors = (value?: string): string[] => {
  if (!value) {
    return [];
  }
  return value
    .split(';')
    .map(name => name.trim())
    .filter(Boolean);
};

const toIsoDate = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  const stamp = new Date(value);
  if (Number.isNaN(stamp.getTime())) {
    return undefined;
  }
  return stamp.toISOString();
};

const buildPdfUrl = (host: string, doi: string, version: string) => `https://${host}/content/${doi}v${version}.full.pdf`;

const buildHtmlUrl = (host: string, doi: string, version: string) => `https://${host}/content/${doi}v${version}`;

const headers = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
};

const daysFromQuery = (query: SearchQuery): number => {
  const candidate = query.filters?.days;
  if (typeof candidate === 'number' && candidate > 0) {
    return candidate;
  }
  return 30;
};

const categoryFromQuery = (query: SearchQuery): string => query.text.trim().toLowerCase().replace(/\s+/g, '_');

const mapItemToPaper = (item: RxivItem, config: RxivConfig): Paper | null => {
  const doi = item.doi;
  if (!doi) {
    return null;
  }
  const version = item.version ?? '1';
  const publishedAt = toIsoDate(item.date);
  return {
    id: doi,
    title: item.title ?? '',
    authors: parseAuthors(item.authors),
    abstract: item.abstract ?? '',
    doi,
    url: buildHtmlUrl(config.siteHost, doi, version),
    source: config.id,
    categories: item.category ? [item.category] : [],
    keywords: [],
    references: [],
    extra: { version },
    pdfUrl: buildPdfUrl(config.siteHost, doi, version),
    ...(publishedAt ? { publishedAt, updatedAt: publishedAt } : {}),
  };
};

const fetchPage = async (
  config: RxivConfig,
  startDate: string,
  endDate: string,
  category: string,
  cursor: number
): Promise<RxivResponse> => {
  const params = new URLSearchParams();
  if (category) {
    params.set('category', category);
  }
  const url = `https://api.biorxiv.org/details/${config.apiSegment}/${startDate}/${endDate}/${cursor}${params.toString() ? `?${params.toString()}` : ''}`;
  return requestJson<RxivResponse>({ url, method: 'GET', headers });
};

const accumulateItems = async (
  config: RxivConfig,
  startDate: string,
  endDate: string,
  category: string,
  limit: number,
  cursor: number,
  acc: Paper[]
): Promise<Paper[]> => {
  if (acc.length >= limit) {
    return acc;
  }
  const response = await fetchPage(config, startDate, endDate, category, cursor);
  const collection = response.collection ?? [];
  const parsed = collection
    .map(item => mapItemToPaper(item, config))
    .filter((paper): paper is Paper => Boolean(paper));
  const nextAcc = acc.concat(parsed);
  if (collection.length < 100) {
    return nextAcc;
  }
  return accumulateItems(config, startDate, endDate, category, limit, cursor + 100, nextAcc);
};

class RxivAdapter extends BasePlatformAdapter {
  constructor(private readonly config: RxivConfig) {
    super(config.id);
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const limit = query.limit ?? 10;
    const days = daysFromQuery(query);
    const now = new Date();
    const endDate = formatDate(now);
    const startDate = formatDate(new Date(now.getTime() - days * 24 * 60 * 60 * 1000));
    const category = categoryFromQuery(query);
    const papers = await accumulateItems(this.config, startDate, endDate, category, limit, 0, []);
    return {
      items: papers.slice(0, limit),
      source: this.id,
      meta: { count: papers.length, range: { startDate, endDate }, category },
    };
  }

  async download(id: string, dir: string): Promise<DownloadResult> {
    const version = '1';
    const pdfUrl = buildPdfUrl(this.config.siteHost, id, version);
    const safeName = `${sanitizeId(id)}.pdf`;
    const target = this.resolvePath(dir, safeName);
    const info = await stat(target).catch(() => null);
    if (info) {
      return { id, source: this.id, path: target, sizeInBytes: info.size, cached: true };
    }
    await this.ensureDir(dir);
    const buffer = await requestBuffer({ url: pdfUrl, method: 'GET', headers });
    await writeFile(target, buffer);
    return { id, source: this.id, path: target, sizeInBytes: buffer.byteLength, cached: false };
  }

  async read(id: string, dir: string): Promise<PaperText> {
    const result = await this.download(id, dir);
    const data = await readFile(result.path);
    const pdf = await pdfParse(data);
    return {
      id,
      source: this.id,
      text: pdf.text.trim(),
      statistics: {
        pages: pdf.numpages,
        sizeInBytes: result.sizeInBytes ?? data.byteLength,
      },
    };
  }
}

const createAdapter = (config: RxivConfig) => new RxivAdapter(config);

addAdapterFactory(() => createAdapter({ id: 'biorxiv', apiSegment: 'biorxiv', siteHost: 'www.biorxiv.org' }));
addAdapterFactory(() => createAdapter({ id: 'medrxiv', apiSegment: 'medrxiv', siteHost: 'www.medrxiv.org' }));
