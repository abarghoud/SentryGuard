import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { CallbackController } from './callback.controller';
import { AuthService } from './auth.service';
import { User } from '../../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController, CallbackController],
  providers: [AuthService],
  exports: [AuthService], // Exporter pour utilisation dans d'autres modules
})
export class AuthModule {}

