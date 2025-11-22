import type { PluginModule, Paper, SearchQuery, SearchResult, DownloadResult, PaperText } from '../core/types.js';
import { BasePlatformAdapter } from '../platforms/baseAdapter.js';
import { requestJson, requestBuffer } from '../utils/http.js';
import pdfParse from 'pdf-parse';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { registerPluginDefinition } from './index.js';

const OA_BUTTON_API = process.env.OA_BUTTON_API_URL ?? 'https://api.openaccessbutton.org/find';

const looksLikeDoi = (value: string) => /10\.\d{4,9}\//.test(value);

const toPaper = (item: Record<string, any>): Paper => {
  const best = item.best_oa_location || item.best_permission || {};
  const authors: string[] = Array.isArray(item.authors) ? item.authors.map((author: Record<string, unknown>) => String(author.name ?? '')).filter(Boolean) : [];
  const doi = item.doi || item.id || '';
  return {
    id: doi || item.url || item.id,
    title: item.title || item.url || 'Open Access Result',
    authors,
    abstract: item.abstract || '',
    doi,
    url: item.url || best.url || '',
    source: 'oa-button',
    categories: [],
    keywords: [],
    references: [],
    extra: { api: 'openaccessbutton', raw: item },
    ...(best.url_for_pdf ? { pdfUrl: best.url_for_pdf } : {}),
  };
};

export class OAButtonAdapter extends BasePlatformAdapter {
  constructor() {
    super('oa-button');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const params = new URLSearchParams();
    const trimmed = query.text.trim();
    if (looksLikeDoi(trimmed)) {
      params.set('doi', trimmed);
    } else if (trimmed.startsWith('http')) {
      params.set('url', trimmed);
    } else {
      params.set('title', trimmed);
    }
    const limit = query.limit ?? 5;
    params.set('page', '1');
    params.set('per_page', String(Math.min(limit, 25)));
    const response = await requestJson<{ data?: any[] }>({ url: `${OA_BUTTON_API}?${params.toString()}`, method: 'GET' });
    const items = (response.data ?? []).map(toPaper).slice(0, limit);
    return { items, source: this.id, meta: { count: items.length } };
  }

  async download(id: string, dir: string): Promise<DownloadResult> {
    const result = await this.lookup(id);
    if (!result || !result.pdfUrl) {
      throw new Error(`Open Access Button 未找到 ${id} 的 PDF`);
    }
    const target = this.resolvePath(dir, `oa_${id.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`);
    const info = await stat(target).catch(() => null);
    if (info) {
      return { id, source: this.id, path: target, sizeInBytes: info.size, cached: true };
    }
    await this.ensureDir(dir);
    const buffer = await requestBuffer({ url: result.pdfUrl, method: 'GET' });
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
    const response = await requestJson<{ data?: any[] }>({
      url: `${OA_BUTTON_API}?${looksLikeDoi(id) ? `doi=${encodeURIComponent(id)}` : `url=${encodeURIComponent(id)}`}`,
      method: 'GET',
    });
    const item = response.data?.[0];
    return item ? toPaper(item) : null;
  }
}

registerPluginDefinition({
  key: 'oaButton',
  loader: async (): Promise<PluginModule> => ({
    id: 'oa-button',
    enabled: true,
    create: async () => new OAButtonAdapter(),
  }),
});
