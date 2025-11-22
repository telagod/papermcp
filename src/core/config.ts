import { z } from 'zod';
import { ConfigError } from './errors.js';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

export interface HttpConfig {
  timeoutMs: number;
  retryCount: number;
  maxConcurrent: number;
  minIntervalMs: number;
  userAgent: string;
}

export interface PluginConfig {
  sciHub: boolean;
  libgen: boolean;
  oaButton: boolean;
  unpaywall: boolean;
  scienceDirect: boolean;
  springerLink: boolean;
  ieeeXplore: boolean;
}

export interface AppConfig {
  logLevel: LogLevel;
  downloadDir: string;
  http: HttpConfig;
  plugins: PluginConfig;
}

const logLevelSchema = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);

const raw = {
  logLevel: process.env.LOG_LEVEL,
  downloadDir: process.env.DOWNLOAD_DIR,
  httpTimeoutMs: process.env.HTTP_TIMEOUT_MS,
  httpRetryCount: process.env.HTTP_RETRY_COUNT,
  httpMaxConcurrent: process.env.HTTP_MAX_CONCURRENT,
  httpMinIntervalMs: process.env.HTTP_MIN_INTERVAL_MS,
  userAgent: process.env.HTTP_USER_AGENT,
  pluginSciHub: process.env.PLUGIN_SCI_HUB,
  pluginLibgen: process.env.PLUGIN_LIBGEN,
  pluginOaButton: process.env.PLUGIN_OA_BUTTON,
  pluginUnpaywall: process.env.PLUGIN_UNPAYWALL,
  pluginScienceDirect: process.env.PLUGIN_SCIENCE_DIRECT,
  pluginSpringerLink: process.env.PLUGIN_SPRINGER_LINK,
  pluginIeeeXplore: process.env.PLUGIN_IEEE_XPLORE,
};

const configSchema = z.object({
  logLevel: logLevelSchema.default('info'),
  downloadDir: z.string().min(1).default('./downloads'),
  httpTimeoutMs: z.coerce.number().int().positive().default(30000),
  httpRetryCount: z.coerce.number().int().nonnegative().default(5),
  httpMaxConcurrent: z.coerce.number().int().positive().default(2),
  httpMinIntervalMs: z.coerce.number().int().nonnegative().default(1000),
  userAgent: z.string().min(1).default('paper-search-mcp-ts/0.1.0'),
  pluginSciHub: z.coerce.boolean().default(false),
  pluginLibgen: z.coerce.boolean().default(false),
  pluginOaButton: z.coerce.boolean().default(false),
  pluginUnpaywall: z.coerce.boolean().default(false),
  pluginScienceDirect: z.coerce.boolean().default(false),
  pluginSpringerLink: z.coerce.boolean().default(false),
  pluginIeeeXplore: z.coerce.boolean().default(false),
});

const parseConfig = (): AppConfig => {
  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new ConfigError(`配置无效: ${details}`);
  }
  const data = parsed.data;
  return {
    logLevel: data.logLevel,
    downloadDir: data.downloadDir,
    http: {
      timeoutMs: data.httpTimeoutMs,
      retryCount: data.httpRetryCount,
      maxConcurrent: data.httpMaxConcurrent,
      minIntervalMs: data.httpMinIntervalMs,
      userAgent: data.userAgent,
    },
    plugins: {
      sciHub: data.pluginSciHub,
      libgen: data.pluginLibgen,
      oaButton: data.pluginOaButton,
      unpaywall: data.pluginUnpaywall,
      scienceDirect: data.pluginScienceDirect,
      springerLink: data.pluginSpringerLink,
      ieeeXplore: data.pluginIeeeXplore,
    },
  };
};

export const appConfig = parseConfig();
