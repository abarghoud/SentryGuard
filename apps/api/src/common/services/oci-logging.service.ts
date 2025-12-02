import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { Region, SimpleAuthenticationDetailsProvider } from 'oci-common';
import { LoggingClient } from 'oci-loggingingestion';

export interface OciLoggingConfig {
  userOcid?: string;
  tenancyOcid?: string;
  fingerprint?: string;
  privateKey?: string;
  privateKeyPath?: string;
  privateKeyBase64?: string;
  region: string;
  logId: string;
  enabled: boolean;
}

@Injectable()
export class OciLoggingService implements OnModuleInit {
  private loggingClient: LoggingClient | null = null;
  private authProvider: SimpleAuthenticationDetailsProvider | null = null;
  private isInitialized = false;

  constructor(private config: OciLoggingConfig) {}

  async onModuleInit() {
    if (!this.config.enabled) {
      return;
    }

    try {
      this.authProvider = await this.createAuthProvider();
      if (!this.authProvider) {
        console.error('[OciLoggingService] Failed to initialize authentication provider');
        return;
      }

      this.loggingClient = new LoggingClient({
        authenticationDetailsProvider: this.authProvider,
      });
      this.loggingClient.endpoint = `https://ingestion.logging.${this.config.region}.oci.oraclecloud.com`;

      this.isInitialized = true;
    } catch (error) {
      console.error(`[OciLoggingService] Failed to initialize: ${(error as Error).message}`);
      this.isInitialized = false;

      throw error;
    }
  }

  private async createAuthProvider(): Promise<SimpleAuthenticationDetailsProvider | null> {
    try {
      if (!this.config.userOcid || !this.config.tenancyOcid || !this.config.fingerprint) {
        throw new Error('Missing required OCI API key configuration');
      }

      let privateKey: string;
      if (this.config.privateKey) {
        privateKey = this.config.privateKey;
      } else if (this.config.privateKeyBase64) {
        privateKey = Buffer.from(this.config.privateKeyBase64, 'base64').toString('utf8');
      } else if (this.config.privateKeyPath) {
        privateKey = readFileSync(this.config.privateKeyPath, 'utf8');
      } else {
        throw new Error('No private key provided');
      }

      const authProvider = new SimpleAuthenticationDetailsProvider(
        this.config.tenancyOcid,
        this.config.userOcid,
        this.config.fingerprint,
        privateKey,
        null,
        Region.fromRegionId(this.config.region)
      );

      return authProvider;
    } catch (error) {
      console.error(`[OciLoggingService] Failed to create authentication provider: ${(error as Error).message}`);
      return null;
    }
  }

  async sendLog(message: unknown): Promise<void> {
    if (!this.isInitialized || !this.loggingClient) {
      return;
    }

    try {
      const putLogsRequest = {
        logId: this.config.logId,
        putLogsDetails: {
          logEntryBatches: [{
            entries: [{
              data: typeof message === 'string' ? message : JSON.stringify(message),
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              time: new Date(),
            }],
            source: 'tesla-guard-api',
            type: 'STRUCTURED',
            defaultlogentrytime: new Date(),
          }],
          specversion: '1.0',
        },
      };

      await this.loggingClient.putLogs(putLogsRequest);

    } catch (error) {
      console.error(`[OciLoggingService] Failed to send log to OCI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}
