import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { CallbackController } from './callback.controller';
import { AuthService } from './auth.service';
import { TeslaOAuthService } from './services/tesla-oauth.service';
import { oauthProviderRequirementsSymbol } from './interfaces/oauth-provider.requirements';
import { UserRegistrationService } from './services/user-registration.service';
import { AccessTokenService } from './services/access-token.service';
import { TeslaPartnerAuthService } from './tesla-partner-auth.service';
import { TeslaTokenRefreshService } from './services/tesla-token-refresh.service';
import { TeslaTokenRefreshSchedulerService } from './services/tesla-token-refresh-scheduler.service';
import { DistributedLockService } from '../../common/services/distributed-lock.service';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../../entities/user.entity';
import { WaitlistModule } from '../waitlist/waitlist.module';

const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = (process.env.JWT_EXPIRATION || '30d') as JwtSignOptions['expiresIn'];

if (!jwtSecret) {
  throw new Error(
    'JWT_SECRET must be defined and strong; generate a random 32+ char secret.'
  );
}

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: jwtSecret,
      signOptions: {
        expiresIn: jwtExpiresIn,
      },
    }),
    WaitlistModule,
  ],
  controllers: [AuthController, CallbackController],
  providers: [
    AuthService,
    TeslaOAuthService,
    {
      provide: oauthProviderRequirementsSymbol,
      useExisting: TeslaOAuthService,
    },
    UserRegistrationService,
    AccessTokenService,
    TeslaPartnerAuthService,
    TeslaTokenRefreshService,
    TeslaTokenRefreshSchedulerService,
    DistributedLockService,
    JwtStrategy,
  ],
  exports: [
    AuthService,
    AccessTokenService,
    TeslaPartnerAuthService,
    TeslaTokenRefreshService,
    JwtStrategy,
    PassportModule,
  ],
})
export class AuthModule {}
