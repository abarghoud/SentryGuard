import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';

/**
 * Custom Throttler Guard for Cloudflare
 * Uses CF-Connecting-IP header to identify real client IP behind Cloudflare proxy
 */
@Injectable()
export class CloudflareThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    // Priority order for IP detection behind Cloudflare:
    // 1. CF-Connecting-IP (Cloudflare specific header with real client IP)
    // 2. X-Forwarded-For (standard proxy header, take first IP)
    // 3. X-Real-IP (alternative proxy header)
    // 4. req.ip (fallback for direct connections)
    
    const cfConnectingIp = req.headers['cf-connecting-ip'];
    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
      // We want the first one (the real client)
      const ips = xForwardedFor.split(',').map((ip: string) => ip.trim());
      return ips[0];
    }

    const xRealIp = req.headers['x-real-ip'];
    if (xRealIp) {
      return xRealIp;
    }

    // Fallback to standard IP (for local development)
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }
}

