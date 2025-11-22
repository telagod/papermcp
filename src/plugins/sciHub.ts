import { load } from 'cheerio';
import { readFile, stat, writeFile } from 'node:fs/promises';
import pdfParse from 'pdf-parse';
import { registerPluginDefinition } from './index.js';
import type { PluginModule, Paper, SearchResult, DownloadResult, PaperText, SearchQuery } from '../core/types.js';
import { BasePlatformAdapter } from '../platforms/baseAdapter.js';
import { request, requestBuffer } from '../utils/http.js';

const SCIHUB_BASE_URL = process.env.SCIHUB_BASE_URL ?? 'https://sci-hub.se';

const buildUrl = (path: string) => {
  if (path.startsWith('//')) {
    return `https:${path}`;
  }
  if (path.startsWith('http')) {
    return path;
  }
  if (path.startsWith('/')) {
    return `${SCIHUB_BASE_URL}${path}`;
  }
  return `${SCIHUB_BASE_URL}/${path}`;
};

const parseMetadata = (html: string, id: string): { paper: Paper; pdfUrl?: string } | null => {
  const $ = load(html);
  const title = $('#citation').find('i').text().trim() || $('title').text().trim();
  const infoText = $('#citation').text();
  const authorsText = infoText.split('.').shift() ?? '';
  const authors = authorsText
    .split(',')
    .map(author => author.trim())
    .filter(Boolean);
  const doiNode = $('#citation').find('button[onclick*="clip"]').attr('onclick');
  const doi = doiNode ? doiNode.replace(/.*'(.*)'.*/, '$1') : id;
  const iframeSrc = $('iframe').attr('src') || $('button[onclick*="location.href"]').attr('onclick');
  let pdfUrl: string | undefined;
  if (iframeSrc) {
    pdfUrl = iframeSrc.startsWith('location.href')
      ? iframeSrc.replace(/.*'(.*)'.*/, '$1')
      : iframeSrc;
    pdfUrl = buildUrl(pdfUrl);
  }
  const paper: Paper = {
    id,
    title: title || id,
    authors,
    abstract: '',
    doi,
    url: `${SCIHUB_BASE_URL}/${encodeURIComponent(id)}`,
    source: 'sci-hub',
    categories: [],
    keywords: [],
    references: [],
    extra: { citation: infoText.trim() },
    ...(pdfUrl ? { pdfUrl } : {}),
  };
  return pdfUrl ? { paper, pdfUrl } : { paper };
};

const fetchSciHub = async (identifier: string): Promise<{ html: string; pdfUrl?: string; paper: Paper } | null> => {
  const response = (await request({
    url: `${SCIHUB_BASE_URL}/${encodeURIComponent(identifier)}`,
    method: 'GET',
    headers: { 'user-agent': 'Mozilla/5.0' },
  })) as { body?: unknown };
  const html = typeof response.body === 'string' ? response.body : String(response.body ?? '');
  const meta = parseMetadata(html, identifier);
  if (!meta) {
    return null;
  }
  return meta.pdfUrl ? { html, pdfUrl: meta.pdfUrl, paper: meta.paper } : { html, paper: meta.paper };
};

export class SciHubAdapter extends BasePlatformAdapter {
  constructor() {
    super('sci-hub');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const identifier = query.text.trim();
    if (!identifier) {
      return { items: [], source: this.id, meta: { error: '请输入 DOI 或 URL' } };
    }
    const result = await fetchSciHub(identifier);
    return {
      items: result ? [result.paper] : [],
      source: this.id,
      meta: { identifier },
    };
  }

  async download(id: string, dir: string): Promise<DownloadResult> {
    const fetched = await fetchSciHub(id);
    if (!fetched || !fetched.pdfUrl) {
      throw new Error(`ScI-Hub 未返回 PDF 链接: ${id}`);
    }
    const filename = `${id.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;
    const target = this.resolvePath(dir, filename);
    const info = await stat(target).catch(() => null);
    if (info) {
      return { id, source: this.id, path: target, sizeInBytes: info.size, cached: true };
    }
    await this.ensureDir(dir);
    const buffer = await requestBuffer({ url: fetched.pdfUrl, method: 'GET', headers: { 'user-agent': 'Mozilla/5.0' } });
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
    const fetched = await fetchSciHub(id);
    return fetched?.paper ?? null;
  }
}

registerPluginDefinition({
  key: 'sciHub',
  loader: async (): Promise<PluginModule> => ({
    id: 'sci-hub',
    enabled: true,
    create: async () => new SciHubAdapter(),
  }),
});
