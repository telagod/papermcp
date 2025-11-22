import { load } from 'cheerio';
import { createHash } from 'node:crypto';
import type { DownloadResult, Paper, PaperText, SearchQuery, SearchResult } from '../core/types.js';
import { PlatformError } from '../core/errors.js';
import { request } from '../utils/http.js';
import { BasePlatformAdapter } from './baseAdapter.js';
import { addAdapterFactory } from './index.js';

const SCHOLAR_URL = 'https://scholar.google.com/scholar';
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
];

const randomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const extractYear = (text: string): number | undefined => {
  const parts = text.split(/\D+/);
  for (const part of parts) {
    if (!part) {
      continue;
    }
    const year = Number(part);
    if (!Number.isNaN(year) && year >= 1900 && year <= new Date().getFullYear()) {
      return year;
    }
  }
  return undefined;
};

const sanitizePdfUrl = (container: Record<string, unknown>): string | undefined => {
  const quick = container.find('.gs_or_ggsm a').attr('href');
  if (quick) {
    return quick;
  }
  const link = container.find('h3.gs_rt a').attr('href');
  if (link && link.endsWith('.pdf')) {
    return link;
  }
  return undefined;
};

const hashId = (value: string): string => `gs_${createHash('sha1').update(value).digest('hex')}`;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchScholarPage = async (params: URLSearchParams, attempt = 0): Promise<{ body?: unknown; statusCode?: number }> => {
  const headers = {
    'user-agent': randomUserAgent(),
    accept: 'text/html,application/xhtml+xml',
    'accept-language': 'en-US,en;q=0.9',
  };
  try {
    const response = (await request({ url: `${SCHOLAR_URL}?${params.toString()}`, method: 'GET', headers })) as {
      body?: unknown;
      statusCode?: number;
    };
    const status = response.statusCode ?? 200;
    if (status === 429 || status === 503) {
      if (attempt >= 2) {
        return response;
      }
      const waitMs = 1000 * (attempt + 1) + Math.floor(Math.random() * 500);
      await delay(waitMs);
      return fetchScholarPage(params, attempt + 1);
    }
    return response;
  } catch (error) {
    if (attempt >= 2) {
      throw error;
    }
    const waitMs = 1500 * (attempt + 1);
    await delay(waitMs);
    return fetchScholarPage(params, attempt + 1);
  }
};

const buildPaper = (element: any, $: Record<string, unknown>): Paper | null => {
  const node = $(element);
  const titleNode = node.find('h3.gs_rt');
  const infoNode = node.find('div.gs_a');
  if (!titleNode.length || !infoNode.length) {
    return null;
  }
  const link = titleNode.find('a');
  const url = link.attr('href') ?? '';
  const title = titleNode.text().replace(/\[(PDF|HTML)\]\s*/gi, '').trim();
  const infoText = infoNode.text();
  const authorSegment = infoText.split('-')[0];
  const authors = authorSegment
    .split(',')
    .map((author: string) => author.trim())
    .filter(Boolean);
  const year = extractYear(infoText);
  const abstractText = node.find('div.gs_rs').text().trim();
  const pdfUrl = sanitizePdfUrl(node);
  return {
    id: url ? hashId(url) : hashId(`${title}-${infoText}`),
    title,
    authors,
    abstract: abstractText,
    doi: '',
    url,
    source: 'google-scholar',
    categories: [],
    keywords: [],
    references: [],
    extra: { info: infoText },
    ...(year ? { publishedAt: new Date(year, 0, 1).toISOString() } : {}),
    ...(pdfUrl ? { pdfUrl } : {}),
  };
};

export class GoogleScholarAdapter extends BasePlatformAdapter {
  constructor() {
    super('google-scholar');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const limit = query.limit ?? 10;
    const perPage = Math.min(limit, 10);
    const items: Paper[] = [];
    let start = 0;
    while (items.length < limit) {
      const params = new URLSearchParams({
        q: query.text,
        start: String(start),
        hl: 'en',
        as_sdt: '0,5',
      });
      const response = await fetchScholarPage(params);
      const html = typeof response.body === 'string' ? response.body : String(response.body ?? '');
      const $ = load(html);
      const nodes = $('div.gs_ri');
      if (!nodes.length) {
        break;
      }
      nodes.each((_, element) => {
        if (items.length >= limit) {
          return;
        }
        const paper = buildPaper(element, $);
        if (paper) {
          items.push(paper);
        }
      });
      if (nodes.length < perPage) {
        break;
      }
      start += perPage;
    }
    return { items, source: this.id, meta: { count: items.length } };
  }

  async download(id: string): Promise<DownloadResult> {
    throw new PlatformError(`Google Scholar 记录 ${id} 无法直接下载 PDF，请使用原文链接。`, this.id);
  }

  async read(id: string): Promise<PaperText> {
    throw new PlatformError(`Google Scholar 记录 ${id} 仅提供索引数据，无法直接读取全文。`, this.id);
  }
}

addAdapterFactory(() => new GoogleScholarAdapter());
