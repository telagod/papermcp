import type { PlatformAdapter } from '../core/types.js';
import { registerAdapter } from '../services/adapterRegistry.js';
import { logger } from '../utils/logger.js';

export type AdapterFactory = () => Promise<PlatformAdapter> | PlatformAdapter;

const factories: AdapterFactory[] = [];

const builtInLoaders: Array<() => Promise<unknown>> = [
  () => import('./pmc.js'),
  () => import('./arxiv.js'),
  () => import('./pubmed.js'),
  () => import('./rxiv.js'),
  () => import('./crossref.js'),
  () => import('./googleScholar.js'),
  () => import('./semantic.js'),
  () => import('./iacr.js'),
  () => import('./acm.js'),
  () => import('./wos.js'),
  () => import('./scopus.js'),
  () => import('./jstor.js'),
  () => import('./researchgate.js'),
  () => import('./core.js'),
  () => import('./microsoftAcademic.js'),
];

export const registerBuiltInAdapters = async () => {
  for (const loader of builtInLoaders) {
    await loader();
  }
  for (const factory of factories) {
    const adapter = await factory();
    registerAdapter(adapter);
    logger.info({ platform: adapter.id }, '平台已注册');
  }
};

export const addAdapterFactory = (factory: AdapterFactory) => {
  factories.push(factory);
};
