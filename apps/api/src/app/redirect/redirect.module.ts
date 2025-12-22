import { Module } from '@nestjs/common';
import { TeslaAppRedirectController } from './tesla-app-redirect.controller';

@Module({
  controllers: [TeslaAppRedirectController],
})
export class RedirectModule {}
