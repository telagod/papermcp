import type { DownloadResult, Paper, PaperText, SearchQuery, SearchResult } from '../core/types.js';
import { PlatformError } from '../core/errors.js';
import { requestJson } from '../utils/http.js';
import { BasePlatformAdapter } from './baseAdapter.js';
import { addAdapterFactory } from './index.js';

const BASE_URL = 'https://api.crossref.org';
const CONTACT_EMAIL = 'paper-search@example.org';
const USER_AGENT = 'paper-search-mcp-ts/0.1.0 (https://github.com/openags/paper-search-mcp)';
const headers = {
  'user-agent': USER_AGENT,
  accept: 'application/json',
};

type CrossrefItem = Record<string, unknown> & {
  DOI?: string;
  title?: string[];
  author?: Array<{ given?: string; family?: string }>;
  abstract?: string;
  published?: { 'date-parts'?: number[][] };
  issued?: { 'date-parts'?: number[][] };
  created?: { 'date-parts'?: number[][] };
  URL?: string;
  resource?: { primary?: { URL?: string } };
  link?: Array<{ URL?: string; 'content-type'?: string }>;
  subject?: string[];
  type?: string;
  publisher?: string;
  'container-title'?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  ISSN?: string[];
  ISBN?: string[];
  member?: string;
  prefix?: string;
  'is-referenced-by-count'?: number;
};

type CrossrefResponse = {
  message?: {
    items?: CrossrefItem[];
  };
};

const toIsoDate = (item?: { 'date-parts'?: number[][] }): string | undefined => {
  const firstPart = item?.['date-parts'];
  if (!firstPart || !firstPart[0]) {
    return undefined;
  }
  const [year, month, day] = firstPart[0];
  const safeYear = typeof year === 'number' ? year : 1970;
  const safeMonth = typeof month === 'number' ? month : 1;
  const safeDay = typeof day === 'number' ? day : 1;
  const stamp = new Date(safeYear, safeMonth - 1, safeDay);
  if (Number.isNaN(stamp.getTime())) {
    return undefined;
  }
  return stamp.toISOString();
};

const pickDate = (item: CrossrefItem): string | undefined =>
  toIsoDate(item.published) ?? toIsoDate(item.issued) ?? toIsoDate(item.created);

const pickTitle = (titles?: string[]): string => {
  if (Array.isArray(titles) && titles.length) {
    return titles[0];
  }
  return '';
};

const pickAuthors = (authors?: Array<{ given?: string; family?: string }>): string[] => {
  if (!Array.isArray(authors)) {
    return [];
  }
  return authors
    .map(author => {
      const given = typeof author.given === 'string' ? author.given : '';
      const family = typeof author.family === 'string' ? author.family : '';
      return `${given} ${family}`.trim();
    })
    .filter(Boolean);
};

const pickPdfUrl = (item: CrossrefItem): string | undefined => {
  const primary = item.resource?.primary?.URL;
  if (primary && primary.endsWith('.pdf')) {
    return primary;
  }
  const links = item.link ?? [];
  for (const link of links) {
    const type = typeof link['content-type'] === 'string' ? link['content-type'].toLowerCase() : '';
    if (type.includes('pdf') && link.URL) {
      return link.URL;
    }
  }
  return undefined;
};

const toPaper = (item: CrossrefItem): Paper | null => {
  const doi = typeof item.DOI === 'string' ? item.DOI : '';
  if (!doi) {
    return null;
  }
  const title = pickTitle(item.title);
  const authors = pickAuthors(item.author);
  const publishedAt = pickDate(item);
  const pdfUrl = pickPdfUrl(item);
  const keywords = Array.isArray(item.subject) ? item.subject : [];
  const categories = item.type ? [item.type] : [];
  const citationCount = typeof item['is-referenced-by-count'] === 'number' ? item['is-referenced-by-count'] : 0;
  const containerTitle = Array.isArray(item['container-title']) && item['container-title'].length ? item['container-title'][0] : '';
  return {
    id: doi,
    title,
    authors,
    abstract: typeof item.abstract === 'string' ? item.abstract : '',
    doi,
    url: typeof item.URL === 'string' && item.URL ? item.URL : `https://doi.org/${doi}`,
    source: 'crossref',
    categories,
    keywords,
    references: [],
    extra: {
      publisher: item.publisher ?? '',
      container_title: containerTitle,
      volume: item.volume ?? '',
      issue: item.issue ?? '',
      page: item.page ?? '',
      issn: item.ISSN ?? [],
      isbn: item.ISBN ?? [],
      crossref_type: item.type ?? '',
      member: item.member ?? '',
      prefix: item.prefix ?? '',
    },
    citations: citationCount,
    ...(pdfUrl ? { pdfUrl } : {}),
    ...(publishedAt ? { publishedAt, updatedAt: publishedAt } : {}),
  };
};

const buildSearchParams = (query: SearchQuery) => {
  const params = new URLSearchParams();
  params.set('query', query.text);
  params.set('rows', String(Math.min(query.limit ?? 10, 1000)));
  params.set('sort', typeof query.filters?.sort === 'string' ? query.filters.sort : 'relevance');
  params.set('order', typeof query.filters?.order === 'string' ? query.filters.order : 'desc');
  const filter = typeof query.filters?.filter === 'string' ? query.filters.filter : undefined;
  if (filter) {
    params.set('filter', filter);
  }
  params.set('mailto', CONTACT_EMAIL);
  return params;
};

const doRequest = async <T>(path: string, params?: URLSearchParams): Promise<T> => {
  const url = params ? `${BASE_URL}${path}?${params.toString()}` : `${BASE_URL}${path}`;
  return requestJson<T>({ url, method: 'GET', headers });
};

class CrossrefAdapter extends BasePlatformAdapter {
  constructor() {
    super('crossref');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const params = buildSearchParams(query);
    const response = await doRequest<CrossrefResponse>('/works', params);
    const items = response.message?.items ?? [];
    const papers = items.map(toPaper).filter((paper): paper is Paper => Boolean(paper));
    return {
      items: papers,
      source: this.id,
      meta: {
        count: papers.length,
        params: Object.fromEntries(params.entries()),
      },
    };
  }

  async download(id: string, _dir: string): Promise<DownloadResult> {
    throw new PlatformError(`CrossRef 记录 ${id} 无法直接下载 PDF，请使用 DOI 访问出版商页面。`, this.id);
  }

  async read(id: string, _dir: string): Promise<PaperText> {
    throw new PlatformError(`CrossRef 记录 ${id} 仅提供元数据，无法直接读取全文。`, this.id);
  }

  async lookup(id: string): Promise<Paper | null> {
    const safeId = encodeURIComponent(id);
    const params = new URLSearchParams({ mailto: CONTACT_EMAIL });
    const response = await doRequest<{ message?: CrossrefItem }>(`/works/${safeId}`, params);
    const paper = response.message ? toPaper(response.message) : null;
    return paper;
  }
}

addAdapterFactory(() => new CrossrefAdapter());
