import got, { OptionsInit } from 'got';
import Bottleneck from 'bottleneck';
import { appConfig } from '../core/config.js';

const limiter = new Bottleneck({
  maxConcurrent: appConfig.http.maxConcurrent,
  minTime: appConfig.http.minIntervalMs,
});

const baseClient = got.extend({
  timeout: { request: appConfig.http.timeoutMs },
  retry: {
    limit: appConfig.http.retryCount,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
  },
  headers: {
    'user-agent': appConfig.http.userAgent,
  },
  http2: true,
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
