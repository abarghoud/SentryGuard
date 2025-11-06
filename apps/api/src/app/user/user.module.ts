import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { UserController } from './user.controller';
import { UserLanguageService } from './user-language.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserLanguageService],
  exports: [UserLanguageService],
})
export class UserModule {}

