import { load } from 'cheerio';
import pdfParse from 'pdf-parse';
import { readFile, stat, writeFile } from 'node:fs/promises';
import type { PluginModule, Paper, SearchResult, DownloadResult, PaperText, SearchQuery } from '../core/types.js';
import { BasePlatformAdapter } from '../platforms/baseAdapter.js';
import { request, requestBuffer } from '../utils/http.js';
import { registerPluginDefinition } from './index.js';

const LIBGEN_BASE_URL = process.env.LIBGEN_BASE_URL ?? 'https://libgen.is';

const buildSearchUrl = (query: string) => `${LIBGEN_BASE_URL}/scimag/?q=${encodeURIComponent(query)}`;

const parseLibgenRows = (html: string): Paper[] => {
  const $ = load(html);
  const rows = $('table.catalog tr').toArray().slice(1);
  return rows.map(row => {
    const cells = $(row).find('td');
    const doi = cells.eq(1).text().trim();
    const title = cells.eq(2).text().trim();
    const authors = cells
      .eq(3)
      .text()
      .split(',')
      .map(author => author.trim())
      .filter(Boolean);
    const year = cells.eq(4).text().trim();
    const pdfLink = cells.eq(5).find('a[href*="download"]').attr('href');
    return {
      id: doi || title,
      title,
      authors,
      abstract: '',
      doi,
      url: `${LIBGEN_BASE_URL}/scimag/${encodeURIComponent(doi)}`,
      source: 'libgen',
      categories: [],
      keywords: [],
      references: [],
      extra: { raw: cells.text() },
      ...(year ? { publishedAt: new Date(Number(year), 0, 1).toISOString() } : {}),
      ...(pdfLink ? { pdfUrl: pdfLink.startsWith('http') ? pdfLink : `${LIBGEN_BASE_URL}${pdfLink}` } : {}),
    };
  });
};

const buildDownloadUrl = (identifier: string) => `${LIBGEN_BASE_URL}/scimag/get.php?doi=${encodeURIComponent(identifier)}`;

export class LibgenAdapter extends BasePlatformAdapter {
  constructor() {
    super('libgen');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const response = (await request({ url: buildSearchUrl(query.text), method: 'GET' })) as { body?: unknown };
    const html = typeof response.body === 'string' ? response.body : String(response.body ?? '');
    const papers = parseLibgenRows(html).slice(0, query.limit ?? 10);
    return { items: papers, source: this.id, meta: { count: papers.length } };
  }

  async download(id: string, dir: string): Promise<DownloadResult> {
    const target = this.resolvePath(dir, `libgen_${id.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`);
    const info = await stat(target).catch(() => null);
    if (info) {
      return { id, source: this.id, path: target, sizeInBytes: info.size, cached: true };
    }
    await this.ensureDir(dir);
    const buffer = await requestBuffer({ url: buildDownloadUrl(id), method: 'GET' });
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
    const response = (await request({ url: buildSearchUrl(id), method: 'GET' })) as { body?: unknown };
    const html = typeof response.body === 'string' ? response.body : String(response.body ?? '');
    const [first] = parseLibgenRows(html);
    return first ?? null;
  }
}

registerPluginDefinition({
  key: 'libgen',
  loader: async (): Promise<PluginModule> => ({
    id: 'libgen',
    enabled: true,
    create: async () => new LibgenAdapter(),
  }),
});
