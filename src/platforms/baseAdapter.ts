import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type {
  DownloadResult,
  PaperText,
  PlatformAdapter,
  PlatformID,
  SearchQuery,
  SearchResult,
} from '../core/types.js';
import { logger } from '../utils/logger.js';

export abstract class BasePlatformAdapter implements PlatformAdapter {
  constructor(readonly id: PlatformID) {}

  abstract search(query: SearchQuery): Promise<SearchResult>;

  abstract download(id: string, dir: string): Promise<DownloadResult>;

  abstract read(id: string, dir: string): Promise<PaperText>;

  protected async ensureDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
  }

  protected resolvePath(dir: string, filename: string): string {
    return path.resolve(dir, filename);
  }

  protected log(scope: Record<string, unknown>) {
    return logger.child(scope);
  }
}
