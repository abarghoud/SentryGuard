import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Interval } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { KafkaService } from '../messaging/kafka/kafka.service';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: { status: 'up' | 'down'; responseTimeMs: number };
    kafka: { status: 'up' | 'down'; connected: boolean };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly kafkaService: KafkaService
  ) {}

  @Interval(60000)
  async scheduledHealthCheck(): Promise<void> {
    await this.check();
  }

  async check(): Promise<HealthStatus> {
    const dbCheck = await this.checkDatabase();
    const kafkaCheck = this.checkKafka();

    const allUp = dbCheck.status === 'up' && kafkaCheck.status === 'up';
    const anyDown = dbCheck.status === 'down' || kafkaCheck.status === 'down';
    const status = allUp ? 'healthy' : anyDown ? 'unhealthy' : 'degraded';

    if (!allUp) {
      const failures: string[] = [];
      if (dbCheck.status !== 'up') failures.push('database');
      if (kafkaCheck.status !== 'up') failures.push('kafka');
      this.logger.error(`[HEALTH_CHECK] degraded: ${failures.join(', ')}`);
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: { database: dbCheck, kafka: kafkaCheck },
    };
  }

  private async checkDatabase(): Promise<{ status: 'up' | 'down'; responseTimeMs: number }> {
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'up', responseTimeMs: Date.now() - start };
    } catch (error) {
      this.logger.error(
        `[HEALTH_CHECK] Database check failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return { status: 'down', responseTimeMs: Date.now() - start };
    }
  }

  private checkKafka(): { status: 'up' | 'down'; connected: boolean } {
    const connected = this.kafkaService.isKafkaConnected();
    if (!connected) {
      this.logger.error('[HEALTH_CHECK] Kafka is disconnected');
    }
    return { status: connected ? 'up' : 'down', connected };
  }
}
