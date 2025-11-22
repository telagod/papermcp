import { load } from 'cheerio';
import pdfParse from 'pdf-parse';
import { readFile, stat, writeFile } from 'node:fs/promises';
import type { PluginModule, Paper, SearchQuery, SearchResult, DownloadResult, PaperText } from '../core/types.js';
import { BasePlatformAdapter } from '../platforms/baseAdapter.js';
import { request, requestBuffer } from '../utils/http.js';
import { registerPluginDefinition } from './index.js';

const IEEE_SEARCH_URL = 'https://ieeexplore.ieee.org/search/searchresult.jsp';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36';

const buildSearchUrl = (query: string) => `${IEEE_SEARCH_URL}?newsearch=true&queryText=${encodeURIComponent(query)}`;

const parseResults = (html: string): Paper[] => {
  const $ = load(html);
  const scripts = $('script').toArray();
  for (const script of scripts) {
    const text = $(script).html() ?? '';
    if (text.includes('global.document.metadata')) {
      try {
        const jsonMatch = text.match(/global\.document\.metadata=(\{.*?\});/s);
        if (jsonMatch) {
          const metadata = JSON.parse(jsonMatch[1]);
          const records = metadata.records ?? [];
          return records.map((record: Record<string, unknown>) => ({
            id: record.doi ?? record.articleNumber,
            title: record.articleTitle ?? record.title ?? '',
            authors: Array.isArray(record.authors)
              ? record.authors.map((author: Record<string, unknown>) => author.preferredName).filter(Boolean)
              : [],
            abstract: record.abstract ?? '',
            doi: record.doi ?? '',
            url: record.htmlLink ?? record.pdfLink ?? '',
            source: 'ieee-xplore',
            categories: [],
            keywords: Array.isArray(record.htmlLink) ? record.htmlLink : [],
            references: [],
            extra: { publicationYear: record.publicationYear, metrics: record.metrics },
            ...(record.pdfLink ? { pdfUrl: record.pdfLink } : {}),
          }));
        }
      } catch {
        continue;
      }
    }
  }
  const results = $('div.List-results-items').toArray();
  return results.map(item => {
    const node = $(item);
    const titleNode = node.find('h3 a');
    const title = titleNode.text().trim();
    const url = `https://ieeexplore.ieee.org${titleNode.attr('href') ?? ''}`;
    const authors = node
      .find('p.author span')
      .map((_, el) => $(el).text().trim())
      .get();
    const doiMatch = node.text().match(/DOI:\s*(10\.\S+)/);
    const pdfLink = node.find('a.icon-pdf').attr('href');
    return {
      id: doiMatch?.[1] ?? url,
      title,
      authors,
      abstract: node.find('div.description').text().trim(),
      doi: doiMatch?.[1] ?? '',
      url,
      source: 'ieee-xplore',
      categories: [],
      keywords: [],
      references: [],
      extra: { raw: node.text().trim() },
      ...(pdfLink ? { pdfUrl: pdfLink.startsWith('http') ? pdfLink : `https://ieeexplore.ieee.org${pdfLink}` } : {}),
    };
  });
};

export class IeeeXploreAdapter extends BasePlatformAdapter {
  constructor() {
    super('ieee-xplore');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const response = (await request({ url: buildSearchUrl(query.text), method: 'GET', headers: { 'user-agent': USER_AGENT } })) as {
      body?: unknown;
    };
    const html = typeof response.body === 'string' ? response.body : String(response.body ?? '');
    const items = parseResults(html).slice(0, query.limit ?? 10);
    return { items, source: this.id, meta: { count: items.length } };
  }

  async download(id: string, dir: string): Promise<DownloadResult> {
    const safeId = id.replace(/[^a-zA-Z0-9._-]/g, '_');
    const target = this.resolvePath(dir, `ieee_${safeId}.pdf`);
    const info = await stat(target).catch(() => null);
    if (info) {
      return { id, source: this.id, path: target, sizeInBytes: info.size, cached: true };
    }
    const lookup = await this.lookup(id);
    if (!lookup || !lookup.pdfUrl) {
      throw new Error(`IEEE Xplore 未找到 ${id} 的 PDF`);
    }
    await this.ensureDir(dir);
    const buffer = await requestBuffer({ url: lookup.pdfUrl, method: 'GET', headers: { 'user-agent': USER_AGENT } });
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

  async lookup(id: string): Promise<Paper | null> {
    const response = (await request({ url: buildSearchUrl(id), method: 'GET', headers: { 'user-agent': USER_AGENT } })) as {
      body?: unknown;
    };
    const html = typeof response.body === 'string' ? response.body : String(response.body ?? '');
    const [first] = parseResults(html);
    return first ?? null;
  }
}

registerPluginDefinition({
  key: 'ieeeXplore',
  loader: async (): Promise<PluginModule> => ({
    id: 'ieee-xplore',
    enabled: true,
    create: async () => new IeeeXploreAdapter(),
  }),
});
