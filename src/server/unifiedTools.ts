import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { appConfig, type PluginConfig } from '../core/config.js';
import { PlatformError } from '../core/errors.js';
import { getRecommendedPlatforms, getPlatformTier } from '../core/platformLimits.js';
import type { PlatformID, SearchQuery } from '../core/types.js';
import { getAdapter } from '../services/adapterRegistry.js';
import { createToolResponse } from '../services/toolResponse.js';

const pluginPlatforms: Record<string, keyof PluginConfig> = {
  'sci-hub': 'sciHub',
  'libgen': 'libgen',
  'oa-button': 'oaButton',
  'unpaywall': 'unpaywall',
  'science-direct': 'scienceDirect',
  'springer-link': 'springerLink',
  'ieee-xplore': 'ieeeXplore',
};

const checkPluginEnabled = (platform: string) => {
  const pluginKey = pluginPlatforms[platform];
  if (pluginKey && !appConfig.plugins[pluginKey]) {
    throw new PlatformError(`插件平台 ${platform} 未启用，请在环境变量中设置 PLUGIN_${pluginKey.toUpperCase()}=true`, platform as PlatformID);
  }
};

const recommendInputSchema = z.object({
  query: z.string().min(1),
  field: z.enum(['biomedical', 'computer-science', 'physics', 'mathematics', 'cryptography', 'open-access', 'general']).optional(),
});

const searchInputSchema = z.object({
  platform: z.string().min(1),
  query: z.string().min(1),
  limit: z.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  year: z.string().optional(),
  filters: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const downloadInputSchema = z.object({
  platform: z.string().min(1),
  id: z.string().min(1),
  dir: z.string().optional(),
});

export const registerUnifiedTools = (server: McpServer) => {
  server.registerTool(
    'recommend_platforms',
    {
      title: '推荐学术平台',
      description: '根据查询意图和学科领域推荐最合适的学术搜索平台。返回按优先级排序的平台列表及其特点。',
      inputSchema: recommendInputSchema,
      outputSchema: z.object({
        recommendations: z.array(z.object({
          platform: z.string(),
          tier: z.number(),
          reason: z.string(),
        })),
        field: z.string().optional(),
      }),
    },
    async args => {
      const field = args.field || 'general';
      const platforms = getRecommendedPlatforms(field === 'general' ? undefined : field);

      const recommendations = platforms.map(p => ({
        platform: p,
        tier: getPlatformTier(p),
        reason: getTierDescription(getPlatformTier(p)),
      }));

      return createToolResponse({ recommendations, field });
    }
  );

  server.registerTool(
    'search_papers',
    {
      title: '搜索学术论文',
      description: '在指定平台搜索学术论文。使用 recommend_platforms 工具获取推荐平台。',
      inputSchema: searchInputSchema,
      outputSchema: z.object({
        items: z.array(z.record(z.any())),
        nextCursor: z.string().optional(),
        source: z.string(),
      }),
    },
    async args => {
      checkPluginEnabled(args.platform);
      const adapter = getAdapter(args.platform as PlatformID);
      const query: SearchQuery = {
        text: args.query,
        limit: args.limit ?? 10,
        ...(args.cursor && { cursor: args.cursor }),
        ...(args.year && { year: args.year }),
        ...(args.filters && { filters: args.filters }),
      };
      const result = await adapter.search(query);
      return createToolResponse(result);
    }
  );

  server.registerTool(
    'download_paper',
    {
      title: '下载论文PDF',
      description: '从指定平台下载论文PDF文件',
      inputSchema: downloadInputSchema,
      outputSchema: z.object({
        id: z.string(),
        source: z.string(),
        path: z.string(),
        cached: z.boolean(),
      }),
    },
    async args => {
      checkPluginEnabled(args.platform);
      const adapter = getAdapter(args.platform as PlatformID);
      const dir = args.dir ?? appConfig.downloadDir;
      const result = await adapter.download(args.id, dir);
      return createToolResponse(result);
    }
  );

  server.registerTool(
    'read_paper',
    {
      title: '读取论文内容',
      description: '读取指定平台论文的PDF文本内容',
      inputSchema: downloadInputSchema,
      outputSchema: z.object({
        id: z.string(),
        source: z.string(),
        text: z.string(),
        statistics: z.object({
          pages: z.number().optional(),
        }).optional(),
      }),
    },
    async args => {
      checkPluginEnabled(args.platform);
      const adapter = getAdapter(args.platform as PlatformID);
      const dir = args.dir ?? appConfig.downloadDir;
      const result = await adapter.read(args.id, dir);
      return createToolResponse(result);
    }
  );
};

const getTierDescription = (tier: number): string => {
  switch (tier) {
    case 1: return '高可用性，无需API key，推荐优先使用';
    case 2: return '中等可用性，建议配置API key提高限额';
    case 3: return '低可用性，严格限流，谨慎使用';
    case 4: return '需要API key认证';
    default: return '未知';
  }
};
