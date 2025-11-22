import { PlatformError } from '../core/errors.js';
import type { PlatformAdapter, PlatformID } from '../core/types.js';

const adapters = new Map<PlatformID, PlatformAdapter>();

export const registerAdapter = (adapter: PlatformAdapter) => {
  adapters.set(adapter.id, adapter);
};

export const getAdapter = (id: PlatformID): PlatformAdapter => {
  const adapter = adapters.get(id);
  if (!adapter) {
    throw new PlatformError(`平台 ${id} 尚未启用`, id);
  }
  return adapter;
};

export const listAdapters = (): PlatformAdapter[] => [...adapters.values()];

export const removeAdapter = (id: PlatformID) => {
  adapters.delete(id);
};
