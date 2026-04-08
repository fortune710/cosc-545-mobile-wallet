import pino from 'pino';

const logger = pino({
  level: import.meta.env.VITE_LOG_LEVEL || (import.meta.env.DEV ? 'debug' : 'info'),
  browser: {
    asObject: true,
  },
});

export default logger;
