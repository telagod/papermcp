import pdfParse from 'pdf-parse';
import { readFile, stat, writeFile } from 'node:fs/promises';
import type { PluginModule, Paper, SearchQuery, SearchResult, DownloadResult, PaperText } from '../core/types.js';
import { BasePlatformAdapter } from '../platforms/baseAdapter.js';
import { requestJson, requestBuffer } from '../utils/http.js';
import { registerPluginDefinition } from './index.js';

const UNPAYWALL_EMAIL = process.env.UNPAYWALL_EMAIL;
const UNPAYWALL_BASE = 'https://api.unpaywall.org/v2';

const isValidEmail = (value: string | undefined): value is string => Boolean(value && /@/.test(value));

const toPaper = (data: Record<string, any>): Paper => {
  const best = data.best_oa_location || {};
  const authors: string[] = Array.isArray(data.z_authors)
    ? data.z_authors.map((author: Record<string, unknown>) => String(author.family ?? '')).filter(Boolean)
    : [];
  return {
    id: data.doi,
    title: data.title,
    authors,
    abstract: data.abstract || '',
    doi: data.doi,
    url: data.doi_url || best.url || '',
    source: 'unpaywall',
    categories: [],
    keywords: [],
    references: [],
    extra: {
      oa_status: data.oa_status,
      is_oa: data.is_oa,
      journal: data.journal_name,
    },
    ...(best.url_for_pdf ? { pdfUrl: best.url_for_pdf } : {}),
  };
};

export class UnpaywallAdapter extends BasePlatformAdapter {
  constructor() {
    super('unpaywall');
    if (!isValidEmail(UNPAYWALL_EMAIL)) {
      throw new Error('UNPAYWALL_EMAIL 环境变量未配置，无法启用 Unpaywall 插件');
    }
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const doi = query.text.trim();
    if (!doi) {
      return { items: [], source: this.id, meta: { error: '请输入 DOI' } };
    }
    const paper = await this.lookup(doi);
    return { items: paper ? [paper] : [], source: this.id, meta: { doi } };
  }

  async download(id: string, dir: string): Promise<DownloadResult> {
    const paper = await this.lookup(id);
    if (!paper || !paper.pdfUrl) {
      throw new Error(`Unpaywall 未提供 ${id} 的开放获取 PDF`);
    }
    const target = this.resolvePath(dir, `unpaywall_${id.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`);
    const info = await stat(target).catch(() => null);
    if (info) {
      return { id, source: this.id, path: target, sizeInBytes: info.size, cached: true };
    }
    await this.ensureDir(dir);
    const buffer = await requestBuffer({ url: paper.pdfUrl, method: 'GET' });
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
    if (!isValidEmail(UNPAYWALL_EMAIL)) {
      throw new Error('UNPAYWALL_EMAIL 未配置');
    }
    const response = await requestJson<Record<string, any>>({
      url: `${UNPAYWALL_BASE}/${encodeURIComponent(id)}?email=${encodeURIComponent(UNPAYWALL_EMAIL)}`,
      method: 'GET',
    });
    if (response.error) {
      return null;
    }
    return toPaper(response);
  }
}

registerPluginDefinition({
  key: 'unpaywall',
  loader: async (): Promise<PluginModule> => ({
    id: 'unpaywall',
    enabled: true,
    create: async () => new UnpaywallAdapter(),
  }),
});
