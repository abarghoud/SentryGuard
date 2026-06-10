import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { ThrottleOptions } from '../config/throttle.config';

@Controller('/test')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Throttle(ThrottleOptions.test())
  @Get()
  getData() {
    return this.appService.getData();
  }
}
