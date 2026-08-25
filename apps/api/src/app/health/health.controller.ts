import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { HealthService } from './health.service';
import { ThrottleOptions } from '../../config/throttle.config';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Throttle(ThrottleOptions.test())
  @Get()
  async check() {
    return this.healthService.check();
  }
}
