import { load } from 'cheerio';
import pdfParse from 'pdf-parse';
import { readFile, stat, writeFile } from 'node:fs/promises';
import type { PluginModule, Paper, SearchQuery, SearchResult, DownloadResult, PaperText } from '../core/types.js';
import { BasePlatformAdapter } from '../platforms/baseAdapter.js';
import { request, requestBuffer } from '../utils/http.js';
import { registerPluginDefinition } from './index.js';

const SCIDIRECT_SEARCH_URL = 'https://www.sciencedirect.com/search';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36';

const buildSearchUrl = (query: string) => `${SCIDIRECT_SEARCH_URL}?qs=${encodeURIComponent(query)}`;

const parseResults = (html: string): Paper[] => {
  const $ = load(html);
  const articles = $('div.result-item-content').toArray();
  return articles.map(article => {
    const node = $(article);
    const titleNode = node.find('h2.result-list-title a');
    const title = titleNode.text().trim();
    const url = `https://www.sciencedirect.com${titleNode.attr('href') ?? ''}`;
    const authors = node
      .find('ol.Authors li.author span.content')
      .map((_, el) => $(el).text().trim())
      .get();
    const publicationText = node.find('div.Source').text().trim();
    const doiMatch = publicationText.match(/doi:\s*(10\.\S+)/i);
    const pdfLink = node.find('a.pdf-download').attr('href');
    return {
      id: doiMatch?.[1] ?? url,
      title,
      authors,
      abstract: node.find('div.text-break-word').text().trim(),
      doi: doiMatch?.[1] ?? '',
      url,
      source: 'science-direct',
      categories: [],
      keywords: [],
      references: [],
      extra: { source: publicationText },
      ...(pdfLink ? { pdfUrl: pdfLink.startsWith('http') ? pdfLink : `https://www.sciencedirect.com${pdfLink}` } : {}),
    };
  });
};

export class ScienceDirectAdapter extends BasePlatformAdapter {
  constructor() {
    super('science-direct');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const response = (await request({
      url: buildSearchUrl(query.text),
      method: 'GET',
      headers: { 'user-agent': USER_AGENT },
    })) as { body?: unknown };
    const html = typeof response.body === 'string' ? response.body : String(response.body ?? '');
    const items = parseResults(html).slice(0, query.limit ?? 10);
    return { items, source: this.id, meta: { count: items.length } };
  }

  async download(id: string, dir: string): Promise<DownloadResult> {
    const safeId = id.replace(/[^a-zA-Z0-9._-]/g, '_');
    const target = this.resolvePath(dir, `sciencedirect_${safeId}.pdf`);
    const info = await stat(target).catch(() => null);
    if (info) {
      return { id, source: this.id, path: target, sizeInBytes: info.size, cached: true };
    }
    const lookup = await this.lookup(id);
    if (!lookup || !lookup.pdfUrl) {
      throw new Error(`ScienceDirect 未找到 ${id} 的 PDF`);
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
    const response = (await request({
      url: buildSearchUrl(id),
      method: 'GET',
      headers: { 'user-agent': USER_AGENT },
    })) as { body?: unknown };
    const html = typeof response.body === 'string' ? response.body : String(response.body ?? '');
    const [first] = parseResults(html);
    return first ?? null;
  }
}

registerPluginDefinition({
  key: 'scienceDirect',
  loader: async (): Promise<PluginModule> => ({
    id: 'science-direct',
    enabled: true,
    create: async () => new ScienceDirectAdapter(),
  }),
});
