import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Observable } from 'rxjs';

@Injectable()
export class LogContextInterceptor implements NestInterceptor {
  constructor(private readonly pinoLogger: PinoLogger) {}

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const fields: Record<string, string> = {};

    if (request?.user?.userId) {
      fields.userId = request.user.userId;
    }

    if (request?.params?.vin) {
      fields.vin = request.params.vin;
    }

    if (Object.keys(fields).length > 0) {
      this.pinoLogger.assign(fields);
    }

    return next.handle();
  }
}
