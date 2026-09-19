import { Module } from '@nestjs/common';
import { LegalRedirectController } from './legal-redirect.controller';
import { TeslaAppRedirectController } from './tesla-app-redirect.controller';

@Module({
  controllers: [TeslaAppRedirectController, LegalRedirectController],
})
export class RedirectModule {}
