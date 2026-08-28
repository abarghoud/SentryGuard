import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, type RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { PublicSupportersResponse, SupportersService } from './supporters.service';

@Controller('supporters')
export class SupportersController {
  constructor(private readonly supportersService: SupportersService) {}

  @Get()
  public async getSupporters(): Promise<PublicSupportersResponse> {
    return this.supportersService.getPublicSupporters();
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  public async handleWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('x-signature-sha256') signature: string,
    @Req() req?: RawBodyRequest<Request>
  ): Promise<{ success: boolean }> {
    const rawBody = req?.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(payload);
    await this.supportersService.handleWebhook(payload, rawBody, signature);
    return { success: true };
  }
}
