import pino, { Bindings, Logger, LoggerOptions } from 'pino';
import { appConfig } from '../core/config.js';

const baseOptions: LoggerOptions = {
  level: appConfig.logLevel,
  name: 'paper-search-mcp',
};

export const logger: Logger = pino(baseOptions);

export const createChildLogger = (bindings?: Bindings): Logger => {
  if (!bindings) {
    return logger;
  }
  return logger.child(bindings);
};
