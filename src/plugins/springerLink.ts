import { load } from 'cheerio';
import pdfParse from 'pdf-parse';
import { readFile, stat, writeFile } from 'node:fs/promises';
import type { PluginModule, Paper, SearchQuery, SearchResult, DownloadResult, PaperText } from '../core/types.js';
import { BasePlatformAdapter } from '../platforms/baseAdapter.js';
import { request, requestBuffer } from '../utils/http.js';
import { registerPluginDefinition } from './index.js';

const SPRINGER_SEARCH_URL = 'https://link.springer.com/search';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36';

const buildSearchUrl = (query: string) => `${SPRINGER_SEARCH_URL}?query=${encodeURIComponent(query)}`;

const parseResults = (html: string): Paper[] => {
  const $ = load(html);
  const items = $('ol#results-list li').toArray();
  return items.map(item => {
    const node = $(item);
    const titleNode = node.find('h2 a');
    const title = titleNode.text().trim();
    const url = `https://link.springer.com${titleNode.attr('href') ?? ''}`;
    const authors = node
      .find('span.authors span')
      .map((_, el) => $(el).text().trim())
      .get();
    const publication = node.find('p.meta').text().trim();
    const doiMatch = publication.match(/doi\.org\/(\S+)/i);
    const pdfLink = node.find('a[data-test="pdf-link"]').attr('href');
    return {
      id: doiMatch?.[1] ?? url,
      title,
      authors,
      abstract: node.find('p.snippet').text().trim(),
      doi: doiMatch?.[1] ?? '',
      url,
      source: 'springer-link',
      categories: [],
      keywords: [],
      references: [],
      extra: { raw: publication },
      ...(pdfLink ? { pdfUrl: pdfLink.startsWith('http') ? pdfLink : `https://link.springer.com${pdfLink}` } : {}),
    };
  });
};

export class SpringerLinkAdapter extends BasePlatformAdapter {
  constructor() {
    super('springer-link');
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
    const target = this.resolvePath(dir, `springer_${safeId}.pdf`);
    const info = await stat(target).catch(() => null);
    if (info) {
      return { id, source: this.id, path: target, sizeInBytes: info.size, cached: true };
    }
    const lookup = await this.lookup(id);
    if (!lookup || !lookup.pdfUrl) {
      throw new Error(`Springer Link 未找到 ${id} 的 PDF`);
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
  key: 'springerLink',
  loader: async (): Promise<PluginModule> => ({
    id: 'springer-link',
    enabled: true,
    create: async () => new SpringerLinkAdapter(),
  }),
});
