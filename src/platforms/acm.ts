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

const BASE_URL = 'https://dl.acm.org/action/doSearch';
const cleanId = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

class AcmAdapter extends BasePlatformAdapter {
  constructor() {
    super('acm');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const params = new URLSearchParams({
      AllField: query.text,
      pageSize: String(query.limit ?? 10),
    });
    const url = `${BASE_URL}?${params.toString()}`;
    const data = await requestJson<Record<string, unknown>>({ url, method: 'GET', headers: { Accept: 'application/json' } });
    const hits = Array.isArray(data.hits) ? data.hits : [];
    const items: Paper[] = hits.map((hit: Record<string, unknown>) => {
      const publishedAt = hit.publicationDate ? new Date(String(hit.publicationDate)).toISOString() : undefined;
      const doi = String(hit.doi ?? '');
      const url = doi ? `https://doi.org/${doi}` : undefined;
      return {
        id: String(hit.id ?? ''),
        title: String(hit.title ?? ''),
        authors: Array.isArray(hit.authors) ? hit.authors.map((a: Record<string, unknown>) => String(a.name ?? '')) : [],
        abstract: String(hit.abstract ?? ''),
        doi,
        source: 'acm' as const,
        categories: [],
        keywords: Array.isArray(hit.keywords) ? hit.keywords.map(String) : [],
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
    const buffer = await requestBuffer({ url: `https://dl.acm.org/doi/pdf/${id}`, method: 'GET' });
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

addAdapterFactory(() => new AcmAdapter());
