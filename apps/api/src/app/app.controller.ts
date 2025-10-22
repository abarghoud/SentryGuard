import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { Request } from 'express';

@Controller('/test')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

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
