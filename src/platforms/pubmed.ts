import { XMLParser } from 'fast-xml-parser';
import type { DownloadResult, Paper, PaperText, SearchQuery, SearchResult } from '../core/types.js';
import { PlatformError } from '../core/errors.js';
import { request } from '../utils/http.js';
import { BasePlatformAdapter } from './baseAdapter.js';
import { addAdapterFactory } from './index.js';

const SEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const FETCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  trimValues: true,
});

type Author = {
  LastName?: unknown;
  Initials?: unknown;
};

type AuthorList = {
  Author?: Author | Author[];
};

type ELocationID = Record<string, unknown> & {
  EIdType?: string;
};

type ArticleInfo = Record<string, unknown> & {
  ArticleTitle?: unknown;
  Abstract?: { AbstractText?: unknown };
  AuthorList?: AuthorList;
  ELocationID?: ELocationID | ELocationID[];
  Journal?: {
    JournalIssue?: {
      PubDate?: Record<string, unknown>;
    };
  };
};

interface RawPubmedArticle {
  MedlineCitation?: {
    PMID?: unknown;
    Article?: ArticleInfo;
  };
}

const arrayify = <T>(value: T | T[] | undefined | null): T[] => {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const textValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && '#text' in (value as Record<string, unknown>)) {
    const text = (value as Record<string, unknown>)['#text'];
    return typeof text === 'string' ? text : '';
  }
  return '';
};

const monthMap: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

const normalizeMonth = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (/^\d{1,2}$/.test(trimmed)) {
    return trimmed.padStart(2, '0');
  }
  const mapped = monthMap[trimmed.toLowerCase()];
  return mapped;
};

const formatPubDate = (pubDate: Record<string, unknown> | undefined): string | undefined => {
  if (!pubDate) {
    return undefined;
  }
  const year = textValue(pubDate.Year);
  if (!year) {
    return undefined;
  }
  const month = normalizeMonth(textValue(pubDate.Month)) ?? '01';
  const dayRaw = textValue(pubDate.Day);
  const day = /^\d{1,2}$/.test(dayRaw) ? dayRaw.padStart(2, '0') : '01';
  const isoCandidate = `${year}-${month}-${day}`;
  const stamp = new Date(isoCandidate);
  if (Number.isNaN(stamp.getTime())) {
    return `${year}-01-01`;
  }
  return stamp.toISOString();
};

const parseAuthors = (authorList?: AuthorList): string[] => {
  const entries = arrayify(authorList?.Author);
  return entries
    .map(author => {
      const last = textValue(author.LastName);
      const initials = textValue(author.Initials);
      return `${last} ${initials}`.trim();
    })
    .filter(Boolean);
};

const parseDoi = (value?: ELocationID | ELocationID[]): string => {
  const entries = arrayify(value);
  for (const entry of entries) {
    const type = typeof entry.EIdType === 'string' ? entry.EIdType.toLowerCase() : '';
    if (type === 'doi') {
      const text = textValue(entry);
      if (text) {
        return text;
      }
    }
  }
  return '';
};

const buildSearchParams = (query: SearchQuery) =>
  new URLSearchParams({
    db: 'pubmed',
    term: query.text,
    retmax: String(query.limit ?? 10),
    retmode: 'xml',
  });

const buildFetchParams = (ids: string[]) =>
  new URLSearchParams({
    db: 'pubmed',
    id: ids.join(','),
    retmode: 'xml',
  });

const parseIds = (xml: string): string[] => {
  const data = parser.parse(xml) as {
    eSearchResult?: {
      IdList?: {
        Id?: string | string[];
      };
    };
  };
  const ids = data.eSearchResult?.IdList?.Id;
  if (!ids) {
    return [];
  }
  return Array.isArray(ids) ? ids : [ids];
};

const parseArticles = (xml: string): RawPubmedArticle[] => {
  const data = parser.parse(xml) as {
    PubmedArticleSet?: {
      PubmedArticle?: RawPubmedArticle | RawPubmedArticle[];
    };
  };
  return arrayify(data.PubmedArticleSet?.PubmedArticle);
};

const buildPaper = (article: RawPubmedArticle): Paper | null => {
  const citation = article.MedlineCitation;
  const articleInfo = citation?.Article;
  if (!citation || !articleInfo) {
    return null;
  }
  const pmid = textValue(citation.PMID);
  if (!pmid) {
    return null;
  }
  const title = textValue(articleInfo.ArticleTitle);
  const abstractValue = articleInfo.Abstract?.AbstractText;
  const abstractText = Array.isArray(abstractValue)
    ? abstractValue.map(textValue).join('\n')
    : textValue(abstractValue as unknown);
  const authors = parseAuthors(articleInfo.AuthorList);
  const doi = parseDoi(articleInfo.ELocationID);
  const pubDate = formatPubDate(articleInfo.Journal?.JournalIssue?.PubDate);
  return {
    id: pmid,
    title,
    authors,
    abstract: abstractText,
    doi,
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    source: 'pubmed',
    categories: [],
    keywords: [],
    references: [],
    extra: { raw: article },
    ...(pubDate ? { publishedAt: pubDate, updatedAt: pubDate } : {}),
  };
};

class PubmedAdapter extends BasePlatformAdapter {
  constructor() {
    super('pubmed');
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const searchParams = buildSearchParams(query);
    const searchRes = (await request({ url: `${SEARCH_URL}?${searchParams.toString()}`, method: 'GET' })) as { body?: unknown };
    const ids = parseIds(typeof searchRes.body === 'string' ? searchRes.body : String(searchRes.body ?? ''));
    if (!ids.length) {
      return { items: [], source: this.id, meta: { count: 0 } };
    }
    const fetchParams = buildFetchParams(ids);
    const fetchRes = (await request({ url: `${FETCH_URL}?${fetchParams.toString()}`, method: 'GET' })) as { body?: unknown };
    const articles = parseArticles(typeof fetchRes.body === 'string' ? fetchRes.body : String(fetchRes.body ?? ''));
    const items = articles.map(buildPaper).filter((paper): paper is Paper => Boolean(paper));
    return { items, source: this.id, meta: { count: items.length } };
  }

  async download(id: string, _dir: string): Promise<DownloadResult> {
    throw new PlatformError(`PubMed 论文 ${id} 无法直接下载 PDF，请访问出版商网站。`, this.id);
  }

  async read(id: string, _dir: string): Promise<PaperText> {
    throw new PlatformError(`PubMed 论文 ${id} 仅提供摘要，无法直接读取全文。`, this.id);
  }
}

addAdapterFactory(() => new PubmedAdapter());
