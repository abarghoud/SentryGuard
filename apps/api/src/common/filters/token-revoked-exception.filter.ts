import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { TokenRevokedException } from '../exceptions/token-revoked.exception';

/**
 * Global exception filter to handle TokenRevokedException
 *
 * This filter intercepts TokenRevokedException instances and returns a structured
 * HTTP 401 response to inform the client that their Tesla authorization has been revoked.
 *
 * SECURITY NOTE: This filter ensures sensitive error details are not leaked to the client
 * while providing enough information for the frontend to handle re-authentication flow.
 */
@Catch(TokenRevokedException)
export class TokenRevokedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TokenRevokedExceptionFilter.name);

  /**
   * Handles TokenRevokedException and sends appropriate HTTP response
   *
   * @param exception - The TokenRevokedException instance
   * @param host - The arguments host containing request/response context
   */
  catch(exception: TokenRevokedException, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const exceptionResponse = exception.getResponse();

    const responseData =
      typeof exceptionResponse === 'object'
        ? exceptionResponse
        : { message: exceptionResponse };

    this.logger.warn(
      `🔒 Tesla token revoked for user: ${exception.userId}`,
      JSON.stringify(responseData)
    );

    response.status(401).json(responseData);
  }
}
