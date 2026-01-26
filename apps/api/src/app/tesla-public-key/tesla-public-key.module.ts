import { Module } from '@nestjs/common';
import { TeslaPublicKeyController } from './tesla-public-key.controller';

@Module({
  controllers: [TeslaPublicKeyController],
})
export class TeslaPublicKeyModule {}