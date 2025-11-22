import got, { OptionsInit } from 'got';
import Bottleneck from 'bottleneck';
import { appConfig } from '../core/config.js';

const limiter = new Bottleneck({
  maxConcurrent: appConfig.http.maxConcurrent,
  minTime: appConfig.http.minIntervalMs,
});

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
];

const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];

const baseClient = got.extend({
  timeout: { request: appConfig.http.timeoutMs },
  retry: {
    limit: appConfig.http.retryCount,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    statusCodes: [408, 413, 429, 500, 502, 503, 504, 520, 521, 522, 524],
    backoffLimit: 10000,
    calculateDelay: ({ attemptCount, retryOptions }) => {
      if (attemptCount > retryOptions.limit) return 0;
      const delay = Math.min(1000 * Math.pow(2, attemptCount - 1), retryOptions.backoffLimit);
      return delay + Math.random() * 1000;
    },
  },
  headers: {
    'user-agent': getRandomUserAgent(),
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'accept-encoding': 'gzip, deflate, br',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
  },
  http2: false,
  hooks: {
    beforeRequest: [
      (options) => {
        options.headers['user-agent'] = getRandomUserAgent();
      },
    ],
  },
});

const schedule = async <T>(task: () => Promise<T>): Promise<T> => limiter.schedule(task);

export const request = async (options: OptionsInit) => {
  const run = async () => baseClient(options);
  return schedule(run);
};

export const requestJson = async <T>(options: OptionsInit): Promise<T> => {
  const run = async () => {
    const response = (await baseClient({ ...options, responseType: 'json' as const })) as { body: T };
    return response.body;
  };
  return schedule(run);
};

export const requestBuffer = async (options: OptionsInit): Promise<Buffer> => {
  const run = async () => {
    const response = (await baseClient({ ...options, responseType: 'buffer' as const })) as { body: Buffer };
    return response.body;
  };
  return schedule(run);
};
