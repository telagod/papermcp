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

const BASE_URL = 'https://api.core.ac.uk/v3/search/works';
const cleanId = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

class CoreAdapter extends BasePlatformAdapter {
  constructor() {
    super('core');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const apiKey = process.env.CORE_API_KEY;
    if (!apiKey) {
      throw new Error('CORE_API_KEY environment variable is required');
    }
    const params = new URLSearchParams({
      q: query.text,
      limit: String(query.limit ?? 10),
    });
    const url = `${BASE_URL}?${params.toString()}`;
    const data = await requestJson<Record<string, unknown>>({
      url,
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const results = Array.isArray(data.results) ? data.results : [];
    const items: Paper[] = results.map((work: Record<string, unknown>) => {
      const id = String(work.id ?? '');
      const doi = String(work.doi ?? '');
      const publishedAt = work.publishedDate ? new Date(String(work.publishedDate)).toISOString() : undefined;
      const sourceUrls = work.sourceFulltextUrls as unknown[] | undefined;
      const url = Array.isArray(sourceUrls) && sourceUrls.length > 0 ? String(sourceUrls[0]) : '';
      return {
        id,
        title: String(work.title ?? ''),
        authors: Array.isArray(work.authors) ? work.authors.map((a: Record<string, unknown>) => String(a.name ?? '')) : [],
        abstract: String(work.abstract ?? ''),
        doi,
        pdfUrl: String(work.downloadUrl ?? ''),
        url,
        source: 'core' as const,
        categories: [],
        keywords: [],
        references: [],
        ...(publishedAt ? { publishedAt } : {}),
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
    const apiKey = process.env.CORE_API_KEY;
    if (!apiKey) {
      throw new Error('CORE_API_KEY environment variable is required');
    }
    const buffer = await requestBuffer({
      url: `https://api.core.ac.uk/v3/works/${id}/download`,
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
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

addAdapterFactory(() => new CoreAdapter());
