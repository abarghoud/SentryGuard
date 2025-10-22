import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { CallbackController } from './callback.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController, CallbackController],
  providers: [AuthService],
  exports: [AuthService], // Exporter pour utilisation dans d'autres modules
})
export class AuthModule {}

