import { load } from 'cheerio';
import { readFile, stat, writeFile } from 'node:fs/promises';
import type { DownloadResult, Paper, PaperText, SearchQuery, SearchResult } from '../core/types.js';
import { request, requestBuffer } from '../utils/http.js';
import { BasePlatformAdapter } from './baseAdapter.js';
import { addAdapterFactory } from './index.js';
import pdfParse from 'pdf-parse';

const BASE_URL = 'https://eprint.iacr.org';
const SEARCH_URL = `${BASE_URL}/search`;
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36';

const sanitizeId = (value: string) => value.replace(/[^0-9/]/g, '');

const parseDate = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  const stamp = new Date(value.trim());
  if (Number.isNaN(stamp.getTime())) {
    return undefined;
  }
  return stamp.toISOString();
};

const buildSearchParams = (query: string) => new URLSearchParams({ q: query });

const parseSearchEntry = async (container: any, fetchDetails: boolean): Promise<Paper | null> => {
  const header = container.find('div.d-flex').first();
  const paperLink = header.find('a.paperlink');
  const paperId = paperLink.text().trim();
  if (!paperId) {
    return null;
  }
  if (fetchDetails) {
    const detailed = await fetchPaperDetails(paperId);
    if (detailed) {
      return detailed;
    }
  }
  const pdfRel = header.find('a[href$="pdf"]').attr('href');
  const pdfUrl = pdfRel ? `${BASE_URL}${pdfRel}` : '';
  const infoNode = container.find('div.ms-md-4');
  const title = infoNode.find('strong').text().trim();
  const authorsText = infoNode.find('span.fst-italic').text();
  const authors = authorsText
    .split(',')
    .map((author: string) => author.trim())
    .filter(Boolean);
  const abstract = infoNode.find('p.search-abstract').text().trim();
  const category = infoNode.find('small.badge').text().trim();
  return {
    id: paperId,
    title,
    authors,
    abstract,
    url: `${BASE_URL}${paperLink.attr('href') ?? ''}`,
    pdfUrl,
    source: 'iacr',
    categories: category ? [category] : [],
    keywords: [],
    references: [],
  };
};

const fetchPaperDetails = async (paperId: string): Promise<Paper | null> => {
  const id = sanitizeId(paperId) || paperId;
  const url = `${BASE_URL}/${id}`;
  const response = (await request({ url, method: 'GET', headers: { 'user-agent': USER_AGENT } })) as { body?: unknown };
  const html = typeof response.body === 'string' ? response.body : String(response.body ?? '');
  const $ = load(html);
  const title = $('h3.mb-3').first().text().trim();
  if (!title) {
    return null;
  }
  const authorText = $('p.fst-italic').first().text().trim();
  const authors = authorText
    .replace(' and ', ',')
    .split(',')
    .map((author: string) => author.trim())
    .filter(Boolean);
  const abstract = $('p[style="white-space: pre-wrap;"]').text().trim();
  const keywords = $('a.badge.bg-secondary.keyword')
    .map((_, el) => $(el).text().trim())
    .get();
  const historyEntries = $('div.card:contains("History") li')
    .map((_, el) => $(el).text().trim())
    .get();
  const publicationInfo = $('div.card:contains("Published")').text().trim();
  const publishedAt = parseDate(historyEntries[0]?.split(':')[0]);
  const pdfUrl = `${BASE_URL}/${id}.pdf`;
  return {
    id,
    title,
    authors,
    abstract,
    url,
    pdfUrl,
    source: 'iacr',
    categories: [],
    keywords,
    references: [],
    extra: {
      publication_info: publicationInfo,
      history: historyEntries.join('; '),
    },
    ...(publishedAt ? { publishedAt, updatedAt: publishedAt } : {}),
  };
};

export class IacrAdapter extends BasePlatformAdapter {
  constructor() {
    super('iacr');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const fetchDetails = query.filters?.fetch_details !== false;
    const params = buildSearchParams(query.text);
    const response = (await request({
      url: `${SEARCH_URL}?${params.toString()}`,
      method: 'GET',
      headers: { 'user-agent': USER_AGENT },
    })) as { body?: unknown };
    const html = typeof response.body === 'string' ? response.body : String(response.body ?? '');
    const $ = load(html);
    const nodes = $('div.mb-4');
    const limit = query.limit ?? 10;
    const papers: Paper[] = [];
    for (const element of nodes.toArray()) {
      if (papers.length >= limit) {
        break;
      }
      const parsed = await parseSearchEntry($(element), fetchDetails);
      if (parsed) {
        papers.push(parsed);
      }
    }
    return { items: papers, source: this.id, meta: { count: papers.length } };
  }

  async download(id: string, dir: string): Promise<DownloadResult> {
    const safeId = sanitizeId(id) || id;
    const safeName = `iacr_${safeId.replace('/', '_')}.pdf`;
    const target = this.resolvePath(dir, safeName);
    const info = await stat(target).catch(() => null);
    if (info) {
      return { id, source: this.id, path: target, sizeInBytes: info.size, cached: true };
    }
    await this.ensureDir(dir);
    const pdfUrl = `${BASE_URL}/${safeId}.pdf`;
    const buffer = await requestBuffer({ url: pdfUrl, method: 'GET', headers: { 'user-agent': USER_AGENT } });
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

  async lookup(id: string): Promise<Paper | null> {
    return fetchPaperDetails(id);
  }
}

addAdapterFactory(() => new IacrAdapter());
