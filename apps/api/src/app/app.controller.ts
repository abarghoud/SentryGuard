import { Controller, Get, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppService } from './app.service';
import type { Request } from 'express';
import { ThrottleOptions } from '../config/throttle.config';

@Controller('/test')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Throttle(ThrottleOptions.test())
  @Get()
  getData() {
    return this.appService.getData();
  }

  @Throttle(ThrottleOptions.test())
  @Get('headers')
  getHeaders(@Req() req: Request) {
    return {
      'cf-connecting-ip': req.headers['cf-connecting-ip'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'remote-addr': req.ip,
      'all-headers': req.headers,
    };
  }
}
