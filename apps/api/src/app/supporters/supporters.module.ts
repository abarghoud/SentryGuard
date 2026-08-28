import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supporter } from '../../entities/supporter.entity';
import { SupportersController } from './supporters.controller';
import { SupportersService } from './supporters.service';

@Module({
  imports: [TypeOrmModule.forFeature([Supporter])],
  controllers: [SupportersController],
  providers: [SupportersService],
  exports: [SupportersService],
})
export class SupportersModule {}
