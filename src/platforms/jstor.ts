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

const BASE_URL = 'https://www.jstor.org/api/search';
const cleanId = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

class JstorAdapter extends BasePlatformAdapter {
  constructor() {
    super('jstor');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const params = new URLSearchParams({
      q: query.text,
      limit: String(query.limit ?? 10),
    });
    const url = `${BASE_URL}?${params.toString()}`;
    const data = await requestJson<Record<string, unknown>>({ url, method: 'GET' });
    const docs = Array.isArray(data.docs) ? data.docs : [];
    const items: Paper[] = docs.map((doc: Record<string, unknown>) => {
      const id = String(doc.id ?? '');
      const doi = String(doc.doi ?? '');
      const publishedAt = doc.publicationDate ? new Date(String(doc.publicationDate)).toISOString() : undefined;
      const url = id ? `https://www.jstor.org/stable/${id}` : undefined;
      return {
        id,
        title: String(doc.title ?? ''),
        authors: Array.isArray(doc.author) ? doc.author.map(String) : [],
        abstract: String(doc.abstract ?? ''),
        doi,
        source: 'jstor' as const,
        categories: Array.isArray(doc.discipline) ? doc.discipline.map(String) : [],
        keywords: Array.isArray(doc.keyword) ? doc.keyword.map(String) : [],
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
    const buffer = await requestBuffer({ url: `https://www.jstor.org/stable/pdf/${id}.pdf`, method: 'GET' });
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

addAdapterFactory(() => new JstorAdapter());
