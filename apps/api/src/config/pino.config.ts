import { Params } from 'nestjs-pino';
import pino from 'pino';
import { Options } from 'pino-http';
import { IncomingMessage, ServerResponse } from 'http';
import { getOciLoggingConfig } from './oci-logging.config';
import { OciTransportStream } from '../common/transports/oci-transport-stream';

interface RequestWithFrameworkProperties {
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  remoteAddress?: string;
}

export function getPinoConfig(): Params {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  const ociConfig = getOciLoggingConfig();

  const baseOptions: Options = {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    messageKey: 'message',
    formatters: {
      level(label: string) {
        return { level: label.toUpperCase() };
      },
    },
    hooks: {
      logMethod(inputArgs, method) {
        if (inputArgs.length <= 2) {
          method.apply(this, inputArgs);
          return;
        }

        const [firstArg, message, ...extraArgs] = inputArgs;
        const hasObjectParams = extraArgs.some(
          (arg: unknown) => typeof arg === 'object' && arg !== null,
        );

        if (typeof firstArg === 'object' && firstArg !== null && hasObjectParams) {
          method.apply(this, [{ ...firstArg, optionalParams: extraArgs }, message]);
          return;
        }

        method.apply(this, inputArgs);
      },
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        '*.password',
        '*.token',
        '*.accessToken',
        '*.refreshToken',
      ],
      remove: true,
    },
    serializers: {
      req: (req: IncomingMessage) => {
        const reqWithFramework = req as IncomingMessage & RequestWithFrameworkProperties & { id?: string | number };
        return {
          id: reqWithFramework.id,
          method: req.method,
          url: req.url,
          query: reqWithFramework.query,
          params: reqWithFramework.params,
          remoteAddress: req.headers['cf-connecting-ip'] || reqWithFramework.remoteAddress,
          userAgent: req.headers['user-agent'],
        };
      },
      res: (res: ServerResponse) => ({
        statusCode: res.statusCode,
      }),
    },
    autoLogging: {
      ignore: (req: IncomingMessage) => {
        return req.url === '/test';
      },
    },
  };

  if (ociConfig.enabled) {
    const ociStream = new OciTransportStream({
      ociConfig,
      maxBatchSize: parseInt(process.env.OCI_LOGGING_MAX_BATCH_SIZE || '50', 10),
      flushIntervalMs: parseInt(process.env.OCI_LOGGING_FLUSH_INTERVAL_MS || '5000', 10),
    });

    return {
      pinoHttp: [
        baseOptions,
        pino.multistream([
          { level: 'trace', stream: process.stdout },
          { level: 'trace', stream: ociStream },
        ]),
      ],
    };
  }

  if (isDevelopment) {
    return {
      pinoHttp: {
        ...baseOptions,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        },
      },
    };
  }

  return { pinoHttp: baseOptions };
}