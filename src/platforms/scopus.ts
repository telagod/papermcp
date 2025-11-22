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

const BASE_URL = 'https://api.elsevier.com/content/search/scopus';
const cleanId = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

class ScopusAdapter extends BasePlatformAdapter {
  constructor() {
    super('scopus');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const apiKey = process.env.SCOPUS_API_KEY;
    if (!apiKey) {
      throw new Error('SCOPUS_API_KEY environment variable is required');
    }
    const params = new URLSearchParams({
      query: query.text,
      count: String(query.limit ?? 10),
    });
    const url = `${BASE_URL}?${params.toString()}`;
    const data = await requestJson<Record<string, unknown>>({
      url,
      method: 'GET',
      headers: { 'X-ELS-APIKey': apiKey },
    });
    const searchResults = data['search-results'] as Record<string, unknown> | undefined;
    const entries = Array.isArray(searchResults?.entry) ? searchResults.entry : [];
    const items: Paper[] = entries.map((entry: Record<string, unknown>) => {
      const doi = String(entry['prism:doi'] ?? '');
      const publishedAt = entry['prism:coverDate'] ? new Date(String(entry['prism:coverDate'])).toISOString() : undefined;
      const citations = Number(entry['citedby-count']) || undefined;
      return {
        id: String(entry['dc:identifier'] ?? '').replace('SCOPUS_ID:', ''),
        title: String(entry['dc:title'] ?? ''),
        authors: String(entry['dc:creator'] ?? '').split(';').filter(Boolean),
        abstract: String(entry['dc:description'] ?? ''),
        doi,
        url: doi ? `https://doi.org/${doi}` : String(entry['prism:url'] ?? ''),
        source: 'scopus' as const,
        categories: [],
        keywords: [],
        references: [],
        ...(publishedAt ? { publishedAt } : {}),
        ...(citations ? { citations } : {}),
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
    const buffer = await requestBuffer({ url: `https://api.elsevier.com/content/article/scopus_id/${id}`, method: 'GET' });
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

addAdapterFactory(() => new ScopusAdapter());
