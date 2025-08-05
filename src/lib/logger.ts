const isDevelopment = process.env.NODE_ENV === 'development';

interface Logger {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

const logger: Logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log('[LOG]', ...args);
    }
  },
  info: (...args) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },
  warn: (...args) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args) => {
    if (isDevelopment) {
      console.error('[ERROR]', ...args);
    }
  },
};

export default logger;