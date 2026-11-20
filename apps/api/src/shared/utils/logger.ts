import pino from 'pino';
import { env } from '../../config/env';

const isProduction = env.NODE_ENV === 'production';

let canUsePretty = !isProduction;
if (canUsePretty) {
  try {
    require.resolve('pino-pretty');
  } catch {
    canUsePretty = false;
  }
}

export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  transport: canUsePretty
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
