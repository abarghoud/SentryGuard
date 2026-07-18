import 'reflect-metadata';
import * as crypto from 'crypto';
import { encrypt, decrypt } from './crypto.util';

describe('The crypto utility functions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('When ENCRYPTION_KEY is valid (>= 32 characters)', () => {
    beforeEach(() => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(32);
    });

    it('should successfully encrypt and decrypt a text value', () => {
      const plaintext = 'Sensitive-Tesla-Token-123';
      const ciphertext = encrypt(plaintext);

      expect(ciphertext.split(':')).toHaveLength(3);

      const decrypted = decrypt(ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    it('should fallback and decrypt legacy AES-256-CBC ciphertext format', () => {
      const plaintext = 'Legacy-CBC-Token';
      const key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const legacyCiphertext = iv.toString('hex') + ':' + encrypted;

      const decrypted = decrypt(legacyCiphertext);
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid encrypted text format', () => {
      expect(() => decrypt('invalid-format')).toThrow('Failed to decrypt data');
    });

    describe('When the GCM auth tag is tampered', () => {
      it('should throw when decrypting a ciphertext with an altered auth tag', () => {
        const ciphertext = encrypt('Sensitive-Tesla-Token-123');
        const parts = ciphertext.split(':');
        const tamperedTag = Buffer.alloc(16, 0xff).toString('hex');
        const tamperedCiphertext = `${parts[0]}:${tamperedTag}:${parts[2]}`;

        expect(() => decrypt(tamperedCiphertext)).toThrow('Failed to decrypt data');
      });
    });
  });

  describe('When ENCRYPTION_KEY is too short (< 32 characters)', () => {
    beforeEach(() => {
      process.env.ENCRYPTION_KEY = 'short-key';
    });

    it('should throw an error during encryption', () => {
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY is too short');
    });

    it('should throw an error during decryption', () => {
      expect(() => decrypt('iv:tag:ciphertext')).toThrow('ENCRYPTION_KEY is too short');
    });
  });

  describe('When ENCRYPTION_KEY is missing', () => {
    beforeEach(() => {
      delete process.env.ENCRYPTION_KEY;
    });

    it('should throw an error during encryption', () => {
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be defined');
    });
  });
});
