import { appConfig, type PluginConfig } from '../core/config.js';
import type { PluginModule } from '../core/types.js';
import { registerAdapter } from '../services/adapterRegistry.js';
import { logger } from '../utils/logger.js';

export type PluginDefinition = {
  key: keyof PluginConfig;
  loader: () => Promise<PluginModule>;
};

const definitions: PluginDefinition[] = [];
const pluginLoaders: Array<() => Promise<unknown>> = [
  () => import('./sciHub.js'),
  () => import('./libgen.js'),
  () => import('./scienceDirect.js'),
  () => import('./springerLink.js'),
  () => import('./ieeeXplore.js'),
  () => import('./oaButton.js'),
  () => import('./unpaywall.js'),
];

export const registerPluginDefinition = (definition: PluginDefinition) => {
  definitions.push(definition);
};

export const loadPluginAdapters = async () => {
  for (const loader of pluginLoaders) {
    try {
      await loader();
    } catch (error) {
      logger.warn({ error: String(error) }, '加载插件模块失败');
    }
  }
  for (const definition of definitions) {
    const enabled = appConfig.plugins[definition.key];
    if (!enabled) {
      continue;
    }
    const module = await definition.loader();
    if (!module.enabled) {
      logger.warn({ plugin: module.id }, '插件未启用');
      continue;
    }
    const adapter = await module.create({});
    registerAdapter(adapter);
    logger.info({ plugin: module.id }, '插件已加载');
  }
};
