import { KafkaConfigFactory } from './kafka-config.factory';

describe('The KafkaConfigFactory class', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.KAFKA_BROKERS = 'broker1:9092,broker2:9092';
    process.env.KAFKA_CLIENT_ID = 'test-client';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('The createKafkaConfig() method', () => {
    describe('When KAFKA_SASL_MECHANISM is not set', () => {
      beforeEach(() => {
        process.env.KAFKA_SASL_MECHANISM = undefined;
      });

      it('should return a plaintext config without ssl or sasl', () => {
        const config = KafkaConfigFactory.createKafkaConfig();

        expect(config).toStrictEqual({
          clientId: 'test-client',
          brokers: ['broker1:9092', 'broker2:9092'],
          connectionTimeout: 5000,
          requestTimeout: 10000,
        });
      });

      it('should use default clientId when KAFKA_CLIENT_ID is not set', () => {
        delete process.env.KAFKA_CLIENT_ID;

        const config = KafkaConfigFactory.createKafkaConfig();

        expect(config.clientId).toBe('sentry-guard-api');
      });
    });

    describe('When KAFKA_SASL_MECHANISM is set to plain', () => {
      beforeEach(() => {
        process.env.KAFKA_SASL_MECHANISM = 'plain';
        process.env.KAFKA_SASL_USERNAME = 'api-key';
        process.env.KAFKA_SASL_PASSWORD = 'api-secret';
      });

      it('should return a config with ssl and sasl enabled', () => {
        const config = KafkaConfigFactory.createKafkaConfig();

        expect(config).toStrictEqual({
          clientId: 'test-client',
          brokers: ['broker1:9092', 'broker2:9092'],
          connectionTimeout: 5000,
          requestTimeout: 10000,
          ssl: true,
          sasl: {
            mechanism: 'plain',
            username: 'api-key',
            password: 'api-secret',
          },
        });
      });
    });

    describe('When KAFKA_SASL_MECHANISM is set to scram-sha-256', () => {
      beforeEach(() => {
        process.env.KAFKA_SASL_MECHANISM = 'scram-sha-256';
        process.env.KAFKA_SASL_USERNAME = 'scram-user';
        process.env.KAFKA_SASL_PASSWORD = 'scram-pass';
      });

      it('should return a config with scram-sha-256 sasl mechanism', () => {
        const config = KafkaConfigFactory.createKafkaConfig();

        expect(config.sasl).toStrictEqual({
          mechanism: 'scram-sha-256',
          username: 'scram-user',
          password: 'scram-pass',
        });
      });
    });

    describe('When KAFKA_SASL_MECHANISM is set to scram-sha-512', () => {
      beforeEach(() => {
        process.env.KAFKA_SASL_MECHANISM = 'scram-sha-512';
        process.env.KAFKA_SASL_USERNAME = 'scram-user';
        process.env.KAFKA_SASL_PASSWORD = 'scram-pass';
      });

      it('should return a config with scram-sha-512 sasl mechanism', () => {
        const config = KafkaConfigFactory.createKafkaConfig();

        expect(config.sasl).toStrictEqual({
          mechanism: 'scram-sha-512',
          username: 'scram-user',
          password: 'scram-pass',
        });
      });
    });

    describe('When SASL credentials are missing', () => {
      beforeEach(() => {
        process.env.KAFKA_SASL_MECHANISM = 'plain';
        process.env.KAFKA_SASL_USERNAME = '';
        process.env.KAFKA_SASL_PASSWORD = '';
      });

      it('should default username and password to empty strings', () => {
        const config = KafkaConfigFactory.createKafkaConfig();

        expect(config.sasl).toEqual({
          mechanism: 'plain',
          username: '',
          password: '',
        });
      });
    });
  });
});
