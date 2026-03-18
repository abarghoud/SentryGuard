import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ErrorCode } from '@sentryguard/beta-domain';
import { User } from '../../entities/user.entity';

@Injectable()
export class BetaTesterGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as User;

    if (!user) {
      throw new ForbiddenException(ErrorCode.BETA_TESTER_ONLY);
    }

    if (!user.is_beta_tester) {
      throw new ForbiddenException(ErrorCode.BETA_TESTER_ONLY);
    }

    return true;
  }
}
