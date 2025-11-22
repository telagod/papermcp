import { stat, writeFile, readFile } from 'node:fs/promises';
import pdfParse from 'pdf-parse';
import type { DownloadResult, Paper, PaperText, SearchQuery, SearchResult } from '../core/types.js';
import { BasePlatformAdapter } from './baseAdapter.js';
import { addAdapterFactory } from './index.js';
import { requestJson, requestBuffer } from '../utils/http.js';

const ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const ESUMMARY_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';

const toIsoDate = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  const stamp = new Date(value);
  if (Number.isNaN(stamp.getTime())) {
    return undefined;
  }
  return stamp.toISOString();
};

const buildPdfUrl = (pmcid: string) => `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/pdf`;
const buildArticleUrl = (pmcid: string) => `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/`;

const normalizeAuthors = (authors?: Array<{ name?: string }>): string[] => {
  if (!Array.isArray(authors)) {
    return [];
  }
  return authors
    .map(author => (typeof author.name === 'string' ? author.name : ''))
    .filter(Boolean);
};

const summaryToPaper = (item: Record<string, unknown>): Paper | null => {
  const articleIds: Array<{ idtype?: string; value?: string }> = item.articleids ?? [];
  const pmcid = articleIds.find(entry => entry.idtype === 'pmcid')?.value;
  if (!pmcid) {
    return null;
  }
  const doi = articleIds.find(entry => entry.idtype === 'doi')?.value ?? '';
  const publishedAt = toIsoDate(item.pubdate);
  return {
    id: pmcid,
    title: item.title ?? '',
    authors: normalizeAuthors(item.authors),
    abstract: item.summary ?? '',
    doi,
    url: buildArticleUrl(pmcid),
    source: 'pmc',
    categories: [],
    keywords: [],
    references: [],
    extra: {
      journal: item.source ?? '',
    },
    pdfUrl: buildPdfUrl(pmcid),
    ...(publishedAt ? { publishedAt, updatedAt: publishedAt } : {}),
  };
};

const buildEsearchParams = (query: SearchQuery) => {
  const params = new URLSearchParams({
    db: 'pmc',
    term: query.text,
    retmode: 'json',
    retmax: String(query.limit ?? 10),
  });
  return params;
};

export class PmcAdapter extends BasePlatformAdapter {
  constructor() {
    super('pmc');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const esearchParams = buildEsearchParams(query);
    const esearchUrl = `${ESEARCH_URL}?${esearchParams.toString()}`;
    const searchResponse = await requestJson<{ esearchresult?: { idlist?: string[] } }>({ url: esearchUrl, method: 'GET' });
    const ids = searchResponse.esearchresult?.idlist ?? [];
    if (!ids.length) {
      return { items: [], source: this.id, meta: { count: 0 } };
    }
    const esummaryParams = new URLSearchParams({
      db: 'pmc',
      id: ids.join(','),
      retmode: 'json',
    });
    const summaryUrl = `${ESUMMARY_URL}?${esummaryParams.toString()}`;
    const summaryResponse = await requestJson<{ result?: Record<string, any> }>({ url: summaryUrl, method: 'GET' });
    const result = summaryResponse.result ?? {};
    const uids: string[] = result.uids ?? ids;
    const papers = uids
      .map(uid => summaryToPaper(result[uid]))
      .filter((paper): paper is Paper => Boolean(paper))
      .slice(0, query.limit ?? 10);
    return { items: papers, source: this.id, meta: { count: papers.length } };
  }

  async download(id: string, dir: string): Promise<DownloadResult> {
    const safeId = id.startsWith('PMC') ? id : `PMC${id}`;
    const target = this.resolvePath(dir, `${safeId}.pdf`);
    const info = await stat(target).catch(() => null);
    if (info) {
      return { id: safeId, source: this.id, path: target, sizeInBytes: info.size, cached: true };
    }
    await this.ensureDir(dir);
    const pdfUrl = buildPdfUrl(safeId);
    const buffer = await requestBuffer({ url: pdfUrl, method: 'GET' });
    await writeFile(target, buffer);
    return { id: safeId, source: this.id, path: target, sizeInBytes: buffer.byteLength, cached: false };
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
    const queryId = id.startsWith('PMC') ? id : `PMC${id}`;
    const esummaryParams = new URLSearchParams({
      db: 'pmc',
      id: queryId.replace(/^PMC/i, ''),
      retmode: 'json',
    });
    const summaryUrl = `${ESUMMARY_URL}?${esummaryParams.toString()}`;
    const summaryResponse = await requestJson<{ result?: Record<string, any> }>({ url: summaryUrl, method: 'GET' });
    const result = summaryResponse.result ?? {};
    const item = Object.values(result).find(value => value?.articleids);
    const paper = item ? summaryToPaper(item) : null;
    return paper;
  }
}

addAdapterFactory(() => new PmcAdapter());
