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

const BASE_URL = 'https://www.researchgate.net/api/search/publications';
const cleanId = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

class ResearchGateAdapter extends BasePlatformAdapter {
  constructor() {
    super('researchgate');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const params = new URLSearchParams({
      query: query.text,
      limit: String(query.limit ?? 10),
    });
    const url = `${BASE_URL}?${params.toString()}`;
    const data = await requestJson<Record<string, unknown>>({ url, method: 'GET' });
    const dataObj = data.data as Record<string, unknown> | undefined;
    const results = Array.isArray(dataObj?.publications) ? dataObj.publications : [];
    const items: Paper[] = results.map((pub: Record<string, unknown>) => {
      const id = String(pub.id ?? '');
      const doi = String(pub.doi ?? '');
      const publishedAt = pub.publicationDate ? new Date(String(pub.publicationDate)).toISOString() : undefined;
      const citations = Number(pub.citationCount) || undefined;
      const url = id ? `https://www.researchgate.net/publication/${id}` : undefined;
      return {
        id,
        title: String(pub.title ?? ''),
        authors: Array.isArray(pub.authors) ? pub.authors.map((a: Record<string, unknown>) => String(a.name ?? '')) : [],
        abstract: String(pub.abstract ?? ''),
        doi,
        source: 'researchgate' as const,
        categories: [],
        keywords: [],
        references: [],
        ...(publishedAt ? { publishedAt } : {}),
        ...(citations ? { citations } : {}),
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
    const buffer = await requestBuffer({ url: `https://www.researchgate.net/publication/${id}/download`, method: 'GET' });
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

addAdapterFactory(() => new ResearchGateAdapter());
