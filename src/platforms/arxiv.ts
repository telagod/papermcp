import { readFile, stat, writeFile } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';
import pdfParse from 'pdf-parse';
import type {
  DownloadResult,
  Paper,
  PaperText,
  SearchQuery,
  SearchResult,
} from '../core/types.js';
import { request, requestBuffer } from '../utils/http.js';
import { BasePlatformAdapter } from './baseAdapter.js';
import { addAdapterFactory } from './index.js';

type RawArxivEntry = Record<string, unknown> & {
  id?: string;
  title?: string;
  summary?: string;
  link?: unknown;
  published?: string;
  updated?: string;
  author?: unknown;
  category?: unknown;
  doi?: string;
  'arxiv:doi'?: string;
};

type RawArxivFeed = {
  feed?: {
    entry?: RawArxivEntry | RawArxivEntry[];
  };
};

const BASE_URL = 'http://export.arxiv.org/api/query';
const PDF_BASE = 'https://arxiv.org/pdf';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  trimValues: true,
});

const arrayify = <T>(value: T | T[] | undefined | null): T[] => {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const pickPdfUrl = (links: unknown): string | undefined => {
  const items = arrayify(links as Record<string, unknown>[] | undefined);
  for (const link of items) {
    const type = typeof link.type === 'string' ? link.type : '';
    if (type === 'application/pdf') {
      const href = typeof link.href === 'string' ? link.href : '';
      if (href) {
        return href;
      }
    }
  }
  return undefined;
};

const parseAuthors = (value: unknown): string[] => {
  const items = arrayify(value as Record<string, unknown>[] | undefined);
  return items
    .map(item => (typeof item.name === 'string' ? item.name.trim() : ''))
    .filter(Boolean);
};

const parseCategories = (value: unknown): string[] => {
  const items = arrayify(value as Record<string, unknown>[] | undefined);
  return items
    .map(item => (typeof item.term === 'string' ? item.term : ''))
    .filter(Boolean);
};

const toIso = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }
  const stamp = new Date(value);
  if (Number.isNaN(stamp.getTime())) {
    return undefined;
  }
  return stamp.toISOString();
};

const cleanId = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

const entryToPaper = (entry: RawArxivEntry): Paper => {
  const rawId = typeof entry.id === 'string' ? entry.id : '';
  const id = rawId.split('/').pop() ?? rawId;
  const title = typeof entry.title === 'string' ? entry.title : '';
  const abstract = typeof entry.summary === 'string' ? entry.summary : '';
  const doiPrimary = typeof entry.doi === 'string' ? entry.doi : '';
  const doiFallback = typeof entry['arxiv:doi'] === 'string' ? entry['arxiv:doi'] : '';
  const publishedAt = toIso(entry.published);
  const updatedAt = toIso(entry.updated);
  const pdfUrl = pickPdfUrl(entry.link);
  return {
    id,
    title,
    authors: parseAuthors(entry.author),
    abstract,
    doi: doiPrimary || doiFallback,
    url: rawId,
    source: 'arxiv',
    categories: parseCategories(entry.category),
    keywords: [],
    references: [],
    extra: { raw: entry },
    ...(publishedAt ? { publishedAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    ...(pdfUrl ? { pdfUrl } : {}),
  };
};

const buildSearchUrl = (query: SearchQuery) => {
  const params = new URLSearchParams();
  params.set('search_query', query.text);
  params.set('sortBy', 'submittedDate');
  params.set('sortOrder', 'descending');
  params.set('max_results', String(query.limit ?? 10));
  return `${BASE_URL}?${params.toString()}`;
};

const ensurePdfFilename = (id: string) => `${cleanId(id)}.pdf`;

class ArxivAdapter extends BasePlatformAdapter {
  constructor() {
    super('arxiv');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const url = buildSearchUrl(query);
    const res = (await request({ url, method: 'GET' })) as { body?: unknown };
    const body = typeof res.body === 'string' ? res.body : String(res.body ?? '');
    const feed = parser.parse(body) as RawArxivFeed;
    const entries = arrayify(feed.feed?.entry);
    const items = entries.map(entryToPaper);
    return { items, source: this.id, meta: { count: items.length } };
  }

  async download(id: string, dir: string): Promise<DownloadResult> {
    const file = this.resolvePath(dir, ensurePdfFilename(id));
    const info = await stat(file).catch(() => null);
    if (info) {
      return { id, source: this.id, path: file, sizeInBytes: info.size, cached: true };
    }
    await this.ensureDir(dir);
    const buffer = await requestBuffer({ url: `${PDF_BASE}/${id}.pdf`, method: 'GET' });
    await writeFile(file, buffer);
    return { id, source: this.id, path: file, sizeInBytes: buffer.byteLength, cached: false };
  }

  async read(id: string, dir: string): Promise<PaperText> {
    const result = await this.download(id, dir);
    const data = await readFile(result.path);
    const pdf = await pdfParse(data);
    const meta: Record<string, unknown> | undefined = pdf.info ? { info: pdf.info as Record<string, unknown> } : undefined;
    return {
      id,
      source: this.id,
      text: pdf.text.trim(),
      statistics: {
        pages: pdf.numpages,
        sizeInBytes: result.sizeInBytes ?? data.byteLength,
      },
      ...(meta ? { metadata: meta } : {}),
    };
  }
}

addAdapterFactory(() => new ArxivAdapter());
