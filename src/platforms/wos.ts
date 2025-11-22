import { readFile, stat, writeFile } from 'node:fs/promises';
import pdfParse from 'pdf-parse';
import type {
  DownloadResult,
  Paper,
  PaperText,
  SearchQuery,
  SearchResult,
} from '../core/types.js';
import { requestJson, requestBuffer } from '../utils/http.js';
import { BasePlatformAdapter } from './baseAdapter.js';
import { addAdapterFactory } from './index.js';

const BASE_URL = 'https://api.clarivate.com/api/wos';
const cleanId = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

class WosAdapter extends BasePlatformAdapter {
  constructor() {
    super('wos');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const apiKey = process.env.WOS_API_KEY;
    if (!apiKey) {
      throw new Error('WOS_API_KEY environment variable is required');
    }
    const params = new URLSearchParams({
      databaseId: 'WOS',
      usrQuery: query.text,
      count: String(query.limit ?? 10),
      firstRecord: '1',
    });
    const url = `${BASE_URL}?${params.toString()}`;
    const data = await requestJson<Record<string, unknown>>({
      url,
      method: 'GET',
      headers: { 'X-ApiKey': apiKey },
    });
    const records = Array.isArray(data.Data) ? data.Data : [];
    const items: Paper[] = records.map((rec: Record<string, unknown>) => {
      const title = rec.title as Record<string, unknown> | undefined;
      const authors = rec.authors as Record<string, unknown> | undefined;
      const identifiers = rec.identifiers as Record<string, unknown> | undefined;
      const source = rec.source as Record<string, unknown> | undefined;
      const doi = String(identifiers?.doi ?? '');
      const publishedAt = source?.published_biblio_date ? new Date(String(source.published_biblio_date)).toISOString() : undefined;
      const url = doi ? `https://doi.org/${doi}` : undefined;
      return {
        id: String(rec.UID ?? ''),
        title: String(title?.title ?? ''),
        authors: Array.isArray(authors?.authors) ? authors.authors.map((a: Record<string, unknown>) => String(a.wos_standard ?? '')) : [],
        abstract: String(rec.abstract ?? ''),
        doi,
        source: 'wos' as const,
        categories: Array.isArray(rec.categories) ? rec.categories.map(String) : [],
        keywords: Array.isArray(rec.keywords) ? rec.keywords.map(String) : [],
        references: [],
        ...(publishedAt ? { publishedAt } : {}),
        ...(url ? { url } : {}),
      };
    });
    return { items, source: this.id, meta: { count: items.length } };
  }

  async download(id: string, dir: string): Promise<DownloadResult> {
    const file = this.resolvePath(dir, `${cleanId(id)}.pdf`);
    const info = await stat(file).catch(() => null);
    if (info) {
      return { id, source: this.id, path: file, sizeInBytes: info.size, cached: true };
    }
    await this.ensureDir(dir);
    const buffer = await requestBuffer({ url: `https://www.webofscience.com/api/gateway/wos/pdf/${id}`, method: 'GET' });
    await writeFile(file, buffer);
    return { id, source: this.id, path: file, sizeInBytes: buffer.byteLength, cached: false };
  }

  async read(id: string, dir: string): Promise<PaperText> {
    const result = await this.download(id, dir);
    const data = await readFile(result.path);
    const pdf = await pdfParse(data);
    const meta = pdf.info ? { info: pdf.info as Record<string, unknown> } : undefined;
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

addAdapterFactory(() => new WosAdapter());
