import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { appConfig, type PluginConfig } from '../core/config.js';
import { PlatformError } from '../core/errors.js';
import type { PlatformAdapter, PlatformID, SearchQuery } from '../core/types.js';
import { getAdapter } from '../services/adapterRegistry.js';
import { createToolResponse } from '../services/toolResponse.js';

const searchInputSchema = z.object({
  query: z.string().min(1, 'query 不能为空'),
  limit: z.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  year: z.string().optional(),
  filters: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const searchOutputSchema = z.object({
  items: z.array(z.record(z.any())),
  nextCursor: z.string().optional(),
  source: z.string(),
  meta: z.record(z.any()).optional(),
});

const downloadInputSchema = z.object({
  id: z.string().min(1, 'id 不能为空'),
  dir: z.string().min(1).optional(),
});

const downloadOutputSchema = z.object({
  id: z.string(),
  source: z.string(),
  path: z.string(),
  sizeInBytes: z.number().optional(),
  cached: z.boolean(),
});

const readOutputSchema = z.object({
  id: z.string(),
  source: z.string(),
  text: z.string(),
  statistics: z
    .object({
      pages: z.number().optional(),
      sizeInBytes: z.number().optional(),
    })
    .optional(),
  metadata: z.record(z.any()).optional(),
});

const crossrefLookupInputSchema = z.object({
  doi: z.string().min(1, 'doi 不能为空'),
});

const recordSchema = z.record(z.any());

type PlatformDefinition = {
  id: PlatformID;
  title: string;
  pluginKey?: keyof PluginConfig;
};

const platforms: PlatformDefinition[] = [
  { id: 'arxiv', title: 'arXiv' },
  { id: 'pubmed', title: 'PubMed' },
  { id: 'pmc', title: 'PubMed Central' },
  { id: 'biorxiv', title: 'bioRxiv' },
  { id: 'medrxiv', title: 'medRxiv' },
  { id: 'google-scholar', title: 'Google Scholar' },
  { id: 'iacr', title: 'IACR' },
  { id: 'semantic', title: 'Semantic Scholar' },
  { id: 'crossref', title: 'CrossRef' },
  { id: 'sci-hub', title: 'Sci-Hub', pluginKey: 'sciHub' },
  { id: 'libgen', title: 'LibGen', pluginKey: 'libgen' },
  { id: 'oa-button', title: 'Open Access Button', pluginKey: 'oaButton' },
  { id: 'unpaywall', title: 'Unpaywall', pluginKey: 'unpaywall' },
  { id: 'science-direct', title: 'ScienceDirect', pluginKey: 'scienceDirect' },
  { id: 'springer-link', title: 'Springer Link', pluginKey: 'springerLink' },
  { id: 'ieee-xplore', title: 'IEEE Xplore', pluginKey: 'ieeeXplore' },
];

const ensureAdapter = (platform: PlatformDefinition): PlatformAdapter => {
  if (platform.pluginKey) {
    const enabled = appConfig.plugins[platform.pluginKey];
    if (!enabled) {
      throw new PlatformError(`平台 ${platform.title} 插件未启用`, platform.id);
    }
  }
  return getAdapter(platform.id);
};

const toQuery = (args: z.infer<typeof searchInputSchema>): SearchQuery => {
  const limit = typeof args.limit === 'number' ? args.limit : 10;
  const parts: Partial<SearchQuery> = {};
  if (args.cursor) {
    parts.cursor = args.cursor;
  }
  if (args.year) {
    parts.year = args.year;
  }
  if (args.filters) {
    parts.filters = args.filters;
  }
  return {
    text: args.query,
    limit,
    ...parts,
  };
};

const registerSearchTool = (server: McpServer, platform: PlatformDefinition) => {
  server.registerTool(
    `search_${platform.id}`,
    {
      title: `${platform.title} 搜索`,
      description: `搜索 ${platform.title} 平台上的论文`,
      inputSchema: searchInputSchema,
      outputSchema: searchOutputSchema,
    },
    async args => {
      const adapter = ensureAdapter(platform);
      const query = toQuery(args);
      const result = await adapter.search(query);
      return createToolResponse(result);
    }
  );
};

const registerDownloadTool = (server: McpServer, platform: PlatformDefinition) => {
  server.registerTool(
    `download_${platform.id}`,
    {
      title: `${platform.title} 下载`,
      description: `下载 ${platform.title} PDF`,
      inputSchema: downloadInputSchema,
      outputSchema: downloadOutputSchema,
    },
    async args => {
      const adapter = ensureAdapter(platform);
      const dir = args.dir ?? appConfig.downloadDir;
      const result = await adapter.download(args.id, dir);
      return createToolResponse(result);
    }
  );
};

const registerReadTool = (server: McpServer, platform: PlatformDefinition) => {
  server.registerTool(
    `read_${platform.id}`,
    {
      title: `${platform.title} 阅读`,
      description: `读取 ${platform.title} PDF 文本内容`,
      inputSchema: downloadInputSchema,
      outputSchema: readOutputSchema,
    },
    async args => {
      const adapter = ensureAdapter(platform);
      const dir = args.dir ?? appConfig.downloadDir;
      const result = await adapter.read(args.id, dir);
      return createToolResponse(result);
    }
  );
};

export const createMcpServer = () => {
  const server = new McpServer({
    name: 'paper-search-mcp-ts',
    version: '0.1.0',
  });
  for (const platform of platforms) {
    registerSearchTool(server, platform);
    registerDownloadTool(server, platform);
    registerReadTool(server, platform);
  }
  const crossrefPlatform = platforms.find(item => item.id === 'crossref');
  if (crossrefPlatform) {
    server.registerTool(
      'get_crossref_paper_by_doi',
      {
        title: 'CrossRef DOI 查询',
        description: '通过 DOI 获取 CrossRef 论文元数据',
        inputSchema: crossrefLookupInputSchema,
        outputSchema: recordSchema,
      },
      async args => {
        const adapter = ensureAdapter(crossrefPlatform);
        if (!adapter.lookup) {
          throw new PlatformError('当前 CrossRef 适配器未提供 DOI 查询能力', crossrefPlatform.id);
        }
        const paper = await adapter.lookup(args.doi);
        return createToolResponse(paper ?? {});
      }
    );
  }
  return server;
};
