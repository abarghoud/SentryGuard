import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';

const GCM_ALGORITHM = 'aes-256-gcm';
const CBC_ALGORITHM = 'aes-256-cbc';
const GCM_IV_LENGTH = 12;

export function validateEncryptionKey(): void {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY must be defined; generate a strong 32+ character value.'
    );
  }

  if (key.length < 32) {
    throw new Error(
      'ENCRYPTION_KEY is too short; it must be at least 32 characters.'
    );
  }
}

function getEncryptionKey(): Buffer {
  validateEncryptionKey();
  return crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv(GCM_ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Return IV + auth tag + encrypted data
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  const key = getEncryptionKey();
  try {
    const parts = text.split(':');

    if (parts.length === 3) {
      // AES-256-GCM
      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encryptedText = parts[2];

      const decipher = crypto.createDecipheriv(GCM_ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } else if (parts.length === 2) {
      Logger.warn('[CRYPTO] Decrypting legacy token using AES-256-CBC fallback. Token should be rotated/re-encrypted.', 'CryptoUtil');
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];

      const decipher = crypto.createDecipheriv(CBC_ALGORITHM, key, iv);

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } else {
      throw new Error('Invalid encrypted text format');
    }
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}
