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

const BASE_URL = 'https://api.labs.cognitive.microsoft.com/academic/v1.0/evaluate';
const cleanId = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

class MicrosoftAcademicAdapter extends BasePlatformAdapter {
  constructor() {
    super('microsoft-academic');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const apiKey = process.env.MICROSOFT_ACADEMIC_API_KEY;
    if (!apiKey) {
      throw new Error('MICROSOFT_ACADEMIC_API_KEY environment variable is required');
    }
    const params = new URLSearchParams({
      expr: `And(Composite(AA.AuN=='${query.text}'),Y>2000)`,
      count: String(query.limit ?? 10),
      attributes: 'Id,Ti,AA.AuN,D,DOI,S,Y,CC',
    });
    const url = `${BASE_URL}?${params.toString()}`;
    const data = await requestJson<Record<string, unknown>>({
      url,
      method: 'GET',
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    });
    const entities = Array.isArray(data.entities) ? data.entities : [];
    const items: Paper[] = entities.map((entity: Record<string, unknown>) => {
      const doi = String(entity.DOI ?? '');
      const year = entity.Y ? Number(entity.Y) : undefined;
      const publishedAt = year ? new Date(year, 0, 1).toISOString() : undefined;
      const citations = Number(entity.CC) || undefined;
      const url = doi ? `https://doi.org/${doi}` : undefined;
      return {
        id: String(entity.Id ?? ''),
        title: String(entity.Ti ?? ''),
        authors: Array.isArray(entity.AA) ? entity.AA.map((a: Record<string, unknown>) => String(a.AuN ?? '')) : [],
        abstract: String(entity.D ?? ''),
        doi,
        source: 'microsoft-academic' as const,
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
    const apiKey = process.env.MICROSOFT_ACADEMIC_API_KEY;
    if (!apiKey) {
      throw new Error('MICROSOFT_ACADEMIC_API_KEY environment variable is required');
    }
    const buffer = await requestBuffer({
      url: `https://api.labs.cognitive.microsoft.com/academic/v1.0/paper/${id}/pdf`,
      method: 'GET',
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
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

addAdapterFactory(() => new MicrosoftAcademicAdapter());
