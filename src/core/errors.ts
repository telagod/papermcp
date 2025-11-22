export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class PlatformError extends Error {
  constructor(message: string, readonly platform?: string) {
    super(message);
    this.name = 'PlatformError';
  }
}

export class DownloadError extends Error {
  constructor(message: string, readonly platform?: string) {
    super(message);
    this.name = 'DownloadError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export type SerializableError = {
  name: string;
  message: string;
  stack?: string;
  details?: Record<string, unknown>;
};

export const serializeError = (error: unknown): SerializableError => {
  if (error instanceof Error) {
    const base: SerializableError = {
      name: error.name,
      message: error.message,
    };
    if (error.stack) {
      return { ...base, stack: error.stack };
    }
    return base;
  }
  const fallback = typeof error === 'string' ? error : JSON.stringify(error);
  return { name: 'Error', message: fallback };
};
