import { KafkaConfig, SASLOptions } from 'kafkajs';

export class KafkaConfigFactory {
  public static createKafkaConfig(): KafkaConfig {
    const brokers = (process.env.KAFKA_BROKERS || '')
      .split(',')
      .map(broker => broker.trim());
    const clientId = process.env.KAFKA_CLIENT_ID || 'sentry-guard-api';

    const baseConfig: KafkaConfig = {
      clientId,
      brokers,
      connectionTimeout: 5000,
      requestTimeout: 10000,
    };

    const saslMechanism = process.env.KAFKA_SASL_MECHANISM;

    if (!saslMechanism) {
      return baseConfig;
    }

    const username = process.env.KAFKA_SASL_USERNAME || '';
    const password = process.env.KAFKA_SASL_PASSWORD || '';

    const sasl: SASLOptions = {
      mechanism: saslMechanism as 'plain' | 'scram-sha-256' | 'scram-sha-512',
      username,
      password,
    };

    return {
      ...baseConfig,
      ssl: true,
      sasl,
    };
  }
}
