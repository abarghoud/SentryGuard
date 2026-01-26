import { Controller, Get, Header, Logger, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ThrottleOptions } from '../../config/throttle.config';

@Controller('.well-known/appspecific')
export class TeslaPublicKeyController {
  private readonly logger = new Logger(TeslaPublicKeyController.name);

  @Throttle(ThrottleOptions.publicSensitive())
  @Get('com.tesla.3p.public-key.pem')
  @Header('Content-Type', 'application/x-pem-file')
  @Header('Content-Disposition', 'attachment; filename="com.tesla.3p.public-key.pem"')
  getPublicKey(@Res() res: Response) {
    this.logger.log('📄 Tesla API requesting public key');

    const publicKeyBase64 = process.env.TESLA_PUBLIC_KEY_BASE64;

    if (!publicKeyBase64) {
      this.logger.error('❌ TESLA_PUBLIC_KEY_BASE64 environment variable is not set');
      return res.status(500).send('Public key not configured');
    }

    try {
      const publicKeyPem = Buffer.from(publicKeyBase64, 'base64').toString('utf-8');

      this.logger.log('✅ Public key served successfully');
      return res.send(publicKeyPem);
    } catch (error) {
      this.logger.error('❌ Failed to decode public key from base64', error);
      return res.status(500).send('Failed to decode public key');
    }
  }
}